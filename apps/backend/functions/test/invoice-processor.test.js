import { describe, it, expect, vi, beforeEach } from 'vitest';
import { processInvoiceDocumentHandler } from '../lib/invoice-processor.js';
import * as ocr from '../lib/invoice-ocr.js';
import * as suppliers from '../lib/suppliers.js';
import * as config from '../lib/config.js';
import * as invoicePdf from '../lib/invoice-pdf.js';

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
  let mockInvoiceSet;
  let mockStorageFiles;
  let mockBucketFile;

  beforeEach(() => {
    vi.clearAllMocks();

    mockInvoiceSet = vi.fn().mockResolvedValue();
    config.db.doc.mockReturnValue({
      set: mockInvoiceSet,
      path: 'businesses/bus1/invoices/inv1',
    });

    mockStorageFiles = new Map();
    mockBucketFile = vi.fn((objectName) => {
      if (!mockStorageFiles.has(objectName)) {
        mockStorageFiles.set(objectName, {
          copy: vi.fn().mockResolvedValue(),
          save: vi.fn().mockResolvedValue(),
          delete: vi.fn().mockResolvedValue(),
        });
      }
      return mockStorageFiles.get(objectName);
    });
    config.storage.bucket.mockReturnValue({ file: mockBucketFile });

    config.db.collection.mockImplementation(() => ({
      doc: vi.fn(() => ({
        collection: vi.fn(() => ({
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          get: vi.fn().mockResolvedValue({ empty: true }),
          add: vi.fn(() => Promise.resolve({ id: 'new-doc-id' })),
        })),
      })),
    }));

    ocr.runInvoiceOcr.mockResolvedValue({
      supplierName: 'Test Supplier',
      supplierTaxNumber: '123456789',
      invoiceNumber: 'INV-001',
      invoiceDate: '2023-09-15',
      totalAmount: 100,
    });
  });

  function createEvent(ref = { update: vi.fn().mockResolvedValue() }) {
    return {
      params: { businessId: 'bus1', invoiceId: 'inv1' },
      data: {
        before: { exists: false },
        after: {
          exists: true,
          ref,
          data: () => ({ status: 'ready' }),
        },
      },
    };
  }

  function mockReadyInvoice(invoiceData) {
    config.db.runTransaction.mockImplementation(async (callback) => {
      const tx = {
        get: vi.fn().mockResolvedValue({
          data: () => ({
            status: 'ready',
            bucket: 'test-bucket',
            ...invoiceData,
          }),
        }),
        update: vi.fn(),
      };
      return await callback(tx);
    });
  }

  it('sets settlementDate to invoiceDate when isPaidAtUpload is true', async () => {
    const mockRef = { update: vi.fn() };
    const event = createEvent(mockRef);
    mockReadyInvoice({
      pages: [{ pageNumber: 1, objectName: 'test.pdf', contentType: 'application/pdf' }],
      isPaidAtUpload: true,
    });

    await processInvoiceDocumentHandler(event);

    expect(mockInvoiceSet).toHaveBeenCalled();
    const payload = mockInvoiceSet.mock.calls[0][0];

    expect(payload.paymentStatus).toBe('paid');
    expect(payload.paidAmount).toBe(100);
    expect(payload.unpaidAmount).toBe(0);
    expect(payload.settlementDate).toBeDefined();
    expect(payload.paymentHistory).toBeDefined();
    expect(payload.paymentHistory[0].paymentDate).toBeDefined();
  });

  it('copies a single uploaded PDF to permanent storage and deletes the staging object after success', async () => {
    const mockRef = { update: vi.fn().mockResolvedValue() };
    const sourcePath = 'businesses/bus1/uploads/inv1/page-001-file.pdf';
    const finalPath = 'businesses/bus1/invoices/inv1.pdf';
    mockReadyInvoice({
      pages: [{ pageNumber: 1, objectName: sourcePath, contentType: 'application/pdf' }],
    });

    await processInvoiceDocumentHandler(createEvent(mockRef));

    expect(mockStorageFiles.get(sourcePath).copy).toHaveBeenCalledWith(mockStorageFiles.get(finalPath));
    expect(mockRef.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'done' }));
    expect(mockStorageFiles.get(sourcePath).delete).toHaveBeenCalledWith({ ignoreNotFound: true });
    expect(mockInvoiceSet.mock.calls[0][0]).not.toHaveProperty('rawFilePaths');
  });

  it('saves a combined PDF for image uploads and deletes all staging objects after success', async () => {
    const mockRef = { update: vi.fn().mockResolvedValue() };
    const pageOne = 'businesses/bus1/uploads/inv1/page-001-file.jpg';
    const pageTwo = 'businesses/bus1/uploads/inv1/page-002-file.jpg';
    const finalPath = 'businesses/bus1/invoices/inv1.pdf';
    mockReadyInvoice({
      pages: [
        { pageNumber: 1, objectName: pageOne, contentType: 'image/jpeg' },
        { pageNumber: 2, objectName: pageTwo, contentType: 'image/jpeg' },
      ],
    });

    await processInvoiceDocumentHandler(createEvent(mockRef));

    expect(invoicePdf.buildCombinedPdfFromPages).toHaveBeenCalledWith(
      [
        { pageNumber: 1, objectName: pageOne, contentType: 'image/jpeg' },
        { pageNumber: 2, objectName: pageTwo, contentType: 'image/jpeg' },
      ],
      'test-bucket'
    );
    expect(mockStorageFiles.get(finalPath).save).toHaveBeenCalledWith(
      Buffer.from('test'),
      expect.objectContaining({ contentType: 'application/pdf' })
    );
    expect(mockStorageFiles.get(pageOne).delete).toHaveBeenCalledWith({ ignoreNotFound: true });
    expect(mockStorageFiles.get(pageTwo).delete).toHaveBeenCalledWith({ ignoreNotFound: true });
  });

  it('completes the invoice when staging cleanup fails', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const mockRef = { update: vi.fn().mockResolvedValue() };
    const sourcePath = 'businesses/bus1/uploads/inv1/page-001-file.pdf';
    mockReadyInvoice({
      pages: [{ pageNumber: 1, objectName: sourcePath, contentType: 'application/pdf' }],
    });
    mockStorageFiles.set(sourcePath, {
      copy: vi.fn().mockResolvedValue(),
      save: vi.fn().mockResolvedValue(),
      delete: vi.fn().mockRejectedValue(new Error('delete failed')),
    });

    await processInvoiceDocumentHandler(createEvent(mockRef));

    expect(mockRef.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'done' }));
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to clean up 1 uploaded page file(s) for invoice inv1'),
      expect.any(Array)
    );
    warnSpy.mockRestore();
  });

  it('does not delete staging files when the upload is a duplicate', async () => {
    const mockRef = { update: vi.fn().mockResolvedValue() };
    const sourcePath = 'businesses/bus1/uploads/inv1/page-001-file.pdf';
    const sourceFile = mockBucketFile(sourcePath);
    mockBucketFile.mockClear();
    mockReadyInvoice({
      pages: [{ pageNumber: 1, objectName: sourcePath, contentType: 'application/pdf' }],
    });

    config.db.collection.mockImplementation(() => ({
      doc: vi.fn(() => ({
        collection: vi.fn(() => ({
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          get: vi.fn().mockResolvedValue({
            empty: false,
            docs: [{ id: 'existing-invoice' }],
          }),
        })),
      })),
    }));

    await processInvoiceDocumentHandler(createEvent(mockRef));

    expect(sourceFile.delete).not.toHaveBeenCalled();
    expect(mockInvoiceSet).not.toHaveBeenCalled();
  });
});
