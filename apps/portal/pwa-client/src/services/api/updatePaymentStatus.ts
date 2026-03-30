import { apiRequest, buildUrl } from '@/services/api/apiClient';

export interface PaymentRequest {
  supplierId: string;
  invoiceId: string;
  action: 'pay' | 'partial';
  amount?: number;
  paymentMethod?: string;
  paymentDate?: string;
  notes?: string;
  creditInvoiceId?: string;
  creditAmountUsed?: number;
}

export interface PaymentResponse {
  success: boolean;
  message?: string;
  invoiceId?: string;
  newStatus?: string;
  paidAmount?: number;
  remainingAmount?: number;
}

export interface PaymentErrorResponse {
  error: string;
  details?: string[];
}

export class PaymentError extends Error {
  details: string[];

  constructor(message: string, details: string[] = []) {
    super(message);
    this.name = 'PaymentError';
    this.details = details;
  }
}

const UPDATE_PAYMENT_STATUS_PATH = import.meta.env.VITE_UPDATE_PAYMENT_STATUS_PATH ?? 'updatePaymentStatus';

export const updatePaymentStatus = async (payload: PaymentRequest): Promise<PaymentResponse> => {
  try {
    return await apiRequest<PaymentResponse>(buildUrl(UPDATE_PAYMENT_STATUS_PATH), 'POST', payload);
  } catch (error: any) {
    throw new PaymentError(
      error.message ?? 'Αποτυχία καταχώρησης πληρωμής',
      error.details ?? []
    );
  }
};
