import { getAuth } from 'firebase/auth';
import { firebaseApp } from '@/services/firebase';

const auth = getAuth(firebaseApp);
const BASE_URL = import.meta.env.VITE_BASE_URL ?? '';

/**
 * Gets the current user's Firebase Auth ID token.
 * Throws if no user is signed in.
 */
export const getAuthToken = async (): Promise<string> => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Πρέπει να είστε συνδεδεμένος');
  }
  return user.getIdToken();
};

/**
 * Authenticated API request helper.
 * Attaches Firebase Auth token and handles JSON serialization/error parsing.
 */
export const apiRequest = async <T>(
  endpoint: string,
  method: 'GET' | 'POST',
  body?: unknown
): Promise<T> => {
  const token = await getAuthToken();

  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(endpoint, options);

  const data = await response.json();

  if (!response.ok) {
    const detail = Array.isArray(data.details) ? data.details[0] : undefined;
    throw new Error(detail ?? data.error ?? data.message ?? 'Σφάλμα επικοινωνίας');
  }

  return data;
};

/**
 * Builds a full endpoint URL from a VITE_* path variable.
 */
export const buildUrl = (path: string): string => `${BASE_URL}${path}`;
