import { getAuthToken, buildUrl } from '@/services/api/apiClient';

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
  const token = await getAuthToken();

  const response = await fetch(buildUrl(UPDATE_PAYMENT_STATUS_PATH), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData: PaymentErrorResponse = await response.json().catch(() => ({
      error: 'Αποτυχία καταχώρησης πληρωμής',
    }));
    throw new PaymentError(
      errorData.error ?? 'Αποτυχία καταχώρησης πληρωμής',
      errorData.details ?? []
    );
  }

  return response.json();
};
