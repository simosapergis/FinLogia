import { describe, it, expect, vi } from 'vitest';
import { requireMethod, sendError } from '../lib/http-utils.js';

describe('http-utils', () => {
  describe('requireMethod', () => {
    it('returns true for matching method', () => {
      const req = { method: 'POST' };
      const res = { status: vi.fn(() => ({ json: vi.fn() })) };
      expect(requireMethod(req, res, 'POST')).toBe(true);
    });

    it('returns false and sends 405 for non-matching method', () => {
      const jsonFn = vi.fn();
      const req = { method: 'GET' };
      const res = { status: vi.fn(() => ({ json: jsonFn })) };
      expect(requireMethod(req, res, 'POST')).toBe(false);
      expect(res.status).toHaveBeenCalledWith(405);
    });
  });

  describe('sendError', () => {
    it('sends error with message only', () => {
      const jsonFn = vi.fn();
      const res = { status: vi.fn(() => ({ json: jsonFn })) };
      sendError(res, 400, 'Bad request');
      expect(res.status).toHaveBeenCalledWith(400);
      expect(jsonFn).toHaveBeenCalledWith({ error: 'Bad request' });
    });

    it('includes details and code when provided', () => {
      const jsonFn = vi.fn();
      const res = { status: vi.fn(() => ({ json: jsonFn })) };
      sendError(res, 500, 'Error', { details: 'info', code: 'ERR_CODE' });
      expect(jsonFn).toHaveBeenCalledWith({
        error: 'Error',
        details: 'info',
        code: 'ERR_CODE',
      });
    });
  });
});
