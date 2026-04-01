import { ref } from 'vue';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { firebaseApp } from '@/services/firebase';
import { notify } from '@/services/notifications';

export interface Client {
  id: string;
  projectId: string; // Keep for compatibility or rename to businessId
  displayName: string;
  bucketName: string;
}

const db = getFirestore(firebaseApp);

export function useClients() {
  const clients = ref<Client[]>([]);
  const loading = ref(false);
  const error = ref('');

  async function loadClients() {
    loading.value = true;
    error.value = '';
    try {
      const snapshot = await getDocs(collection(db, 'businesses'));
      const fetchedClients = snapshot.docs.map(doc => ({
        id: doc.id,
        projectId: doc.id, // Map businessId to projectId for now
        displayName: doc.data().displayName || doc.id,
        bucketName: doc.data().bucketName || '',
      }));
      clients.value = fetchedClients.sort((a, b) => a.displayName.localeCompare(b.displayName, 'el'));
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
