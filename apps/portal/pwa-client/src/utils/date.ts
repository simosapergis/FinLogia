/**
 * Formats a number as currency in Greek locale (el-GR)
 * Uses comma as decimal separator, period as thousands separator
 * Example: 1234.56 -> "1.234,56"
 */
export const formatCurrency = (value?: number | null, includeCurrencySymbol = false): string => {
  const amount = value ?? 0;
  const formatted = new Intl.NumberFormat('el-GR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  
  return includeCurrencySymbol ? `€ ${formatted}` : formatted;
};

export const formatDate = (value?: string | Date | { seconds: number }) => {
  if (!value) return 'Unknown';

  const date = typeof value === 'object' && 'seconds' in value
    ? new Date(value.seconds * 1000)
    : typeof value === 'string' ? new Date(value) : value;

  return new Intl.DateTimeFormat('el-GR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
};

export const formatDateTime = (value?: string | Date | { seconds: number }) => {
  if (!value) return 'Unknown';

  if (typeof value === 'object' && 'seconds' in value) {
    return new Date(value.seconds * 1000).toLocaleString("el-GR", {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  }

  const date = typeof value === 'string' ? new Date(value) : value;
  return new Intl.DateTimeFormat('el-GR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

/** Formats a Date as YYYY-MM-DD in local timezone (for date inputs) */
export const toLocalDateStr = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

/**
 * Parses a date input into a Date object
 */
const parseDate = (dateInput: string | Date | { seconds: number }): Date => {
  if (typeof dateInput === 'object' && 'seconds' in dateInput) {
    return new Date(dateInput.seconds * 1000);
  }
  return typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
};

/** Number of days threshold for showing expiry warning */
export const INVOICE_EXPIRY_DAYS = parseInt(import.meta.env.VITE_INVOICE_EXPIRY_DAYS, 10) || 30;


/**
 * Gets the number of days remaining until the end of the invoice's month.
 * Returns null if no date provided.
 * Returns negative value if already past the invoice month (expired).
 * @param invoiceDate - The date of the invoice (string, Date, or Firestore timestamp)
 * @returns Number of days until end of invoice month (negative if expired)
 */
export const getDaysUntilExpiry = (invoiceDate?: string | Date | { seconds: number }): number | null => {
  if (!invoiceDate) return null;

  const date = parseDate(invoiceDate);
  const today = new Date();
  
  // Get the last day of the invoice's month
  const invoiceYear = date.getFullYear();
  const invoiceMonth = date.getMonth();
  const endOfMonth = new Date(invoiceYear, invoiceMonth + 1, 0, 23, 59, 59, 999);
  
  // Calculate difference in days
  const diffTime = endOfMonth.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
};

