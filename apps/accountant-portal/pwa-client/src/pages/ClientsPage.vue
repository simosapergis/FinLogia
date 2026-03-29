<template>
  <div class="w-full space-y-6">
    <div>
      <h1 class="text-2xl font-bold text-slate-900 sm:text-3xl">Πελάτες</h1>
      <p class="mt-1 text-sm text-slate-500">Όλοι οι πελάτες FinLogia που σας έχουν εκχωρηθεί.</p>
    </div>

    <div class="relative">
      <Search class="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Αναζήτηση πελάτη..."
        class="w-full rounded-xl border-2 border-slate-200 bg-white py-3 pl-12 pr-4 text-slate-900 transition placeholder:text-slate-400 focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-500/10"
      />
    </div>

    <Loader v-if="loading" message="Φόρτωση πελατών..." />

    <div v-else-if="filteredClients.length === 0" class="rounded-2xl bg-white p-10 text-center shadow-sm">
      <Building2 class="mx-auto h-10 w-10 text-slate-300" />
      <p class="mt-3 text-sm text-slate-500">
        {{ searchQuery ? 'Δεν βρέθηκαν αποτελέσματα.' : 'Δεν υπάρχουν πελάτες ακόμα.' }}
      </p>
    </div>

    <div v-else class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <ClientCard
        v-for="client in filteredClients"
        :key="client.id"
        :client="client"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { Search, Building2 } from 'lucide-vue-next';
import Loader from '@/components/Loader.vue';
import ClientCard from '@/components/ClientCard.vue';
import { useClients } from '@/composables/useClients';

const { clients, loading, loadClients } = useClients();
const searchQuery = ref('');

const filteredClients = computed(() => {
  if (!searchQuery.value.trim()) return clients.value;
  const q = searchQuery.value.toLowerCase();
  return clients.value.filter(
    (c) =>
      c.displayName.toLowerCase().includes(q) ||
      c.projectId.toLowerCase().includes(q)
  );
});

onMounted(() => {
  loadClients();
});
</script>
