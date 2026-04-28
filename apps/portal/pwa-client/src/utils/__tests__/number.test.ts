import { describe, expect, it } from 'vitest';
import { roundAmount } from '../number';

describe('roundAmount', () => {
  it('should round standard numbers to 2 decimal places', () => {
    expect(roundAmount(32.00000001)).toBe(32.00);
    expect(roundAmount(32.009)).toBe(32.01);
    expect(roundAmount(32.1)).toBe(32.10);
    expect(roundAmount(32)).toBe(32.00);
  });

  it('should handle edge cases (null, undefined, NaN)', () => {
    expect(roundAmount(null)).toBeNull();
    expect(roundAmount(undefined)).toBeNull();
    expect(roundAmount(NaN)).toBeNull();
  });

  it('should handle zero correctly', () => {
    expect(roundAmount(0)).toBe(0.00);
    expect(roundAmount(-0)).toBe(-0.00);
  });

  it('should handle negative numbers correctly', () => {
    expect(roundAmount(-32.00000001)).toBe(-32.00);
    expect(roundAmount(-32.009)).toBe(-32.01);
    expect(roundAmount(-32.1)).toBe(-32.10);
    expect(roundAmount(-32)).toBe(-32.00);
  });

  it('should handle large numbers correctly', () => {
    expect(roundAmount(9999999.999)).toBe(10000000.00);
    expect(roundAmount(123456789.123)).toBe(123456789.12);
  });

  it('should handle exact half rounding consistently', () => {
    // Note: JS toFixed uses half-up rounding for positive numbers
    expect(roundAmount(2.555)).toBe(2.56); // 2.555 -> 2.56
    expect(roundAmount(2.545)).toBe(2.55); // 2.545 -> 2.55
  });
});
