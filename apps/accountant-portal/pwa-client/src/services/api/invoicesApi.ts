import { apiRequest } from './apiClient';
import type { InvoiceItem, InvoiceDetail } from '@/modules/invoices/Invoice';
import type { Client } from '@/modules/clients/Client';

interface GetInvoicesResponse {
  success: boolean;
  data: {
    invoices: InvoiceItem[];
    invoiceCount: number;
    client: Client;
  };
}

interface ViewDetailsResponse {
  success: boolean;
  data: {
    invoice: InvoiceDetail;
    client: Client;
  };
}

interface SignedUrlResponse {
  success: boolean;
  data: {
    downloadUrl: string;
    expiresAt: string;
  };
}

interface UpdateAuditStatusResponse {
  success: boolean;
  message: string;
}

export async function getClientInvoices(params: {
  clientProjectId: string;
  startDate: string;
  endDate: string;
}): Promise<GetInvoicesResponse> {
  const path = import.meta.env.VITE_GET_CLIENT_INVOICES_PATH;
  return apiRequest<GetInvoicesResponse>(path, { method: 'POST', body: params });
}

export async function viewInvoiceDetails(params: {
  clientProjectId: string;
  supplierId: string;
  invoiceId: string;
}): Promise<ViewDetailsResponse> {
  const path = import.meta.env.VITE_VIEW_INVOICE_DETAILS_PATH;
  return apiRequest<ViewDetailsResponse>(path, { method: 'POST', body: params });
}

export async function getSignedInvoiceUrl(params: {
  clientProjectId: string;
  filePath: string;
  bucketName: string;
}): Promise<SignedUrlResponse> {
  const path = import.meta.env.VITE_GET_SIGNED_INVOICE_URL_PATH;
  return apiRequest<SignedUrlResponse>(path, { method: 'POST', body: params });
}

export async function updateAuditStatus(params: {
  clientProjectId: string;
  supplierId: string;
  invoiceId: string;
  status: 'registered' | 'denied' | null;
}): Promise<UpdateAuditStatusResponse> {
  const path = import.meta.env.VITE_UPDATE_AUDIT_STATUS_PATH || '/updateAuditStatus_v1';
  return apiRequest<UpdateAuditStatusResponse>(path, { method: 'POST', body: params });
}
