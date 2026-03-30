import { ref } from 'vue';
import type { QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';

import { useFirestore } from './useFirestore';
import type { Invoice } from '@/modules/invoices/InvoiceMapper';

export function useSupplierInvoices() {
  const loading = ref(false);
  const loadingMore = ref(false);
  const error = ref<string | null>(null);
  const invoices = ref<Invoice[]>([]);
  const hasMore = ref(false);
  const lastVisible = ref<QueryDocumentSnapshot<DocumentData> | null>(null);

  const { fetchSupplierInvoices } = useFirestore();

  const loadInvoices = async (supplierId: string) => {
    loading.value = true;
    error.value = null;
    lastVisible.value = null;
    invoices.value = [];
    try {
      const result = await fetchSupplierInvoices(supplierId);
      invoices.value = result.invoices;
      lastVisible.value = result.lastVisible;
      hasMore.value = result.hasMore;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to load invoices';
      error.value = message;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const loadMoreInvoices = async (supplierId: string) => {
    if (!hasMore.value || loadingMore.value) return;
    
    loadingMore.value = true;
    try {
      const result = await fetchSupplierInvoices(supplierId, lastVisible.value);
      invoices.value = [...invoices.value, ...result.invoices];
      lastVisible.value = result.lastVisible;
      hasMore.value = result.hasMore;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to load more invoices';
      error.value = message;
      throw err;
    } finally {
      loadingMore.value = false;
    }
  };

  /**
   * Update a single invoice in the local invoices array
   */
  const updateInvoice = (updatedInvoice: Invoice) => {
    const index = invoices.value.findIndex((inv) => inv.id === updatedInvoice.id);
    if (index !== -1) {
      invoices.value[index] = { ...invoices.value[index], ...updatedInvoice };
    }
  };

  /**
   * Remove an invoice from the local array (e.g., after full payment)
   */
  const removeInvoice = (invoiceId: string) => {
    invoices.value = invoices.value.filter((inv) => inv.id !== invoiceId);
  };

  return { invoices, loading, loadingMore, hasMore, error, loadInvoices, loadMoreInvoices, updateInvoice, removeInvoice };
}
