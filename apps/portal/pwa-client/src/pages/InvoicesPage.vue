<template>
  <section class="w-full">
    <header class="mb-6">
      <h2 class="text-2xl font-semibold text-slate-900">Τιμολόγια</h2>
      <p class="mt-1 text-sm text-slate-500">Αναζήτηση τιμολογίων ανά περίοδο</p>
    </header>

    <!-- Date Range Picker Card -->
    <div class="mb-8 overflow-hidden rounded-3xl bg-white shadow-lg">
      <!-- Collapsible Filter Section -->
      <Transition name="collapse">
        <div v-if="!isCollapsed" class="filter-content p-6 pb-0">
          <div class="mb-6 flex items-center justify-between">
            <h3 class="text-sm font-semibold uppercase tracking-wide text-slate-400">ΕΠΙΛΟΓΗ ΠΕΡΙΟΔΟΥ</h3>
            <button
              v-if="hasSearched"
              type="button"
              class="text-xs font-medium text-primary-600 hover:text-primary-700"
              @click="isCollapsed = true"
            >
              Απόκρυψη
            </button>
          </div>

          <!-- Quick Period Buttons -->
          <div class="mb-6 flex flex-wrap gap-2">
            <button
              v-for="period in quickPeriods"
              :key="period.label"
              type="button"
              class="rounded-xl px-3 py-2 text-sm font-medium transition active:scale-95 sm:px-4 sm:py-2.5"
              :class="selectedPeriod === period.label
                ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/30'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'"
              @click="selectQuickPeriod(period)"
            >
              {{ period.label }}
            </button>
          </div>

          <!-- Custom Date Range -->
          <div class="mb-6 grid grid-cols-2 gap-3 sm:gap-4">
            <div class="min-w-0">
              <label class="mb-2 block text-sm font-medium text-slate-700">Από</label>
              <div class="relative">
                <input
                  v-model="startDate"
                  type="date"
                  lang="el-GR"
                  class="date-input h-12 w-full min-w-0 rounded-xl border-2 border-slate-200 bg-white px-3 text-sm text-slate-900 transition focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-500/20 sm:h-14 sm:px-4 sm:text-base"
                  @change="selectedPeriod = 'custom'"
                />
                <span
                  v-if="!startDate"
                  class="pointer-events-none absolute top-[3px] bottom-[3px] left-[3px] right-12 flex items-center rounded-lg bg-white pl-3 text-sm text-slate-400 sm:pl-4 sm:text-base"
                  aria-hidden="true"
                >ηη/μμ/εεεε</span>
              </div>
            </div>
            <div class="min-w-0">
              <label class="mb-2 block text-sm font-medium text-slate-700">Έως</label>
              <div class="relative">
                <input
                  v-model="endDate"
                  type="date"
                  lang="el-GR"
                  class="date-input h-12 w-full min-w-0 rounded-xl border-2 border-slate-200 bg-white px-3 text-sm text-slate-900 transition focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-500/20 sm:h-14 sm:px-4 sm:text-base"
                  @change="selectedPeriod = 'custom'"
                />
                <span
                  v-if="!endDate"
                  class="pointer-events-none absolute top-[3px] bottom-[3px] left-[3px] right-12 flex items-center rounded-lg bg-white pl-3 text-sm text-slate-400 sm:pl-4 sm:text-base"
                  aria-hidden="true"
                >ηη/μμ/εεεε</span>
              </div>
            </div>
          </div>

          <!-- Date Type Selector -->
          <div class="mb-6">
            <label class="mb-2 block text-sm font-medium text-slate-700">Ημερομηνία</label>
            <select
              v-model="dateType"
              class="h-12 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm text-slate-900 transition focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-500/20 sm:h-14 sm:px-4 sm:text-base"
            >
              <option value="invoiceDate">Εκδοσης</option>
              <option value="uploadedAt">Μεταφόρτωσης</option>
            </select>
          </div>
        </div>
      </Transition>

      <!-- Collapsed State - Show selected period -->
      <Transition name="fade">
        <div v-if="isCollapsed && hasSearched" class="flex items-center justify-between px-6 pt-4">
          <div class="flex items-center gap-2 text-sm text-slate-600">
            <Calendar class="h-4 w-4 shrink-0" />
            <span>
              {{ dateTypeLabel }} · {{ formatDisplayDate(startDate) }} - {{ formatDisplayDate(endDate) }}
            </span>
          </div>
          <button
            type="button"
            class="text-xs font-medium text-primary-600 hover:text-primary-700"
            @click="isCollapsed = false"
          >
            Αλλαγή
          </button>
        </div>
      </Transition>

      <!-- Search Button -->
      <div class="p-6" :class="{ 'pt-4': isCollapsed }">
        <button
          type="button"
          :disabled="!isValidRange || loading"
          class="flex h-14 w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-primary-600 to-primary-500 text-base font-semibold text-white shadow-lg shadow-primary-600/30 transition hover:shadow-xl hover:shadow-primary-600/40 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
          @click="searchInvoices"
        >
          <Loader2 v-if="loading" class="h-5 w-5 animate-spin" />
          <SearchIcon v-else class="h-5 w-5" />
          {{ loading ? 'Αναζήτηση...' : 'Αναζήτηση Τιμολογίων' }}
        </button>
      </div>
    </div>

    <!-- Results Section -->
    <div v-if="hasSearched" class="rounded-3xl bg-white p-6 shadow-lg">
      <header class="mb-4 flex items-center justify-between">
        <h3 class="text-lg font-semibold text-slate-900">Αποτελέσματα</h3>
        <p class="text-sm text-slate-500">
          {{ invoices.length }} {{ invoices.length === 1 ? 'τιμολόγιο' : 'τιμολόγια' }}
        </p>
      </header>

      <Loader v-if="loading" label="Αναζήτηση τιμολογίων..." />
      
      <p v-else-if="error" class="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-700">
        {{ error }}
      </p>

      <div v-else-if="invoices.length > 0" class="space-y-4">
        <!-- Grouped by date -->
        <div v-for="(group, dateKey) in groupedInvoices" :key="dateKey">
          <!-- Date Separator -->
          <div class="mb-3 flex items-center gap-3">
            <div class="h-px flex-1 bg-slate-200" />
            <span class="text-xs font-semibold tracking-wide text-slate-400">
              {{ group.label }}
            </span>
            <div class="h-px flex-1 bg-slate-200" />
          </div>

          <!-- Invoices for this date -->
          <div class="space-y-3">
            <article
              v-for="invoice in group.invoices"
              :key="invoice.id"
              class="cursor-pointer rounded-2xl border border-slate-100 bg-slate-50 p-4 transition hover:bg-slate-100 hover:shadow-sm"
              @click="openDetailModal(invoice)"
            >
              <div class="flex items-start justify-between gap-4">
                <div class="min-w-0 flex-1">
                  <p class="font-semibold text-slate-900">{{ invoice.supplierName }}</p>
                  <p class="text-sm text-slate-500">{{ invoice.isCredit ? 'ΠΤ-' : 'ΤΔΑ-' }}{{ invoice.invoiceNumber ?? invoice.id }}</p>
                </div>
                <div class="text-right">
                  <p class="font-bold text-slate-900">€ {{ formatCurrency(invoice.isCredit ? -(invoice.totalAmount ?? 0) : invoice.totalAmount) }}</p>
                  <StatusBadge :status="invoice.paymentStatus ?? invoice.status" :is-credit="invoice.isCredit" />
                </div>
              </div>
            </article>
          </div>
        </div>
      </div>

      <div v-else class="py-8 text-center">
        <FileText class="mx-auto h-12 w-12 text-slate-300" :stroke-width="1.5" />
        <p class="mt-4 text-sm font-medium text-slate-600">Δεν βρέθηκαν τιμολόγια</p>
        <p class="mt-1 text-xs text-slate-400">Δοκιμάστε διαφορετική περίοδο αναζήτησης</p>
      </div>
    </div>

    <!-- Invoice Detail Modal -->
    <InvoiceDetailView
      v-if="detailInvoice"
      :is-open="detailModalOpen"
      :invoice="detailInvoice"
      @close="closeDetailModal"
      @updated="handleInvoiceUpdated"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { Calendar, Search as SearchIcon, Loader2, FileText } from 'lucide-vue-next';

import InvoiceDetailView from '@/components/InvoiceDetailView.vue';
import Loader from '@/components/Loader.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import { useFirestore } from '@/composables/useFirestore';
import { QUICK_PERIODS, getDateRangeForPeriod } from '@/composables/useQuickPeriods';
import type { Invoice } from '@/modules/invoices/InvoiceMapper';
import { formatCurrency } from '@/utils/date';

const { fetchInvoicesByDateRange, fetchInvoicesByInvoiceDate } = useFirestore();

type DateType = 'invoiceDate' | 'uploadedAt';
const dateType = ref<DateType>('invoiceDate');
const startDate = ref('');
const endDate = ref('');
const selectedPeriod = ref('');
const loading = ref(false);
const error = ref<string | null>(null);
const invoices = ref<Invoice[]>([]);
const hasSearched = ref(false);
const isCollapsed = ref(false);
// Captured when search runs, used for grouping (so changing dropdown doesn't affect existing results)
const dateTypeForResults = ref<DateType>('invoiceDate');

// Invoice detail modal state
const detailModalOpen = ref(false);
const detailInvoice = ref<Invoice | null>(null);

const quickPeriods = QUICK_PERIODS;

const isValidRange = computed(() => {
  return startDate.value && endDate.value && new Date(startDate.value) <= new Date(endDate.value);
});

const dateTypeLabel = computed(() =>
  dateTypeForResults.value === 'invoiceDate' ? 'Εκδοσης' : 'Μεταφόρτωσης'
);

// Format date for collapsed state display
const formatDisplayDate = (dateStr: string): string => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('el-GR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

// Get date label for separator
const getDateLabel = (date: Date): string => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const compareDate = new Date(date);
  compareDate.setHours(0, 0, 0, 0);
  
  if (compareDate.getTime() === today.getTime()) {
    return 'Σήμερα';
  } else if (compareDate.getTime() === yesterday.getTime()) {
    return 'Χθές';
  } else {
    return compareDate.toLocaleDateString('el-GR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }
};

// Parse invoice date to Date object
const parseInvoiceDate = (date?: string | Date | { seconds: number }): Date => {
  if (!date) return new Date(0);
  if (typeof date === 'object' && 'seconds' in date) {
    return new Date(date.seconds * 1000);
  }
  return typeof date === 'string' ? new Date(date) : date;
};

// Group invoices by date (uses the field we queried on)
const groupedInvoices = computed(() => {
  const groups: Record<string, { label: string; invoices: Invoice[] }> = {};
  const field = dateTypeForResults.value;

  for (const invoice of invoices.value) {
    const dateValue = field === 'invoiceDate' ? invoice.invoiceDate : invoice.uploadedAt;
    const date = parseInvoiceDate(dateValue);
    const dateKey = date.toISOString().split('T')[0];
    
    if (!groups[dateKey]) {
      groups[dateKey] = {
        label: getDateLabel(date),
        invoices: []
      };
    }
    groups[dateKey].invoices.push(invoice);
  }
  
  // Sort by date descending
  const sortedKeys = Object.keys(groups).sort((a, b) => b.localeCompare(a));
  const sortedGroups: Record<string, { label: string; invoices: Invoice[] }> = {};
  for (const key of sortedKeys) {
    sortedGroups[key] = groups[key];
  }
  
  return sortedGroups;
});

// Invoice detail functions
const openDetailModal = (invoice: Invoice) => {
  detailInvoice.value = invoice;
  detailModalOpen.value = true;
};

const closeDetailModal = () => {
  detailModalOpen.value = false;
  setTimeout(() => {
    detailInvoice.value = null;
  }, 300);
};

const handleInvoiceUpdated = (updatedInvoice: Invoice) => {
  // Update the invoice in the local array
  const index = invoices.value.findIndex((inv) => inv.id === updatedInvoice.id);
  if (index !== -1) {
    invoices.value[index] = { ...invoices.value[index], ...updatedInvoice };
  }
  // Update the detail modal invoice
  detailInvoice.value = updatedInvoice;
};

const selectQuickPeriod = (period: { label: string; key: string }) => {
  selectedPeriod.value = period.label;
  const { startDate: s, endDate: e } = getDateRangeForPeriod(period.key);
  startDate.value = s;
  endDate.value = e;
};

const searchInvoices = async () => {
  if (!isValidRange.value) return;

  loading.value = true;
  error.value = null;
  hasSearched.value = true;
  isCollapsed.value = true; // Collapse after search
  invoices.value = [];

  try {
    const start = new Date(startDate.value);
    start.setHours(0, 0, 0, 0);

    const end = new Date(endDate.value);
    end.setHours(23, 59, 59, 999);

    if (dateType.value === 'invoiceDate') {
      invoices.value = await fetchInvoicesByInvoiceDate(start, end);
    } else {
      invoices.value = await fetchInvoicesByDateRange(start, end);
    }
    dateTypeForResults.value = dateType.value;
  } catch (err) {
    console.error('Failed to fetch invoices:', err);
    error.value = err instanceof Error ? err.message : 'Αδυναμία φόρτωσης τιμολογίων';
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
/* Date input styling for mobile */
.date-input {
  -webkit-appearance: none;
  appearance: none;
}

.date-input::-webkit-calendar-picker-indicator {
  opacity: 0.6;
}

/* Collapse animation */
.collapse-enter-active,
.collapse-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}

.collapse-enter-from,
.collapse-leave-to {
  opacity: 0;
  max-height: 0;
  padding-top: 0;
  padding-bottom: 0;
  margin-bottom: 0;
}

.collapse-enter-to,
.collapse-leave-from {
  opacity: 1;
  max-height: 500px;
}

/* Fade animation */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
