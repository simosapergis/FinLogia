import archiver from 'archiver';
import { PassThrough } from 'stream';
import { pipeline } from 'stream/promises';
import { storage, getBucketName, SIGNED_URL_TTL_MS, formatAthensDate } from './config.js';
import { getClientBucket } from './client-access.js';

const EXPORTS_PREFIX = 'exports/';
const MAX_EXPORT_INVOICES = 500;

function validateExportRequest(body) {
  const errors = [];
  if (!body.clientProjectId || typeof body.clientProjectId !== 'string') {
    errors.push('clientProjectId is required and must be a string');
  }
  if (!Array.isArray(body.invoices)) {
    errors.push('invoices is required and must be an array');
    return errors;
  }
  if (body.invoices.length === 0) {
    errors.push('invoices must contain at least one entry');
    return errors;
  }
  if (body.invoices.length > MAX_EXPORT_INVOICES) {
    errors.push(`invoices must not exceed ${MAX_EXPORT_INVOICES} entries`);
    return errors;
  }
  for (let i = 0; i < body.invoices.length; i++) {
    const entry = body.invoices[i];
    if (!entry || typeof entry !== 'object') {
      errors.push(`invoices[${i}] must be an object`);
      continue;
    }
    if (!entry.supplierId || typeof entry.supplierId !== 'string') {
      errors.push(`invoices[${i}].supplierId is required and must be a string`);
    }
    if (!entry.invoiceId || typeof entry.invoiceId !== 'string') {
      errors.push(`invoices[${i}].invoiceId is required and must be a string`);
    }
  }
  return errors;
}

function sanitizeZipEntryName(invoice) {
  const parts = [];
  if (invoice.supplierName) {
    parts.push(invoice.supplierName.replace(/[^a-zA-Z0-9\u0370-\u03FF\u1F00-\u1FFF_-]/g, '_'));
  }
  if (invoice.invoiceNumber) {
    parts.push(invoice.invoiceNumber.toString().replace(/[^a-zA-Z0-9_-]/g, '_'));
  }
  if (invoice.invoiceDate) {
    const date = invoice.invoiceDate.toDate
      ? invoice.invoiceDate.toDate()
      : new Date(invoice.invoiceDate);
    if (!isNaN(date.getTime())) {
      parts.push(formatAthensDate(date));
    }
  }
  if (parts.length === 0) {
    parts.push(invoice.invoiceId || 'unknown');
  }
  return `${parts.join('_')}.pdf`;
}

async function fetchExportInvoiceDocs({ clientDb, invoicePairs }) {
  const refs = invoicePairs.map(({ supplierId, invoiceId }) =>
    clientDb.collection('suppliers').doc(supplierId).collection('invoices').doc(invoiceId)
  );
  const snapshots = await clientDb.getAll(...refs);
  const results = [];
  for (let i = 0; i < snapshots.length; i++) {
    const snap = snapshots[i];
    if (snap.exists) {
      results.push({
        invoiceId: invoicePairs[i].invoiceId,
        supplierId: invoicePairs[i].supplierId,
        ...snap.data(),
      });
    }
  }
  return results;
}

async function streamClientInvoicesZip({ invoices, accountantId, userId, clientBucketName }) {
  const centralBucketName = getBucketName();
  const centralBucket = storage.bucket(centralBucketName);
  const timestamp = Date.now();
  const zipObjectPath = `${EXPORTS_PREFIX}${accountantId}/${timestamp}.zip`;
  const zipFile = centralBucket.file(zipObjectPath);

  const archive = archiver('zip', { zlib: { level: 5 } });
  const passThrough = new PassThrough();
  archive.pipe(passThrough);

  const uploadPromise = pipeline(
    passThrough,
    zipFile.createWriteStream({
      resumable: false,
      contentType: 'application/zip',
      metadata: {
        invoiceCount: invoices.length.toString(),
        createdBy: userId,
      },
    })
  );

  const clientBucket = getClientBucket(clientBucketName);
  const usedNames = new Set();

  for (const invoice of invoices) {
    if (!invoice.filePath) continue;

    let entryName = sanitizeZipEntryName(invoice);
    if (usedNames.has(entryName)) {
      const base = entryName.replace(/\.pdf$/, '');
      let counter = 2;
      while (usedNames.has(`${base}_${counter}.pdf`)) counter++;
      entryName = `${base}_${counter}.pdf`;
    }
    usedNames.add(entryName);

    const sourceFile = clientBucket.file(invoice.filePath);
    const readStream = sourceFile.createReadStream();
    archive.append(readStream, { name: entryName });
  }

  await archive.finalize();
  await uploadPromise;
  return zipObjectPath;
}

async function getExportDownloadUrl(zipObjectPath) {
  const centralBucketName = getBucketName();
  const file = storage.bucket(centralBucketName).file(zipObjectPath);
  const expiresAtMs = Date.now() + SIGNED_URL_TTL_MS;
  const [downloadUrl] = await file.getSignedUrl({
    version: 'v4',
    action: 'read',
    expires: expiresAtMs,
  });
  return {
    downloadUrl,
    expiresAt: new Date(expiresAtMs).toISOString(),
  };
}

export {
  EXPORTS_PREFIX,
  MAX_EXPORT_INVOICES,
  validateExportRequest,
  sanitizeZipEntryName,
  fetchExportInvoiceDocs,
  streamClientInvoicesZip,
  getExportDownloadUrl,
};
