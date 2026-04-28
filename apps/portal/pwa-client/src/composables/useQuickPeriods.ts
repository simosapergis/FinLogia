import { toLocalDateStr } from '@/utils/date';

export interface QuickPeriod {
  label: string;
  key: string;
}

export const QUICK_PERIODS: QuickPeriod[] = [
  { label: 'Σήμερα', key: 'today' },
  { label: 'Χθες', key: 'yesterday' },
  { label: 'Α\' Τρίμ.', key: 'q1' },
  { label: 'Β\' Τρίμ.', key: 'q2' },
  { label: 'Γ\' Τρίμ.', key: 'q3' },
  { label: 'Δ\' Τρίμ.', key: 'q4' },
];

export interface DateRange {
  startDate: string;
  endDate: string;
}

/**
 * Returns the date range for a quick period key.
 * - today: today → today
 * - yesterday: yesterday → yesterday
 * - q1: 1 January → 31 March
 * - q2: 1 April → 30 June
 * - q3: 1 July → 30 September
 * - q4: 1 October → 31 December
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
    case 'q1':
      start = new Date(today.getFullYear(), 0, 1);
      end.setTime(new Date(today.getFullYear(), 2, 31).getTime());
      break;
    case 'q2':
      start = new Date(today.getFullYear(), 3, 1);
      end.setTime(new Date(today.getFullYear(), 5, 30).getTime());
      break;
    case 'q3':
      start = new Date(today.getFullYear(), 6, 1);
      end.setTime(new Date(today.getFullYear(), 8, 30).getTime());
      break;
    case 'q4':
      start = new Date(today.getFullYear(), 9, 1);
      end.setTime(new Date(today.getFullYear(), 11, 31).getTime());
      break;
    default:
      start = new Date(today);
  }

  return {
    startDate: toLocalDateStr(start),
    endDate: toLocalDateStr(end),
  };
}
