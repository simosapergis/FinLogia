import { auth } from '@/services/firebase';

export async function getAuthToken(): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error('Δεν υπάρχει συνδεδεμένος χρήστης');
  return user.getIdToken();
}

export async function apiRequest<T>(
  endpointPath: string,
  options: {
    method?: 'GET' | 'POST';
    body?: Record<string, unknown>;
  } = {}
): Promise<T> {
  const { method = 'GET', body } = options;
  const baseUrl = import.meta.env.VITE_BASE_URL;
  const url = `${baseUrl}/${endpointPath}`;
  const token = await getAuthToken();

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json();

  if (!response.ok) {
    const errorMessage = data?.error || `Σφάλμα ${response.status}`;
    throw new Error(errorMessage);
  }

  return data as T;
}
