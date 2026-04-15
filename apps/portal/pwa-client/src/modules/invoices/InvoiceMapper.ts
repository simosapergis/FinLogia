export type InvoiceStatus = 'pending' | 'processing' | 'uploaded' | 'completed' | 'failed';

export interface InvoiceQuality {
  score: number;
  accepted: boolean;
  reasons: string[];
}

export interface Invoice {
  id: string;
  invoiceId?: string;
  supplierId?: string;
  supplierName: string;
  supplierTaxNumber?: string;
  supplierNameNormalized?: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  dueDate?: string;
  totalAmount?: number;
  unpaidAmount?: number;
  paidAmount?: number;
  netAmount?: number;
  vatAmount?: number;
  vatRate?: number;
  isCredit?: boolean;
  currency: string;
  status: InvoiceStatus;
  paymentStatus?: 'paid' | 'unpaid' | 'partially_paid';
  settlementDate?: string | { seconds: number };
  paymentHistory?: {
    amount: number;
    paymentDate: string | { seconds: number };
    paymentMethod?: string;
    notes?: string;
    creditInvoiceId?: string;
    creditAmountUsed?: number;
  }[];
  statusMessage?: string;
  errorMessage?: string | null;
  confidence?: number | null;
  uploadedAt: string;
  createdAt?: string;
  processedAt?: string;
  uploadedBy?: string;
  uploadedByName?: string;
  bucket?: string;
  rawFilePaths?: string[];
  filePath?: string;
  fileUrl?: string;
  quality: InvoiceQuality;
}

