import { admin, db, serverTimestamp } from './config.js';

function validateUpdateAuditStatusRequest(body) {
  const errors = [];
  if (!body.businessId || typeof body.businessId !== 'string') {
    errors.push('businessId is required and must be a string');
  }
  if (!body.invoiceId || typeof body.invoiceId !== 'string') {
    errors.push('invoiceId is required and must be a string');
  }
  if (body.status !== null && !['registered', 'denied'].includes(body.status)) {
    errors.push('status must be "registered", "denied", or null');
  }
  return errors;
}

function validateRecordViewRequest(body) {
  const errors = [];
  if (!body.businessId || typeof body.businessId !== 'string') {
    errors.push('businessId is required and must be a string');
  }
  if (!body.invoiceId || typeof body.invoiceId !== 'string') {
    errors.push('invoiceId is required and must be a string');
  }
  return errors;
}

async function updateInvoiceAuditStatus({ businessId, invoiceId, status, userId, userName }) {
  const invoiceRef = db.collection('businesses').doc(businessId).collection('invoices').doc(invoiceId);
  
  const updateData = {
    auditStatus: status,
    auditStatusUpdatedAt: serverTimestamp(),
    auditStatusUpdatedBy: {
      userId,
      name: userName,
    },
  };

  await invoiceRef.update(updateData);
}

async function recordInvoiceView({ businessId, invoiceId, userId, userName }) {
  const invoiceRef = db.collection('businesses').doc(businessId).collection('invoices').doc(invoiceId);
  
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(invoiceRef);
    if (!snap.exists) return;
    
    const data = snap.data();
    const viewedBy = data.viewedBy || {};
    const userView = viewedBy[userId] || { viewCount: 0, firstViewedAt: serverTimestamp() };
    
    viewedBy[userId] = {
      ...userView,
      name: userName,
      lastViewedAt: serverTimestamp(),
      viewCount: userView.viewCount + 1,
    };
    
    tx.update(invoiceRef, { viewedBy });
  });
}

export {
  validateUpdateAuditStatusRequest,
  validateRecordViewRequest,
  updateInvoiceAuditStatus,
  recordInvoiceView,
};
