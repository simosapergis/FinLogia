<template>
  <div 
    class="rounded-2xl border bg-white p-4 shadow-sm transition-all hover:shadow-md"
    :class="warning ? 'border-amber-400' : 'border-slate-200'"
  >
    <div class="flex items-start justify-between">
      <div class="flex items-center gap-3">
        <div 
          class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-bold text-white shadow-sm"
          :class="invoice.type === 'pdf' ? 'bg-rose-500' : 'bg-blue-500'"
        >
          {{ invoice.type === 'pdf' ? 'PDF' : 'IMG' }}
        </div>
        <div>
          <h3 class="text-sm font-semibold text-slate-800">
            Τιμολόγιο {{ index + 1 }}
          </h3>
          <p v-if="invoice.type !== 'pdf'" class="text-xs text-slate-500">
            {{ invoice.totalPages }} {{ invoice.totalPages === 1 ? 'σελίδα' : 'σελίδες' }}
          </p>
        </div>
      </div>
      
      <div class="flex items-center gap-2">
        <span
          v-if="invoice.status !== 'pending'"
          class="rounded-full px-3 py-1 text-xs font-semibold"
          :class="statusClasses"
        >
          {{ statusLabel }}
        </span>
        <button
          v-if="invoice.status === 'pending' || invoice.status === 'error'"
          type="button"
          class="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-colors"
          @click="$emit('remove', invoice.id)"
          title="Αφαίρεση"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
          </svg>
        </button>
      </div>
    </div>

    <div class="mt-4 flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-3">
      <div>
        <p class="text-xs font-semibold text-slate-700">Είναι ήδη εξοφλημένο;</p>
      </div>
      <label class="relative inline-flex cursor-pointer items-center">
        <input 
          type="checkbox" 
          :checked="invoice.isPaid"
          @change="$emit('update:isPaid', invoice.id, ($event.target as HTMLInputElement).checked)"
          class="peer sr-only" 
          :disabled="invoice.status === 'uploading' || invoice.status === 'completed'" 
        />
        <div class="peer h-5 w-9 rounded-full bg-slate-300 after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-emerald-500 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-emerald-300 peer-disabled:cursor-not-allowed peer-disabled:opacity-60"></div>
      </label>
    </div>

    <div v-if="invoice.pages.length > 0" class="mt-3">
      <ul class="space-y-2">
        <li v-for="page in invoice.pages" :key="page.id" class="flex items-center justify-between text-xs">
          <span class="min-w-0 flex-1 truncate pr-2 text-slate-600">
            <template v-if="invoice.type === 'pdf'">
              {{ page.name }}
            </template>
            <template v-else>
              Σελίδα {{ page.pageNumber }} - {{ page.name }}
            </template>
          </span>
          <span class="shrink-0 text-slate-400">
            {{ page.progress }}%
          </span>
        </li>
      </ul>
      <p v-if="invoice.error" class="mt-2 text-xs text-rose-500">
        {{ invoice.error }}
      </p>
    </div>

    <!-- Warning Message -->
    <div v-if="warning" class="mt-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
      <svg xmlns="http://www.w3.org/2000/svg" class="mt-0.5 h-5 w-5 shrink-0 text-amber-500" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
      </svg>
      <p>{{ warning }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

// Define minimal interface here to avoid circular dependencies if needed, 
// or import from useInvoiceUpload.ts
// Assuming BatchInvoice is exported from useInvoiceUpload
import type { BatchInvoice } from '@/composables/useInvoiceUpload';

const props = defineProps<{
  invoice: BatchInvoice;
  index: number;
  warning?: string | null;
}>();

defineEmits<{
  (e: 'remove', id: string): void;
  (e: 'update:isPaid', id: string, value: boolean): void;
}>();

const statusClasses = computed(() => {
  switch (props.invoice.status) {
    case 'completed':
      return 'bg-emerald-100 text-emerald-700';
    case 'uploading':
      return 'bg-sky-100 text-sky-700';
    case 'error':
      return 'bg-rose-100 text-rose-700';
    default:
      return 'bg-slate-100 text-slate-600';
  }
});

const statusLabel = computed(() => {
  switch (props.invoice.status) {
    case 'completed':
      return 'Ολοκληρώθηκε';
    case 'uploading':
      return 'Μεταφόρτωση...';
    case 'error':
      return 'Σφάλμα';
    default:
      return 'Εκκρεμεί';
  }
});
</script>
