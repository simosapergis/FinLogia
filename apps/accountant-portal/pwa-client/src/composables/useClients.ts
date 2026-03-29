import { ref } from 'vue';
import type { Client } from '@/modules/clients/Client';
import { fetchClients } from '@/services/api/clientsApi';
import { notify } from '@/services/notifications';

export function useClients() {
  const clients = ref<Client[]>([]);
  const loading = ref(false);
  const error = ref('');

  async function loadClients() {
    loading.value = true;
    error.value = '';
    try {
      const response = await fetchClients();
      clients.value = response.data.clients;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Αποτυχία φόρτωσης πελατών';
      error.value = message;
      notify({ message, type: 'error' });
    } finally {
      loading.value = false;
    }
  }

  return { clients, loading, error, loadClients };
}
