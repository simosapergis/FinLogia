import admin from 'firebase-admin';
import { db, ACCOUNTANTS_COLLECTION, INVOICE_VIEWS_SUBCOLLECTION, serverTimestamp } from './config.js';
import { getClientDb } from './client-access.js';

function validateGetInvoicesRequest(body) {
  const errors = [];
  if (!body.clientProjectId || typeof body.clientProjectId !== 'string') {
    errors.push('clientProjectId is required and must be a string');
  }
  if (!body.startDate || typeof body.startDate !== 'string') {
    errors.push('startDate is required (YYYY-MM-DD)');
  }
  if (!body.endDate || typeof body.endDate !== 'string') {
    errors.push('endDate is required (YYYY-MM-DD)');
  }
  if (body.startDate && body.endDate && new Date(body.startDate) > new Date(body.endDate)) {
    errors.push('startDate must not be after endDate');
  }
  return errors;
}

function validateViewInvoiceRequest(body) {
  const errors = [];
  if (!body.clientProjectId || typeof body.clientProjectId !== 'string') {
    errors.push('clientProjectId is required and must be a string');
  }
  if (!body.supplierId || typeof body.supplierId !== 'string') {
    errors.push('supplierId is required and must be a string');
  }
  if (!body.invoiceId || typeof body.invoiceId !== 'string') {
    errors.push('invoiceId is required and must be a string');
  }
  return errors;
}

function validateSignedUrlRequest(body) {
  const errors = [];
  if (!body.clientProjectId || typeof body.clientProjectId !== 'string') {
    errors.push('clientProjectId is required and must be a string');
  }
  if (!body.filePath || typeof body.filePath !== 'string') {
    errors.push('filePath is required and must be a string');
  }
  if (!body.bucketName || typeof body.bucketName !== 'string') {
    errors.push('bucketName is required and must be a string');
  }
  return errors;
}

function validateUpdateAuditStatusRequest(body) {
  const errors = [];
  if (!body.clientProjectId || typeof body.clientProjectId !== 'string') {
    errors.push('clientProjectId is required and must be a string');
  }
  if (!body.supplierId || typeof body.supplierId !== 'string') {
    errors.push('supplierId is required and must be a string');
  }
  if (!body.invoiceId || typeof body.invoiceId !== 'string') {
    errors.push('invoiceId is required and must be a string');
  }
  if (body.status !== null && !['registered', 'denied'].includes(body.status)) {
    errors.push('status must be "registered", "denied", or null');
  }
  return errors;
}

async function fetchClientInvoices({ clientProjectId, startDate, endDate }) {
  const clientDb = getClientDb(clientProjectId);

  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  const snapshot = await clientDb
    .collectionGroup('invoices')
    .where('invoiceDate', '>=', start)
    .where('invoiceDate', '<=', end)
    .orderBy('invoiceDate', 'desc')
    .get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    const pathParts = doc.ref.path.split('/');
    const supplierId = pathParts[1];
    return {
      invoiceId: doc.id,
      supplierId,
      supplierName: data.supplierName || supplierId,
      invoiceNumber: data.invoiceNumber || null,
      invoiceDate: data.invoiceDate,
      totalAmount: data.totalAmount ?? null,
      filePath: data.filePath || null,
      bucket: data.bucket || null,
      downloadedBy: data.downloadedBy || {},
    };
  });
}

async function fetchInvoiceViews({ accountantId, clientProjectId, invoiceIds }) {
  if (!invoiceIds || invoiceIds.length === 0) return {};

  const viewsRef = db
    .collection(ACCOUNTANTS_COLLECTION)
    .doc(accountantId)
    .collection(INVOICE_VIEWS_SUBCOLLECTION);

  const viewIds = invoiceIds.map(
    ({ supplierId, invoiceId }) => `${clientProjectId}_${supplierId}_${invoiceId}`
  );

  const batchSize = 30;
  const viewMap = {};

  for (let i = 0; i < viewIds.length; i += batchSize) {
    const batch = viewIds.slice(i, i + batchSize);
    const refs = batch.map((id) => viewsRef.doc(id));
    const snapshots = await db.getAll(...refs);

    for (const snap of snapshots) {
      if (snap.exists) {
        viewMap[snap.id] = snap.data();
      }
    }
  }

  return viewMap;
}

async function recordInvoiceView({ accountantId, userId, userName, clientProjectId, supplierId, invoiceId }) {
  const viewId = `${clientProjectId}_${supplierId}_${invoiceId}`;
  const viewRef = db
    .collection(ACCOUNTANTS_COLLECTION)
    .doc(accountantId)
    .collection(INVOICE_VIEWS_SUBCOLLECTION)
    .doc(viewId);

  const viewDoc = await viewRef.get();

  if (viewDoc.exists) {
    await viewRef.update({
      [`viewedBy.${userId}.lastViewedAt`]: serverTimestamp(),
      [`viewedBy.${userId}.viewCount`]: admin.firestore.FieldValue.increment(1),
    });
  } else {
    await viewRef.set({
      clientProjectId,
      supplierId,
      invoiceId,
      viewedBy: {
        [userId]: {
          name: userName,
          firstViewedAt: serverTimestamp(),
          lastViewedAt: serverTimestamp(),
          viewCount: 1,
        },
      },
      auditStatus: null,
    });
  }
}

async function updateInvoiceAuditStatus({ accountantId, userId, userName, clientProjectId, supplierId, invoiceId, status }) {
  const viewId = `${clientProjectId}_${supplierId}_${invoiceId}`;
  const viewRef = db
    .collection(ACCOUNTANTS_COLLECTION)
    .doc(accountantId)
    .collection(INVOICE_VIEWS_SUBCOLLECTION)
    .doc(viewId);

  const viewDoc = await viewRef.get();

  const updateData = {
    auditStatus: status,
    auditStatusUpdatedAt: serverTimestamp(),
    auditStatusUpdatedBy: {
      userId,
      name: userName,
    },
  };

  if (viewDoc.exists) {
    await viewRef.update(updateData);
  } else {
    await viewRef.set({
      clientProjectId,
      supplierId,
      invoiceId,
      viewedBy: {},
      ...updateData,
    });
  }
}

async function fetchInvoiceDetail({ clientProjectId, supplierId, invoiceId }) {
  const clientDb = getClientDb(clientProjectId);
  const doc = await clientDb
    .collection('suppliers')
    .doc(supplierId)
    .collection('invoices')
    .doc(invoiceId)
    .get();

  if (!doc.exists) {
    return null;
  }

  return { invoiceId: doc.id, supplierId, ...doc.data() };
}

export {
  validateGetInvoicesRequest,
  validateViewInvoiceRequest,
  validateSignedUrlRequest,
  validateUpdateAuditStatusRequest,
  fetchClientInvoices,
  fetchInvoiceViews,
  recordInvoiceView,
  updateInvoiceAuditStatus,
  fetchInvoiceDetail,
};
