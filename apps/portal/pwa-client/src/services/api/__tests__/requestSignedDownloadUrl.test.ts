import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/api/apiClient', () => ({
  apiRequest: vi.fn(),
  buildUrl: vi.fn((path: string) => `https://example.com/${path}`),
}));

import { apiRequest } from '@/services/api/apiClient';
import { requestSignedDownloadUrl } from '../requestSignedDownloadUrl';

const mockApiRequest = vi.mocked(apiRequest);

describe('requestSignedDownloadUrl', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('requests a signed URL by authorized business and invoice IDs only', async () => {
    const payload = {
      businessId: 'businessA',
      invoiceId: 'invoice1',
    };
    const response = {
      downloadUrl: 'https://storage.example.com/invoice.pdf',
      expiresAt: '2026-08-27T12:00:00.000Z',
    };
    mockApiRequest.mockResolvedValue(response);

    await expect(requestSignedDownloadUrl(payload)).resolves.toEqual(response);
    expect(mockApiRequest).toHaveBeenCalledWith(
      expect.stringContaining('getSignedDownloadUrl_v2'),
      'POST',
      payload
    );
    expect(mockApiRequest.mock.calls[0][2]).not.toHaveProperty('filePath');
  });
});
