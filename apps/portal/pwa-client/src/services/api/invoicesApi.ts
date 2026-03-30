import { apiRequest } from './apiClient';

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
  return apiRequest<UpdateAuditStatusResponse>(path, 'POST', params);
}

export async function recordInvoiceView(params: {
  businessId: string;
  invoiceId: string;
}): Promise<{ success: boolean }> {
  const path = import.meta.env.VITE_RECORD_INVOICE_VIEW_PATH || '/recordInvoiceView_v2';
  return apiRequest<{ success: boolean }>(path, 'POST', params);
}
