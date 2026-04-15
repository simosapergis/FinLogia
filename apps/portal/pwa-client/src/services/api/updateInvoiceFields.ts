import { apiRequest, buildUrl } from '@/services/api/apiClient';

export interface UpdateInvoiceFieldsRequest {
  supplierId: string;
  invoiceId: string;
  fields: {
    supplierName?: string;
    supplierTaxNumber?: string;
    invoiceNumber?: string;
    invoiceDate?: string;
    dueDate?: string;
    totalAmount?: number;
    netAmount?: number;
    vatAmount?: number;
    vatRate?: number;
    isCredit?: boolean;
    currency?: string;
    paidAmount?: number;
    paymentHistory?: Array<{
      amount: number;
      paymentDate: string;
      paymentMethod?: string;
      notes?: string;
      creditInvoiceId?: string;
      creditAmountUsed?: number;
    }>;
  };
}

export interface UpdateInvoiceFieldsResponse {
  success: boolean;
  message?: string;
  updatedFields?: string[];
}

const UPDATE_INVOICE_FIELDS_PATH = import.meta.env.VITE_UPDATE_INVOICE_FIELDS_PATH ?? 'updateInvoiceFields';

export const updateInvoiceFields = async (
  payload: UpdateInvoiceFieldsRequest
): Promise<UpdateInvoiceFieldsResponse> => {
  return apiRequest<UpdateInvoiceFieldsResponse>(
    buildUrl(UPDATE_INVOICE_FIELDS_PATH),
    'POST',
    payload
  );
};
