import { apiRequest, buildUrl } from '@/services/api/apiClient';

export interface SignedUrlResponse {
  uploadUrl: string;
  fileUrl: string;
  invoiceId: string;
  bucket?: string;
  objectName?: string;
  headers?: Record<string, string>;
  expiresAt?: string;
  expiresIn?: number;
  pageNumber: number;
  totalPages?: number;
}

interface SignedUrlRequest {
  filename: string;
  contentType: string;
  pageNumber: number;
  totalPages?: number;
  invoiceId?: string;
  folder?: string;
  isPaid?: boolean;
}

const SIGNED_UPLOAD_URL_PATH = import.meta.env.VITE_SIGNED_UPLOAD_URL_PATH ?? 'sign/upload';
const defaultFolder = import.meta.env.VITE_FIREBASE_BUCKET_FOLDER ?? 'uploads';

export const requestSignedUrl = async (payload: SignedUrlRequest): Promise<SignedUrlResponse> => {
  return apiRequest<SignedUrlResponse>(buildUrl(SIGNED_UPLOAD_URL_PATH), 'POST', {
    filename: payload.filename,
    contentType: payload.contentType,
    folder: payload.folder ?? defaultFolder,
    pageNumber: payload.pageNumber,
    ...(payload.totalPages ? { totalPages: payload.totalPages } : {}),
    ...(payload.invoiceId ? { invoiceId: payload.invoiceId } : {}),
    ...(payload.isPaid !== undefined ? { isPaid: payload.isPaid } : {}),
  });
};
