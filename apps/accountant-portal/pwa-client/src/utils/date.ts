const currencyFormatter = new Intl.NumberFormat('el-GR', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
});

export function formatCurrency(amount: number | null | undefined): string {
  if (amount == null) return '—';
  return currencyFormatter.format(amount);
}

export function formatDate(date: Date | string | { toDate: () => Date } | null): string {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : 'toDate' in date ? date.toDate() : date;
  return d.toLocaleDateString('el-GR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

export function getMonthOptions(): { value: string; label: string }[] {
  const months: { value: string; label: string }[] = [];
  const today = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('el-GR', { year: 'numeric', month: 'long' });
    months.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) });
  }
  return months;
}

export function getMonthRange(monthValue: string): { startDate: string; endDate: string } {
  const [year, month] = monthValue.split('-').map(Number);
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);
  return {
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0],
  };
}

export function toLocalDateStr(date: Date): string {
  const offset = date.getTimezoneOffset() * 60000;
  const localDate = new Date(date.getTime() - offset);
  return localDate.toISOString().split('T')[0];
}
