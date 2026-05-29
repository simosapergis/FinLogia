<template>
  <Teleport to="body">
    <Transition name="modal-backdrop">
      <div
        v-if="visible"
        class="fixed inset-0 z-[80] bg-slate-900/60 backdrop-blur-sm"
        @click="$emit('close')"
      />
    </Transition>
    <Transition name="modal">
      <div v-if="visible" class="fixed inset-0 z-[90] flex items-center justify-center p-4">
        <div
          class="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
          @click.stop
        >
          <div class="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <h2 class="text-lg font-bold text-slate-900">Λεπτομέρειες Τιμολογίου</h2>
            <div class="flex items-center gap-3">
              <div class="flex items-center gap-1 mr-4 border-r border-slate-200 pr-4">
                <button
                  type="button"
                  class="flex h-8 w-8 items-center justify-center rounded-full border transition hover:scale-110"
                  :class="auditStatus === 'registered' ? 'border-emerald-500 text-emerald-600 bg-emerald-50' : 'border-slate-200 text-slate-400 hover:text-emerald-600 hover:border-emerald-300 bg-white'"
                  @click="emit('update:auditStatus', auditStatus === 'registered' ? null : 'registered')"
                  title="Καταχωρήθηκε"
                >
                  <Check class="h-4 w-4" />
                </button>
                <button
                  type="button"
                  class="flex h-8 w-8 items-center justify-center rounded-full border transition hover:scale-110"
                  :class="auditStatus === 'denied' ? 'border-rose-500 text-rose-600 bg-rose-50' : 'border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-300 bg-white'"
                  @click="emit('update:auditStatus', auditStatus === 'denied' ? null : 'denied')"
                  title="Απορρίφθηκε"
                >
                  <XIcon class="h-4 w-4" />
                </button>
              </div>
              <button
                type="button"
                class="flex h-8 w-8 items-center justify-center rounded-lg text-rose-400 transition hover:bg-rose-50 hover:text-rose-600"
                @click="showDeleteConfirm = true"
                title="Διαγραφή"
              >
                <Trash2 class="h-4 w-4" />
              </button>
              <button
                type="button"
                class="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                @click="emit('close')"
              >
                <X class="h-5 w-5" />
              </button>
            </div>
          </div>

          <div v-if="loading" class="flex items-center justify-center py-16">
            <div class="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
          </div>

          <div v-else-if="invoice" class="flex-1 overflow-y-auto p-6">
            <dl class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <dt class="text-xs font-medium text-slate-400">Αρ. Τιμολογίου</dt>
                <dd class="mt-1 text-sm font-semibold text-slate-900">{{ invoice.invoiceNumber || '—' }}</dd>
              </div>
              <div>
                <dt class="text-xs font-medium text-slate-400">Τύπος</dt>
                <dd class="mt-1 text-sm font-semibold" :class="invoice.isCredit ? 'text-indigo-600' : 'text-slate-900'">
                  {{ invoice.isCredit ? 'Πιστωτικό' : 'Χρεωστικό' }}
                </dd>
              </div>
              <div>
                <dt class="text-xs font-medium text-slate-400">Προμηθευτής</dt>
                <dd class="mt-1 text-sm font-semibold text-slate-900">{{ invoice.supplierName || invoice.supplierId }}</dd>
              </div>
              <div>
                <dt class="text-xs font-medium text-slate-400">Α.Φ.Μ. Προμηθευτή</dt>
                <dd class="mt-1 text-sm font-semibold text-slate-900">{{ invoice.supplierTaxNumber || '—' }}</dd>
              </div>
              <div>
                <dt class="text-xs font-medium text-slate-400">Ημερομηνία Έκδοσης</dt>
                <dd class="mt-1 text-sm text-slate-700">{{ formatInvoiceDate(invoice.invoiceDate) }}</dd>
              </div>
              <div>
                <dt class="text-xs font-medium text-slate-400">Ημερομηνία Μεταφόρτωσης</dt>
                <dd class="mt-1 text-sm text-slate-700">{{ formatInvoiceDate(invoice.uploadedAt) }}</dd>
              </div>
              <div v-if="invoice.uploadedByName">
                <dt class="text-xs font-medium text-slate-400">Καταχωρήθηκε Από</dt>
                <dd class="mt-1 text-sm font-semibold text-slate-900">{{ invoice.uploadedByName }}</dd>
              </div>
              <div>
                <dt class="text-xs font-medium text-slate-400">Καθαρό Ποσό</dt>
                <dd class="mt-1 text-sm font-semibold text-slate-900">{{ formatCurrency(getDisplayAmount(invoice.netAmount), true) }}</dd>
              </div>
              <div>
                <dt class="text-xs font-medium text-slate-400">Φ.Π.Α.</dt>
                <dd class="mt-1 text-sm font-semibold text-slate-900">{{ formatCurrency(getDisplayAmount(invoice.vatAmount), true) }}</dd>
              </div>
              <div>
                <dt class="text-xs font-medium text-slate-400">Συνολικό Ποσό</dt>
                <dd class="mt-1 text-sm font-semibold text-slate-900">{{ formatCurrency(getDisplayAmount(invoice.totalAmount), true) }}</dd>
              </div>
              <div>
                <dt class="text-xs font-medium text-slate-400">Εξοφλημένο Ποσό</dt>
                <dd class="mt-1 text-sm font-semibold text-emerald-600">{{ formatCurrency(getDisplayAmount(invoice.paidAmount), true) }}</dd>
              </div>
              <div>
                <dt class="text-xs font-medium text-slate-400">Ανεξόφλητο Ποσό</dt>
                <dd class="mt-1 text-sm font-semibold" :class="(invoice.unpaidAmount ?? 0) > 0 ? 'text-amber-600' : 'text-emerald-600'">
                  {{ formatCurrency(getDisplayAmount(invoice.unpaidAmount), true) }}
                </dd>
              </div>
              <div v-if="!invoice.isCredit && creditUsedNotes.length > 0" class="sm:col-span-2">
                <dt class="text-xs font-medium text-slate-400">Συνδεδεμένα Πιστωτικά</dt>
                <dd class="mt-1 text-sm font-medium text-indigo-600">
                  <span v-for="(note, index) in creditUsedNotes" :key="index" class="block">
                    {{ note }}
                  </span>
                </dd>
              </div>
            </dl>

            <div v-if="pdfUrl" class="mt-6">
              <a
                :href="pdfUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex items-center gap-2 rounded-xl bg-primary-50 px-4 py-2.5 text-sm font-medium text-primary-700 transition hover:bg-primary-100"
              >
                <ExternalLink class="h-4 w-4" />
                Προβολή PDF
              </a>
            </div>

            <div v-if="pdfUrl" class="mt-4 overflow-hidden rounded-2xl border border-slate-200">
              <iframe :src="pdfUrl" class="h-[400px] w-full" />
            </div>
          </div>

          <div v-else class="px-6 py-16 text-center text-sm text-slate-500">
            Δεν βρέθηκαν δεδομένα.
          </div>
          
          <!-- Delete Confirmation Overlay -->
          <Transition name="fade">
            <div v-if="showDeleteConfirm" class="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
              <div class="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
                <div class="flex items-start gap-4">
                  <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-100">
                    <Trash2 class="h-6 w-6 text-rose-600" />
                  </div>
                  <div>
                    <h3 class="text-lg font-semibold text-slate-900">Διαγραφή Τιμολογίου</h3>
                    <p class="mt-2 text-sm text-slate-600">
                      Είστε σίγουροι ότι θέλετε να διαγράψετε αυτό το τιμολόγιο; Αυτή η ενέργεια δεν μπορεί να αναιρεθεί.
                    </p>
                    
                    <div v-if="invoice?.auditStatus" class="mt-3 rounded-lg bg-amber-50 p-3 border border-amber-200">
                      <div class="flex items-start gap-2">
                        <svg class="h-5 w-5 shrink-0 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p class="text-sm font-medium text-amber-800">
                          Προσοχή: Το τιμολόγιο έχει ήδη ελεγχθεί ({{ invoice.auditStatus === 'registered' ? 'Καταχωρήθηκε' : 'Απορρίφθηκε' }}). Είστε σίγουροι ότι θέλετε να το διαγράψετε;
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div class="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    class="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    @click="showDeleteConfirm = false"
                    :disabled="isDeleting"
                  >
                    Ακύρωση
                  </button>
                  <button
                    type="button"
                    class="flex min-w-[100px] items-center justify-center rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
                    @click="confirmDelete"
                    :disabled="isDeleting"
                  >
                    <svg v-if="isDeleting" class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span v-else>Διαγραφή</span>
                  </button>
                </div>
              </div>
            </div>
          </Transition>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { firebaseApp } from '@/services/firebase';
import { X, ExternalLink, Check, X as XIcon, Trash2 } from 'lucide-vue-next';
import type { Invoice as InvoiceDetail } from '@/modules/invoices/InvoiceMapper';
import { requestSignedDownloadUrl } from '@/services/api/requestSignedDownloadUrl';
import { recordInvoiceView, deleteInvoice } from '@/services/api/invoicesApi';
import { formatCurrency, formatDateTime } from '@/utils/date';
import { notify } from '@/services/notifications';

const db = getFirestore(firebaseApp);

const props = defineProps<{
  visible: boolean;
  clientProjectId: string;
  supplierId: string;
  invoiceId: string;
  bucketName: string;
  auditStatus?: 'registered' | 'denied' | null;
}>();

const emit = defineEmits<{
  close: [];
  'update:auditStatus': [status: 'registered' | 'denied' | null];
  deleted: [invoiceId: string];
}>();

const invoice = ref<InvoiceDetail | null>(null);
const pdfUrl = ref<string | null>(null);
const loading = ref(false);

const isDeleting = ref(false);
const showDeleteConfirm = ref(false);

const confirmDelete = async () => {
  try {
    isDeleting.value = true;
    await deleteInvoice({ businessId: props.clientProjectId, invoiceId: props.invoiceId });
    notify({ message: 'Το τιμολόγιο διαγράφηκε επιτυχώς', type: 'success' });
    showDeleteConfirm.value = false;
    emit('deleted', props.invoiceId);
    emit('close');
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Αποτυχία διαγραφής τιμολογίου';
    notify({ message, type: 'error' });
  } finally {
    isDeleting.value = false;
  }
};

function formatInvoiceDate(date: unknown): string {
  if (!date) return '—';
  if (typeof date === 'string') return formatDateTime(date);
  if (typeof date === 'object' && date !== null && '_seconds' in date) {
    return formatDateTime(new Date((date as { _seconds: number })._seconds * 1000));
  }
  return formatDateTime(date as Date);
}

const getDisplayAmount = (amount?: number) => {
  if (!amount) return 0;
  return invoice.value?.isCredit ? -amount : amount;
};

const creditUsedNotes = computed(() => {
  if (!invoice.value?.paymentHistory || invoice.value.paymentHistory.length === 0) return [];
  
  const notes: string[] = [];
  for (const entry of invoice.value.paymentHistory) {
    if (entry.creditInvoiceId) {
      const amount = formatCurrency(entry.creditAmountUsed ?? 0);
      notes.push(`Χρήση Πιστωτικού: ΠΤ-${entry.notes?.match(/αριθμό (.+)/)?.[1] || entry.creditInvoiceId} (€ ${amount})`);
    }
  }
  return notes;
});

watch(
  () => props.visible,
  async (isVisible) => {
    if (!isVisible) return;
    loading.value = true;
    invoice.value = null;
    pdfUrl.value = null;

    try {
      const docSnap = await getDoc(doc(db, `businesses/${props.clientProjectId}/invoices/${props.invoiceId}`));
      if (docSnap.exists()) {
        invoice.value = docSnap.data() as InvoiceDetail;
        
        // Record view asynchronously
        recordInvoiceView({ businessId: props.clientProjectId, invoiceId: props.invoiceId }).catch(console.error);

        if (invoice.value?.filePath) {
          try {
            const urlRes = await requestSignedDownloadUrl({
              filePath: invoice.value.filePath,
              businessId: props.clientProjectId,
            });
            pdfUrl.value = urlRes.downloadUrl;
          } catch {
            notify({ message: 'Αποτυχία φόρτωσης PDF', type: 'error' });
          }
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Αποτυχία φόρτωσης τιμολογίου';
      notify({ message, type: 'error' });
    } finally {
      loading.value = false;
    }
  }
);
</script>

<style scoped>
.modal-backdrop-enter-active, .modal-backdrop-leave-active { transition: opacity 0.2s ease; }
.modal-backdrop-enter-from, .modal-backdrop-leave-to { opacity: 0; }
.modal-enter-active, .modal-leave-active { transition: all 0.2s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; transform: scale(0.95); }
</style>
