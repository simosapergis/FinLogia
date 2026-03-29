import { describe, it, expect, vi, beforeEach } from 'vitest';
import { exportInvoices, ExportError } from '../exportInvoices';

// Mock the apiClient module
vi.mock('@/services/api/apiClient', () => ({
  getAuthToken: vi.fn(),
  buildUrl: vi.fn((path: string) => `https://example.com${path}`),
}));

import { getAuthToken } from '@/services/api/apiClient';

const mockGetAuthToken = vi.mocked(getAuthToken);

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

beforeEach(() => {
  vi.clearAllMocks();
  mockGetAuthToken.mockResolvedValue('fake-token');
});

describe('exportInvoices', () => {
  const payload = {
    invoices: [
      { supplierId: 'sup-a', invoiceId: 'inv-1' },
      { supplierId: 'sup-b', invoiceId: 'inv-2' },
    ],
  };

  it('returns response data on success', async () => {
    const responseData = {
      success: true,
      message: 'Export complete',
      data: {
        downloadUrl: 'https://storage.example.com/zip',
        invoiceCount: 2,
        zipPath: 'exports/uid/123.zip',
        expiresAt: '2026-02-13T15:30:00.000Z',
      },
    };

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(responseData),
    });

    const result = await exportInvoices(payload);
    expect(result).toEqual(responseData);
    expect(mockFetch).toHaveBeenCalledOnce();
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('exportInvoices'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer fake-token',
        }),
      }),
    );
  });

  it('throws ExportError on non-ok response with error details array', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({
        error: 'Validation failed',
        details: ['invoices[0].supplierId is required'],
        code: 'VALIDATION_ERROR',
      }),
    });

    await expect(exportInvoices(payload)).rejects.toThrow(ExportError);

    try {
      await exportInvoices(payload);
    } catch (err) {
      expect(err).toBeInstanceOf(ExportError);
      const exportErr = err as ExportError;
      expect(exportErr.message).toBe('Validation failed');
      expect(exportErr.details).toEqual(['invoices[0].supplierId is required']);
      expect(exportErr.code).toBe('VALIDATION_ERROR');
    }
  });

  it('throws ExportError on non-ok response with string details', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({
        error: 'Server error',
        details: 'Something went wrong',
      }),
    });

    try {
      await exportInvoices(payload);
    } catch (err) {
      const exportErr = err as ExportError;
      expect(exportErr.details).toEqual(['Something went wrong']);
    }
  });

  it('throws ExportError with default message when json parse fails', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.reject(new Error('parse error')),
    });

    try {
      await exportInvoices(payload);
    } catch (err) {
      const exportErr = err as ExportError;
      expect(exportErr.message).toBe('Αποτυχία εξαγωγής τιμολογίων');
      expect(exportErr.details).toEqual([]);
    }
  });

  it('throws when user is not authenticated', async () => {
    mockGetAuthToken.mockRejectedValue(new Error('Πρέπει να είστε συνδεδεμένος'));

    await expect(exportInvoices(payload)).rejects.toThrow('Πρέπει να είστε συνδεδεμένος');
  });
});
