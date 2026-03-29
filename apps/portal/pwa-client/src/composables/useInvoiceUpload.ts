import { computed, ref } from 'vue';

import { UploadFlow, type UploadPageResult } from '@/modules/invoices/UploadFlow';
import { detectQuality } from '@/modules/invoices/DetectQuality';
import { requestSignedUrl } from '@/services/api/requestSignedUrl';
import type { ImageQualityReport } from '@/utils/image';
import { createUUID } from '@/utils/uuid';
import { useNotifications } from './useNotifications';

const uploadFlow = new UploadFlow({
  detectQuality,
  requestSignedUrl,
});

type UploadState = 'idle' | 'validating' | 'ready' | 'uploading' | 'completed' | 'error';
type PageStatus = 'pending' | 'validating' | 'uploading' | 'uploaded' | 'error';

interface PageEntry {
  id: string;
  file: File;
  name: string;
  pageNumber: number;
  status: PageStatus;
  progress: number;
  error?: string;
  quality?: ImageQualityReport;
  result?: UploadPageResult;
}

export function useInvoiceUpload() {
  const totalPages = ref<number | null>(null);
  const activeInvoiceId = ref<string | null>(null);
  const isPaid = ref(false);
  const status = ref<UploadState>('idle');
  const error = ref<string | null>(null);
  const pages = ref<PageEntry[]>([]);
  const uploadsLog = ref<UploadPageResult[]>([]);

  const { notifySuccess, notifyError } = useNotifications();

  const canAddPages = computed(() => {
    if (!totalPages.value) return false;
    return pages.value.length < totalPages.value;
  });

  const remainingPages = computed(() => {
    if (!totalPages.value) return 0;
    return Math.max(totalPages.value - pages.value.length, 0);
  });

  const completedPages = computed(() => pages.value.filter((page) => page.status === 'uploaded').length);

  const overallProgress = computed(() => {
    if (!totalPages.value || totalPages.value === 0) return 0;
    return Math.min(100, Math.round((completedPages.value / totalPages.value) * 100));
  });

  const pendingPages = computed(() => pages.value.filter((page) => page.status === 'pending'));
  const hasPendingUploads = computed(() => pendingPages.value.length > 0);

  const setTotalPages = (value: number | null) => {
    if (value !== null && value < 1) {
      totalPages.value = null;
      return;
    }

    if (value !== null && Number.isFinite(value) && value < pages.value.length) {
      notifyError('Ο συνολικός αριθμός σελίδων δεν μπορεί να είναι μικρότερος από τις ήδη καταγεγραμμένες.');
      return;
    }
    totalPages.value = value;
  };

  const resetQueue = (options?: { keepSettings?: boolean }) => {
    pages.value = [];
    status.value = 'idle';
    error.value = null;
    totalPages.value = null;
    activeInvoiceId.value = null;
    if (!options?.keepSettings) {
      isPaid.value = false;
    }
  };

  const isPdf = (file: File) => file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

  const addPage = async (file: File) => {
    if (!totalPages.value) {
      const message = 'Ορίστε τον συνολικό αριθμό σελίδων πριν τη λήψη.';
      error.value = message;
      notifyError(message);
      return;
    }

    if (!canAddPages.value) {
      const message = 'Έχετε ήδη προσθέσει όλες τις σελίδες για αυτό το τιμολόγιο.';
      error.value = message;
      notifyError(message);
      return;
    }

    status.value = 'validating';
    try {
      const PDF_QUALITY_PASS: ImageQualityReport = {
        score: 100,
        status: 'accepted',
        accepted: true,
        reasons: [],
        width: 0,
        height: 0,
      };

      let quality: ImageQualityReport;

      if (isPdf(file)) {
        quality = PDF_QUALITY_PASS;
      } else {
        quality = await detectQuality(file);
        if (!quality.accepted) {
          throw new Error(quality.reasons[0] ?? 'Ο έλεγχος ποιότητας απέτυχε. Παρακαλώ επαναλάβετε τη λήψη.');
        }
      }

      const pageNumber = pages.value.length + 1;
      pages.value = [
        ...pages.value,
        {
          id: createUUID(),
          file,
          name: file.name || `Σελίδα ${pageNumber}`,
          pageNumber,
          status: 'pending',
          progress: 0,
          quality,
        },
      ];

      status.value = 'ready';
      error.value = null;
      notifySuccess(`Σελίδα ${pageNumber} επικυρώθηκε. Έτοιμη για μεταφόρτωση.`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Αδυναμία επικύρωσης της φωτογραφίας. Δοκιμάστε ξανά.';
      status.value = 'idle';
      error.value = message;
      notifyError(message);
    }
  };

  const removePage = (id: string) => {
    const index = pages.value.findIndex((page) => page.id === id);
    if (index === -1) return;
    pages.value.splice(index, 1);
    pages.value = pages.value.map((page, idx) => ({
      ...page,
      pageNumber: idx + 1,
    }));
  };

  const upload = async () => {
    if (!pages.value.length) {
      error.value = 'Καταγράψτε τουλάχιστον μία σελίδα πριν τη μεταφόρτωση.';
      notifyError(error.value);
      return;
    }

    if (!totalPages.value) {
      error.value = 'Ορίστε τον συνολικό αριθμό σελίδων.';
      notifyError(error.value);
      return;
    }

    let invoiceId = activeInvoiceId.value;

    status.value = 'uploading';
    error.value = null;

    for (const page of pages.value) {
      if (page.status === 'uploaded') continue;

      page.status = 'uploading';
      page.progress = 0;

      try {
        const includeTotalPages = !invoiceId && page.pageNumber === 1 ? totalPages.value : undefined;
        const result = await uploadFlow.uploadPage({
          file: page.file,
          pageNumber: page.pageNumber,
          totalPages: includeTotalPages ?? undefined,
          invoiceId: invoiceId ?? undefined,
          isPaid: isPaid.value,
          quality: page.quality,
          onProgress(progress) {
            page.progress = Math.round(progress);
          },
        });

        invoiceId = result.invoiceId;
        activeInvoiceId.value = result.invoiceId;
        page.status = 'uploaded';
        page.progress = 100;
        page.result = result;
        uploadsLog.value.push(result);

        const currentTotal = result.totalPages ?? totalPages.value;
        const isLastPage = result.pageNumber === currentTotal;

        // Only show individual page toast if it's not the last page
        if (!isLastPage) {
          notifySuccess(`Μεταφορτώθηκε σελίδα ${result.pageNumber} από ${currentTotal}.`);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Η μεταφόρτωση απέτυχε';
        page.status = 'error';
        page.error = message;
        status.value = 'error';
        error.value = message;
        notifyError(message);
        return;
      }
    }

    if (completedPages.value === totalPages.value) {
      status.value = 'completed';
      notifySuccess(`Ολοκληρώθηκε η μεταφόρτωση ${totalPages.value}/${totalPages.value} σελίδων. Η επεξεργασία θα συνεχιστεί στο παρασκήνιο.`);
      resetQueue();
    } else {
      status.value = 'ready';
    }
  };

  return {
    status,
    error,
    totalPages,
    activeInvoiceId,
    isPaid,
    pages,
    uploadsLog,
    canAddPages,
    remainingPages,
    completedPages,
    overallProgress,
    hasPendingUploads,
    isPdf,
    addPage,
    removePage,
    upload,
    setTotalPages,
    resetQueue,
  };
}
