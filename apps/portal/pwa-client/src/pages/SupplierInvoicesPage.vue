<template>
  <section class="w-full">
    <!-- Back navigation -->
    <button
      type="button"
      class="mb-4 flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-700"
      @click="goBack"
    >
      <ChevronLeft class="h-4 w-4" />
      Προμηθευτές
    </button>

    <!-- Supplier Header -->
    <header v-if="supplier" class="mb-8 rounded-3xl bg-gradient-to-br from-primary-600 to-primary-700 p-6 text-white shadow-lg">
      <div class="flex items-start justify-between gap-4">
        <div class="min-w-0 flex-1">
          <p class="text-xs font-medium uppercase tracking-widest text-primary-200">ΠΡΟΜΗΘΕΥΤΗΣ</p>
          <h1 class="mt-1 text-2xl font-bold sm:text-3xl">{{ supplier.name }}</h1>
          <div class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-primary-100">
            <span v-if="supplier.supplierTaxNumber || supplier.id" class="flex items-center gap-1.5">
              <FileText class="h-4 w-4" />
              ΑΦΜ: {{ supplier.supplierTaxNumber ?? supplier.id }}
            </span>
            <span v-if="supplier.contactEmail" class="flex items-center gap-1.5">
              <Mail class="h-4 w-4" />
              {{ supplier.contactEmail }}
            </span>
            <span v-if="supplier.contactPhone" class="flex items-center gap-1.5">
              <Phone class="h-4 w-4" />
              {{ supplier.contactPhone }}
            </span>
            <!-- Delivery Info -->
            <span v-if="hasDeliveryInfo" class="flex items-center gap-1.5">
              <ArrowLeftRight class="h-4 w-4" />
              Παραδίδει: {{ deliveryDayLabel }}<template v-if="deliveryTimeRange">, {{ deliveryTimeRange }}</template>
            </span>
          </div>
        </div>

        <!-- Right side: Status + Edit button -->
        <div class="flex flex-col items-end gap-3">
          <!-- Edit Button -->
          <button
            type="button"
            class="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white transition hover:bg-white/20"
            aria-label="Επεξεργασία προμηθευτή"
            @click="openSupplierEditModal"
          >
            <Pencil class="h-5 w-5" />
          </button>

          <!-- Status Badge -->
        <span v-if="supplier.status" :class="statusBadgeClass">
          {{ statusLabel }}
        </span>
        </div>
      </div>
    </header>

    <!-- Loading state for supplier -->
    <Loader v-else-if="supplierLoading" label="Φόρτωση προμηθευτή..." />

    <!-- Invoices Section -->
    <div class="rounded-3xl bg-white p-6 shadow-lg">
      <header class="mb-4 flex items-center justify-between">
        <h2 class="text-xl font-semibold text-slate-900">Τιμολόγια</h2>
        <p v-if="invoices.length > 0" class="text-sm text-slate-500">
          {{ invoices.length }} {{ invoices.length === 1 ? 'τιμολόγιο' : 'τιμολόγια' }}
        </p>
      </header>

      <Loader v-if="invoiceLoading" label="Φόρτωση τιμολογίων..." />
      <p v-else-if="invoiceError" class="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-700">
        {{ invoiceError }}
      </p>
      <div v-else class="grid gap-4 md:grid-cols-2">
        <InvoicePreviewCard
          v-for="invoice in invoices"
          :key="invoice.id"
          :invoice="invoice"
          @select="selectInvoice"
          @payment="openPaymentModal"
        />
      </div>
      
      <div v-if="hasMore" class="mt-8 flex justify-center">
        <button
          type="button"
          :disabled="loadingMore"
          class="flex items-center gap-2 rounded-xl bg-slate-100 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
          @click="loadMoreInvoices(supplierId)"
        >
          <Loader2 v-if="loadingMore" class="h-4 w-4 animate-spin" />
          {{ loadingMore ? 'Φόρτωση...' : 'Φόρτωση περισσότερων' }}
        </button>
      </div>

      <div v-if="!invoiceLoading && invoices.length === 0" class="py-8 text-center">
        <FileText class="mx-auto h-12 w-12 text-slate-300" :stroke-width="1.5" />
        <p class="mt-4 text-sm font-medium text-slate-600">Δεν βρέθηκαν τιμολόγια</p>
        <p class="mt-1 text-xs text-slate-400">Δεν υπάρχουν τιμολόγια για αυτόν τον προμηθευτή</p>
      </div>
    </div>

    <!-- Invoice Detail Modal -->
    <InvoiceDetailView
      v-if="selectedInvoice"
      :is-open="detailModalOpen"
      :invoice="selectedInvoice"
      @close="clearInvoiceSelection"
      @updated="handleInvoiceUpdated"
    />

    <!-- Supplier Edit Modal -->
    <SupplierEditModal
      v-if="supplier"
      :is-open="supplierEditModalOpen"
      :supplier="supplier"
      @close="closeSupplierEditModal"
      @updated="handleSupplierUpdated"
    />

    <!-- Payment Modal -->
    <PaymentModal
      :is-open="paymentModalOpen"
      :invoice-id="paymentInvoice?.id ?? ''"
      :supplier-id="paymentInvoice?.supplierId ?? paymentInvoice?.supplierTaxNumber ?? supplierId"
      :supplier-name="paymentInvoice?.supplierName ?? supplier?.name ?? ''"
      :total-amount="paymentInvoice?.unpaidAmount ?? paymentInvoice?.totalAmount ?? 0"
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
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ChevronLeft, FileText, Mail, Phone, ArrowLeftRight, Pencil, Loader2 } from 'lucide-vue-next';

import InvoiceDetailView from '@/components/InvoiceDetailView.vue';
import InvoicePreviewCard from '@/components/InvoicePreviewCard.vue';
import Loader from '@/components/Loader.vue';
import PaymentModal from '@/components/PaymentModal.vue';
import SupplierEditModal from '@/components/SupplierEditModal.vue';
import { clearDeliveryCache } from '@/composables/useFirestore';
import { useSupplierInvoices } from '@/composables/useSupplierInvoices';
import { useSuppliers } from '@/composables/useSuppliers';
import type { Invoice } from '@/modules/invoices/InvoiceMapper';
import type { Supplier } from '@/modules/suppliers/Supplier';
import { PaymentError, updatePaymentStatus } from '@/services/api/updatePaymentStatus';
import { useSupplierStore } from '@/store/supplierStore';

const route = useRoute();
const router = useRouter();
const supplierStore = useSupplierStore();
const { hydrate } = useSuppliers();
const { invoices, loading: invoiceLoading, loadingMore, hasMore, error: invoiceError, loadInvoices, loadMoreInvoices, updateInvoice } = useSupplierInvoices();

const supplierId = computed(() => route.params.supplierId as string);
const supplier = ref<Supplier | null>(null);
const supplierLoading = ref(true);

// Invoice detail state
const selectedInvoice = ref<Invoice | null>(null);
const detailModalOpen = ref(false);

// Supplier edit modal state
const supplierEditModalOpen = ref(false);

// Payment modal state
const paymentModalOpen = ref(false);
const paymentInvoice = ref<Invoice | null>(null);
const modalStatus = ref<'form' | 'success' | 'error'>('form');
const modalErrorMessage = ref('');
const modalErrorDetails = ref<string[]>([]);
const submitting = ref(false);

const availableCreditsForSelected = computed(() => {
  return invoices.value.filter(
    (inv) => inv.isCredit && (inv.unpaidAmount ?? 0) > 0
  );
});

// Days of week mapping for display
const daysOfWeekLabels: Record<number, string> = {
  1: 'Δευτέρα',
  2: 'Τρίτη',
  3: 'Τετάρτη',
  4: 'Πέμπτη',
  5: 'Παρασκευή',
  6: 'Σάββατο',
  7: 'Κυριακή',
};

// Delivery info computed properties
const hasDeliveryInfo = computed(() => {
  return supplier.value?.delivery?.dayOfWeek !== undefined;
});

const deliveryDayLabel = computed(() => {
  const dayOfWeek = supplier.value?.delivery?.dayOfWeek;
  if (dayOfWeek === undefined) return '';
  return daysOfWeekLabels[dayOfWeek] ?? '';
});

const formatTime = (hour?: number, minute?: number): string => {
  if (hour === undefined) return '';
  const h = hour.toString().padStart(2, '0');
  const m = (minute ?? 0).toString().padStart(2, '0');
  return `${h}:${m}`;
};

const deliveryTimeRange = computed(() => {
  const delivery = supplier.value?.delivery;
  if (!delivery) return '';

  const fromTime = formatTime(delivery.from?.hour, delivery.from?.minute);
  const toTime = formatTime(delivery.to?.hour, delivery.to?.minute);

  if (fromTime && toTime) {
    return `${fromTime} - ${toTime}`;
  } else if (fromTime) {
    return `από ${fromTime}`;
  } else if (toTime) {
    return `έως ${toTime}`;
  }
  return '';
});

const statusBadgeClass = computed(() => {
  const base = 'rounded-full px-3 py-1 text-xs font-semibold';
  switch (supplier.value?.status) {
    case 'active':
      return `${base} bg-white/20 text-white`;
    case 'prospect':
      return `${base} bg-amber-400/20 text-amber-100`;
    case 'inactive':
      return `${base} bg-white/10 text-primary-200`;
    default:
      return `${base} bg-white/20 text-white`;
  }
});

const statusLabel = computed(() => {
  switch (supplier.value?.status) {
    case 'active':
      return 'Ενεργός';
    case 'prospect':
      return 'Υποψήφιος';
    case 'inactive':
      return 'Ανενεργός';
    default:
      return supplier.value?.status ?? '';
  }
});

const goBack = () => {
  router.push({ name: 'suppliers' });
};

const loadSupplierData = async () => {
  supplierLoading.value = true;
  try {
    // Ensure suppliers are loaded in the store
    await hydrate();
    // Get supplier from store
    supplier.value = supplierStore.getSupplierById(supplierId.value) ?? null;
    // Load invoices
    await loadInvoices(supplierId.value);
  } finally {
    supplierLoading.value = false;
  }
};

// Invoice selection - use already loaded data (no Firebase call needed)
const selectInvoice = (invoiceId: string) => {
  const invoice = invoices.value.find((inv) => inv.id === invoiceId);
  if (invoice) {
    selectedInvoice.value = invoice;
    detailModalOpen.value = true;
  }
};

const clearInvoiceSelection = () => {
  detailModalOpen.value = false;
  setTimeout(() => {
    selectedInvoice.value = null;
  }, 300);
};

// Supplier edit modal functions
const openSupplierEditModal = () => {
  supplierEditModalOpen.value = true;
};

const closeSupplierEditModal = () => {
  supplierEditModalOpen.value = false;
};

const handleSupplierUpdated = (updatedSupplier: Supplier) => {
  // Update local state
  supplier.value = updatedSupplier;
  // Also update the store
  supplierStore.updateSupplier(updatedSupplier);
  // Clear delivery cache so overview page fetches fresh data
  clearDeliveryCache();
};

// Payment modal functions
const openPaymentModal = (invoice: Invoice) => {
  paymentInvoice.value = invoice;
  modalStatus.value = 'form';
  modalErrorMessage.value = '';
  modalErrorDetails.value = [];
  paymentModalOpen.value = true;
};

// Handle invoice updated from detail view
const handleInvoiceUpdated = (updatedInvoice: Invoice) => {
  // Update the invoice in the local array
  updateInvoice(updatedInvoice);
  // Also update the selected invoice ref so the modal shows updated data
  selectedInvoice.value = updatedInvoice;
};

const closePaymentModal = () => {
  paymentModalOpen.value = false;
  setTimeout(() => {
    paymentInvoice.value = null;
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

const handlePaymentSubmit = async (payload: { invoiceId: string; supplierId: string; amount: number; paymentDate: string; creditInvoiceId?: string; creditAmountUsed?: number }) => {
  if (submitting.value || !paymentInvoice.value) return;

  submitting.value = true;
  const invoiceTotalAmount = paymentInvoice.value.unpaidAmount ?? paymentInvoice.value.totalAmount ?? 0;
  const isFullPayment = payload.amount >= invoiceTotalAmount;

  try {
    await updatePaymentStatus({
      supplierId: payload.supplierId,
      invoiceId: payload.invoiceId,
      action: isFullPayment ? 'pay' : 'partial',
      amount: payload.amount,
      paymentDate: payload.paymentDate ? new Date(payload.paymentDate).toISOString() : new Date().toISOString(),
      creditInvoiceId: payload.creditInvoiceId,
      creditAmountUsed: payload.creditAmountUsed,
    });

    // Update local state to reflect payment
    const invoice = invoices.value.find((inv) => inv.id === payload.invoiceId);
    if (invoice) {
      if (isFullPayment) {
        invoice.paymentStatus = 'paid';
        invoice.unpaidAmount = 0;
      } else {
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
          creditInvoice.paymentStatus = 'paid';
        }
      }
    }

    // Also update selectedInvoice if it's the same invoice
    if (selectedInvoice.value?.id === payload.invoiceId) {
      if (isFullPayment) {
        selectedInvoice.value.paymentStatus = 'paid';
        selectedInvoice.value.unpaidAmount = 0;
      } else {
        selectedInvoice.value.unpaidAmount = (selectedInvoice.value.unpaidAmount ?? selectedInvoice.value.totalAmount ?? 0) - payload.amount;
        selectedInvoice.value.paymentStatus = 'partially_paid';
      }
    }

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

// Load data when route changes
watch(supplierId, () => {
  loadSupplierData();
});

onMounted(() => {
  loadSupplierData();
});
</script>
