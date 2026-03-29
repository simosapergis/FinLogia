<template>
  <section class="w-full">
    <header class="mb-6">
      <h2 class="text-2xl font-semibold text-slate-900">Προμηθευτές</h2>
      <p class="mt-1 text-sm text-slate-500">Επιλέξτε προμηθευτή για να δείτε τα τιμολόγιά του</p>
    </header>

    <!-- Search Filter -->
    <div v-if="!loading && suppliers.length > 0" class="mb-6">
      <div class="relative">
        <Search class="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Αναζήτηση προμηθευτή..."
          class="w-full rounded-xl border-2 border-slate-200 bg-white py-3 pl-12 pr-4 text-sm text-slate-900 transition placeholder:text-slate-400 focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-500/10"
        />
      </div>
    </div>

    <Loader v-if="loading" label="Φόρτωση προμηθευτών..." />
    <p v-else-if="error" class="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-700">
      {{ error }}
    </p>
    <div v-else class="grid gap-4 md:grid-cols-2">
      <button
        v-for="supplier in filteredSuppliers"
        :key="supplier.id"
        type="button"
        class="text-left"
        @click="selectSupplier(supplier.id)"
      >
        <SupplierCard :supplier="supplier" />
      </button>
    </div>

    <!-- Empty State -->
    <div v-if="!loading && filteredSuppliers.length === 0 && suppliers.length > 0" class="mt-8 rounded-3xl border border-dashed border-slate-200 bg-white p-10 text-center">
      <Search class="mx-auto h-12 w-12 text-slate-300" />
      <p class="mt-4 text-sm font-medium text-slate-600">Δεν βρέθηκαν αποτελέσματα</p>
      <p class="mt-1 text-xs text-slate-400">Δοκιμάστε διαφορετικούς όρους αναζήτησης</p>
    </div>

    <div v-if="!loading && suppliers.length === 0" class="mt-8 rounded-3xl border border-dashed border-slate-200 bg-white p-10 text-center">
      <Building2 class="mx-auto h-12 w-12 text-slate-300" />
      <p class="mt-4 text-sm font-medium text-slate-600">Δεν βρέθηκαν προμηθευτές</p>
      <p class="mt-1 text-xs text-slate-400">Οι προμηθευτές θα εμφανιστούν εδώ μόλις σαρώσετε τιμολόγια</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { Search, Building2 } from 'lucide-vue-next';

import Loader from '@/components/Loader.vue';
import SupplierCard from '@/components/SupplierCard.vue';
import { useSuppliers } from '@/composables/useSuppliers';

const router = useRouter();
const { suppliers, loading, error, hydrate } = useSuppliers();
const searchQuery = ref('');

const filteredSuppliers = computed(() => {
  if (!searchQuery.value.trim()) return suppliers.value;
  const query = searchQuery.value.toLowerCase().trim();
  return suppliers.value.filter(
    (s) =>
      s.name.toLowerCase().includes(query) ||
      s.supplierTaxNumber?.toLowerCase().includes(query) ||
      s.city?.toLowerCase().includes(query)
  );
});

onMounted(async () => {
  await hydrate();
});

const selectSupplier = (supplierId: string) => {
  router.push({ name: 'supplier-invoices', params: { supplierId } });
};
</script>
