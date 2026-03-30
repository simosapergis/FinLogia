<template>
  <div class="w-full space-y-6">
    <div>
      <h1 class="text-2xl font-bold text-slate-900 sm:text-3xl">Σύνοψη</h1>
      <p class="mt-1 text-sm text-slate-500">Γενική εικόνα του λογαριασμού σας.</p>
    </div>

    <Loader v-if="loading" message="Φόρτωση δεδομένων..." />

    <template v-else>
      <div class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <div class="flex items-center gap-4 rounded-2xl bg-white p-6 shadow-sm">
          <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
            <Building2 class="h-6 w-6" />
          </div>
          <div>
            <p class="text-2xl font-bold text-slate-900">{{ clients.length }}</p>
            <p class="text-sm text-slate-500">Πελάτες</p>
          </div>
        </div>
      </div>

      <div>
        <div class="mb-4 flex items-center justify-between">
          <h2 class="text-lg font-semibold text-slate-900">Πελάτες</h2>
          <RouterLink
            to="/accountant/clients"
            class="text-sm font-medium text-primary-600 transition hover:text-primary-700"
          >
            Προβολή όλων →
          </RouterLink>
        </div>

        <div v-if="clients.length === 0" class="rounded-2xl bg-white p-10 text-center shadow-sm">
          <Building2 class="mx-auto h-10 w-10 text-slate-300" />
          <p class="mt-3 text-sm text-slate-500">Δεν υπάρχουν πελάτες ακόμα.</p>
        </div>

        <div v-else class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <AccountantClientCard
            v-for="client in clients.slice(0, 6)"
            :key="client.id"
            :client="client"
          />
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { RouterLink } from 'vue-router';
import { Building2 } from 'lucide-vue-next';
import Loader from '@/components/Loader.vue';
import AccountantClientCard from '@/components/AccountantClientCard.vue';
import { useClients } from '@/composables/useClients';
import { useUserStore } from '@/store/userStore';

const { clients, loading, loadClients } = useClients();
const userStore = useUserStore();

onMounted(() => {
  if (userStore.isAccountant) {
    console.log(`accountant: ${userStore.user?.email}`);
  }
  loadClients();
});
</script>
