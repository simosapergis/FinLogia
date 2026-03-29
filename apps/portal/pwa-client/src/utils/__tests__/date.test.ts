import { describe, it, expect, vi, afterEach } from 'vitest';
import { formatCurrency, formatDateTime, getDaysUntilExpiry } from '../date';

describe('formatCurrency', () => {
  it('formats a positive number with 2 decimals', () => {
    const result = formatCurrency(1234.56);
    // el-GR uses comma for decimal, period for thousands
    expect(result).toContain('1');
    expect(result).toContain('234');
    expect(result).toContain('56');
  });

  it('returns "0,00" for null/undefined', () => {
    expect(formatCurrency(null)).toBe('0,00');
    expect(formatCurrency(undefined)).toBe('0,00');
  });

  it('formats zero', () => {
    expect(formatCurrency(0)).toBe('0,00');
  });

  it('includes currency symbol when requested', () => {
    const result = formatCurrency(100, true);
    expect(result).toContain('€');
    expect(result).toContain('100');
  });

  it('does not include currency symbol by default', () => {
    const result = formatCurrency(100);
    expect(result).not.toContain('€');
  });
});

describe('formatDateTime', () => {
  it('returns "Unknown" for null/undefined', () => {
    expect(formatDateTime(undefined)).toBe('Unknown');
    expect(formatDateTime()).toBe('Unknown');
  });

  it('formats a Date object', () => {
    const date = new Date(2026, 0, 15, 10, 30);
    const result = formatDateTime(date);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
    expect(result).not.toBe('Unknown');
  });

  it('formats a Firestore timestamp object', () => {
    // 2026-01-15T00:00:00Z
    const ts = { seconds: 1768435200 };
    const result = formatDateTime(ts);
    expect(typeof result).toBe('string');
    expect(result).toContain('2026');
  });

  it('formats a date string', () => {
    const result = formatDateTime('2026-06-15T12:00:00Z');
    expect(typeof result).toBe('string');
    expect(result).not.toBe('Unknown');
  });
});

describe('getDaysUntilExpiry', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns null for null/undefined input', () => {
    expect(getDaysUntilExpiry(undefined)).toBeNull();
    expect(getDaysUntilExpiry()).toBeNull();
  });

  it('returns positive days for a date in the current month (future end of month)', () => {
    // Fix "today" to 2026-02-10
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 1, 10, 12, 0, 0));

    const result = getDaysUntilExpiry(new Date(2026, 1, 5));
    // End of Feb 2026 is Feb 28. From Feb 10 that is ~18 days
    expect(result).not.toBeNull();
    expect(result!).toBeGreaterThan(0);
  });

  it('returns negative days for a date whose month has passed', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 15, 12, 0, 0)); // June 15

    const result = getDaysUntilExpiry(new Date(2026, 0, 10)); // January 10
    // End of Jan is Jan 31, which is well before June 15
    expect(result).not.toBeNull();
    expect(result!).toBeLessThan(0);
  });

  it('handles Firestore timestamp input', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 1, 10, 12, 0, 0));

    // Timestamp for 2026-02-05
    const ts = { seconds: new Date(2026, 1, 5).getTime() / 1000 };
    const result = getDaysUntilExpiry(ts);
    expect(result).not.toBeNull();
    expect(result!).toBeGreaterThan(0);
  });
});
