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

export type UploadState = 'idle' | 'validating' | 'ready' | 'uploading' | 'completed' | 'error';
export type PageStatus = 'pending' | 'validating' | 'uploading' | 'uploaded' | 'error';

export interface PageEntry {
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

export interface BatchInvoice {
  id: string;
  type: 'pdf' | 'image';
  pages: PageEntry[];
  totalPages: number;
  isPaid: boolean;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  invoiceId?: string;
  error?: string;
}

const MAX_INVOICES = 10;

export function useInvoiceUpload() {
  const invoices = ref<BatchInvoice[]>([]);
  const draftInvoice = ref<BatchInvoice | null>(null);
  const status = ref<UploadState>('idle');
  const error = ref<string | null>(null);
  const uploadsLog = ref<UploadPageResult[]>([]);

  const { notifySuccess, notifyError } = useNotifications();

  const totalInvoices = computed(() => invoices.value.length);
  const canAddMoreInvoices = computed(() => totalInvoices.value < MAX_INVOICES);

  const completedInvoices = computed(() => invoices.value.filter((inv) => inv.status === 'completed').length);
  const pendingInvoices = computed(() => invoices.value.filter((inv) => inv.status === 'pending' || inv.status === 'error'));
  const hasPendingUploads = computed(() => pendingInvoices.value.length > 0);

  const overallProgress = computed(() => {
    if (totalInvoices.value === 0) return 0;
    
    let totalPages = 0;
    let completedPages = 0;
    
    for (const inv of invoices.value) {
      totalPages += inv.totalPages;
      completedPages += inv.pages.filter(p => p.status === 'uploaded').length;
    }
    
    if (totalPages === 0) return 0;
    return Math.min(100, Math.round((completedPages / totalPages) * 100));
  });

  const resetQueue = () => {
    invoices.value = [];
    draftInvoice.value = null;
    status.value = 'idle';
    error.value = null;
  };

  const isPdf = (file: File) => file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

  const startImageDraft = (expectedPages: number) => {
    if (!canAddMoreInvoices.value) {
      notifyError(`Μέγιστο όριο ${MAX_INVOICES} τιμολόγια ανά μεταφόρτωση.`);
      return false;
    }

    draftInvoice.value = {
      id: createUUID(),
      type: 'image',
      pages: [],
      totalPages: expectedPages,
      isPaid: false,
      status: 'pending',
    };
    return true;
  };

  const cancelImageDraft = () => {
    draftInvoice.value = null;
  };

  const addPdfToBatch = (file: File) => {
    if (!canAddMoreInvoices.value) {
      notifyError(`Μέγιστο όριο ${MAX_INVOICES} τιμολόγια ανά μεταφόρτωση.`);
      return false;
    }

    const PDF_QUALITY_PASS: ImageQualityReport = {
      score: 100,
      status: 'accepted',
      accepted: true,
      reasons: [],
      width: 0,
      height: 0,
    };

    const newInvoice: BatchInvoice = {
      id: createUUID(),
      type: 'pdf',
      pages: [{
        id: createUUID(),
        file,
        name: file.name || 'PDF Document',
        pageNumber: 1,
        status: 'pending',
        progress: 0,
        quality: PDF_QUALITY_PASS,
      }],
      totalPages: 1, // We treat PDF as 1 unit for upload purposes
      isPaid: false,
      status: 'pending',
    };

    invoices.value.push(newInvoice);
    return true;
  };

  const addImageToDraft = async (file: File) => {
    if (!draftInvoice.value) {
      error.value = 'Δεν υπάρχει ενεργό πρόχειρο τιμολόγιο.';
      return false;
    }

    if (draftInvoice.value.pages.length >= draftInvoice.value.totalPages) {
      notifyError('Έχετε ήδη προσθέσει όλες τις σελίδες για αυτό το τιμολόγιο.');
      return false;
    }

    status.value = 'validating';
    try {
      const quality = await detectQuality(file);
      if (!quality.accepted) {
        throw new Error(quality.reasons[0] ?? 'Ο έλεγχος ποιότητας απέτυχε. Παρακαλώ επαναλάβετε τη λήψη.');
      }

      const pageNumber = draftInvoice.value.pages.length + 1;
      draftInvoice.value.pages.push({
        id: createUUID(),
        file,
        name: file.name || `Σελίδα ${pageNumber}`,
        pageNumber,
        status: 'pending',
        progress: 0,
        quality,
      });

      status.value = 'ready';
      error.value = null;
      notifySuccess(`Σελίδα ${pageNumber} επικυρώθηκε.`);

      // If draft is complete, move it to invoices batch
      if (draftInvoice.value.pages.length === draftInvoice.value.totalPages) {
        invoices.value.push({ ...draftInvoice.value });
        draftInvoice.value = null;
        notifySuccess('Το τιμολόγιο προστέθηκε στη λίστα μεταφόρτωσης.');
      }

      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Αδυναμία επικύρωσης της φωτογραφίας. Δοκιμάστε ξανά.';
      status.value = 'idle';
      error.value = message;
      notifyError(message);
      return false;
    }
  };

  const removeInvoice = (id: string) => {
    const index = invoices.value.findIndex((inv) => inv.id === id);
    if (index !== -1) {
      invoices.value.splice(index, 1);
    }
  };

  const updateInvoiceIsPaid = (id: string, isPaid: boolean) => {
    const invoice = invoices.value.find((inv) => inv.id === id);
    if (invoice) {
      invoice.isPaid = isPaid;
    }
  };

  const upload = async () => {
    if (!invoices.value.length) {
      error.value = 'Προσθέστε τουλάχιστον ένα τιμολόγιο πριν τη μεταφόρτωση.';
      notifyError(error.value);
      return;
    }

    status.value = 'uploading';
    error.value = null;

    let allSuccessful = true;

    for (const invoice of invoices.value) {
      if (invoice.status === 'completed') continue;

      invoice.status = 'uploading';
      invoice.error = undefined;
      
      // Reset invoiceId for each new BatchInvoice to ensure they are treated as separate documents
      let currentBackendInvoiceId: string | undefined = undefined;
      let invoiceFailed = false;

      for (const page of invoice.pages) {
        if (page.status === 'uploaded') {
          // If resuming a partially uploaded invoice, we need the ID
          if (page.result?.invoiceId) {
            currentBackendInvoiceId = page.result.invoiceId;
          }
          continue;
        }

        page.status = 'uploading';
        page.progress = 0;

        try {
          const includeTotalPages = !currentBackendInvoiceId && page.pageNumber === 1 ? invoice.totalPages : undefined;
          
          const result = await uploadFlow.uploadPage({
            file: page.file,
            pageNumber: page.pageNumber,
            totalPages: includeTotalPages,
            invoiceId: currentBackendInvoiceId,
            isPaid: invoice.isPaid,
            quality: page.quality,
            onProgress(progress) {
              page.progress = Math.round(progress);
            },
          });

          currentBackendInvoiceId = result.invoiceId;
          invoice.invoiceId = result.invoiceId;
          
          page.status = 'uploaded';
          page.progress = 100;
          page.result = result;
          uploadsLog.value.push(result);

        } catch (err) {
          const message = err instanceof Error ? err.message : 'Η μεταφόρτωση απέτυχε';
          page.status = 'error';
          page.error = message;
          invoice.status = 'error';
          invoice.error = message;
          invoiceFailed = true;
          allSuccessful = false;
          notifyError(`Σφάλμα στο Τιμολόγιο: ${message}`);
          break; // Stop uploading pages for this specific invoice
        }
      }

      if (!invoiceFailed) {
        invoice.status = 'completed';
      }
    }

    if (allSuccessful) {
      status.value = 'completed';
      notifySuccess(`Ολοκληρώθηκε η μεταφόρτωση ${invoices.value.length} τιμολογίων. Η επεξεργασία θα συνεχιστεί στο παρασκήνιο.`);
      resetQueue();
    } else {
      status.value = 'error';
      error.value = 'Ορισμένα τιμολόγια δεν μεταφορτώθηκαν. Ελέγξτε τα σφάλματα.';
    }
  };

  return {
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
  };
}
