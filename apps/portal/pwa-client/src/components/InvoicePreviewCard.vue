<template>
  <article
    class="cursor-pointer rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.98]"
    @click="handleClick"
  >
    <!-- Mobile Layout -->
    <div class="sm:hidden">
      <!-- Row 1: Invoice ID -->
      <div>
        <p class="text-sm font-semibold text-slate-900">
          {{ invoice.isCredit ? 'ΠΤ-' : 'ΤΔΑ-' }}{{ invoice.invoiceNumber ?? invoice.invoiceId ?? invoice.id }}
        </p>
        <p class="mt-0.5 text-xs text-slate-400">
          Εκδόθηκε {{ invoiceDate }}
        </p>
      </div>

      <!-- Row 2: Amount + Status Badge + Payment Button -->
      <div class="mt-3 flex items-center justify-between">
        <p class="text-lg font-bold text-slate-900">
          {{ currencySymbol }} {{ totalAmount }}
        </p>
        <div class="flex flex-col items-end gap-1.5">
          <StatusBadge :status="invoice.paymentStatus ?? invoice.status" :is-credit="invoice.isCredit" />
          <button
            v-if="!isPaid"
            type="button"
            class="flex h-8 items-center gap-1.5 rounded-lg bg-primary-50 px-2.5 text-primary-600 transition active:scale-95"
            @click.stop="handlePayment"
          >
            <Wallet class="h-4 w-4" />
            <span class="text-xs font-medium">Πληρωμή</span>
          </button>
        </div>
      </div>

      <!-- Row 3: Unpaid amount (only for partially paid) -->
      <p v-if="isPartiallyPaid" class="mt-1 text-sm font-medium text-amber-600">
        Υπόλοιπο: {{ currencySymbol }} {{ unpaidAmount }}
      </p>

      <!-- Row 4: Status message (only if there's a message or error) -->
      <p v-if="invoice.statusMessage || invoice.errorMessage" class="mt-2 text-xs text-slate-500 line-clamp-2">
        {{ invoice.statusMessage ?? invoice.errorMessage }}
      </p>

      <!-- Row 5: Upload date -->
      <p class="mt-2 text-xs text-slate-400">
        Μεταφορτώθηκε {{ formattedDate }}
      </p>
    </div>

    <!-- Desktop Layout (sm+) -->
    <div class="hidden sm:block">
      <div class="flex items-start justify-between">
        <!-- Left: Invoice info -->
        <div class="flex-1">
          <p class="text-sm font-semibold text-slate-900">
            {{ invoice.isCredit ? 'ΠΤ-' : 'ΤΔΑ-' }}{{ invoice.invoiceNumber ?? invoice.invoiceId ?? invoice.id }}
          </p>
          <p class="text-xs text-slate-500">
            Εκδόθηκε {{ invoiceDate }}
          </p>
        </div>

        <!-- Right: Amount + Badge + Payment stacked -->
        <div class="flex items-start gap-3">
          <div class="text-right">
            <p class="text-sm font-bold text-slate-900">
              {{ currencySymbol }} {{ totalAmount }}
            </p>
            <!-- Unpaid amount below total -->
            <p v-if="isPartiallyPaid" class="mt-0.5 text-xs font-medium text-amber-600">
              Υπόλοιπο: {{ currencySymbol }} {{ unpaidAmount }}
            </p>
            <p v-else class="mt-0.5 text-xs text-slate-400">
              {{ formattedDate }}
            </p>
          </div>
          <div class="flex flex-col items-end gap-1.5">
            <StatusBadge :status="invoice.paymentStatus ?? invoice.status" :is-credit="invoice.isCredit" />
            <button
              v-if="!isPaid"
              type="button"
              class="flex h-8 items-center gap-1.5 rounded-lg bg-primary-50 px-2.5 text-primary-600 transition hover:bg-primary-100 active:scale-95"
              @click.stop="handlePayment"
            >
              <Wallet class="h-4 w-4" />
              <span class="text-xs font-medium">Πληρωμή</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Status message (only if there's a message or error) -->
      <p v-if="invoice.statusMessage || invoice.errorMessage" class="mt-2 text-xs text-slate-500 line-clamp-1">
        {{ invoice.statusMessage ?? invoice.errorMessage }}
      </p>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Wallet } from 'lucide-vue-next';

import StatusBadge from '@/components/StatusBadge.vue';
import type { Invoice } from '@/modules/invoices/InvoiceMapper';
import { formatCurrency, formatDateTime } from '@/utils/date';

const props = defineProps<{ invoice: Invoice }>();
const emit = defineEmits<{
  (e: 'select', invoiceId: string): void;
  (e: 'payment', invoice: Invoice): void;
}>();

const formattedDate = computed(() => formatDateTime(props.invoice.uploadedAt));
const invoiceDate = computed(() => formatDateTime(props.invoice.invoiceDate));

const getDisplayAmount = (amount?: number) => {
  if (!amount) return 0;
  return props.invoice.isCredit ? -amount : amount;
};

const totalAmount = computed(() => formatCurrency(getDisplayAmount(props.invoice.totalAmount)));
const unpaidAmount = computed(() => formatCurrency(getDisplayAmount(props.invoice.unpaidAmount)));

const currencySymbol = computed(() => 
  props.invoice.currency === 'EUR' || props.invoice.currency === '€' ? '€' : '$'
);

const isPaid = computed(() => props.invoice.paymentStatus === 'paid');
const isPartiallyPaid = computed(() => props.invoice.paymentStatus === 'partially_paid');

const handleClick = () => emit('select', props.invoice.id);
const handlePayment = () => emit('payment', props.invoice);
</script>
