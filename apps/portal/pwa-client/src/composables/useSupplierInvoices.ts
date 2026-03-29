import { ref } from 'vue';

import { useFirestore } from './useFirestore';
import type { Invoice } from '@/modules/invoices/InvoiceMapper';

export function useSupplierInvoices() {
  const loading = ref(false);
  const error = ref<string | null>(null);
  const invoices = ref<Invoice[]>([]);

  const { fetchSupplierInvoices } = useFirestore();

  const loadInvoices = async (supplierId: string) => {
    loading.value = true;
    error.value = null;
    try {
      invoices.value = await fetchSupplierInvoices(supplierId);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to load invoices';
      error.value = message;
      throw err;
    } finally {
      loading.value = false;
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

  return { invoices, loading, error, loadInvoices, updateInvoice, removeInvoice };
}
