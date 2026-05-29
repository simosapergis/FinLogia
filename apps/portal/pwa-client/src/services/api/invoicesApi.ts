import { apiRequest, buildUrl } from './apiClient';

interface UpdateAuditStatusResponse {
  success: boolean;
  message: string;
}

export async function updateAuditStatus(params: {
  businessId: string;
  invoiceId: string;
  status: 'registered' | 'denied' | null;
}): Promise<UpdateAuditStatusResponse> {
  const path = import.meta.env.VITE_UPDATE_AUDIT_STATUS_PATH || '/updateAuditStatus_v2';
  return apiRequest<UpdateAuditStatusResponse>(buildUrl(path), 'POST', params);
}

export async function recordInvoiceView(params: {
  businessId: string;
  invoiceId: string;
}): Promise<{ success: boolean }> {
  const path = import.meta.env.VITE_RECORD_INVOICE_VIEW_PATH || '/recordInvoiceView_v2';
  return apiRequest<{ success: boolean }>(buildUrl(path), 'POST', params);
}

export async function deleteInvoice(params: {
  businessId: string;
  invoiceId: string;
}): Promise<{ success: boolean; message: string }> {
  const path = import.meta.env.VITE_DELETE_INVOICE_PATH || '/deleteInvoice_v2';
  return apiRequest<{ success: boolean; message: string }>(buildUrl(path), 'POST', params);
}
