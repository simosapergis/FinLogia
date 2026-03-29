import { describe, it, expect } from 'vitest';
import {
  validateGetInvoicesRequest,
  validateViewInvoiceRequest,
  validateSignedUrlRequest,
} from '../lib/invoices.js';

describe('invoices', () => {
  describe('validateGetInvoicesRequest', () => {
    it('returns errors for empty body', () => {
      const errors = validateGetInvoicesRequest({});
      expect(errors.length).toBeGreaterThan(0);
      expect(errors).toContain('clientProjectId is required and must be a string');
      expect(errors).toContain('startDate is required (YYYY-MM-DD)');
      expect(errors).toContain('endDate is required (YYYY-MM-DD)');
    });

    it('returns no errors for valid body', () => {
      const errors = validateGetInvoicesRequest({
        clientProjectId: 'finlogia-demo',
        startDate: '2025-01-01',
        endDate: '2025-01-31',
      });
      expect(errors).toEqual([]);
    });

    it('rejects startDate after endDate', () => {
      const errors = validateGetInvoicesRequest({
        clientProjectId: 'finlogia-demo',
        startDate: '2025-02-01',
        endDate: '2025-01-01',
      });
      expect(errors).toContain('startDate must not be after endDate');
    });
  });

  describe('validateViewInvoiceRequest', () => {
    it('returns errors for empty body', () => {
      const errors = validateViewInvoiceRequest({});
      expect(errors.length).toBe(3);
    });

    it('returns no errors for valid body', () => {
      const errors = validateViewInvoiceRequest({
        clientProjectId: 'finlogia-demo',
        supplierId: 'supplier-1',
        invoiceId: 'inv-001',
      });
      expect(errors).toEqual([]);
    });
  });

  describe('validateSignedUrlRequest', () => {
    it('returns errors for empty body', () => {
      const errors = validateSignedUrlRequest({});
      expect(errors.length).toBe(3);
    });

    it('returns no errors for valid body', () => {
      const errors = validateSignedUrlRequest({
        clientProjectId: 'finlogia-demo',
        filePath: 'suppliers/abc/invoices/inv.pdf',
        bucketName: 'finlogia-demo.appspot.com',
      });
      expect(errors).toEqual([]);
    });
  });
});
