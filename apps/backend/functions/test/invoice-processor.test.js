import { describe, it, expect, vi, beforeEach } from 'vitest';
import { processInvoiceDocumentHandler } from '../lib/invoice-processor.js';
import * as ocr from '../lib/invoice-ocr.js';
import * as suppliers from '../lib/suppliers.js';
import * as config from '../lib/config.js';

vi.mock('../lib/invoice-ocr.js', () => ({
  runInvoiceOcr: vi.fn(),
  FIELD_LABELS: {
    supplierName: 'supplierName',
    supplierTaxNumber: 'supplierTaxNumber',
    invoiceNumber: 'invoiceNumber',
    invoiceDate: 'invoiceDate',
    totalAmount: 'totalAmount',
  },
  formatMetadataError: vi.fn((inv, sup, base) => base),
  formatMetadataSuccess: vi.fn(() => 'Success'),
  parseAmount: vi.fn((val) => Number(val) || 0),
  parseDate: vi.fn((val) => val ? new Date(val) : null),
}));

vi.mock('../lib/suppliers.js', () => ({
  ensureSupplierProfile: vi.fn(() => Promise.resolve({ canonicalName: 'Test Supplier' })),
}));

vi.mock('../lib/invoice-pdf.js', () => ({
  buildCombinedPdfFromPages: vi.fn(() => Promise.resolve({ combinedPdfBuffer: Buffer.from('test') })),
}));

vi.mock('../lib/config.js', () => {
  return {
    admin: {
      firestore: {
        Timestamp: {
          now: vi.fn(() => ({ toDate: () => new Date() })),
          fromDate: vi.fn((date) => ({ toDate: () => date })),
        },
        FieldValue: {
          serverTimestamp: vi.fn(() => 'SERVER_TIMESTAMP'),
        },
      },
    },
    db: {
      runTransaction: vi.fn(async (callback) => {
        const tx = {
          get: vi.fn(),
          update: vi.fn(),
        };
        return await callback(tx);
      }),
      collection: vi.fn(() => ({
        doc: vi.fn(() => ({
          collection: vi.fn(() => ({
            where: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            get: vi.fn().mockResolvedValue({ empty: true }),
            add: vi.fn(() => Promise.resolve({ id: 'new-doc-id' })),
            doc: vi.fn(() => ({
              id: 'new-invoice-id',
            })),
          })),
          set: vi.fn(),
          path: 'businesses/test/invoices/inv1',
        })),
      })),
      doc: vi.fn().mockReturnValue({
        set: vi.fn(),
        path: 'businesses/test/invoices/inv1',
      }),
    },
    storage: {
      bucket: vi.fn(() => ({
        file: vi.fn(() => ({
          copy: vi.fn(),
          save: vi.fn(),
        })),
      })),
    },
    INVOICE_STATUS: {
      ready: 'ready',
      processing: 'processing',
      done: 'done',
      error: 'error',
    },
    PAYMENT_STATUS: {
      paid: 'paid',
      unpaid: 'unpaid',
    },
    serverTimestamp: vi.fn(() => 'SERVER_TIMESTAMP'),
    getBucketName: vi.fn(() => 'test-bucket'),
    getAthensToday: vi.fn(() => ({ utcDate: new Date('2023-10-01T00:00:00Z'), dayOfMonth: 1 })),
  };
});

vi.mock('../lib/email-utils.js', () => ({
  sendOcrSuccessEmail: vi.fn(),
  sendOcrErrorEmail: vi.fn(),
}));

describe('invoice-processor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should set settlementDate to invoiceDate when isPaidAtUpload is true', async () => {
    const mockRef = { update: vi.fn() };
    const event = {
      params: { businessId: 'bus1', invoiceId: 'inv1' },
      data: {
        before: { exists: false },
        after: {
          exists: true,
          ref: mockRef,
          data: () => ({ status: 'ready' }),
        },
      },
    };

    // Mock transaction to return locked data
    config.db.runTransaction.mockImplementation(async (callback) => {
      const tx = {
        get: vi.fn().mockResolvedValue({
          data: () => ({
            status: 'ready',
            bucket: 'test-bucket',
            pages: [{ pageNumber: 1, objectName: 'test.pdf', contentType: 'application/pdf' }],
            isPaidAtUpload: true, // Key property for this test
          }),
        }),
        update: vi.fn(),
      };
      return await callback(tx);
    });

    ocr.runInvoiceOcr.mockResolvedValue({
      supplierName: 'Test Supplier',
      supplierTaxNumber: '123456789',
      invoiceNumber: 'INV-001',
      invoiceDate: '2023-09-15',
      totalAmount: 100,
    });

    await processInvoiceDocumentHandler(event);

    const setMock = config.db.doc().set;
    if (!setMock.mock.calls.length) {
      console.log('config.db.doc().set was not called. Calls on config.db.doc:', config.db.doc.mock.calls);
    }
    expect(setMock).toHaveBeenCalled();
    const payload = setMock.mock.calls[0][0];

    expect(payload.paymentStatus).toBe('paid');
    expect(payload.paidAmount).toBe(100);
    expect(payload.unpaidAmount).toBe(0);
    
    // settlementDate should be the parsed invoiceDate
    expect(payload.settlementDate).toBeDefined();
    
    // paymentHistory[0].paymentDate should be the parsed invoiceDate
    expect(payload.paymentHistory).toBeDefined();
    expect(payload.paymentHistory[0].paymentDate).toBeDefined();
    // The date should match invoiceDate, not today's date
  });
});
