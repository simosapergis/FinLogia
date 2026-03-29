import { onRequest } from 'firebase-functions/v2/https';

// ═══════════════════════════════════════════════════════════════════════════════
// LIB IMPORTS
// ═══════════════════════════════════════════════════════════════════════════════

import { SIGNED_URL_TTL_MS } from './lib/config.js';
import { authenticateRequest, validateAccountant, getUserDisplayName } from './lib/auth.js';
import { HTTP_OPTS, requireMethod, sendError } from './lib/http-utils.js';
import { validateClientAccess, getClientDb, getClientBucket } from './lib/client-access.js';
import { listAccountantClients } from './lib/clients.js';
import {
  validateGetInvoicesRequest,
  validateViewInvoiceRequest,
  validateSignedUrlRequest,
  validateUpdateAuditStatusRequest,
  fetchClientInvoices,
  fetchInvoiceViews,
  recordInvoiceView,
  updateInvoiceAuditStatus,
  fetchInvoiceDetail,
} from './lib/invoices.js';
import {
  validateExportRequest,
  fetchExportInvoiceDocs,
  streamClientInvoicesZip,
  getExportDownloadUrl,
} from './lib/invoice-export.js';

// ═══════════════════════════════════════════════════════════════════════════════
// LIST CLIENTS
// ═══════════════════════════════════════════════════════════════════════════════

export const listClients_v1 = onRequest(HTTP_OPTS, async (req, res) => {
  if (!requireMethod(req, res, 'GET')) return;

  const authResult = await authenticateRequest(req);
  if (authResult.error) {
    return sendError(res, authResult.status, authResult.error);
  }

  const officeId = authResult.user.officeId || authResult.user.uid;

  const accountantResult = await validateAccountant(officeId);
  if (accountantResult.error) {
    return sendError(res, accountantResult.status, accountantResult.error);
  }

  try {
    const clients = await listAccountantClients(officeId);
    return res.status(200).json({
      success: true,
      data: { clients, accountant: accountantResult.accountant },
    });
  } catch (error) {
    console.error('Failed to list clients:', error);
    return sendError(res, 500, 'Αποτυχία φόρτωσης πελατών', { code: 'LIST_CLIENTS_ERROR' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET CLIENT INVOICES
// ═══════════════════════════════════════════════════════════════════════════════

export const getClientInvoices_v1 = onRequest(HTTP_OPTS, async (req, res) => {
  if (!requireMethod(req, res, 'POST')) return;

  const authResult = await authenticateRequest(req);
  if (authResult.error) {
    return sendError(res, authResult.status, authResult.error);
  }
  const officeId = authResult.user.officeId || authResult.user.uid;

  const body = req.body || {};
  const validationErrors = validateGetInvoicesRequest(body);
  if (validationErrors.length > 0) {
    return sendError(res, 400, 'Validation failed', { details: validationErrors });
  }

  const clientResult = await validateClientAccess(officeId, body.clientProjectId);
  if (clientResult.error) {
    return sendError(res, clientResult.status, clientResult.error);
  }

  try {
    const invoices = await fetchClientInvoices({
      clientProjectId: body.clientProjectId,
      startDate: body.startDate,
      endDate: body.endDate,
    });

    const invoiceKeys = invoices.map(({ supplierId, invoiceId }) => ({ supplierId, invoiceId }));
    const viewMap = await fetchInvoiceViews({
      accountantId: officeId,
      clientProjectId: body.clientProjectId,
      invoiceIds: invoiceKeys,
    });

    const enriched = invoices.map((inv) => {
      const viewId = `${body.clientProjectId}_${inv.supplierId}_${inv.invoiceId}`;
      const viewData = viewMap[viewId];
      return {
        ...inv,
        viewedBy: viewData?.viewedBy || {},
        auditStatus: viewData?.auditStatus || null,
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        invoices: enriched,
        invoiceCount: enriched.length,
        client: clientResult.client,
      },
    });
  } catch (error) {
    console.error('Failed to fetch client invoices:', error);
    return sendError(res, 500, 'Αποτυχία φόρτωσης τιμολογίων', { code: 'FETCH_INVOICES_ERROR' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// VIEW INVOICE DETAILS
// ═══════════════════════════════════════════════════════════════════════════════

export const viewInvoiceDetails_v1 = onRequest(HTTP_OPTS, async (req, res) => {
  if (!requireMethod(req, res, 'POST')) return;

  const authResult = await authenticateRequest(req);
  if (authResult.error) {
    return sendError(res, authResult.status, authResult.error);
  }
  const officeId = authResult.user.officeId || authResult.user.uid;
  const userId = authResult.user.uid;
  const userName = getUserDisplayName(authResult.user);

  const body = req.body || {};
  const validationErrors = validateViewInvoiceRequest(body);
  if (validationErrors.length > 0) {
    return sendError(res, 400, 'Validation failed', { details: validationErrors });
  }

  const clientResult = await validateClientAccess(officeId, body.clientProjectId);
  if (clientResult.error) {
    return sendError(res, clientResult.status, clientResult.error);
  }

  try {
    const invoice = await fetchInvoiceDetail({
      clientProjectId: body.clientProjectId,
      supplierId: body.supplierId,
      invoiceId: body.invoiceId,
    });

    if (!invoice) {
      return sendError(res, 404, 'Το τιμολόγιο δεν βρέθηκε', { code: 'INVOICE_NOT_FOUND' });
    }

    try {
      await recordInvoiceView({
        accountantId: officeId,
        userId,
        userName,
        clientProjectId: body.clientProjectId,
        supplierId: body.supplierId,
        invoiceId: body.invoiceId,
      });
    } catch (viewError) {
      console.error('Failed to record invoice view:', viewError);
    }

    return res.status(200).json({
      success: true,
      data: { invoice, client: clientResult.client },
    });
  } catch (error) {
    console.error('Failed to view invoice details:', error);
    return sendError(res, 500, 'Αποτυχία φόρτωσης τιμολογίου', { code: 'VIEW_INVOICE_ERROR' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET SIGNED INVOICE URL
// ═══════════════════════════════════════════════════════════════════════════════

export const getSignedInvoiceUrl_v1 = onRequest(HTTP_OPTS, async (req, res) => {
  if (!requireMethod(req, res, 'POST')) return;

  const authResult = await authenticateRequest(req);
  if (authResult.error) {
    return sendError(res, authResult.status, authResult.error);
  }
  const officeId = authResult.user.officeId || authResult.user.uid;

  const body = req.body || {};
  const validationErrors = validateSignedUrlRequest(body);
  if (validationErrors.length > 0) {
    return sendError(res, 400, 'Validation failed', { details: validationErrors });
  }

  const clientResult = await validateClientAccess(officeId, body.clientProjectId);
  if (clientResult.error) {
    return sendError(res, clientResult.status, clientResult.error);
  }

  try {
    const bucket = getClientBucket(body.bucketName);
    const file = bucket.file(body.filePath);
    const expiresAtMs = Date.now() + SIGNED_URL_TTL_MS;

    const [downloadUrl] = await file.getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: expiresAtMs,
    });

    return res.status(200).json({
      success: true,
      data: {
        downloadUrl,
        expiresAt: new Date(expiresAtMs).toISOString(),
      },
    });
  } catch (error) {
    console.error('Failed to generate signed URL:', error);
    return sendError(res, 500, 'Αποτυχία δημιουργίας URL λήψης', { code: 'SIGNED_URL_ERROR' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// UPDATE INVOICE AUDIT STATUS
// ═══════════════════════════════════════════════════════════════════════════════

export const updateAuditStatus_v1 = onRequest(HTTP_OPTS, async (req, res) => {
  if (!requireMethod(req, res, 'POST')) return;

  const authResult = await authenticateRequest(req);
  if (authResult.error) {
    return sendError(res, authResult.status, authResult.error);
  }
  const officeId = authResult.user.officeId || authResult.user.uid;
  const userId = authResult.user.uid;
  const userName = getUserDisplayName(authResult.user);

  const body = req.body || {};
  const validationErrors = validateUpdateAuditStatusRequest(body);
  if (validationErrors.length > 0) {
    return sendError(res, 400, 'Validation failed', { details: validationErrors });
  }

  const clientResult = await validateClientAccess(officeId, body.clientProjectId);
  if (clientResult.error) {
    return sendError(res, clientResult.status, clientResult.error);
  }

  try {
    await updateInvoiceAuditStatus({
      accountantId: officeId,
      userId,
      userName,
      clientProjectId: body.clientProjectId,
      supplierId: body.supplierId,
      invoiceId: body.invoiceId,
      status: body.status,
    });

    return res.status(200).json({
      success: true,
      message: 'Η κατάσταση ελέγχου ενημερώθηκε',
    });
  } catch (error) {
    console.error('Failed to update audit status:', error);
    return sendError(res, 500, 'Αποτυχία ενημέρωσης κατάστασης', { code: 'UPDATE_AUDIT_STATUS_ERROR' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORT CLIENT INVOICES
// ═══════════════════════════════════════════════════════════════════════════════

const EXPORT_OPTS = {
  ...HTTP_OPTS,
  timeoutSeconds: 540,
  memory: '1GiB',
};

export const exportClientInvoices_v1 = onRequest(EXPORT_OPTS, async (req, res) => {
  if (!requireMethod(req, res, 'POST')) return;

  const authResult = await authenticateRequest(req);
  if (authResult.error) {
    return sendError(res, authResult.status, authResult.error);
  }
  const officeId = authResult.user.officeId || authResult.user.uid;
  const userId = authResult.user.uid;

  const body = req.body || {};
  const validationErrors = validateExportRequest(body);
  if (validationErrors.length > 0) {
    return sendError(res, 400, 'Validation failed', { details: validationErrors });
  }

  const clientResult = await validateClientAccess(officeId, body.clientProjectId);
  if (clientResult.error) {
    return sendError(res, clientResult.status, clientResult.error);
  }

  try {
    const clientDb = getClientDb(body.clientProjectId);
    const invoices = await fetchExportInvoiceDocs({
      clientDb,
      invoicePairs: body.invoices,
    });

    if (invoices.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'Δεν βρέθηκαν τιμολόγια για τα επιλεγμένα αναγνωριστικά',
        data: { invoiceCount: 0 },
      });
    }

    const exportable = invoices.filter((inv) => inv.filePath);
    if (exportable.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'Δεν βρέθηκαν αρχεία PDF για τα επιλεγμένα τιμολόγια',
        data: { invoiceCount: invoices.length },
      });
    }

    console.log(`Exporting ${exportable.length} invoices for office ${officeId} from ${body.clientProjectId}`);

    const zipPath = await streamClientInvoicesZip({
      invoices: exportable,
      accountantId: officeId,
      userId,
      clientBucketName: clientResult.client.bucketName,
    });

    const { downloadUrl, expiresAt } = await getExportDownloadUrl(zipPath);

    return res.status(200).json({
      success: true,
      message: `Εξαγωγή ${exportable.length} τιμολογίων ολοκληρώθηκε`,
      data: {
        downloadUrl,
        invoiceCount: exportable.length,
        zipPath,
        expiresAt,
      },
    });
  } catch (error) {
    console.error('Invoice export failed:', error);
    return sendError(res, 500, 'Αποτυχία εξαγωγής τιμολογίων', {
      details: error.message,
      code: 'EXPORT_ERROR',
    });
  }
});
