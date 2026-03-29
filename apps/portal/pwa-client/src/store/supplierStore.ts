import { defineStore } from 'pinia';

import type { Supplier } from '@/modules/suppliers/Supplier';

export const useSupplierStore = defineStore('suppliers', {
  state: () => ({
    suppliers: [] as Supplier[],
    loading: false,
    error: '' as string | null,
    initialized: false,
  }),
  getters: {
    activeSuppliers: (state) => state.suppliers.filter((supplier) => supplier.status !== 'inactive'),
    getSupplierById: (state) => (id: string) => state.suppliers.find((supplier) => supplier.id === id),
  },
  actions: {
    setSuppliers(entries: Supplier[]) {
      this.suppliers = entries;
      this.initialized = true;
    },
    updateSupplier(updatedSupplier: Supplier) {
      const index = this.suppliers.findIndex((s) => s.id === updatedSupplier.id);
      if (index !== -1) {
        this.suppliers[index] = { ...this.suppliers[index], ...updatedSupplier };
      }
    },
    setLoading(value: boolean) {
      this.loading = value;
    },
    setError(message: string | null) {
      this.error = message;
    },
  },
});




