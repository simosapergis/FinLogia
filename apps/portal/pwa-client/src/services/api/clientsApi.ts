import { apiRequest, buildUrl } from './apiClient';
import type { Client } from '@/modules/clients/Client';

interface ListClientsResponse {
  success: boolean;
  data: {
    clients: Client[];
    accountant: { displayName: string; email: string };
  };
}

export async function fetchClients(): Promise<ListClientsResponse> {
  const path = import.meta.env.VITE_LIST_CLIENTS_PATH;
  return apiRequest<ListClientsResponse>(buildUrl(path), 'GET');
}
