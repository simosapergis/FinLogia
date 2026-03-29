import { storeToRefs } from 'pinia';

import { useFirestore } from './useFirestore';
import { useSupplierStore } from '@/store/supplierStore';

export function useSuppliers() {
  const store = useSupplierStore();
  const { suppliers, loading, error, activeSuppliers } = storeToRefs(store);
  const { fetchSuppliers } = useFirestore();

  const hydrate = async (force = false) => {
    if (store.initialized && !force) return;
    store.setLoading(true);
    try {
      const items = await fetchSuppliers();
      store.setSuppliers(items);
      store.setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to load suppliers';
      store.setError(message);
      throw err;
    } finally {
      store.setLoading(false);
    }
  };

  return {
    suppliers,
    activeSuppliers,
    loading,
    error,
    hydrate,
  };
}




