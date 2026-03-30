<template>
  <div class="w-full space-y-6">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-slate-900 sm:text-3xl">Πελάτες</h1>
        <p class="mt-1 text-sm text-slate-500">Όλοι οι πελάτες FinLogia που σας έχουν εκχωρηθεί.</p>
      </div>
      
      <div v-if="userStore.role === 'admin'" class="flex flex-wrap gap-2">
        <button @click="isAddBusinessModalOpen = true" class="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
          + Επιχείρηση
        </button>
        <button @click="isAddUserModalOpen = true" class="inline-flex items-center justify-center rounded-lg bg-white border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
          + Χρήστης
        </button>
        <button @click="isAddAccountantModalOpen = true" class="inline-flex items-center justify-center rounded-lg bg-white border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
          + Λογιστής
        </button>
        <button @click="isResetPasswordModalOpen = true" class="inline-flex items-center justify-center rounded-lg bg-white border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
          Επαναφορά Κωδικού
        </button>
      </div>
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
      <AccountantClientCard
        v-for="client in filteredClients"
        :key="client.id"
        :client="client"
      />
    </div>

    <!-- Modals -->
    <AddBusinessModal
      :isOpen="isAddBusinessModalOpen"
      @close="isAddBusinessModalOpen = false"
      @submit="handleAddBusiness"
    />
    
    <AddUserModal
      :isOpen="isAddUserModalOpen"
      :businesses="clients"
      @close="isAddUserModalOpen = false"
      @submit="handleAddUser"
    />
    
    <AddAccountantModal
      :isOpen="isAddAccountantModalOpen"
      @close="isAddAccountantModalOpen = false"
      @submit="handleAddAccountant"
    />

    <ResetPasswordModal
      :isOpen="isResetPasswordModalOpen"
      @close="isResetPasswordModalOpen = false"
      @submit="handleResetPassword"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { Search, Building2 } from 'lucide-vue-next';
import Loader from '@/components/Loader.vue';
import AccountantClientCard from '@/components/AccountantClientCard.vue';
import AddBusinessModal from '@/components/AddBusinessModal.vue';
import AddUserModal from '@/components/AddUserModal.vue';
import AddAccountantModal from '@/components/AddAccountantModal.vue';
import ResetPasswordModal from '@/components/ResetPasswordModal.vue';
import { useClients } from '@/composables/useClients';
import { useUserStore } from '@/store/userStore';
import { createClientBusiness, addUserToBusiness, addAccountant, resetUserPassword } from '@/services/api/adminApi';

const { clients, loading, loadClients } = useClients();
const userStore = useUserStore();
const searchQuery = ref('');

const isAddBusinessModalOpen = ref(false);
const isAddUserModalOpen = ref(false);
const isAddAccountantModalOpen = ref(false);
const isResetPasswordModalOpen = ref(false);

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

const handleAddBusiness = async (data: any) => {
  try {
    await createClientBusiness(data);
    isAddBusinessModalOpen.value = false;
    await loadClients();
    alert('Η επιχείρηση δημιουργήθηκε επιτυχώς!');
  } catch (error: any) {
    alert('Σφάλμα: ' + error.message);
  }
};

const handleAddUser = async (data: any) => {
  try {
    await addUserToBusiness(data);
    isAddUserModalOpen.value = false;
    alert('Ο χρήστης προστέθηκε επιτυχώς!');
  } catch (error: any) {
    alert('Σφάλμα: ' + error.message);
  }
};

const handleAddAccountant = async (data: any) => {
  try {
    await addAccountant(data);
    isAddAccountantModalOpen.value = false;
    alert('Ο λογιστής προστέθηκε επιτυχώς!');
  } catch (error: any) {
    alert('Σφάλμα: ' + error.message);
  }
};

const handleResetPassword = async (data: any) => {
  try {
    await resetUserPassword(data);
    isResetPasswordModalOpen.value = false;
    alert('Το email επαναφοράς κωδικού στάλθηκε επιτυχώς!');
  } catch (error: any) {
    alert('Σφάλμα: ' + error.message);
  }
};
</script>
