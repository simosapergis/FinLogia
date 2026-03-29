import { describe, it, expect } from 'vitest';
import { extractBearerToken } from '../lib/auth.js';

describe('auth', () => {
  describe('extractBearerToken', () => {
    it('returns null for missing header', () => {
      expect(extractBearerToken(undefined)).toBeNull();
      expect(extractBearerToken(null)).toBeNull();
      expect(extractBearerToken('')).toBeNull();
    });

    it('extracts token from valid Bearer header', () => {
      expect(extractBearerToken('Bearer abc123')).toBe('abc123');
      expect(extractBearerToken('bearer xyz789')).toBe('xyz789');
    });

    it('returns null for malformed header', () => {
      expect(extractBearerToken('Basic abc123')).toBeNull();
      expect(extractBearerToken('Bearerabc123')).toBeNull();
      expect(extractBearerToken('Bearer ')).toBeNull();
    });
  });
});
