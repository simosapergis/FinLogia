import { toLocalDateStr } from '@/utils/date';

export interface QuickPeriod {
  label: string;
  key: string;
}

export const QUICK_PERIODS: QuickPeriod[] = [
  { label: 'Τρέχον Μήνας', key: 'current_month' },
  { label: 'Τρέχον Τρίμηνο', key: 'current_quarter' },
  { label: 'Τρέχον Εξάμηνο', key: 'current_semester' },
  { label: 'Τρέχον Έτος', key: 'current_year' },
];

export interface DateRange {
  startDate: string;
  endDate: string;
}

export function getDateRangeForPeriod(key: string): DateRange {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let start: Date;
  const end = new Date(today);

  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();

  switch (key) {
    case 'current_month':
      start = new Date(currentYear, currentMonth, 1);
      break;
    case 'current_quarter': {
      const quarterStartMonth = Math.floor(currentMonth / 3) * 3;
      start = new Date(currentYear, quarterStartMonth, 1);
      break;
    }
    case 'current_semester': {
      const semesterStartMonth = Math.floor(currentMonth / 6) * 6;
      start = new Date(currentYear, semesterStartMonth, 1);
      break;
    }
    case 'current_year':
      start = new Date(currentYear, 0, 1);
      break;
    default:
      start = new Date(today);
  }

  return {
    startDate: toLocalDateStr(start),
    endDate: toLocalDateStr(end),
  };
}
