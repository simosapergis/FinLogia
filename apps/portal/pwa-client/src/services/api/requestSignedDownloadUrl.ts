import { apiRequest, buildUrl } from '@/services/api/apiClient';

export interface SignedDownloadUrlResponse {
  downloadUrl: string;
  expiresAt?: string;
  expiresIn?: number;
}

interface SignedDownloadUrlRequest {
  filePath: string;
  businessId?: string;
}

const SIGNED_DOWNLOAD_URL_PATH = import.meta.env.VITE_SIGNED_DOWNLOAD_URL_PATH ?? 'sign/download';

export const requestSignedDownloadUrl = async (
  payload: SignedDownloadUrlRequest
): Promise<SignedDownloadUrlResponse> => {
  return apiRequest<SignedDownloadUrlResponse>(buildUrl(SIGNED_DOWNLOAD_URL_PATH), 'POST', payload);
};
