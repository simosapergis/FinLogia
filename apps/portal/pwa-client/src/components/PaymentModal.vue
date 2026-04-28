<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="isOpen"
        class="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
        @click.self="handleClose"
      >
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" @click="handleClose" />

        <!-- Modal Panel -->
        <div
          class="relative w-full max-w-md rounded-t-3xl bg-white px-6 pb-8 pt-4 shadow-2xl sm:rounded-3xl sm:m-4"
        >
          <!-- Drag indicator (mobile) -->
          <div class="mx-auto mb-4 h-1 w-10 rounded-full bg-slate-300 sm:hidden" />

          <!-- SUCCESS STATE -->
          <Transition name="fade" mode="out-in">
            <div v-if="status === 'success'" key="success" class="text-center py-4">
              <!-- Success icon -->
              <div class="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
                <svg class="h-10 w-10 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 class="mb-2 text-xl font-semibold text-slate-900">Επιτυχής Καταχώρηση!</h3>
              <p class="mb-8 text-sm text-slate-500">
                Η πληρωμή καταχωρήθηκε επιτυχώς για το τιμολόγιο του προμηθευτή
                <span class="font-medium text-slate-700">{{ supplierName }}</span>
              </p>
              <button
                type="button"
                class="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 text-base font-semibold text-white shadow-lg shadow-emerald-600/30 transition hover:bg-emerald-700 active:scale-[0.98]"
                @click="handleClose"
              >
                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
                Κλείσιμο
              </button>
            </div>

            <!-- ERROR STATE -->
            <div v-else-if="status === 'error'" key="error" class="text-center py-4">
              <!-- Error icon -->
              <div class="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-rose-100">
                <svg class="h-10 w-10 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 class="mb-2 text-xl font-semibold text-slate-900">Αποτυχία Καταχώρησης</h3>
              <p class="mb-4 text-sm text-slate-500">
                Η πληρωμή δεν καταχωρήθηκε για το τιμολόγιο του προμηθευτή
                <span class="font-medium text-slate-700">{{ supplierName }}</span>
              </p>
              <!-- Error message box -->
              <div class="mb-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-left">
                <p class="text-sm font-semibold text-rose-800">{{ errorMessage }}</p>
                <ul v-if="errorDetails && errorDetails.length > 0" class="mt-2 space-y-1">
                  <li
                    v-for="(detail, index) in errorDetails"
                    :key="index"
                    class="flex items-start gap-2 text-sm text-rose-700"
                  >
                    <svg class="mt-0.5 h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01" />
                    </svg>
                    {{ detail }}
                  </li>
                </ul>
              </div>
              <!-- Action buttons -->
              <div class="flex gap-3">
                <button
                  type="button"
                  class="flex h-14 flex-1 items-center justify-center gap-2 rounded-xl border-2 border-slate-200 bg-white text-base font-semibold text-slate-700 transition hover:bg-slate-50 active:scale-[0.98]"
                  @click="handleClose"
                >
                  Κλείσιμο
                </button>
                <button
                  type="button"
                  class="flex h-14 flex-1 items-center justify-center gap-2 rounded-xl bg-primary-600 text-base font-semibold text-white shadow-lg shadow-primary-600/30 transition hover:bg-primary-700 active:scale-[0.98]"
                  @click="handleRetry"
                >
                  <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Επανάληψη
                </button>
              </div>
            </div>

            <!-- FORM STATE -->
            <div v-else key="form">
              <!-- Header -->
              <div class="mb-6 flex items-center justify-between">
                <div>
                  <h3 class="text-lg font-semibold text-slate-900">Καταχώρηση Πληρωμής</h3>
                  <p class="text-sm text-slate-500">{{ supplierName }}</p>
                </div>
                <button
                  type="button"
                  class="flex h-10 w-10 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                  @click="handleClose"
                >
                  <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <!-- Total info -->
              <div class="mb-6 rounded-2xl bg-slate-50 p-4">
                <p class="text-xs uppercase tracking-wide text-slate-400">Συνολικό Ποσό</p>
                <p class="text-2xl font-bold text-slate-900">€ {{ formatCurrency(totalAmount) }}</p>
              </div>

              <!-- Credit Offset Section -->
              <div v-if="availableCredits && availableCredits.length > 0" class="mb-6 rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4">
                <label class="flex items-center gap-3 cursor-pointer">
                  <input v-model="useCredit" type="checkbox" class="h-5 w-5 rounded border-indigo-300 text-indigo-600 focus:ring-indigo-500" />
                  <span class="text-sm font-medium text-indigo-900">Χρήση πιστωτικού για την εξόφληση</span>
                </label>
                
                <div v-if="useCredit" class="mt-4 space-y-4">
                  <div>
                    <label class="mb-1.5 block text-xs font-medium text-indigo-800">Επιλογή Πιστωτικού</label>
                    <select
                      v-model="selectedCreditId"
                      class="w-full rounded-xl border-2 border-indigo-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    >
                      <option value="" disabled>Επιλέξτε πιστωτικό...</option>
                      <option v-for="credit in availableCredits" :key="credit.id" :value="credit.id">
                        ΠΤ-{{ credit.invoiceNumber ?? credit.id }} (Διαθέσιμο: € {{ formatCurrency(credit.unpaidAmount) }})
                      </option>
                    </select>
                  </div>
                  
                  <div v-if="selectedCreditId">
                    <label class="mb-1.5 block text-xs font-medium text-indigo-800">Ποσό Πιστωτικού προς χρήση</label>
                    <div class="relative">
                      <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">€</span>
                      <input
                        v-model.number="creditAmountUsed"
                        type="number"
                        step="0.01"
                        min="0"
                        :max="maxCreditAmount"
                        class="w-full rounded-xl border-2 border-indigo-200 bg-white pl-8 pr-3 py-2 text-sm font-semibold text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        :class="{ 'border-rose-300 focus:border-rose-500 focus:ring-rose-500/20': creditAmountError }"
                        @blur="creditAmountUsed = roundAmount(creditAmountUsed)"
                      />
                    </div>
                    <p v-if="creditAmountError" class="mt-1.5 text-xs font-medium text-rose-500">{{ creditAmountError }}</p>
                  </div>
                </div>
              </div>

              <!-- Payment Date section -->
              <div class="mb-6">
                <label class="mb-2 block text-sm font-medium text-slate-700">Ημερομηνία Πληρωμής</label>
                <div class="relative">
                  <input
                    v-model="paymentDate"
                    type="date"
                    lang="el-GR"
                    class="h-14 w-full rounded-xl border-2 border-slate-200 bg-white px-4 text-lg font-semibold text-slate-900 transition focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-500/20"
                    :class="{ 'border-rose-300 focus:border-rose-500 focus:ring-rose-500/20': paymentDateError }"
                  />
                </div>
                <p v-if="paymentDateError" class="mt-2 text-sm text-rose-600">{{ paymentDateError }}</p>
              </div>

              <!-- Amount input section -->
              <div class="mb-6" v-if="remainingAmountToPay > 0">
                <label class="mb-2 block text-sm font-medium text-slate-700">Ποσό Πληρωμής (Μετρητά/Κάρτα)</label>
                <div class="flex gap-3">
                  <!-- Input with euro sign -->
                  <div class="relative flex-1">
                    <span class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">€</span>
                    <input
                      v-model.number="amount"
                      type="number"
                      step="0.01"
                      min="0"
                      :max="remainingAmountToPay"
                      placeholder="0.00"
                      class="h-14 w-full rounded-xl border-2 border-slate-200 bg-white pl-9 pr-4 text-lg font-semibold text-slate-900 transition focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-500/20"
                      :class="{ 'border-rose-300 focus:border-rose-500 focus:ring-rose-500/20': amountError }"
                      @blur="amount = roundAmount(amount)"
                    />
                  </div>
                  <!-- Full payment button -->
                  <button
                    type="button"
                    class="flex h-14 shrink-0 items-center gap-2 rounded-xl bg-slate-100 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 active:scale-95"
                    @click="fillTotalAmount"
                  >
                    <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span class="hidden sm:inline">Ολική πληρωμή</span>
                    <span class="sm:hidden">Ολική</span>
                  </button>
                </div>
                <p v-if="amountError" class="mt-2 text-sm text-rose-600">{{ amountError }}</p>
              </div>

              <!-- Submit button -->
              <button
                type="button"
                :disabled="!isValid || loading"
                class="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-primary-600 text-base font-semibold text-white shadow-lg shadow-primary-600/30 transition hover:bg-primary-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
                @click="handleSubmit"
              >
                <svg v-if="loading" class="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <svg v-else class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                {{ loading ? 'Καταχώρηση...' : 'Καταχώρηση Πληρωμής' }}
              </button>
            </div>
          </Transition>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';

import { formatCurrency } from '@/utils/date';
import { roundAmount } from '@/utils/number';

import type { Invoice } from '@/modules/invoices/InvoiceMapper';

type ModalStatus = 'form' | 'success' | 'error';

const props = defineProps<{
  isOpen: boolean;
  invoiceId: string;
  supplierId: string;
  supplierName: string;
  totalAmount: number;
  availableCredits?: Invoice[];
  loading?: boolean;
  status?: ModalStatus;
  errorMessage?: string;
  errorDetails?: string[];
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'submit', payload: { invoiceId: string; supplierId: string; amount: number; paymentDate: string; creditInvoiceId?: string; creditAmountUsed?: number }): void;
  (e: 'retry'): void;
}>();

const amount = ref<number | null>(null);
const paymentDate = ref<string>('');
const useCredit = ref(false);
const selectedCreditId = ref<string>('');
const creditAmountUsed = ref<number | null>(null);

// Reset state when modal opens
watch(() => props.isOpen, (open) => {
  if (open) {
    amount.value = null;
    useCredit.value = false;
    selectedCreditId.value = '';
    creditAmountUsed.value = null;
    paymentDate.value = new Date().toISOString().split('T')[0];
  }
});

const status = computed(() => props.status ?? 'form');

const selectedCreditInvoice = computed(() => {
  if (!useCredit.value || !selectedCreditId.value || !props.availableCredits) return null;
  return props.availableCredits.find(c => c.id === selectedCreditId.value) || null;
});

const maxCreditAmount = computed(() => {
  if (!selectedCreditInvoice.value) return 0;
  return roundAmount(Math.min(props.totalAmount, selectedCreditInvoice.value.unpaidAmount ?? 0)) ?? 0;
});

watch(selectedCreditId, (newId) => {
  if (newId) {
    creditAmountUsed.value = maxCreditAmount.value;
  } else {
    creditAmountUsed.value = null;
  }
});

const creditAmountError = computed(() => {
  if (!useCredit.value || creditAmountUsed.value === null) return null;
  if (creditAmountUsed.value <= 0) return 'Το ποσό πρέπει να είναι θετικό';
  if (creditAmountUsed.value > maxCreditAmount.value) return `Δεν μπορεί να υπερβαίνει τα € ${formatCurrency(maxCreditAmount.value)}`;
  return null;
});

const remainingAmountToPay = computed(() => {
  const credit = (useCredit.value && creditAmountUsed.value) ? creditAmountUsed.value : 0;
  return roundAmount(Math.max(0, props.totalAmount - credit)) ?? 0;
});

const amountError = computed(() => {
  if (amount.value === null || amount.value === 0) return null;
  if (amount.value < 0) return 'Το ποσό δεν μπορεί να είναι αρνητικό';
  if (amount.value > remainingAmountToPay.value) return `Το ποσό δεν μπορεί να υπερβαίνει τα € ${formatCurrency(remainingAmountToPay.value)}`;
  return null;
});

const paymentDateError = computed(() => {
  if (!paymentDate.value) return 'Η ημερομηνία είναι υποχρεωτική';
  return null;
});

const isValid = computed(() => {
  if (!paymentDate.value) return false;
  if (useCredit.value) {
    if (!selectedCreditId.value || creditAmountError.value) return false;
    if (remainingAmountToPay.value === 0) return true; // Fully covered by credit
  }
  return amount.value !== null && amount.value > 0 && !amountError.value;
});

const fillTotalAmount = () => {
  amount.value = roundAmount(remainingAmountToPay.value);
};

const handleSubmit = () => {
  if (!isValid.value) return;
  emit('submit', {
    invoiceId: props.invoiceId,
    supplierId: props.supplierId,
    amount: (amount.value || 0) + (useCredit.value && creditAmountUsed.value ? creditAmountUsed.value : 0),
    paymentDate: paymentDate.value,
    creditInvoiceId: useCredit.value ? selectedCreditId.value : undefined,
    creditAmountUsed: useCredit.value && creditAmountUsed.value ? creditAmountUsed.value : undefined,
  });
};

const handleClose = () => {
  emit('close');
};

const handleRetry = () => {
  emit('retry');
};
</script>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: all 0.3s ease;
}

.modal-enter-active .relative,
.modal-leave-active .relative {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .relative,
.modal-leave-to .relative {
  transform: translateY(100%);
}

@media (min-width: 640px) {
  .modal-enter-from .relative,
  .modal-leave-to .relative {
    transform: translateY(20px) scale(0.95);
  }
}

/* Fade transition for content switching */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Hide number input spinners */
input[type="number"]::-webkit-inner-spin-button,
input[type="number"]::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

input[type="number"] {
  -moz-appearance: textfield;
}
</style>
