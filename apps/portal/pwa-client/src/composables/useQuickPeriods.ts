import { toLocalDateStr } from '@/utils/date';

export interface QuickPeriod {
  label: string;
  key: string;
}

export const QUICK_PERIODS: QuickPeriod[] = [
  { label: 'Σήμερα', key: 'today' },
  { label: 'Χθες', key: 'yesterday' },
  { label: 'Εβδομάδα', key: 'week' },
  { label: 'Μήνας', key: 'month' },
  { label: 'Τρίμηνο', key: 'quarter' },
  { label: 'Έτος', key: 'year' },
];

export interface DateRange {
  startDate: string;
  endDate: string;
}

/**
 * Returns the date range for a quick period key.
 * - today: today → today
 * - yesterday: yesterday → yesterday
 * - week: last Sunday → today
 * - month: 1st of current month → today
 * - quarter: 1st of 3 months ago → today
 * - year: 1 January of current year → today
 */
export function getDateRangeForPeriod(key: string): DateRange {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let start: Date;
  const end = new Date(today);

  switch (key) {
    case 'today':
      start = new Date(today);
      break;
    case 'yesterday': {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      start = yesterday;
      end.setTime(yesterday.getTime()); // Set end date to yesterday as well
      break;
    }
    case 'week': {
      // From last Sunday until today (Sunday = 0 in getDay())
      const dayOfWeek = today.getDay();
      start = new Date(today);
      start.setDate(start.getDate() - dayOfWeek);
      break;
    }
    case 'month':
      // 1st of current month until today
      start = new Date(today.getFullYear(), today.getMonth(), 1);
      break;
    case 'quarter':
      // 1st of 3 months ago until today
      start = new Date(today.getFullYear(), today.getMonth() - 3, 1);
      break;
    case 'year':
      // 1 January of current year until today
      start = new Date(today.getFullYear(), 0, 1);
      break;
    default:
      start = new Date(today);
  }

  return {
    startDate: toLocalDateStr(start),
    endDate: toLocalDateStr(end),
  };
}
