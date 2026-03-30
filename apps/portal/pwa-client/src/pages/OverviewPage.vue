<template>
  <section class="w-full">
    <header class="mb-6">
      <div class="flex items-center justify-between">
      <h2 class="text-2xl font-semibold text-slate-900">Σύνοψη</h2>
        <button
          type="button"
          :disabled="loading"
          class="flex items-center gap-2 rounded-xl bg-primary-50 px-4 py-2 text-sm font-medium text-primary-600 transition hover:bg-primary-100 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
          @click="refreshInvoices"
        >
          <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': loading }" />
          Ανανέωση
        </button>
      </div>
      <p class="mt-1 text-sm text-slate-500">Ανεξόφλητα και μερικώς εξοφλημένα τιμολόγια</p>
    </header>

    <div class="mb-6 grid gap-4 sm:grid-cols-3">
      <div class="flex items-center gap-4 rounded-2xl bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
        <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
          <FileText class="h-6 w-6" />
        </div>
        <div>
          <p class="text-xs tracking-wide text-slate-400">Τιμολόγια</p>
          <p class="mt-0.5 text-2xl font-bold text-slate-900">{{ invoices.length }}</p>
        </div>
      </div>
      <div class="flex items-center gap-4 rounded-2xl bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
        <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
          <Building2 class="h-6 w-6" />
        </div>
        <div>
          <p class="text-xs tracking-wide text-slate-400">
            <span class="supplier-label-full">Προμηθευτές</span>
            <span class="supplier-label-short">Προμηθευτ.</span>
          </p>
          <p class="mt-0.5 text-2xl font-bold text-slate-900">{{ uniqueSupplierCount }}</p>
        </div>
      </div>
      <div class="flex items-center gap-4 rounded-2xl bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md sm:col-span-1">
        <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
          <Wallet class="h-6 w-6" />
        </div>
        <div>
          <p class="text-xs tracking-wide text-slate-400">Υπόλοιπα</p>
          <p class="mt-0.5 text-2xl font-bold text-slate-900">€ {{ totalAmount }}</p>
          <p v-if="hasOffset" class="mt-1 text-xs font-medium text-indigo-600">
            Με χρήση πιστωτικών: € {{ offsetAmount }}
          </p>
        </div>
      </div>
    </div>

    <!-- Suppliers Delivering Today -->
    <div v-if="suppliersDeliveringToday.length > 0" class="mb-6 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 p-4 shadow-sm">
      <div class="mb-3 flex flex-wrap items-center gap-2">
        <Truck class="h-5 w-5 text-emerald-600" />
        <h3 class="text-sm font-semibold text-emerald-800">Σημερινές Παραδόσεις</h3>
        <span class="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
          {{ suppliersDeliveringToday.length }}
        </span>
      </div>
      <div class="flex flex-wrap gap-2">
        <router-link
          v-for="supplier in suppliersDeliveringToday"
          :key="supplier.id"
          :to="{ name: 'supplier-invoices', params: { supplierId: supplier.id } }"
          class="flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-emerald-50 hover:text-emerald-700"
        >
          <span class="truncate">{{ supplier.name }}</span>
          <span v-if="supplier.delivery?.from" class="text-xs text-slate-400">
            {{ formatDeliveryTime(supplier.delivery) }}
          </span>
        </router-link>
      </div>
    </div>

    <Loader v-if="loading" label="Φόρτωση τιμολογίων..." />
    <p v-else-if="error" class="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-700">
      {{ error }}
    </p>

    <div v-else class="space-y-3 sm:space-y-4">
      <article
        v-for="invoice in invoices"
        :key="invoice.id"
        class="cursor-pointer rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.99]"
        @click="openDetailModal(invoice)"
      >
        <!-- Mobile Layout -->
        <div class="sm:hidden">
          <!-- Row 1: Supplier name + Payment button -->
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-semibold text-slate-900">
                {{ invoice.supplierName }}
              </p>
              <p class="mt-0.5 text-xs text-slate-400">
                {{ invoice.isCredit ? 'ΠΤ-' : 'ΤΔΑ-' }}{{ invoice.invoiceNumber ?? invoice.id }}
              </p>
            </div>
            <button
              type="button"
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600 transition hover:bg-primary-100 active:scale-95"
              @click.stop="openPaymentModal(invoice)"
            >
              <Wallet class="h-5 w-5" />
            </button>
          </div>
          <!-- Row 2: Amounts -->
          <div class="mt-3 flex items-baseline justify-between">
            <p class="text-lg font-bold text-slate-900">
              € {{ formatCurrency(getDisplayAmount(invoice)) }}
            </p>
            <p class="text-sm font-medium" :class="invoice.unpaidAmount ? 'text-amber-600' : 'text-emerald-600'">
              Υπόλοιπο: € {{ formatCurrency(getDisplayUnpaidAmount(invoice)) }}
            </p>
          </div>
          <!-- Row 3: Badges -->
          <div class="mt-3 flex flex-wrap items-center gap-2">
            <ExpiryBadge :invoice-date="invoice.invoiceDate" />
            <StatusBadge :status="invoice.paymentStatus ?? invoice.status" :is-credit="invoice.isCredit" />
          </div>
        </div>

        <!-- Desktop Layout (sm+) -->
        <div class="hidden sm:flex sm:items-center sm:justify-between">
          <div class="flex-1">
            <p class="text-sm font-semibold text-slate-900">
              {{ invoice.supplierName }}
            </p>
            <p class="text-xs text-slate-500">
              {{ invoice.isCredit ? 'ΠΤ-' : 'ΤΔΑ-' }}{{ invoice.invoiceNumber ?? invoice.id }}
            </p>
          </div>
          <div class="text-right">
            <p class="text-sm font-semibold text-slate-900">
              € {{ formatCurrency(getDisplayAmount(invoice)) }}
            </p>
            <p class="text-xs" :class="invoice.unpaidAmount ? 'text-amber-600' : 'text-emerald-600'">
              Ανεξόφλητο: € {{ formatCurrency(getDisplayUnpaidAmount(invoice)) }}
            </p>
          </div>
          <div class="ml-4 flex items-center gap-2">
            <ExpiryBadge :invoice-date="invoice.invoiceDate" />
            <StatusBadge :status="invoice.paymentStatus ?? invoice.status" :is-credit="invoice.isCredit" />
            <button
              type="button"
              class="flex h-9 items-center gap-2 rounded-xl bg-primary-50 px-3 text-primary-600 transition hover:bg-primary-100 active:scale-95"
              @click.stop="openPaymentModal(invoice)"
            >
              <Wallet class="h-5 w-5" />
              <span class="text-sm font-medium">Πληρωμή</span>
            </button>
          </div>
        </div>
      </article>
    </div>

    <div v-if="!loading && invoices.length === 0" class="mt-8 rounded-3xl border border-dashed border-slate-200 bg-white p-10 text-center">
      <FileText class="mx-auto h-12 w-12 text-slate-300" />
      <p class="mt-4 text-sm font-medium text-slate-600">Δεν βρέθηκαν ανεξόφλητα τιμολόγια</p>
      <p class="mt-1 text-xs text-slate-400">Όλα τα τιμολόγιά σας είναι εξοφλημένα</p>
    </div>

    <!-- Invoice Detail Modal -->
    <InvoiceDetailView
      v-if="detailInvoice"
      :is-open="detailModalOpen"
      :invoice="detailInvoice"
      @close="closeDetailModal"
      @updated="handleInvoiceUpdated"
    />

    <!-- Payment Modal -->
    <PaymentModal
      :is-open="paymentModalOpen"
      :invoice-id="selectedInvoice?.id ?? ''"
      :supplier-id="selectedInvoice?.supplierId ?? selectedInvoice?.supplierTaxNumber ?? ''"
      :supplier-name="selectedInvoice?.supplierName ?? ''"
      :total-amount="selectedInvoice?.unpaidAmount ?? selectedInvoice?.totalAmount ?? 0"
      :available-credits="availableCreditsForSelected"
      :loading="submitting"
      :status="modalStatus"
      :error-message="modalErrorMessage"
      :error-details="modalErrorDetails"
      @close="closePaymentModal"
      @submit="handlePaymentSubmit"
      @retry="handlePaymentRetry"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { RefreshCw, FileText, Building2, Wallet, Truck } from 'lucide-vue-next';

import ExpiryBadge from '@/components/ExpiryBadge.vue';
import InvoiceDetailView from '@/components/InvoiceDetailView.vue';
import Loader from '@/components/Loader.vue';
import PaymentModal from '@/components/PaymentModal.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import { useFirestore } from '@/composables/useFirestore';
import type { Invoice } from '@/modules/invoices/InvoiceMapper';
import type { Supplier } from '@/modules/suppliers/Supplier';
import { PaymentError, updatePaymentStatus } from '@/services/api/updatePaymentStatus';
import { formatCurrency } from '@/utils/date';
import { useUserStore } from '@/store/userStore';

const route = useRoute();
const { fetchUnpaidInvoices, fetchSuppliersDeliveringToday, needsDeliveryCacheRefresh } = useFirestore();
const userStore = useUserStore();

const invoices = ref<Invoice[]>([]);
const suppliersDeliveringToday = ref<Supplier[]>([]);
const lastFetchTime = ref(0);
const loading = ref(true);
const error = ref<string | null>(null);

// Invoice detail modal state
const detailModalOpen = ref(false);
const detailInvoice = ref<Invoice | null>(null);

// Payment modal state
const paymentModalOpen = ref(false);
const selectedInvoice = ref<Invoice | null>(null);
const modalStatus = ref<'form' | 'success' | 'error'>('form');
const modalErrorMessage = ref('');
const modalErrorDetails = ref<string[]>([]);

const availableCreditsForSelected = computed(() => {
  if (!selectedInvoice.value) return [];
  const supplierKey = selectedInvoice.value.supplierId ?? selectedInvoice.value.supplierTaxNumber;
  return invoices.value.filter(
    (inv) => 
      (inv.supplierId === supplierKey || inv.supplierTaxNumber === supplierKey) && 
      inv.isCredit && 
      (inv.unpaidAmount ?? 0) > 0
  );
});

const debtCalculations = computed(() => {
  const supplierDebts = new Map<string, { debit: number; credit: number }>();

  for (const inv of invoices.value) {
    const supplierKey = inv.supplierId ?? inv.supplierTaxNumber ?? 'unknown';
    const amount = inv.unpaidAmount ?? inv.totalAmount ?? 0;
    
    if (!supplierDebts.has(supplierKey)) {
      supplierDebts.set(supplierKey, { debit: 0, credit: 0 });
    }
    
    const current = supplierDebts.get(supplierKey)!;
    if (inv.isCredit) {
      current.credit += amount;
    } else {
      current.debit += amount;
    }
  }

  let totalDebt = 0;
  let totalOffset = 0;

  for (const { debit, credit } of supplierDebts.values()) {
    const netDebt = debit - credit;
    if (netDebt > 0) {
      totalDebt += netDebt;
      totalOffset += credit;
    } else if (debit > 0) {
      // If credit >= debit, we can only offset up to the debit amount
      totalOffset += debit;
    }
  }

  // The total amount shown is the sum of all positive debts BEFORE offset
  // Wait, the plan says:
  // `totalAmount` = Sum of all positive `supplierDebt`.
  // Wait, if supplierDebt = sum(debit unpaid) - sum(credit unpaid).
  // If `supplierDebt < 0`, treat as 0.
  // `totalAmount` = Sum of all positive `supplierDebt`.
  // Wait, the plan says: "Το Υπόλοιπο της σύνοψης θα παραμένει το άθροισμα των ανεξόφλητων τιμολογίων όπως τώρα, απλα στο ίδιο element σύνοψης, κατω κατω me indigo χρώμα(το ιδιο του πιστωτικού) θα αναφέρουμε οτι με το υπόλοιπο ειναι Χ Ευρω με χρήση του πιστωτικού"
  // So `totalAmount` should be the sum of all DEBITS.
  // And the offset text should say "Με χρήση πιστωτικών: € [totalAmount - totalPossibleCreditOffset]"
  
  let rawTotalDebt = 0;
  let possibleOffset = 0;

  for (const { debit, credit } of supplierDebts.values()) {
    rawTotalDebt += debit;
    if (debit > 0 && credit > 0) {
      possibleOffset += Math.min(debit, credit);
    }
  }

  return {
    rawTotalDebt,
    possibleOffset,
    netDebt: rawTotalDebt - possibleOffset
  };
});

const totalAmount = computed(() => formatCurrency(debtCalculations.value.rawTotalDebt));
const offsetAmount = computed(() => formatCurrency(debtCalculations.value.netDebt));
const hasOffset = computed(() => debtCalculations.value.possibleOffset > 0);

const uniqueSupplierCount = computed(() => {
  const supplierIds = new Set(invoices.value.map((inv) => inv.supplierId ?? inv.supplierTaxNumber));
  return supplierIds.size;
});

const getDisplayAmount = (invoice: Invoice) => {
  const amount = invoice.totalAmount ?? 0;
  return invoice.isCredit ? -amount : amount;
};

const getDisplayUnpaidAmount = (invoice: Invoice) => {
  const amount = invoice.unpaidAmount ?? 0;
  return invoice.isCredit ? -amount : amount;
};

// Format delivery time for display
const formatDeliveryTime = (delivery: Supplier['delivery']): string => {
  if (!delivery) return '';
  const formatTime = (time?: { hour: number; minute: number }) => {
    if (!time) return '';
    return `${time.hour.toString().padStart(2, '0')}:${time.minute.toString().padStart(2, '0')}`;
  };
  const from = formatTime(delivery.from);
  const to = formatTime(delivery.to);
  if (from && to) return `${from}-${to}`;
  if (from) return `από ${from}`;
  if (to) return `έως ${to}`;
  return '';
};

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

const openPaymentModal = (invoice: Invoice) => {
  selectedInvoice.value = invoice;
  modalStatus.value = 'form';
  modalErrorMessage.value = '';
  modalErrorDetails.value = [];
  paymentModalOpen.value = true;
};

const closePaymentModal = () => {
  paymentModalOpen.value = false;
  // Delay resetting state so the closing animation completes
  setTimeout(() => {
    selectedInvoice.value = null;
    modalStatus.value = 'form';
    modalErrorMessage.value = '';
    modalErrorDetails.value = [];
  }, 300);
};

const handlePaymentRetry = () => {
  modalStatus.value = 'form';
  modalErrorMessage.value = '';
  modalErrorDetails.value = [];
};

const submitting = ref(false);

const handlePaymentSubmit = async (payload: { invoiceId: string; supplierId: string; amount: number; creditInvoiceId?: string; creditAmountUsed?: number }) => {
  if (submitting.value || !selectedInvoice.value) return;

  submitting.value = true;
  const invoiceTotalAmount = selectedInvoice.value.unpaidAmount ?? selectedInvoice.value.totalAmount ?? 0;
  const isFullPayment = payload.amount >= invoiceTotalAmount;

  try {
    await updatePaymentStatus({
      supplierId: payload.supplierId,
      invoiceId: payload.invoiceId,
      action: isFullPayment ? 'pay' : 'partial',
      amount: payload.amount,
      paymentDate: new Date().toISOString(),
      creditInvoiceId: payload.creditInvoiceId,
      creditAmountUsed: payload.creditAmountUsed,
    });

    // Update local state to reflect payment
    const invoice = invoices.value.find((inv) => inv.id === payload.invoiceId);
    if (invoice) {
      if (isFullPayment) {
        // Remove from unpaid list
        invoices.value = invoices.value.filter((inv) => inv.id !== payload.invoiceId);
      } else {
        // Update unpaid amount
        invoice.unpaidAmount = (invoice.unpaidAmount ?? invoice.totalAmount ?? 0) - payload.amount;
        invoice.paymentStatus = 'partially_paid';
      }
    }
    
    // Update credit invoice if used
    if (payload.creditInvoiceId && payload.creditAmountUsed) {
      const creditInvoice = invoices.value.find((inv) => inv.id === payload.creditInvoiceId);
      if (creditInvoice) {
        creditInvoice.unpaidAmount = (creditInvoice.unpaidAmount ?? creditInvoice.totalAmount ?? 0) - payload.creditAmountUsed;
        if (creditInvoice.unpaidAmount <= 0) {
          invoices.value = invoices.value.filter((inv) => inv.id !== payload.creditInvoiceId);
        }
      }
    }

    // Show success state in modal
    modalStatus.value = 'success';
  } catch (err) {
    console.error('Payment failed:', err);
    if (err instanceof PaymentError) {
      modalErrorMessage.value = err.message;
      modalErrorDetails.value = err.details;
    } else {
      modalErrorMessage.value = err instanceof Error ? err.message : 'Αποτυχία καταχώρησης πληρωμής';
      modalErrorDetails.value = [];
    }
    modalStatus.value = 'error';
  } finally {
    submitting.value = false;
  }
};

const refreshInvoices = async () => {
  loading.value = true;
  error.value = null;
  try {
    // Fetch both invoices and suppliers delivering today in parallel
    const [fetchedInvoices, fetchedSuppliers] = await Promise.all([
      fetchUnpaidInvoices(),
      fetchSuppliersDeliveringToday(),
    ]);
    invoices.value = fetchedInvoices;
    suppliersDeliveringToday.value = fetchedSuppliers;
    lastFetchTime.value = Date.now();
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Αδυναμία φόρτωσης τιμολογίων';
  } finally {
    loading.value = false;
  }
};

// Refresh suppliers if day has changed (midnight case)
const refreshSuppliersIfDayChanged = async () => {
  if (needsDeliveryCacheRefresh()) {
    console.info('[OverviewPage] Day changed, refreshing suppliers delivering today');
    try {
      suppliersDeliveringToday.value = await fetchSuppliersDeliveringToday();
    } catch (err) {
      console.error('[OverviewPage] Failed to refresh suppliers:', err);
    }
  }
};

// Handle visibility change (when user tabs back or resumes app)
const handleVisibilityChange = () => {
  if (document.visibilityState === 'visible') {
    refreshSuppliersIfDayChanged();
  }
};

onMounted(() => {
  if (userStore.isAccountant) {
    console.log(`accountant: ${userStore.user?.email}`);
  }
  refreshInvoices();
  // Listen for visibility changes (handles midnight case when app resumes)
  document.addEventListener('visibilitychange', handleVisibilityChange);
});

onUnmounted(() => {
  document.removeEventListener('visibilitychange', handleVisibilityChange);
});

// Auto-refresh when navigating back to this page (data might be stale)
watch(
  () => route.path,
  (newPath) => {
    if (newPath === '/' || newPath === '/home') {
      // Always check if day changed for suppliers
      refreshSuppliersIfDayChanged();

      const now = Date.now();
      // Only refresh invoices if more than 30 seconds since last fetch
      if (now - lastFetchTime.value > 30000) {
        refreshInvoices();
      }
    }
  }
);
</script>

<style scoped>
/* Very small screens (≤ 370px): show short supplier label */
@media (max-width: 370px) {
  .supplier-label-full {
    display: none;
  }

  .supplier-label-short {
    display: inline;
  }
}

/* Screens > 370px: show full supplier label */
@media (min-width: 371px) {
  .supplier-label-full {
    display: inline;
  }

  .supplier-label-short {
    display: none;
  }
}
</style>
