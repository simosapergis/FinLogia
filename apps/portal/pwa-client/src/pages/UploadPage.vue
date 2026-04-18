<template>
  <section class="grid w-full min-w-0 gap-6 lg:grid-cols-[2fr,1fr]">
    <div class="min-w-0 rounded-3xl bg-white p-4 shadow-lg sm:p-6">
      <header class="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 class="upload-title text-2xl font-semibold text-slate-900">Σάρωση Τιμολογίου</h2>
        </div>
        <StatusBadge :status="statusBadge" />
      </header>

      <!-- Action Buttons (Hidden when drafting) -->
      <div v-if="!draftInvoice" class="grid gap-4 sm:grid-cols-2">
        <button
          type="button"
          class="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-6 text-slate-600 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="!canAddMoreInvoices || isBusy"
          @click="triggerPdfPicker"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          <span class="font-semibold">PDF</span>
        </button>

        <button
          type="button"
          class="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-6 text-slate-600 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="!canAddMoreInvoices || isBusy"
          @click="showDraftSetup = true"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span class="font-semibold">Φωτογραφίες</span>
        </button>
      </div>

      <!-- PDF Hidden Input -->
      <input
        ref="pdfInput"
        type="file"
        accept="application/pdf"
        multiple
        class="hidden"
        @change="handlePdfSelection"
      />

      <!-- Draft Setup Inline Form -->
      <div v-if="showDraftSetup && !draftInvoice" class="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <h3 class="font-semibold text-slate-800">Νέο Τιμολόγιο από Εικόνες</h3>
        <p class="mt-1 text-sm text-slate-600">Πόσες σελίδες έχει αυτό το τιμολόγιο;</p>
        
        <div class="mt-4 flex flex-wrap items-center gap-3">
          <input
            type="number"
            min="1"
            v-model="draftExpectedPages"
            class="w-24 rounded-xl border border-slate-300 px-4 py-2 focus:border-primary-500 focus:outline-none"
          />
          <button
            type="button"
            class="rounded-xl bg-primary-600 px-5 py-2 font-semibold text-white hover:bg-primary-700"
            @click="confirmDraftSetup"
          >
            Συνέχεια
          </button>
          <button
            type="button"
            class="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200"
            @click="showDraftSetup = false"
          >
            Ακύρωση
          </button>
        </div>
      </div>

      <!-- Active Draft Workspace -->
      <div v-if="draftInvoice" class="mt-6 rounded-2xl border-2 border-slate-200 bg-white p-5 shadow-sm">
        <div class="mb-4 flex items-center justify-between">
          <div>
            <h3 class="font-semibold text-slate-800">
              {{ isMobile ? 'Λήψη Σελίδων' : 'Επιλογή Σελίδων' }}
            </h3>
            <p class="text-sm text-slate-500">
              Σελίδα {{ draftInvoice.pages.length + 1 }} από {{ draftInvoice.totalPages }}
            </p>
          </div>
          <button
            type="button"
            class="text-sm font-semibold text-rose-500 hover:text-rose-600"
            @click="cancelDraft"
          >
            Ακύρωση
          </button>
        </div>

        <div class="flex flex-col gap-3">
          <div class="relative flex flex-col gap-3 sm:block">
            <CameraButton
              v-if="isMobile"
              :disabled="isBusy"
              @select="handleImageSelection"
            >
              Λήψη Φωτογραφίας
            </CameraButton>
            
            <button
              type="button"
              class="w-full rounded-xl px-6 py-4 text-base font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
              :class="isMobile ? 'border-2 border-primary-600 bg-white text-primary-600 hover:bg-primary-50 active:bg-primary-100' : 'bg-primary-600 text-white shadow-lg shadow-primary-600/30 hover:bg-primary-700'"
              :disabled="isBusy"
              @click="triggerImagePicker"
            >
              Επιλογή Εικόνων
            </button>
          </div>
        </div>

        <!-- Image Hidden Input -->
        <input
          ref="imageInput"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/*"
          multiple
          class="hidden"
          @change="handleGalleryImageSelection"
        />
      </div>

      <!-- Batch Invoice List -->
      <div v-if="invoices.length > 0" class="mt-8">
        <div class="mb-4 flex items-center justify-between">
          <h3 class="font-semibold text-slate-800">Λίστα Μεταφόρτωσης ({{ invoices.length }}/{{ MAX_INVOICES }})</h3>
        </div>
        
        <div class="grid gap-4">
          <InvoiceBatchCard
            v-for="(invoice, index) in invoices"
            :key="invoice.id"
            :invoice="invoice"
            :index="index"
            @remove="removeInvoice"
            @update:isPaid="updateInvoiceIsPaid"
          />
        </div>
      </div>

      <!-- Global Actions -->
      <div class="mt-8 border-t border-slate-100 pt-6">
        <div v-if="invoices.length > 0" class="mb-4 text-sm font-medium text-slate-500">
          Συνολική Πρόοδος: {{ overallProgress }}%
        </div>
        <div class="flex flex-col-reverse gap-3 sm:flex-row sm:items-stretch">
          <button
            type="button"
            class="flex flex-1 items-center justify-center whitespace-nowrap rounded-xl border border-slate-300 px-6 py-4 text-sm font-semibold text-slate-600 disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="isBusy"
            @click="resetAll"
          >
            Επαναφορά
          </button>
          <button
            type="button"
            class="flex flex-[2] items-center justify-center rounded-xl bg-slate-900 px-6 py-4 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="!hasPendingUploads || isBusy || !!draftInvoice"
            @click="startUpload"
          >
            <span class="text-center">{{ statusLabel }}</span>
          </button>
        </div>
      </div>

      <Loader v-if="isBusy" :label="statusMessage" />
      <p v-if="error" class="mt-4 text-sm text-rose-500">{{ error }}</p>
      <p v-if="!canAddMoreInvoices" class="mt-2 text-sm font-medium text-amber-600">
        Έχετε φτάσει το μέγιστο όριο των {{ MAX_INVOICES }} τιμολογίων.
      </p>
    </div>

    <!-- Sidebar -->
    <div class="min-w-0 space-y-4">
      <div class="rounded-3xl border border-dashed border-slate-200 bg-white p-4 text-sm text-slate-500">
        <p class="font-semibold text-slate-700">Βήματα Μαζικής Μεταφόρτωσης</p>
        <ol class="mt-2 list-decimal space-y-1 pl-5">
          <li>Επιλέξτε "Προσθήκη PDF" για έτοιμα αρχεία.</li>
          <li>Επιλέξτε "Σάρωση" για να φωτογραφίσετε νέα τιμολόγια.</li>
          <li>Ορίστε αν κάποιο τιμολόγιο είναι εξοφλημένο.</li>
          <li>Πατήστε "Μαζική Μεταφόρτωση" για αποστολή.</li>
        </ol>
      </div>

      <div v-if="inboundEmailAddress" class="rounded-3xl border border-dashed border-slate-200 bg-white p-4 text-sm text-slate-500">
        <p class="font-semibold text-slate-700">Αποστολή μέσω Email</p>
        <p class="mt-2">Προωθήστε τα τιμολόγιά σας (σε μορφή PDF) στην παρακάτω διεύθυνση για αυτόματη καταχώρηση:</p>
        <div class="mt-3 flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-3">
          <span class="min-w-0 flex-1 truncate pr-2 font-mono text-xs text-slate-600">{{ inboundEmailAddress }}</span>
          <button 
            @click="copyEmailAddress" 
            class="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-primary-600 shadow-sm hover:bg-slate-50"
          >
            Αντιγραφή
          </button>
        </div>
      </div>

      <div class="rounded-3xl bg-white p-4 shadow-sm">
        <p class="font-semibold text-slate-700">Πρόσφατες μεταφορτώσεις</p>
        <p v-if="!uploadsLog.length" class="text-sm text-slate-500">Δεν υπάρχουν μεταφορτώσεις ακόμα.</p>
        <ul v-else class="mt-3 space-y-2 text-xs text-slate-500">
          <li
            v-for="log in uploadsLog.slice(-5).reverse()"
            :key="`${log.invoiceId}-${log.pageNumber}-${log.objectName}`"
            class="rounded-2xl border border-slate-100 p-3"
          >
            <div class="flex items-center justify-between text-slate-600">
              <span class="font-semibold">Τιμολόγιο {{ log.invoiceId }}</span>
              <span>Σελίδα {{ log.pageNumber }}</span>
            </div>
            <p class="mt-1 break-all text-[11px] text-slate-400">
              {{ log.objectName ?? log.fileUrl }}
            </p>
          </li>
        </ul>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import { useUserStore } from '@/store/userStore';

import CameraButton from '@/components/CameraButton.vue';
import Loader from '@/components/Loader.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import InvoiceBatchCard from '@/components/InvoiceBatchCard.vue';
import { useInvoiceUpload } from '@/composables/useInvoiceUpload';
import { useNotifications } from '@/composables/useNotifications';

const { notifySuccess, notifyError } = useNotifications();

const {
  status,
  error,
  invoices,
  draftInvoice,
  uploadsLog,
  canAddMoreInvoices,
  hasPendingUploads,
  overallProgress,
  isPdf,
  startImageDraft,
  cancelImageDraft,
  addPdfToBatch,
  addImageToDraft,
  removeInvoice,
  updateInvoiceIsPaid,
  upload,
  resetQueue,
  MAX_INVOICES,
} = useInvoiceUpload();

const userStore = useUserStore();
const { currentBusinessId } = storeToRefs(userStore);

const inboundEmailAddress = computed(() => {
  if (!currentBusinessId.value) return '';
  return `upload-${currentBusinessId.value}@${import.meta.env.VITE_FIREBASE_PROJECT_ID}.invoices.finlogia.online`;
});

const copyEmailAddress = async () => {
  if (inboundEmailAddress.value) {
    try {
      await navigator.clipboard.writeText(inboundEmailAddress.value);
      notifySuccess('Η διεύθυνση email αντιγράφηκε!');
    } catch (err) {
      notifyError('Αποτυχία αντιγραφής της διεύθυνσης email.');
    }
  }
};

// UI State
const isMobile = ref(true);
const showDraftSetup = ref(false);
const draftExpectedPages = ref(1);

onMounted(() => {
  isMobile.value = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
});

// Refs for hidden inputs
const pdfInput = ref<HTMLInputElement | null>(null);
const imageInput = ref<HTMLInputElement | null>(null);

const triggerPdfPicker = () => {
  showDraftSetup.value = false;
  if (pdfInput.value) pdfInput.value.click();
};

const triggerImagePicker = () => {
  if (imageInput.value) imageInput.value.click();
};

const handlePdfSelection = (event: Event) => {
  const input = event.target as HTMLInputElement;
  const files = input.files ? Array.from(input.files) : [];
  
  for (const file of files) {
    if (isPdf(file)) {
      addPdfToBatch(file);
    }
  }
  
  input.value = '';
};

const confirmDraftSetup = () => {
  const pages = Number(draftExpectedPages.value);
  if (pages > 0) {
    if (startImageDraft(pages)) {
      showDraftSetup.value = false;
      draftExpectedPages.value = 1;
    }
  }
};

const cancelDraft = () => {
  cancelImageDraft();
  showDraftSetup.value = false;
};

const handleImageSelection = async (file: File) => {
  await addImageToDraft(file);
};

const handleGalleryImageSelection = async (event: Event) => {
  const input = event.target as HTMLInputElement;
  const files = input.files ? Array.from(input.files) : [];
  
  const remainingPages = draftInvoice.value ? draftInvoice.value.totalPages - draftInvoice.value.pages.length : 0;
  
  if (files.length > remainingPages) {
    notifyError(`Επιλέξατε περισσότερες εικόνες από τις υπολειπόμενες σελίδες. Προστέθηκαν μόνο οι πρώτες ${remainingPages}.`);
  }
  
  for (const file of files) {
    if (draftInvoice.value && draftInvoice.value.pages.length < draftInvoice.value.totalPages) {
      await addImageToDraft(file);
    } else {
      break;
    }
  }
  
  input.value = '';
};

const startUpload = async () => {
  await upload();
};

const resetAll = () => {
  resetQueue();
  showDraftSetup.value = false;
  draftExpectedPages.value = 1;
};

const isBusy = computed(() => ['validating', 'uploading'].includes(status.value));

const statusBadge = computed(() => {
  switch (status.value) {
    case 'completed':
      return 'uploaded';
    case 'error':
      return 'failed';
    case 'idle':
      return 'pending';
    default:
      return 'processing';
  }
});

const statusLabel = computed(() => {
  if (status.value === 'uploading') return 'Μεταφόρτωση...';
  if (status.value === 'validating') return 'Επικύρωση...';
  return 'Μεταφόρτωση Όλων';
});

const statusMessage = computed(() => {
  switch (status.value) {
    case 'validating':
      return 'Έλεγχος ευκρίνειας και προσανατολισμού...';
    case 'uploading':
      return 'Μεταφόρτωση τιμολογίων...';
    case 'completed':
      return 'Όλα τα τιμολόγια μεταφορτώθηκαν. Αναμονή επεξεργασίας.';
    case 'error':
      return 'Κάτι πήγε στραβά. Διορθώστε το πρόβλημα και δοκιμάστε ξανά.';
    default:
      return 'Προσθέστε τιμολόγια στη λίστα.';
  }
});
</script>

<style scoped>
/* Default: text-2xl (24px) - handled by Tailwind class */

/* Width <= 410px: text-xl (20px) */
@media (max-width: 410px) {
  .upload-title {
    font-size: 1.25rem; /* text-xl */
    line-height: 1.75rem;
  }
}

/* Width <= 380px: text-lg (18px) */
@media (max-width: 380px) {
  .upload-title {
    font-size: 1.125rem; /* text-lg */
    line-height: 1.75rem;
  }
}
</style>
