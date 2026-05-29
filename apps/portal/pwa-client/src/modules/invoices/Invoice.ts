export interface InvoiceItem {
  invoiceId: string;
  supplierId: string;
  supplierName: string;
  invoiceNumber: string | null;
  invoiceDate: string | { _seconds: number };
  uploadedAt?: string | { _seconds: number };
  totalAmount: number | null;
  isCredit?: boolean;
  filePath: string | null;
  bucket: string | null;
  downloadedBy: Record<string, unknown>;
  viewedBy: Record<string, ViewEntry>;
  auditStatus?: 'registered' | 'denied' | null;
}

export interface ViewEntry {
  name: string;
  firstViewedAt: unknown;
  lastViewedAt: unknown;
  viewCount: number;
}

export interface SupplierGroup {
  supplierId: string;
  supplierName: string;
  invoices: InvoiceItem[];
}

export interface InvoiceDetail extends InvoiceItem {
  ocrText?: string;
  unpaidAmount?: number;
  paidAmount?: number;
  paymentStatus?: 'paid' | 'unpaid' | 'partially_paid';
  paymentHistory?: {
    amount: number;
    paymentDate: string | { _seconds: number } | Date;
    notes?: string;
    creditInvoiceId?: string;
    creditAmountUsed?: number;
  }[];
  [key: string]: unknown;
}
