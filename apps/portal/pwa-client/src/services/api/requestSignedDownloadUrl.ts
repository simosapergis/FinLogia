import { getAuthToken, buildUrl } from '@/services/api/apiClient';

export interface SignedDownloadUrlResponse {
  downloadUrl: string;
  expiresAt?: string;
  expiresIn?: number;
}

interface SignedDownloadUrlRequest {
  filePath: string;
}

const SIGNED_DOWNLOAD_URL_PATH = import.meta.env.VITE_SIGNED_DOWNLOAD_URL_PATH ?? 'sign/download';

export const requestSignedDownloadUrl = async (
  payload: SignedDownloadUrlRequest
): Promise<SignedDownloadUrlResponse> => {
  const token = await getAuthToken();

  const response = await fetch(buildUrl(SIGNED_DOWNLOAD_URL_PATH), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      filePath: payload.filePath,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to get download URL: ${errorText}`);
  }

  return response.json();
};
