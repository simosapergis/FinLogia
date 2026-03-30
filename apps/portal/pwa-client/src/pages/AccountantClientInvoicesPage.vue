<template>
  <section class="w-full pb-24">
    <header class="mb-6">
      <RouterLink to="/clients" class="mb-2 inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700">
        <ArrowLeft class="h-4 w-4" />
        Πίσω στους πελάτες
      </RouterLink>
      <h2 class="text-2xl font-semibold text-slate-900">{{ clientName }}</h2>
      <p class="mt-1 text-sm text-slate-500">Αναζήτηση, προβολή και εξαγωγή τιμολογίων</p>
    </header>

    <!-- Audit Legend -->
    <div class="mb-6 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 rounded-2xl bg-white p-4 shadow-sm border border-slate-100">
      <span class="text-sm font-medium text-slate-600">Κατάσταση Ελέγχου:</span>
      <div class="flex flex-wrap items-center gap-4">
        <div class="flex items-center gap-2">
          <div class="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <Check class="h-4 w-4" />
          </div>
          <span class="text-sm text-slate-700">Καταχωρήθηκε</span>
        </div>
        <div class="flex items-center gap-2">
          <div class="flex h-6 w-6 items-center justify-center rounded-full bg-rose-100 text-rose-600">
            <X class="h-4 w-4" />
          </div>
          <span class="text-sm text-slate-700">Απορρίφθηκε</span>
        </div>
      </div>
    </div>

    <!-- Filter Card -->
    <div class="mb-8 overflow-hidden rounded-3xl bg-white shadow-lg">
      <Transition name="collapse">
        <div v-if="!isCollapsed" class="p-6 pb-0">
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

          <div class="grid grid-cols-2 gap-3 sm:gap-4">
            <div class="min-w-0">
              <label class="mb-2 block text-sm font-medium text-slate-700">Από</label>
              <div class="relative">
                <input
                  v-model="startDate"
                  type="date"
                  lang="el-GR"
                  :max="todayStr"
                  class="date-input h-12 w-full min-w-0 rounded-xl border-2 border-slate-200 bg-white px-3 text-sm text-slate-900 transition focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-500/20 sm:h-14 sm:px-4 sm:text-base"
                  @change="onCustomDateChanged"
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
                  :max="todayStr"
                  class="date-input h-12 w-full min-w-0 rounded-xl border-2 border-slate-200 bg-white px-3 text-sm text-slate-900 transition focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-500/20 sm:h-14 sm:px-4 sm:text-base"
                  @change="onCustomDateChanged"
                />
                <span
                  v-if="!endDate"
                  class="pointer-events-none absolute top-[3px] bottom-[3px] left-[3px] right-12 flex items-center rounded-lg bg-white pl-3 text-sm text-slate-400 sm:pl-4 sm:text-base"
                  aria-hidden="true"
                >ηη/μμ/εεεε</span>
              </div>
            </div>
          </div>
        </div>
      </Transition>

      <Transition name="fade">
        <div v-if="isCollapsed && hasSearched" class="flex items-center justify-between px-6 pt-4">
          <div class="flex items-center gap-2 text-sm text-slate-600">
            <Calendar class="h-4 w-4" />
            <span>{{ formatDisplayDate(startDate) }} - {{ formatDisplayDate(endDate) }}</span>
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
          {{ filteredInvoicesCount }} {{ filteredInvoicesCount === 1 ? 'τιμολόγιο' : 'τιμολόγια' }}
        </p>
      </header>

      <div class="relative mb-6">
        <SearchIcon class="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Αναζήτηση παρόχου..."
          class="w-full rounded-xl border-2 border-slate-200 bg-white py-3 pl-12 pr-4 text-slate-900 transition placeholder:text-slate-400 focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-500/10"
        />
      </div>

      <Loader v-if="loading" message="Αναζήτηση τιμολογίων..." />

      <p v-else-if="error" class="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-700">
        {{ error }}
      </p>

      <div v-else-if="invoices.length > 0">
        <label class="mb-5 flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            :checked="isAllSelected"
            :indeterminate="isPartiallySelected"
            class="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
            @change="toggleSelectAll"
          />
          <span class="text-sm font-semibold text-slate-700">Επιλογή όλων</span>
        </label>

        <div class="space-y-6">
          <div v-for="group in filteredGroupedBySupplier" :key="group.supplierId">
            <div class="mb-3 flex items-center gap-3">
              <label class="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  :checked="isGroupAllSelected(group)"
                  :indeterminate="isGroupPartiallySelected(group)"
                  class="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                  @change="toggleSupplierSelection(group)"
                />
                <span class="text-sm font-semibold text-slate-900">{{ group.supplierName }}</span>
              </label>
              <span class="text-xs text-slate-400">({{ group.invoices.length }})</span>
            </div>

            <div class="flex flex-wrap gap-3">
              <div
                v-for="invoice in group.invoices"
                :key="invoice.invoiceId"
                class="relative flex w-24 flex-col items-center gap-2 rounded-2xl border-2 p-3 pb-4 transition sm:w-28 sm:pb-5 mb-5"
                :class="[
                  isSelected(invoice.invoiceId)
                    ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-500/20'
                    : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-slate-100',
                  invoice.auditStatus === 'registered' ? '!border-emerald-500 !bg-emerald-50' : '',
                  invoice.auditStatus === 'denied' ? '!border-rose-500 !bg-rose-50' : ''
                ]"
              >
                <!-- Audit Quick Actions -->
                <div class="absolute -top-3 -right-3 flex gap-1 z-10">
                  <button
                    type="button"
                    class="flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-sm border transition hover:scale-110"
                    :class="invoice.auditStatus === 'registered' ? 'border-emerald-500 text-emerald-600 bg-emerald-50' : 'border-slate-200 text-slate-400 hover:text-emerald-600 hover:border-emerald-300'"
                    @click.stop="handleAuditStatus(invoice, invoice.auditStatus === 'registered' ? null : 'registered')"
                    title="Καταχωρήθηκε"
                  >
                    <Check class="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    class="flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-sm border transition hover:scale-110"
                    :class="invoice.auditStatus === 'denied' ? 'border-rose-500 text-rose-600 bg-rose-50' : 'border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-300'"
                    @click.stop="handleAuditStatus(invoice, invoice.auditStatus === 'denied' ? null : 'denied')"
                    title="Απορρίφθηκε"
                  >
                    <X class="h-4 w-4" />
                  </button>
                </div>

                <button
                  type="button"
                  class="flex w-full flex-col items-center gap-2 outline-none"
                  @click.stop="handleTileClick($event, invoice)"
                >
                  <svg class="h-8 w-8 flex-shrink-0" :class="isSelected(invoice.invoiceId) ? 'text-primary-600' : 'text-slate-400'" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" opacity="0.2" />
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm4 18H6V4h7v5h5v11z" />
                    <text x="7" y="18" font-size="5.5" font-weight="bold" fill="currentColor">PDF</text>
                  </svg>
                  <span class="w-full truncate text-center text-xs font-medium" :class="isSelected(invoice.invoiceId) ? 'text-primary-700' : 'text-slate-700'">
                    {{ invoice.invoiceNumber ?? invoice.invoiceId }}
                  </span>
                  <!-- Audit Status Text on Border -->
                  <div v-if="invoice.auditStatus" class="absolute -bottom-2.5 left-1/2 z-10 -translate-x-1/2">
                    <span v-if="invoice.auditStatus === 'registered'" class="whitespace-nowrap bg-white px-1.5 text-xs font-bold text-emerald-600">
                      Καταχωρήθηκε
                    </span>
                    <span v-if="invoice.auditStatus === 'denied'" class="whitespace-nowrap bg-white px-1.5 text-xs font-bold text-rose-600">
                      Απορρίφθηκε
                    </span>
                  </div>

                  <!-- Other Badges -->
                  <div class="absolute left-1/2 flex w-[120%] -translate-x-1/2 flex-wrap justify-center gap-1" :class="invoice.auditStatus ? '-bottom-6' : '-bottom-2.5'">
                    <StatusBadge v-if="isViewed(invoice) && !invoice.auditStatus" type="viewed" />
                    <StatusBadge v-if="isExported(invoice)" type="exported" />
                  </div>
                </button>
              </div>
            </div>

            <div class="mt-4 h-px bg-slate-100" />
          </div>
        </div>
      </div>

      <div v-else class="py-8 text-center">
        <FileText class="mx-auto h-12 w-12 text-slate-300" :stroke-width="1.5" />
        <p class="mt-4 text-sm font-medium text-slate-600">Δεν βρέθηκαν τιμολόγια</p>
        <p class="mt-1 text-xs text-slate-400">Δοκιμάστε διαφορετική περίοδο αναζήτησης</p>
      </div>
    </div>

    <!-- Sticky Export Bar -->
    <Transition name="slide-up">
      <div
        v-if="selectedCount > 0"
        class="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/90 px-6 py-4 shadow-lg backdrop-blur-md"
      >
        <div class="mx-auto flex max-w-lg items-center justify-between">
          <p class="text-sm font-medium text-slate-700">
            Επιλεγμένα: <span class="font-bold text-primary-600">{{ selectedCount }}</span> τιμολόγια
          </p>
          <button
            type="button"
            :disabled="exporting"
            class="flex items-center gap-2 rounded-xl bg-primary-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-primary-600/30 transition hover:bg-primary-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none"
            @click="handleExport"
          >
            <Loader2 v-if="exporting" class="h-4 w-4 animate-spin" />
            <Download v-else class="h-4 w-4" />
            {{ exporting ? 'Εξαγωγή...' : 'Εξαγωγή ZIP' }}
          </button>
        </div>
      </div>
    </Transition>

    <!-- Invoice Detail Modal -->
    <InvoiceDetailModal
      :visible="modalVisible"
      :client-project-id="projectId"
      :supplier-id="modalSupplierId"
      :invoice-id="modalInvoiceId"
      :bucket-name="clientBucketName"
      :audit-status="modalAuditStatus"
      @update:audit-status="handleModalAuditStatusUpdate"
      @close="closeModal"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { ArrowLeft, Calendar, Search as SearchIcon, Loader2, Download, FileText, Check, X } from 'lucide-vue-next';

import Loader from '@/components/Loader.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import InvoiceDetailModal from '@/components/AccountantInvoiceDetailModal.vue';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { firebaseApp } from '@/services/firebase';
import { useClientInvoices } from '@/composables/useClientInvoices';
import { exportClientInvoices } from '@/services/api/exportApi';
import { getMonthOptions, getMonthRange } from '@/utils/date';
import { QUICK_PERIODS, getDateRangeForPeriod } from '@/composables/useQuickPeriods';
import { notify } from '@/services/notifications';
import type { InvoiceItem, SupplierGroup } from '@/modules/invoices/Invoice';

const db = getFirestore(firebaseApp);

const props = defineProps<{ projectId: string }>();

const route = useRoute();
const router = useRouter();
const {
  invoices,
  loading,
  error,
  groupedBySupplier,
  selectedCount,
  isViewed,
  isExported,
  isSelected,
  toggleSelection,
  toggleSupplierSelection,
  selectAll,
  deselectAll,
  loadInvoices,
  getSelectedInvoicePairs,
  markAsViewedLocal,
  setAuditStatus,
} = useClientInvoices();

const clientName = ref(props.projectId);
const clientBucketName = ref('');
const selectedPeriod = ref('');
const startDate = ref('');
const endDate = ref('');
const hasSearched = ref(false);
const isCollapsed = ref(false);
const exporting = ref(false);

const modalVisible = ref(false);
const modalSupplierId = ref('');
const modalInvoiceId = ref('');
const modalAuditStatus = ref<'registered' | 'denied' | null>(null);

const today = new Date();
const todayStr = today.toISOString().split('T')[0];
const quickPeriods = QUICK_PERIODS;

const searchQuery = ref('');

const filteredGroupedBySupplier = computed(() => {
  if (!searchQuery.value.trim()) return groupedBySupplier.value;
  const q = searchQuery.value.toLowerCase();
  return groupedBySupplier.value.filter((group) =>
    group.supplierName.toLowerCase().includes(q)
  );
});

const filteredInvoicesCount = computed(() => {
  return filteredGroupedBySupplier.value.reduce((acc, group) => acc + group.invoices.length, 0);
});

const isValidRange = computed(() => {
  return startDate.value && endDate.value && new Date(startDate.value) <= new Date(endDate.value);
});

const isAllSelected = computed(() => {
  return invoices.value.length > 0 && selectedCount.value === invoices.value.length;
});
const isPartiallySelected = computed(() => {
  return selectedCount.value > 0 && selectedCount.value < invoices.value.length;
});

function isGroupAllSelected(group: SupplierGroup): boolean {
  return group.invoices.every((inv) => isSelected(inv.invoiceId));
}
function isGroupPartiallySelected(group: SupplierGroup): boolean {
  const count = group.invoices.filter((inv) => isSelected(inv.invoiceId)).length;
  return count > 0 && count < group.invoices.length;
}

const formatDisplayDate = (dateStr: string): string => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('el-GR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const selectQuickPeriod = (period: { label: string; key: string }) => {
  selectedPeriod.value = period.label;
  const { startDate: s, endDate: e } = getDateRangeForPeriod(period.key);
  startDate.value = s;
  endDate.value = e;
  syncQueryParams();
};

function onCustomDateChanged() {
  selectedPeriod.value = '';
  syncQueryParams();
}

function syncQueryParams() {
  const query: Record<string, string> = {};
  if (selectedPeriod.value) {
    query.period = selectedPeriod.value;
  } else if (startDate.value && endDate.value) {
    query.from = startDate.value;
    query.to = endDate.value;
  }
  router.replace({ query });
}

async function searchInvoices() {
  if (!isValidRange.value) return;
  hasSearched.value = true;
  isCollapsed.value = true;
  await loadInvoices(props.projectId, startDate.value, endDate.value);
}

function toggleSelectAll() {
  if (isAllSelected.value) {
    deselectAll();
  } else {
    selectAll();
  }
}

function handleTileClick(event: MouseEvent, invoice: InvoiceItem) {
  if (event.shiftKey || event.ctrlKey || event.metaKey) {
    toggleSelection(invoice.invoiceId);
  } else {
    openModal(invoice);
  }
}

function openModal(invoice: InvoiceItem) {
  modalSupplierId.value = invoice.supplierId;
  modalInvoiceId.value = invoice.invoiceId;
  modalAuditStatus.value = invoice.auditStatus || null;
  modalVisible.value = true;
  markAsViewedLocal(invoice.invoiceId);
}

function closeModal() {
  modalVisible.value = false;
}

async function handleAuditStatus(invoice: InvoiceItem, status: 'registered' | 'denied' | null) {
  await setAuditStatus(props.projectId, invoice.supplierId, invoice.invoiceId, status);
}

async function handleModalAuditStatusUpdate(status: 'registered' | 'denied' | null) {
  modalAuditStatus.value = status;
  await setAuditStatus(props.projectId, modalSupplierId.value, modalInvoiceId.value, status);
}

async function handleExport() {
  if (selectedCount.value === 0) return;
  exporting.value = true;
  try {
    const pairs = getSelectedInvoicePairs();
    const response = await exportClientInvoices({
      clientProjectId: props.projectId,
      invoices: pairs,
    });
    if (response.success && response.data?.downloadUrl) {
      notify({ message: `Εξαγωγή ${response.data.invoiceCount} τιμολογίων ολοκληρώθηκε`, type: 'success' });
      window.open(response.data.downloadUrl, '_blank');
      await searchInvoices();
    } else {
      notify({ message: response.message || 'Δεν βρέθηκαν αρχεία PDF', type: 'error' });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Αποτυχία εξαγωγής τιμολογίων';
    notify({ message, type: 'error' });
  } finally {
    exporting.value = false;
  }
}

onMounted(async () => {
  try {
    const docSnap = await getDoc(doc(db, 'businesses', props.projectId));
    if (docSnap.exists()) {
      clientName.value = docSnap.data().displayName || props.projectId;
      clientBucketName.value = docSnap.data().bucketName || '';
    }
  } catch {
    /* proceed with projectId as fallback */
  }

  const periodParam = route.query.period as string | undefined;
  const fromParam = route.query.from as string | undefined;
  const toParam = route.query.to as string | undefined;

  if (periodParam) {
    const period = quickPeriods.find(p => p.label === periodParam);
    if (period) {
      selectQuickPeriod(period);
      searchInvoices();
    }
  } else if (fromParam && toParam) {
    startDate.value = fromParam;
    endDate.value = toParam;
    if (isValidRange.value) searchInvoices();
  }
});
</script>

<style scoped>
.date-input { -webkit-appearance: none; appearance: none; }
.date-input::-webkit-calendar-picker-indicator { opacity: 0.6; }

.collapse-enter-active, .collapse-leave-active {
  transition: all 0.3s ease; overflow: hidden;
}
.collapse-enter-from, .collapse-leave-to {
  opacity: 0; max-height: 0; padding-top: 0; padding-bottom: 0;
}
.collapse-enter-to, .collapse-leave-from { opacity: 1; max-height: 500px; }

.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.slide-up-enter-active, .slide-up-leave-active { transition: all 0.3s ease; }
.slide-up-enter-from, .slide-up-leave-to { transform: translateY(100%); opacity: 0; }
</style>
