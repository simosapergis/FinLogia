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
                <dt class="text-xs font-medium text-slate-400">Προμηθευτής</dt>
                <dd class="mt-1 text-sm font-semibold text-slate-900">{{ invoice.supplierName || invoice.supplierId }}</dd>
              </div>
              <div>
                <dt class="text-xs font-medium text-slate-400">Ημερομηνία</dt>
                <dd class="mt-1 text-sm text-slate-700">{{ formatInvoiceDate(invoice.invoiceDate) }}</dd>
              </div>
              <div>
                <dt class="text-xs font-medium text-slate-400">Ποσό</dt>
                <dd class="mt-1 text-sm font-semibold text-slate-900">{{ formatCurrency(invoice.totalAmount) }}</dd>
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
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { firebaseApp } from '@/services/firebase';
import { X, ExternalLink, Check, X as XIcon } from 'lucide-vue-next';
import type { InvoiceDetail } from '@/modules/invoices/Invoice';
import { requestSignedDownloadUrl } from '@/services/api/requestSignedDownloadUrl';
import { recordInvoiceView } from '@/services/api/invoicesApi';
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
}>();

const invoice = ref<InvoiceDetail | null>(null);
const pdfUrl = ref<string | null>(null);
const loading = ref(false);

function formatInvoiceDate(date: unknown): string {
  if (!date) return '—';
  if (typeof date === 'string') return formatDateTime(date);
  if (typeof date === 'object' && date !== null && '_seconds' in date) {
    return formatDateTime(new Date((date as { _seconds: number })._seconds * 1000));
  }
  return formatDateTime(date as Date);
}

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
