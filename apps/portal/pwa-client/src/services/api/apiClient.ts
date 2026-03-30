import { getAuth } from 'firebase/auth';
import { firebaseApp } from '@/services/firebase';
import { useUserStore } from '@/store/userStore';

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
  const userStore = useUserStore();
  const businessId = userStore.currentBusinessId;

  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  };

  let finalEndpoint = endpoint;

  if (method === 'GET' && businessId) {
    const url = new URL(endpoint.startsWith('http') ? endpoint : `http://dummy${endpoint}`);
    if (!url.searchParams.has('businessId')) {
      url.searchParams.append('businessId', businessId);
    }
    finalEndpoint = endpoint.startsWith('http') ? url.toString() : `${url.pathname}${url.search}`;
  }

  if (body) {
    if (typeof body === 'object' && body !== null) {
      const bodyObj = body as Record<string, unknown>;
      // Only inject businessId if it's not already provided in the body
      if (businessId && !('businessId' in bodyObj)) {
        options.body = JSON.stringify({ ...bodyObj, businessId });
      } else {
        options.body = JSON.stringify(bodyObj);
      }
    } else {
      options.body = JSON.stringify(body);
    }
  } else if (method === 'POST' && businessId) {
    options.body = JSON.stringify({ businessId });
  }

  const response = await fetch(finalEndpoint, options);

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
