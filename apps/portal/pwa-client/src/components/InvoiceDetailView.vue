<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="isOpen"
        class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6"
        @click.self="handleBackdropClick"
      >
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-slate-900/70 backdrop-blur-sm" @click="handleBackdropClick" />

        <!-- Modal Panel - Almost Full Screen -->
        <article
          class="relative flex h-full max-h-[95vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-gradient-to-br from-white to-slate-50 shadow-2xl"
        >
          <!-- Header -->
          <header class="header-compact flex shrink-0 items-center justify-between border-b border-slate-100 px-4 py-4 sm:px-6 sm:py-5">
            <div class="min-w-0 flex-1 pr-2">
              <p class="header-subtitle text-xs uppercase tracking-widest text-primary-600">
                {{ isEditing ? 'ΕΠΕΞΕΡΓΑΣΙΑ ΤΙΜΟΛΟΓΙΟΥ' : 'ΛΕΠΤΟΜΕΡΕΙΕΣ ΤΙΜΟΛΟΓΙΟΥ' }}
              </p>
              <p class="header-subtitle-short text-xs uppercase tracking-wide text-primary-600">
                {{ isEditing ? 'ΕΠΕΞΕΡΓΑΣΙΑ' : 'ΤΙΜΟΛΟΓΙΟ' }}
              </p>
              <div class="flex items-center gap-3">
                <h3 class="header-title truncate text-xl font-bold text-slate-900 sm:text-2xl">
                  {{ invoice.isCredit ? 'ΠΤ-' : 'ΤΔΑ-' }}{{ invoice.invoiceNumber ?? invoice.id }}
                </h3>
                <StatusBadge v-if="!isEditing" :status="invoice.paymentStatus ?? invoice.status" :is-credit="invoice.isCredit" class="hidden sm:inline-flex" />
              </div>
            </div>

            <!-- Action Buttons -->
            <div class="flex shrink-0 items-center gap-1 sm:gap-2">
              <!-- Edit Button (only in view mode) -->
              <button
                v-if="!isEditing"
                type="button"
                class="header-btn flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 sm:h-10 sm:w-10"
                aria-label="Επεξεργασία"
                @click="startEditing"
              >
                <svg class="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>

              <!-- Cancel Edit Button (only in edit mode) -->
              <button
                v-if="isEditing"
                type="button"
                class="header-btn flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 sm:h-10 sm:w-10"
                aria-label="Ακύρωση"
                @click="cancelEditing"
              >
                <svg class="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              <!-- Close Button (only in view mode) -->
              <button
                v-if="!isEditing"
                type="button"
                class="header-btn flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 sm:h-10 sm:w-10"
                aria-label="Κλείσιμο"
                @click="$emit('close')"
              >
                <svg class="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </header>

          <!-- Scrollable Content -->
          <div class="flex-1 overflow-y-auto p-4 sm:p-6">
            <!-- Edit Mode Notice -->
            <Transition name="fade">
              <div v-if="isEditing" class="mb-4 flex items-center gap-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
                <svg class="h-5 w-5 shrink-0 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Επεξεργαστείτε τα πεδία και πατήστε <strong>Αποθήκευση</strong> για να ενημερώσετε το τιμολόγιο.</span>
              </div>
            </Transition>

            <dl class="grid gap-4 sm:grid-cols-2 sm:gap-5">
              <!-- Supplier Name -->
              <div class="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
                <dt class="text-xs uppercase tracking-wide text-slate-400">ΠΡΟΜΗΘΕΥΤΗΣ</dt>
                <dd class="mt-1">
                  <input
                    v-if="isEditing"
                    v-model="editForm.supplierName"
                    type="text"
                    class="w-full rounded-lg border border-slate-200 px-3 py-2 text-lg font-semibold text-slate-900 transition focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                    placeholder="Όνομα προμηθευτή"
                  />
                  <span v-else class="text-lg font-semibold text-slate-900">
                  {{ invoice.supplierName ?? '—' }}
                  </span>
                </dd>
              </div>

              <!-- Supplier Tax Number -->
              <div class="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
                <dt class="text-xs uppercase tracking-wide text-slate-400">Α.Φ.Μ. ΠΡΟΜΗΘΕΥΤΗ</dt>
                <dd class="mt-1">
                  <input
                    v-if="isEditing"
                    v-model="editForm.supplierTaxNumber"
                    type="text"
                    class="w-full rounded-lg border border-slate-200 px-3 py-2 text-lg font-semibold text-slate-900 transition focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                    placeholder="ΑΦΜ"
                  />
                  <span v-else class="text-lg font-semibold text-slate-900">
                  {{ invoice.supplierTaxNumber ?? '—' }}
                  </span>
                </dd>
              </div>

              <!-- Invoice Number -->
              <div class="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
                <dt class="text-xs uppercase tracking-wide text-slate-400">ΑΡΙΘΜΟΣ ΤΙΜΟΛΟΓΙΟΥ</dt>
                <dd class="mt-1">
                  <input
                    v-if="isEditing"
                    v-model="editForm.invoiceNumber"
                    type="text"
                    class="w-full rounded-lg border border-slate-200 px-3 py-2 text-lg font-semibold text-slate-900 transition focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                    placeholder="Αριθμός τιμολογίου"
                  />
                  <span v-else class="text-lg font-semibold text-slate-900">
                  {{ invoice.invoiceNumber ?? '—' }}
                  </span>
                </dd>
              </div>

              <!-- Is Credit Invoice -->
              <div v-if="isEditing" class="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-100 flex items-center justify-between">
                <dt class="text-xs uppercase tracking-wide text-slate-400">ΠΙΣΤΩΤΙΚΟ ΤΙΜΟΛΟΓΙΟ</dt>
                <dd class="mt-1 flex items-center">
                  <label class="relative inline-flex cursor-pointer items-center">
                    <input v-model="editForm.isCredit" type="checkbox" class="peer sr-only" />
                    <div class="peer h-6 w-11 rounded-full bg-slate-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-slate-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-primary-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300"></div>
                  </label>
                </dd>
              </div>

              <!-- Invoice Date -->
              <div class="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
                <dt class="text-xs uppercase tracking-wide text-slate-400">HΜΕΡΟΜΗΝΙΑ ΕΚΔΟΣΗΣ</dt>
                <dd class="mt-1">
                  <div v-if="isEditing" class="relative">
                    <input
                      v-model="editForm.invoiceDate"
                      type="date"
                      lang="el-GR"
                      class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-lg font-semibold text-slate-900 transition focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                    />
                    <span
                      v-if="!editForm.invoiceDate"
                      class="pointer-events-none absolute top-[2px] bottom-[2px] left-[2px] right-10 flex items-center rounded-md bg-white pl-3 text-slate-400"
                      aria-hidden="true"
                    >ηη/μμ/εεεε</span>
                  </div>
                  <span v-else class="text-lg font-semibold text-slate-900">
                    {{ formattedInvoiceDate }}
                  </span>
                </dd>
              </div>

              <!-- Upload Date (read-only) -->
              <div class="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
                <dt class="text-xs uppercase tracking-wide text-slate-400">ΗΜΕΡΟΜΗΝΙΑ ΜΕΤΑΦΟΡΤΩΣΗΣ</dt>
                <dd class="mt-1 text-lg font-semibold text-slate-900">
                  {{ formattedUploadedAt }}
                </dd>
              </div>

              <!-- Uploaded By (read-only) -->
              <div v-if="invoice.uploadedByName" class="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
                <dt class="text-xs uppercase tracking-wide text-slate-400">ΚΑΤΑΧΩΡΗΘΗΚΕ ΑΠΟ</dt>
                <dd class="mt-1 text-lg font-semibold text-slate-900">
                  {{ invoice.uploadedByName }}
                </dd>
              </div>

              <!-- Total Amount -->
              <div class="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
                <dt class="text-xs uppercase tracking-wide text-slate-400">ΣΥΝΟΛΙΚΟ ΠΟΣΟ</dt>
                <dd class="mt-1">
                  <div v-if="isEditing" class="relative">
                    <span class="absolute left-3 top-1/2 -translate-y-1/2 text-lg font-semibold text-slate-400">€</span>
                    <input
                      v-model.number="editForm.totalAmount"
                      type="number"
                      step="0.01"
                      min="0"
                      class="w-full rounded-lg border border-slate-200 py-2 pl-8 pr-3 text-lg font-semibold text-slate-900 transition focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                      placeholder="0.00"
                    />
                  </div>
                  <span v-else class="text-lg font-semibold text-slate-900">
                  € {{ formattedTotal }}
                  </span>
                </dd>
              </div>

              <!-- Net Amount -->
              <div class="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
                <dt class="text-xs uppercase tracking-wide text-slate-400">ΚΑΘΑΡΟ ΠΟΣΟ</dt>
                <dd class="mt-1">
                  <div v-if="isEditing" class="relative">
                    <span class="absolute left-3 top-1/2 -translate-y-1/2 text-lg font-semibold text-slate-400">€</span>
                    <input
                      v-model.number="editForm.netAmount"
                      type="number"
                      step="0.01"
                      min="0"
                      class="w-full rounded-lg border border-slate-200 py-2 pl-8 pr-3 text-lg font-semibold text-slate-900 transition focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                      placeholder="0.00"
                    />
                  </div>
                  <span v-else class="text-lg font-semibold text-slate-900">
                    € {{ formattedNet }}
                  </span>
                </dd>
              </div>

              <!-- VAT Amount -->
              <div class="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
                <dt class="text-xs uppercase tracking-wide text-slate-400">Φ.Π.Α.</dt>
                <dd class="mt-1">
                  <div v-if="isEditing" class="relative">
                    <span class="absolute left-3 top-1/2 -translate-y-1/2 text-lg font-semibold text-slate-400">€</span>
                    <input
                      v-model.number="editForm.vatAmount"
                      type="number"
                      step="0.01"
                      min="0"
                      class="w-full rounded-lg border border-slate-200 py-2 pl-8 pr-3 text-lg font-semibold text-slate-900 transition focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                      placeholder="0.00"
                    />
                  </div>
                  <span v-else class="text-lg font-semibold text-slate-900">
                    € {{ formattedVat }}
                  </span>
                </dd>
              </div>

              <!-- Paid Amount -->
              <div class="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
                <dt class="text-xs uppercase tracking-wide text-slate-400">ΕΞΟΦΛΗΜΕΝΟ ΠΟΣΟ</dt>
                <dd class="mt-1">
                  <div v-if="isEditing" class="relative">
                    <span class="absolute left-3 top-1/2 -translate-y-1/2 text-lg font-semibold text-slate-400">€</span>
                    <input
                      v-model.number="editForm.paidAmount"
                      type="number"
                      step="0.01"
                      min="0"
                      class="w-full rounded-lg border border-slate-200 py-2 pl-8 pr-3 text-lg font-semibold text-emerald-600 transition focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                      placeholder="0.00"
                    />
                  </div>
                  <div v-else>
                    <span class="text-lg font-semibold text-emerald-600">
                      € {{ formattedPaid }}
                    </span>
                    <p v-if="creditUsedNotes.length > 0" class="mt-1 text-xs font-medium text-indigo-600">
                      <span v-for="(note, index) in creditUsedNotes" :key="index" class="block">
                        {{ note }}
                      </span>
                    </p>
                  </div>
                </dd>
              </div>

              <!-- Unpaid Amount (always read-only) -->
              <div class="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
                <dt class="text-xs uppercase tracking-wide text-slate-400">ΑΝΕΞΟΦΛΗΤΟ ΠΟΣΟ</dt>
                <dd class="mt-1">
                  <span v-if="isEditing" class="text-lg font-semibold" :class="calculatedUnpaidColor">
                    € {{ formattedCalculatedUnpaid }}
                    <span class="ml-1 text-xs font-normal text-slate-400">(υπολογίζεται αυτόματα)</span>
                  </span>
                  <span v-else class="text-lg font-semibold" :class="unpaidColor">
                    € {{ formattedUnpaid }}
                  </span>
                </dd>
              </div>

              <!-- PDF File -->
              <div class="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-100 sm:col-span-2">
                <dt class="text-xs uppercase tracking-wide text-slate-400">ΑΡΧΕΙΟ ΤΙΜΟΛΟΓΙΟΥ</dt>
                <dd class="mt-2">
                  <button
                    v-if="invoice.filePath"
                    type="button"
                    :disabled="loadingPdf"
                    class="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700 active:scale-[0.98] disabled:cursor-wait disabled:opacity-60"
                    @click="openPdf"
                  >
                    <svg v-if="loadingPdf" class="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <svg v-else class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    {{ loadingPdf ? 'Φόρτωση...' : 'Προβολή PDF' }}
                  </button>
                  <span v-else class="text-sm text-slate-400">Δεν υπάρχει αρχείο</span>
                  <p v-if="pdfError" class="mt-2 text-xs text-rose-500">{{ pdfError }}</p>
                </dd>
              </div>
            </dl>

            <!-- Save Error -->
            <Transition name="fade">
              <div v-if="saveError" class="mt-4 flex items-center gap-3 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
                <svg class="h-5 w-5 shrink-0 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{{ saveError }}</span>
              </div>
            </Transition>
          </div>

          <!-- Footer -->
          <footer class="shrink-0 border-t border-slate-100 bg-slate-50/50 px-4 py-4 sm:px-6">
            <div class="flex items-center justify-end gap-3">
              <!-- Edit Mode Footer -->
              <template v-if="isEditing">
                <button
                  type="button"
                  :disabled="isSaving"
                  class="flex h-11 items-center justify-center gap-2 rounded-xl border-2 border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                  @click="cancelEditing"
                >
                  Ακύρωση
                </button>
                <button
                  type="button"
                  :disabled="isSaving || !hasChanges"
                  class="flex h-11 items-center justify-center gap-2 rounded-xl bg-primary-600 px-6 text-sm font-semibold text-white shadow-lg shadow-primary-600/30 transition hover:bg-primary-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
                  @click="saveChanges"
                >
                  <svg v-if="isSaving" class="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <svg v-else class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                  {{ isSaving ? 'Αποθήκευση...' : 'Αποθήκευση' }}
                </button>
              </template>

              <!-- View Mode Footer -->
              <template v-else>
              <button
                type="button"
                class="flex h-11 items-center justify-center gap-2 rounded-xl border-2 border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 active:scale-[0.98]"
                @click="$emit('close')"
              >
                Κλείσιμο
              </button>
              </template>
            </div>
          </footer>
        </article>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';

import StatusBadge from '@/components/StatusBadge.vue';
import type { Invoice } from '@/modules/invoices/InvoiceMapper';
import { requestSignedDownloadUrl } from '@/services/api/requestSignedDownloadUrl';
import { updateInvoiceFields } from '@/services/api/updateInvoiceFields';
import { formatCurrency, formatDateTime } from '@/utils/date';
import { useNotifications } from '@/composables/useNotifications';

const props = defineProps<{
  isOpen: boolean;
  invoice: Invoice;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'edit'): void;
  (e: 'updated', invoice: Invoice): void;
}>();

const { notifySuccess, notifyError } = useNotifications();

// PDF loading state
const loadingPdf = ref(false);
const pdfError = ref<string | null>(null);

// Edit mode state
const isEditing = ref(false);
const isSaving = ref(false);
const saveError = ref<string | null>(null);

// Edit form data
interface EditForm {
  supplierName: string;
  supplierTaxNumber: string;
  invoiceNumber: string;
  invoiceDate: string;
  totalAmount: number | null;
  netAmount: number | null;
  vatAmount: number | null;
  paidAmount: number | null;
  isCredit: boolean;
}

const editForm = ref<EditForm>({
  supplierName: '',
  supplierTaxNumber: '',
  invoiceNumber: '',
  invoiceDate: '',
  totalAmount: null,
  netAmount: null,
  vatAmount: null,
  paidAmount: null,
  isCredit: false,
});

// Helper to parse date to YYYY-MM-DD format
const toDateInputValue = (value?: string | Date | { seconds: number }): string => {
  if (!value) return '';
  let date: Date;
  if (typeof value === 'object' && 'seconds' in value) {
    date = new Date(value.seconds * 1000);
  } else {
    date = typeof value === 'string' ? new Date(value) : value;
  }
  if (isNaN(date.getTime())) return '';
  return date.toISOString().split('T')[0];
};

// Initialize edit form from invoice data
const initializeEditForm = () => {
  editForm.value = {
    supplierName: props.invoice.supplierName ?? '',
    supplierTaxNumber: props.invoice.supplierTaxNumber ?? '',
    invoiceNumber: props.invoice.invoiceNumber ?? '',
    invoiceDate: toDateInputValue(props.invoice.invoiceDate),
    totalAmount: props.invoice.totalAmount ?? null,
    netAmount: props.invoice.netAmount ?? null,
    vatAmount: props.invoice.vatAmount ?? null,
    paidAmount: props.invoice.paidAmount ?? 0,
    isCredit: props.invoice.isCredit ?? false,
  };
};

// Computed: calculated unpaid amount (for edit mode preview)
const calculatedUnpaid = computed(() => {
  const total = editForm.value.totalAmount ?? 0;
  const paid = editForm.value.paidAmount ?? 0;
  return Math.max(0, total - paid);
});

const formattedCalculatedUnpaid = computed(() => formatCurrency(calculatedUnpaid.value));
const calculatedUnpaidColor = computed(() =>
  calculatedUnpaid.value > 0 ? 'text-amber-600' : 'text-emerald-600'
);

// Check if form has changes
const hasChanges = computed(() => {
  const inv = props.invoice;
  const form = editForm.value;
  
  return (
    form.supplierName !== (inv.supplierName ?? '') ||
    form.supplierTaxNumber !== (inv.supplierTaxNumber ?? '') ||
    form.invoiceNumber !== (inv.invoiceNumber ?? '') ||
    form.invoiceDate !== toDateInputValue(inv.invoiceDate) ||
    form.totalAmount !== (inv.totalAmount ?? null) ||
    form.netAmount !== (inv.netAmount ?? null) ||
    form.vatAmount !== (inv.vatAmount ?? null) ||
    form.paidAmount !== (inv.paidAmount ?? 0) ||
    form.isCredit !== (inv.isCredit ?? false)
  );
});

// Start editing
const startEditing = () => {
  initializeEditForm();
  isEditing.value = true;
  saveError.value = null;
};

// Cancel editing
const cancelEditing = () => {
  isEditing.value = false;
  saveError.value = null;
};

// Handle backdrop click
const handleBackdropClick = () => {
  if (isEditing.value) {
    // Don't close modal in edit mode on backdrop click
    return;
  }
  emit('close');
};

// Save changes
const saveChanges = async () => {
  if (!hasChanges.value || isSaving.value) return;

  if (!props.invoice.supplierId) {
    saveError.value = 'Δεν βρέθηκε το ID του προμηθευτή';
    return;
  }

  isSaving.value = true;
  saveError.value = null;

  try {
    const fields: Record<string, string | number | undefined> = {};

    // Only include fields that have changed
    const inv = props.invoice;
    const form = editForm.value;

    if (form.supplierName !== (inv.supplierName ?? '')) {
      fields.supplierName = form.supplierName;
    }
    if (form.supplierTaxNumber !== (inv.supplierTaxNumber ?? '')) {
      fields.supplierTaxNumber = form.supplierTaxNumber;
    }
    if (form.invoiceNumber !== (inv.invoiceNumber ?? '')) {
      fields.invoiceNumber = form.invoiceNumber;
    }
    if (form.invoiceDate !== toDateInputValue(inv.invoiceDate)) {
      fields.invoiceDate = form.invoiceDate;
    }
    if (form.totalAmount !== (inv.totalAmount ?? null)) {
      fields.totalAmount = form.totalAmount ?? undefined;
    }
    if (form.netAmount !== (inv.netAmount ?? null)) {
      fields.netAmount = form.netAmount ?? undefined;
    }
    if (form.vatAmount !== (inv.vatAmount ?? null)) {
      fields.vatAmount = form.vatAmount ?? undefined;
    }
    if (form.paidAmount !== (inv.paidAmount ?? 0)) {
      fields.paidAmount = form.paidAmount ?? 0;
    }
    if (form.isCredit !== (inv.isCredit ?? false)) {
      fields.isCredit = form.isCredit;
    }

    await updateInvoiceFields({
      supplierId: props.invoice.supplierId,
      invoiceId: props.invoice.id,
      fields,
    });

    // Update local invoice data and emit
    const updatedInvoice: Invoice = {
      ...props.invoice,
      supplierName: form.supplierName || props.invoice.supplierName,
      supplierTaxNumber: form.supplierTaxNumber || props.invoice.supplierTaxNumber,
      invoiceNumber: form.invoiceNumber || props.invoice.invoiceNumber,
      invoiceDate: form.invoiceDate || props.invoice.invoiceDate,
      totalAmount: form.totalAmount ?? props.invoice.totalAmount,
      netAmount: form.netAmount ?? props.invoice.netAmount,
      vatAmount: form.vatAmount ?? props.invoice.vatAmount,
      paidAmount: form.paidAmount ?? 0,
      isCredit: form.isCredit,
      unpaidAmount: calculatedUnpaid.value,
    };

    emit('updated', updatedInvoice);
    notifySuccess('Το τιμολόγιο ενημερώθηκε επιτυχώς');
    isEditing.value = false;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Αποτυχία αποθήκευσης αλλαγών';
    saveError.value = message;
    notifyError(message);
  } finally {
    isSaving.value = false;
  }
};

// Formatted values for view mode
const formattedUploadedAt = computed(() => formatDateTime(props.invoice.uploadedAt));
const formattedInvoiceDate = computed(() => formatDateTime(props.invoice.invoiceDate));

const getDisplayAmount = (amount?: number) => {
  if (!amount) return 0;
  return props.invoice.isCredit ? -amount : amount;
};

const formattedTotal = computed(() => formatCurrency(getDisplayAmount(props.invoice.totalAmount)));
const formattedUnpaid = computed(() => formatCurrency(getDisplayAmount(props.invoice.unpaidAmount)));
const formattedNet = computed(() => formatCurrency(getDisplayAmount(props.invoice.netAmount)));
const formattedVat = computed(() => formatCurrency(getDisplayAmount(props.invoice.vatAmount)));
const formattedPaid = computed(() => formatCurrency(getDisplayAmount(props.invoice.paidAmount ?? 0)));

const creditUsedNotes = computed(() => {
  if (!props.invoice.paymentHistory || props.invoice.paymentHistory.length === 0) return [];
  
  const notes: string[] = [];
  for (const entry of props.invoice.paymentHistory) {
    if (entry.creditInvoiceId) {
      const amount = formatCurrency(entry.creditAmountUsed ?? 0);
      notes.push(`Χρήση Πιστωτικού: ΠΤ-${entry.notes?.match(/αριθμό (.+)/)?.[1] || entry.creditInvoiceId} (€ ${amount})`);
    }
  }
  return notes;
});

const unpaidColor = computed(() =>
  (props.invoice.unpaidAmount ?? 0) > 0 ? 'text-amber-600' : 'text-emerald-600'
);

// Reset edit mode when modal closes
watch(() => props.isOpen, (open) => {
  if (!open) {
    isEditing.value = false;
    saveError.value = null;
  }
});

/**
 * Detects if running as an iOS PWA (standalone mode)
 */
const isIOSPwa = (): boolean => {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    || (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  return isIOS && isStandalone;
};

/**
 * Opens a URL. For iOS PWA, navigates directly since new tabs don't work.
 * For other platforms, uses window.open().
 */
const openUrl = (url: string) => {
  if (isIOSPwa()) {
    window.location.href = url;
  } else {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
};

const openPdf = async () => {
  if (!props.invoice.filePath) return;

  loadingPdf.value = true;
  pdfError.value = null;

  try {
    if (props.invoice.fileUrl) {
      openUrl(props.invoice.fileUrl);
      return;
    }

    const { downloadUrl } = await requestSignedDownloadUrl({
      filePath: props.invoice.filePath,
    });
 
    openUrl(downloadUrl);
  } catch (error) {
    console.error('Failed to get PDF URL:', error);
    pdfError.value = 'Αποτυχία φόρτωσης του αρχείου. Παρακαλώ δοκιμάστε ξανά.';
  } finally {
    loadingPdf.value = false;
  }
};
</script>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: all 0.3s ease;
}

.modal-enter-active article,
.modal-leave-active article {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from article,
.modal-leave-to article {
  transform: scale(0.95) translateY(20px);
  opacity: 0;
}

/* Fade transition for notices */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Very small screens (≤409px): show short subtitle, hide long one */
@media (max-width: 409px) {
  .header-subtitle {
    display: none;
  }

  .header-subtitle-short {
    display: block;
  }
}

/* Screens > 409px: show long subtitle, hide short one */
@media (min-width: 410px) {
  .header-subtitle {
    display: block;
  }

  .header-subtitle-short {
    display: none;
  }
}
</style>
