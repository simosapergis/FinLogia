import { apiRequest } from './apiClient';

interface ExportInvoice {
  supplierId: string;
  invoiceId: string;
}

interface ExportResponse {
  success: boolean;
  message: string;
  data: {
    downloadUrl: string;
    invoiceCount: number;
    zipPath: string;
    expiresAt: string;
  };
}

export async function exportClientInvoices(params: {
  clientProjectId: string;
  invoices: ExportInvoice[];
}): Promise<ExportResponse> {
  const path = import.meta.env.VITE_EXPORT_CLIENT_INVOICES_PATH;
  return apiRequest<ExportResponse>(path, { method: 'POST', body: params });
}
