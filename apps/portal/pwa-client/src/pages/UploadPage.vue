<template>
  <section class="grid w-full gap-6 lg:grid-cols-[2fr,1fr]">
    <div class="rounded-3xl bg-white p-6 shadow-lg">
      <header class="mb-6 flex items-center justify-between">
        <div>
          <h2 class="upload-title text-2xl font-semibold text-slate-900">Σάρωση Τιμολογίου</h2>
        </div>
        <StatusBadge :status="statusBadge" />
      </header>

      <div class="grid gap-4">
        <label class="text-sm font-medium text-slate-600">
          Σύνολο σελίδων
          <input
            type="number"
            min="1"
            class="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 focus:border-primary-500 focus:outline-none"
            :value="totalPages ?? ''"
            @input="handleTotalPagesInput"
          />
        </label>
      </div>

      <div class="mt-4 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div>
          <p class="text-sm font-semibold text-slate-700">Είναι ήδη εξοφλημένο;</p>
          <p class="text-xs text-slate-500">Θα καταχωρηθεί αυτόματα ως πληρωμένο</p>
        </div>
        <label class="relative inline-flex cursor-pointer items-center">
          <input type="checkbox" v-model="isPaid" class="peer sr-only" :disabled="isBusy" />
          <div class="peer h-6 w-11 rounded-full bg-slate-300 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-emerald-500 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 peer-disabled:cursor-not-allowed peer-disabled:opacity-60"></div>
        </label>
      </div>

      <p v-if="activeInvoiceId" class="mt-2 text-xs uppercase tracking-wide text-emerald-600">
        Ενεργό ID τιμολογίου: {{ activeInvoiceId }}
      </p>

      <div class="mt-6 space-y-3">
        <div class="flex flex-col gap-3">
          <label class="flex items-center gap-2 text-sm font-semibold text-slate-600 sm:hidden">
            <input
              type="checkbox"
              v-model="useGalleryMode"
              class="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
            />
            Από γκαλερί
          </label>
          <div class="relative">
            <CameraButton
              v-if="!useGalleryMode"
              :disabled="!canUseCamera"
              @select="handleSelection"
            >
              {{ mainActionLabel }}
            </CameraButton>
            <button
              v-else
              type="button"
              class="w-full rounded-xl bg-primary-600 px-6 py-4 text-base font-semibold text-white shadow-lg shadow-primary-600/30 transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
              :disabled="!canUseGallery"
              @click="triggerGalleryPicker"
            >
              {{ mainActionLabel }}
            </button>
          </div>
        </div>
        <p class="text-sm text-slate-500">{{ remainingPagesMessage }}</p>
      </div>

      <input
        ref="galleryInput"
        type="file"
        accept="image/*,application/pdf"
        multiple
        class="hidden"
        @change="handleGallerySelection"
      />

      <div v-if="pages.length" class="mt-6 rounded-2xl border border-slate-200">
        <ul class="divide-y divide-slate-100">
          <li v-for="page in pages" :key="page.id" class="flex items-center justify-between px-4 py-3">
            <div>
              <p class="text-sm font-semibold text-slate-800">
                Σελίδα {{ page.pageNumber }} — {{ page.name }}
              </p>
              <p class="text-xs text-slate-400">
                {{ page.result?.objectName ?? 'Εκκρεμεί μεταφόρτωση' }}
              </p>
            </div>
            <div class="flex items-center gap-3">
              <span
                class="rounded-full px-3 py-1 text-xs font-semibold"
                :class="pageStatusClasses(page.status)"
              >
                {{ formatPageStatus(page.status) }}
              </span>
              <button
                v-if="page.status === 'pending'"
                class="text-xs font-semibold text-rose-500 hover:text-rose-600"
                type="button"
                @click="removePage(page.id)"
              >
                Αφαίρεση
              </button>
            </div>
          </li>
        </ul>
      </div>

      <div class="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          type="button"
          class="rounded-xl bg-slate-900 px-6 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="!hasPendingUploads || isBusy"
          @click="startUpload"
        >
          {{ statusLabel }}
        </button>
        <button
          type="button"
          class="rounded-xl border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-600 disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="isBusy"
          @click="() => resetQueue()"
        >
          Επαναφορά
        </button>
        <p class="text-xs text-slate-500 sm:ml-auto">Πρόοδος: {{ overallProgress }}%</p>
      </div>

      <Loader v-if="isBusy" :label="statusMessage" />
      <p v-if="error" class="mt-2 text-sm text-rose-500">{{ error }}</p>
    </div>

    <div class="space-y-4">
      <div class="rounded-3xl border border-dashed border-slate-200 bg-white p-4 text-sm text-slate-500">
        <p class="font-semibold text-slate-700">Βήματα Σάρωσης</p>
        <ol class="mt-2 list-decimal space-y-1 pl-5">
          <li>Καταχώρηση συνολικού αριθμού σελίδων.</li>
          <li>Λήψη σελίδας.</li>
          <li>Μεταφόρτωση σελίδας.</li>
          <li>Επανάληψη για τις υπόλοιπες σελίδες (αν υπάρχουν).</li>
        </ol>
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
import { computed, ref } from 'vue';

import CameraButton from '@/components/CameraButton.vue';
import Loader from '@/components/Loader.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import { useInvoiceUpload } from '@/composables/useInvoiceUpload';

const {
  addPage,
  upload,
  removePage,
  resetQueue,
  setTotalPages,
  isPdf,
  status,
  error,
  totalPages,
  activeInvoiceId,
  isPaid,
  pages,
  uploadsLog,
  canAddPages,
  remainingPages,
  overallProgress,
  hasPendingUploads,
} = useInvoiceUpload();

const galleryInput = ref<HTMLInputElement | null>(null);
const useGalleryMode = ref(false);

const handleGallerySelection = async (event: Event) => {
  const input = event.target as HTMLInputElement;
  const files = input.files ? Array.from(input.files) : [];
  if (!files.length) return;

  const pdfFile = files.find((f) => isPdf(f));

  if (pdfFile) {
    resetQueue({ keepSettings: true });
    setTotalPages(1);
    await addPage(pdfFile);
  } else {
    for (const file of files) {
      await addPage(file);
    }
  }

  input.value = '';
};

const triggerGalleryPicker = () => {
  if (!galleryInput.value || !canUseGallery.value) return;
  galleryInput.value.click();
};

const handleSelection = async (file: File) => {
  if (isPdf(file)) {
    resetQueue({ keepSettings: true });
    setTotalPages(1);
  }
  await addPage(file);
};

const startUpload = async () => {
  await upload();
};

const handleTotalPagesInput = (event: Event) => {
  const input = event.target as HTMLInputElement;
  const value = Number.isNaN(input.valueAsNumber) ? null : input.valueAsNumber;
  setTotalPages(value);
};

const isBusy = computed(() => ['validating', 'uploading'].includes(status.value));
const canUseGallery = computed(() => (canAddPages.value || !totalPages.value) && !isBusy.value);
const canUseCamera = computed(() => (canAddPages.value || !totalPages.value) && !isBusy.value && !useGalleryMode.value);
const mainActionLabel = computed(() => {
  if (!canAddPages.value && totalPages.value) {
    return 'Όλες οι σελίδες καταγράφηκαν';
  }
  return 'Επιλογή εικόνας ή PDF';
});

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
  return 'Μεταφόρτωση εκκρεμών σελίδων';
});

const statusMessage = computed(() => {
  switch (status.value) {
    case 'validating':
      return 'Έλεγχος ευκρίνειας και προσανατολισμού...';
    case 'uploading':
      return 'Μεταφόρτωση σελίδας στο υπογεγραμμένο URL...';
    case 'completed':
      return 'Όλες οι σελίδες μεταφορτώθηκαν. Αναμονή επεξεργασίας.';
    case 'error':
      return 'Κάτι πήγε στραβά. Διορθώστε το πρόβλημα και δοκιμάστε ξανά.';
    default:
      return 'Καταγράψτε σελίδες και ανεβάστε τις καθώς προχωράτε.';
  }
});

const remainingPagesMessage = computed(() => {
  if (!totalPages.value) return 'Ορίστε τον συνολικό αριθμό σελίδων για να ξεκινήσετε.';
  if (remainingPages.value <= 0) return 'Όλες οι σελίδες καταγράφηκαν. Μεταφορτώστε για ολοκλήρωση.';
  return `Απομένουν ${remainingPages.value} σελίδ${remainingPages.value > 1 ? 'ες' : 'α'} για λήψη.`;
});

const pageStatusClasses = (pageStatus: string) => {
  switch (pageStatus) {
    case 'uploaded':
      return 'bg-emerald-100 text-emerald-700';
    case 'uploading':
      return 'bg-sky-100 text-sky-700';
    case 'validating':
      return 'bg-amber-100 text-amber-700';
    case 'error':
      return 'bg-rose-100 text-rose-700';
    default:
      return 'bg-slate-100 text-slate-600';
  }
};

const formatPageStatus = (pageStatus: string) => {
  switch (pageStatus) {
    case 'uploaded':
      return 'Ολοκληρώθηκε';
    case 'uploading':
      return 'Μεταφόρτωση';
    case 'validating':
      return 'Επικύρωση';
    case 'error':
      return 'Σφάλμα';
    default:
      return 'Εκκρεμεί';
  }
};
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
