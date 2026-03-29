import { describe, it, expect } from 'vitest';
import { validateExportRequest, sanitizeZipEntryName } from '../lib/invoice-export.js';

describe('invoice-export', () => {
  describe('validateExportRequest', () => {
    it('rejects missing clientProjectId', () => {
      const errors = validateExportRequest({ invoices: [{ supplierId: 'a', invoiceId: 'b' }] });
      expect(errors).toContain('clientProjectId is required and must be a string');
    });

    it('rejects missing invoices', () => {
      const errors = validateExportRequest({ clientProjectId: 'proj' });
      expect(errors).toContain('invoices is required and must be an array');
    });

    it('rejects empty invoices array', () => {
      const errors = validateExportRequest({ clientProjectId: 'proj', invoices: [] });
      expect(errors).toContain('invoices must contain at least one entry');
    });

    it('rejects invoices exceeding limit', () => {
      const invoices = Array.from({ length: 501 }, (_, i) => ({
        supplierId: `s${i}`,
        invoiceId: `i${i}`,
      }));
      const errors = validateExportRequest({ clientProjectId: 'proj', invoices });
      expect(errors.some((e) => e.includes('must not exceed'))).toBe(true);
    });

    it('validates individual invoice entries', () => {
      const errors = validateExportRequest({
        clientProjectId: 'proj',
        invoices: [{ supplierId: 'a' }],
      });
      expect(errors.some((e) => e.includes('invoiceId'))).toBe(true);
    });

    it('returns no errors for valid request', () => {
      const errors = validateExportRequest({
        clientProjectId: 'proj',
        invoices: [{ supplierId: 'a', invoiceId: 'b' }],
      });
      expect(errors).toEqual([]);
    });
  });

  describe('sanitizeZipEntryName', () => {
    it('uses supplierName and invoiceNumber', () => {
      const name = sanitizeZipEntryName({
        supplierName: 'ΑΒΓΔ Supplies',
        invoiceNumber: 'INV-001',
      });
      expect(name).toContain('ΑΒΓΔ');
      expect(name).toContain('INV-001');
      expect(name).toMatch(/\.pdf$/);
    });

    it('falls back to invoiceId when no other fields', () => {
      const name = sanitizeZipEntryName({ invoiceId: 'abc123' });
      expect(name).toBe('abc123.pdf');
    });

    it('sanitizes special characters', () => {
      const name = sanitizeZipEntryName({
        supplierName: 'Test/Supplier@#$',
        invoiceNumber: '123',
      });
      expect(name).not.toContain('/');
      expect(name).not.toContain('@');
    });
  });
});
