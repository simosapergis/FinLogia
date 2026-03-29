import { describe, it, expect } from 'vitest';
import {
  getAvailableMonths,
  applyMonth,
  groupBySupplier,
  compositeKey,
} from '../exportInvoicesHelpers';
import type { ExportInvoice } from '@/composables/useFirestore';

const makeInvoice = (overrides: Partial<ExportInvoice> & { supplierId: string; id: string }): ExportInvoice => ({
  supplierName: 'Test Supplier',
  currency: '€',
  status: 'completed',
  uploadedAt: '2026-01-10',
  quality: { score: 100, accepted: true, reasons: [] },
  downloadedBy: {},
  ...overrides,
});

describe('getAvailableMonths', () => {
  it('returns only January when today is in January', () => {
    const today = new Date(2026, 0, 15); // January 15
    const months = getAvailableMonths(today);
    expect(months).toHaveLength(1);
    expect(months[0].label).toBe('Ιανουάριος');
    expect(months[0].value).toBe('2026-01');
  });

  it('returns 6 months when today is in June', () => {
    const today = new Date(2026, 5, 1); // June 1
    const months = getAvailableMonths(today);
    expect(months).toHaveLength(6);
    expect(months[0].value).toBe('2026-01');
    expect(months[5].value).toBe('2026-06');
  });

  it('returns all 12 months when today is in December', () => {
    const today = new Date(2026, 11, 31); // December 31
    const months = getAvailableMonths(today);
    expect(months).toHaveLength(12);
    expect(months[11].label).toBe('Δεκέμβριος');
    expect(months[11].value).toBe('2026-12');
  });

  it('uses the correct year', () => {
    const today = new Date(2027, 2, 10); // March 2027
    const months = getAvailableMonths(today);
    expect(months[0].value).toBe('2027-01');
  });
});

describe('applyMonth', () => {
  it('returns first and last day of a past month', () => {
    const today = new Date(2026, 5, 15); // June 15
    const result = applyMonth('2026-03', today); // March
    expect(result.startDate).toBe('2026-03-01');
    expect(result.endDate).toBe('2026-03-31');
  });

  it('caps end date to today for the current month', () => {
    const today = new Date(2026, 1, 13); // February 13
    const result = applyMonth('2026-02', today);
    expect(result.startDate).toBe('2026-02-01');
    expect(result.endDate).toBe('2026-02-13');
  });

  it('handles a month with 28 days (Feb non-leap)', () => {
    const today = new Date(2026, 5, 1); // June (past Feb)
    const result = applyMonth('2026-02', today);
    expect(result.endDate).toBe('2026-02-28');
  });

  it('handles a month with 31 days', () => {
    const today = new Date(2026, 5, 1);
    const result = applyMonth('2026-01', today);
    expect(result.startDate).toBe('2026-01-01');
    expect(result.endDate).toBe('2026-01-31');
  });
});

describe('groupBySupplier', () => {
  it('returns empty array for empty input', () => {
    expect(groupBySupplier([])).toEqual([]);
  });

  it('groups invoices by supplierId', () => {
    const invoices: ExportInvoice[] = [
      makeInvoice({ id: 'inv-1', supplierId: 'sup-a', supplierName: 'Alpha' }),
      makeInvoice({ id: 'inv-2', supplierId: 'sup-b', supplierName: 'Beta' }),
      makeInvoice({ id: 'inv-3', supplierId: 'sup-a', supplierName: 'Alpha' }),
    ];
    const groups = groupBySupplier(invoices);
    expect(groups).toHaveLength(2);
    expect(groups[0].supplierName).toBe('Alpha');
    expect(groups[0].invoices).toHaveLength(2);
    expect(groups[1].supplierName).toBe('Beta');
    expect(groups[1].invoices).toHaveLength(1);
  });

  it('sorts groups alphabetically by supplier name (Greek locale)', () => {
    const invoices: ExportInvoice[] = [
      makeInvoice({ id: 'inv-1', supplierId: 'sup-z', supplierName: 'Ωμέγα' }),
      makeInvoice({ id: 'inv-2', supplierId: 'sup-a', supplierName: 'Άλφα' }),
    ];
    const groups = groupBySupplier(invoices);
    expect(groups[0].supplierName).toBe('Άλφα');
    expect(groups[1].supplierName).toBe('Ωμέγα');
  });

  it('uses supplierId as fallback name when supplierName is empty', () => {
    const invoices: ExportInvoice[] = [
      makeInvoice({ id: 'inv-1', supplierId: 'sup-x', supplierName: '' }),
    ];
    const groups = groupBySupplier(invoices);
    expect(groups[0].supplierName).toBe('sup-x');
  });
});

describe('compositeKey', () => {
  it('builds correct key from supplierId and id', () => {
    expect(compositeKey({ supplierId: 'sup-a', id: 'inv-1' })).toBe('sup-a/inv-1');
  });

  it('handles special characters', () => {
    expect(compositeKey({ supplierId: 'a/b', id: 'c' })).toBe('a/b/c');
  });
});
