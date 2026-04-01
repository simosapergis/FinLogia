<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="isOpen"
        class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6"
        @click.self="handleClose"
      >
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-slate-900/70 backdrop-blur-sm" @click="handleClose" />

        <!-- Modal Panel -->
        <article
          class="relative flex h-full max-h-[95vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl bg-gradient-to-br from-white to-slate-50 shadow-2xl"
        >
          <!-- Header -->
          <header class="flex shrink-0 items-center justify-between border-b border-slate-100 px-6 py-5">
            <div class="min-w-0 flex-1">
              <p
                class="text-xs uppercase tracking-widest"
                :class="entryType === 'income' ? 'text-emerald-600' : 'text-rose-600'"
              >
                ΕΠΕΞΕΡΓΑΣΙΑ ΕΓΓΡΑΦΗΣ
              </p>
              <h3 class="text-xl font-bold text-slate-900">
                {{ categoryLabel }}
              </h3>
            </div>
            <button
              type="button"
              class="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              aria-label="Close"
              @click="handleClose"
            >
              <X class="h-5 w-5" />
            </button>
          </header>

          <!-- Scrollable Content -->
          <div class="flex-1 overflow-y-auto p-6">
            <!-- Invoice payment restriction -->
            <p
              v-if="entry?.source === 'invoice_payment'"
              class="mb-6 rounded-xl bg-amber-50 p-4 text-sm text-amber-700"
            >
              Οι εγγραφές από τιμολόγια δεν μπορούν να επεξεργαστούν.
            </p>

            <div v-else class="grid gap-5">
              <!-- Category -->
              <div class="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
                <label class="text-xs uppercase tracking-wide text-slate-400">Κατηγορία</label>
                <select
                  v-model="form.category"
                  class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-lg font-semibold text-slate-900 focus:border-primary-500 focus:ring-primary-500"
                >
                  <option v-for="(label, key) in categoryOptions" :key="key" :value="key">
                    {{ label }}
                  </option>
                </select>
              </div>

              <!-- Amount -->
              <div class="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
                <label class="text-xs uppercase tracking-wide text-slate-400">Ποσό</label>
                <div class="relative mt-1">
                  <input
                    v-model.number="form.amount"
                    type="number"
                    step="0.01"
                    min="0"
                    class="w-full rounded-lg border border-slate-300 px-3 py-2 pr-10 text-lg font-semibold text-slate-900 focus:border-primary-500 focus:ring-primary-500"
                  />
                  <span class="absolute right-3 top-1/2 -translate-y-1/2 text-lg font-medium text-slate-400">€</span>
                </div>
              </div>

              <!-- Date -->
              <div class="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-100 w-full">
                <label class="text-xs uppercase tracking-wide text-slate-400">Ημερομηνία</label>
                <div class="relative mt-1 flex w-full items-center">
                  <input
                    v-model="form.date"
                    type="date"
                    lang="el-GR"
                    class="w-full flex-1 min-w-0 max-w-full appearance-none min-h-[46px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-lg font-semibold text-slate-900 focus:border-primary-500 focus:ring-primary-500"
                  />
                  <span
                    v-if="!form.date"
                    class="pointer-events-none absolute top-[2px] bottom-[2px] left-[2px] right-10 flex items-center rounded-md bg-white pl-3 text-slate-400"
                    aria-hidden="true"
                  >ηη/μμ/εεεε</span>
                </div>
              </div>

              <!-- Description -->
              <div class="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
                <label class="text-xs uppercase tracking-wide text-slate-400">Περιγραφή</label>
                <input
                  v-model="form.description"
                  type="text"
                  placeholder="Σημειώσεις..."
                  class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-lg font-semibold text-slate-900 focus:border-primary-500 focus:ring-primary-500"
                />
              </div>
            </div>

            <!-- Error Message -->
            <p v-if="errorMessage" class="mt-4 rounded-xl bg-rose-50 p-4 text-sm text-rose-700">
              {{ errorMessage }}
            </p>
          </div>

          <!-- Footer -->
          <footer
            v-if="entry?.source !== 'invoice_payment'"
            class="shrink-0 border-t border-slate-100 bg-slate-50/50 px-6 py-4"
          >
            <div class="flex items-center justify-end gap-3">
              <button
                type="button"
                class="flex h-11 items-center justify-center gap-2 rounded-xl border-2 border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 active:scale-[0.98]"
                @click="handleClose"
              >
                Ακύρωση
              </button>
              <button
                type="button"
                :disabled="!hasChanges || isSaving"
                class="flex h-11 items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold text-white shadow-sm transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                :class="entryType === 'income'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-rose-600 hover:bg-rose-700'"
                @click="saveChanges"
              >
                <Loader2 v-if="isSaving" class="h-5 w-5 animate-spin" />
                <Check v-else class="h-5 w-5" />
                {{ isSaving ? 'Αποθήκευση...' : 'Αποθήκευση' }}
              </button>
            </div>
          </footer>
        </article>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { Check, Loader2, X } from 'lucide-vue-next';

import {
  editFinancialEntry,
  INCOME_CATEGORY_LABELS,
  EXPENSE_CATEGORY_LABELS,
  type EntryType,
  type FinancialEntry,
  type IncomeCategory,
  type ExpenseCategory,
} from '@/services/api/financialApi';

const props = defineProps<{
  isOpen: boolean;
  entry: FinancialEntry | null;
  entryType: EntryType;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'updated'): void;
}>();

const manualExpenseCategories: Partial<Record<ExpenseCategory, string>> = {
  ΡΕΥΜΑ: 'Ρεύμα',
  ΤΗΛΕΦΩΝΙΑ: 'Τηλεφωνία',
  ΕΝΟΙΚΙΟ: 'Ενοίκιο',
  ΜΙΣΘΟΙ: 'Μισθοί',
  ΛΟΓΙΣΤΗΣ: 'Λογιστής',
  ΑΛΛΑ: 'Άλλα',
};

const categoryOptions = computed(() => {
  return props.entryType === 'income' ? INCOME_CATEGORY_LABELS : manualExpenseCategories;
});

const categoryLabel = computed(() => {
  if (!props.entry) return '';
  if (props.entryType === 'income') {
    return INCOME_CATEGORY_LABELS[props.entry.category as IncomeCategory] ?? props.entry.category;
  }
  return EXPENSE_CATEGORY_LABELS[props.entry.category as ExpenseCategory] ?? props.entry.category;
});

const form = reactive({
  category: '' as string,
  amount: 0,
  date: '',
  description: '',
});

const isSaving = ref(false);
const errorMessage = ref<string | null>(null);

const toDateInputValue = (raw: string): string => {
  if (!raw) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const d = new Date(raw);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().split('T')[0];
};

watch(
  () => props.isOpen,
  (open) => {
    if (open && props.entry) {
      form.category = props.entry.category;
      form.amount = props.entry.amount;
      form.date = toDateInputValue(props.entry.date);
      form.description = props.entry.description ?? '';
      errorMessage.value = null;
    }
  },
  { immediate: true }
);

const hasChanges = computed(() => {
  if (!props.entry) return false;
  const originalDate = toDateInputValue(props.entry.date);

  return (
    form.category !== props.entry.category ||
    form.amount !== props.entry.amount ||
    form.date !== originalDate ||
    form.description !== (props.entry.description ?? '')
  );
});

const handleClose = () => {
  if (!isSaving.value) {
    emit('close');
  }
};

const saveChanges = async () => {
  if (!hasChanges.value || isSaving.value || !props.entry) return;

  isSaving.value = true;
  errorMessage.value = null;

  try {
    const fields: Record<string, unknown> = {};

    if (form.category !== props.entry.category) {
      fields.category = form.category;
    }
    if (form.amount !== props.entry.amount) {
      fields.amount = form.amount;
    }
    if (form.date !== toDateInputValue(props.entry.date)) {
      fields.date = form.date;
    }
    if (form.description !== (props.entry.description ?? '')) {
      fields.description = form.description || null;
    }

    await editFinancialEntry({
      entryId: props.entry.id,
      fields,
    });

    emit('updated');
    emit('close');
  } catch (err) {
    console.error('Failed to edit entry:', err);
    errorMessage.value = err instanceof Error ? err.message : 'Αποτυχία ενημέρωσης εγγραφής';
  } finally {
    isSaving.value = false;
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
</style>
