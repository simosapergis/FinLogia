import type { ExportInvoice } from '@/composables/useFirestore';

export interface MonthOption {
  label: string;
  value: string;
}

export interface SupplierGroup {
  supplierId: string;
  supplierName: string;
  invoices: ExportInvoice[];
}

export interface ApplyMonthResult {
  startDate: string;
  endDate: string;
}

const MONTH_LABELS = [
  'Ιανουάριος', 'Φεβρουάριος', 'Μάρτιος', 'Απρίλιος',
  'Μάιος', 'Ιούνιος', 'Ιούλιος', 'Αύγουστος',
  'Σεπτέμβριος', 'Οκτώβριος', 'Νοέμβριος', 'Δεκέμβριος',
];

/**
 * Returns month dropdown options from January up to and including the month of `today`.
 */
export const getAvailableMonths = (today: Date): MonthOption[] => {
  const currentMonth = today.getMonth(); // 0-based
  const currentYear = today.getFullYear();
  return MONTH_LABELS.slice(0, currentMonth + 1).map((label, index) => ({
    label,
    value: `${currentYear}-${String(index + 1).padStart(2, '0')}`,
  }));
};

/** Formats a local Date as YYYY-MM-DD without UTC conversion. */
const toLocalDateStr = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

/**
 * Given a month value like "2026-02", returns the start and end date strings (YYYY-MM-DD).
 * The end date is capped to `today` if the month includes the current date.
 */
export const applyMonth = (monthValue: string, today: Date): ApplyMonthResult => {
  const [year, month] = monthValue.split('-').map(Number);
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);

  const cappedEnd = lastDay > today ? today : lastDay;

  return {
    startDate: toLocalDateStr(firstDay),
    endDate: toLocalDateStr(cappedEnd),
  };
};

/**
 * Groups invoices by supplier and sorts groups alphabetically by supplier name.
 */
export const groupBySupplier = (invoices: ExportInvoice[]): SupplierGroup[] => {
  const groups: Record<string, SupplierGroup> = {};

  for (const invoice of invoices) {
    const sid = invoice.supplierId;
    if (!groups[sid]) {
      groups[sid] = {
        supplierId: sid,
        supplierName: invoice.supplierName || sid,
        invoices: [],
      };
    }
    groups[sid].invoices.push(invoice);
  }

  return Object.values(groups).sort((a, b) => a.supplierName.localeCompare(b.supplierName, 'el'));
};

/**
 * Builds a composite key "supplierId/invoiceId" for selection tracking.
 */
export const compositeKey = (invoice: Pick<ExportInvoice, 'supplierId' | 'id'>): string => {
  return `${invoice.supplierId}/${invoice.id}`;
};
