import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { QUICK_PERIODS, getDateRangeForPeriod } from '../useQuickPeriods';

describe('useQuickPeriods', () => {
  beforeEach(() => {
    // Set system time to a fixed date: May 15, 2026, 12:00:00 local time
    // We use a specific date so we can reliably test 'today', 'yesterday', and quarters
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 4, 15, 12, 0, 0)); // Month is 0-indexed (4 = May)
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('QUICK_PERIODS', () => {
    it('should contain the expected quick period options', () => {
      expect(QUICK_PERIODS).toEqual([
        { label: 'Σήμερα', key: 'today' },
        { label: 'Χθες', key: 'yesterday' },
        { label: 'Τρέχων Μήνας', key: 'current_month' },
        { label: 'Τρέχον Έτος', key: 'current_year' },
        { label: 'Α\' Τρίμ.', key: 'q1' },
        { label: 'Β\' Τρίμ.', key: 'q2' },
        { label: 'Γ\' Τρίμ.', key: 'q3' },
        { label: 'Δ\' Τρίμ.', key: 'q4' },
      ]);
    });
  });

  describe('getDateRangeForPeriod', () => {
    it('should return correct range for "today"', () => {
      const range = getDateRangeForPeriod('today');
      expect(range).toEqual({
        startDate: '2026-05-15',
        endDate: '2026-05-15',
      });
    });

    it('should return correct range for "yesterday"', () => {
      const range = getDateRangeForPeriod('yesterday');
      expect(range).toEqual({
        startDate: '2026-05-14',
        endDate: '2026-05-14',
      });
    });

    it('should correctly handle "yesterday" on the 1st of the month', () => {
      // Set to May 1st
      vi.setSystemTime(new Date(2026, 4, 1, 12, 0, 0));
      const range = getDateRangeForPeriod('yesterday');
      expect(range).toEqual({
        startDate: '2026-04-30',
        endDate: '2026-04-30',
      });
    });

    it('should correctly handle "yesterday" on Jan 1st (year boundary)', () => {
      // Set to Jan 1st, 2026
      vi.setSystemTime(new Date(2026, 0, 1, 12, 0, 0));
      const range = getDateRangeForPeriod('yesterday');
      expect(range).toEqual({
        startDate: '2025-12-31',
        endDate: '2025-12-31',
      });
    });

    it('should return correct range for "current_month"', () => {
      const range = getDateRangeForPeriod('current_month');
      expect(range).toEqual({
        startDate: '2026-05-01',
        endDate: '2026-05-15',
      });
    });

    it('should return correct range for "current_year"', () => {
      const range = getDateRangeForPeriod('current_year');
      expect(range).toEqual({
        startDate: '2026-01-01',
        endDate: '2026-05-15',
      });
    });

    it('should return correct range for "q1"', () => {
      const range = getDateRangeForPeriod('q1');
      expect(range).toEqual({
        startDate: '2026-01-01',
        endDate: '2026-03-31',
      });
    });

    it('should return correct range for "q2"', () => {
      const range = getDateRangeForPeriod('q2');
      expect(range).toEqual({
        startDate: '2026-04-01',
        endDate: '2026-06-30',
      });
    });

    it('should return correct range for "q3"', () => {
      const range = getDateRangeForPeriod('q3');
      expect(range).toEqual({
        startDate: '2026-07-01',
        endDate: '2026-09-30',
      });
    });

    it('should return correct range for "q4"', () => {
      const range = getDateRangeForPeriod('q4');
      expect(range).toEqual({
        startDate: '2026-10-01',
        endDate: '2026-12-31',
      });
    });

    it('should return "today" range for unknown keys', () => {
      const range = getDateRangeForPeriod('unknown_key');
      expect(range).toEqual({
        startDate: '2026-05-15',
        endDate: '2026-05-15',
      });
    });
  });
});
