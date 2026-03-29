<template>
  <section class="w-full">
    <header class="mb-6">
      <h2 class="text-2xl font-semibold text-slate-900">Έξοδα</h2>
      <p class="mt-1 text-sm text-slate-500">Καταχώρηση, αναζήτηση και διαχείριση εξόδων</p>
    </header>

    <!-- Tab Navigation -->
    <div class="mb-6 flex gap-1 rounded-xl bg-slate-100 p-1">
      <button
        type="button"
        class="flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition"
        :class="activeTab === 'entry' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'"
        @click="activeTab = 'entry'"
      >
        Καταχώρηση
      </button>
      <button
        type="button"
        class="flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition"
        :class="activeTab === 'search' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'"
        @click="activeTab = 'search'"
      >
        Αναζήτηση
      </button>
      <button
        type="button"
        class="flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition"
        :class="activeTab === 'recurring' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'"
        @click="activeTab = 'recurring'; loadRecurringExpenses()"
      >
        Πάγια
      </button>
    </div>

    <!-- Entry Tab -->
    <div v-if="activeTab === 'entry'" class="rounded-3xl bg-white p-6 shadow-lg">
      <h3 class="mb-6 flex items-center gap-2 text-lg font-semibold text-slate-900">
        <PlusCircle class="h-5 w-5 text-rose-600" />
        Καταχώρηση Εξόδου
      </h3>

      <!-- Category Selector -->
      <div class="mb-4">
        <label class="mb-2 block text-sm font-medium text-slate-700">Κατηγορία</label>
        <select
          v-model="expenseCategory"
          class="w-full rounded-xl border-2 border-slate-200 px-4 py-3 text-slate-900 transition focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-500/10"
        >
          <option value="">— Επιλέξτε κατηγορία —</option>
          <option v-for="(label, key) in manualExpenseCategories" :key="key" :value="key">
            {{ label }}
          </option>
        </select>
      </div>

      <!-- Amount -->
      <div class="mb-4">
        <label class="mb-2 block text-sm font-medium text-slate-700">Ποσό</label>
        <div class="relative">
          <input
            v-model.number="expenseAmount"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            class="w-full rounded-xl border-2 border-slate-200 px-4 py-3 pr-12 text-lg font-semibold text-slate-900 transition focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-500/10"
          />
          <span class="absolute right-4 top-1/2 -translate-y-1/2 text-lg font-medium text-slate-400">€</span>
        </div>
      </div>

      <!-- Date -->
      <div class="mb-4">
        <label class="mb-2 block text-sm font-medium text-slate-700">Ημερομηνία</label>
        <div class="relative">
          <input
            v-model="expenseDate"
            type="date"
            lang="el-GR"
            class="w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-slate-900 transition focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-500/10"
          />
          <span
            v-if="!expenseDate"
            class="pointer-events-none absolute top-[3px] bottom-[3px] left-[3px] right-12 flex items-center rounded-lg bg-white pl-4 text-slate-400"
            aria-hidden="true"
          >ηη/μμ/εεεε</span>
        </div>
      </div>

      <!-- Description -->
      <div class="mb-6">
        <label class="mb-2 block text-sm font-medium text-slate-700">Περιγραφή (προαιρετικό)</label>
        <input
          v-model="expenseDescription"
          type="text"
          placeholder="Σημειώσεις..."
          class="w-full rounded-xl border-2 border-slate-200 px-4 py-3 text-slate-900 transition focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-500/10"
        />
      </div>

      <!-- Submit Button -->
      <button
        type="button"
        :disabled="!canSubmitExpense || isSubmitting"
        class="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 py-4 text-lg font-semibold text-white shadow-lg shadow-rose-600/30 transition hover:shadow-xl hover:shadow-rose-600/40 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
        @click="submitExpense"
      >
        <Loader2 v-if="isSubmitting" class="h-5 w-5 animate-spin" />
        {{ isSubmitting ? 'Καταχώρηση...' : 'Καταχώρηση' }}
      </button>

      <!-- Messages -->
      <p v-if="successMessage" class="mt-4 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700">
        {{ successMessage }}
      </p>
      <p v-if="errorMessage" class="mt-4 rounded-xl bg-rose-50 p-4 text-sm text-rose-700">
        {{ errorMessage }}
      </p>
    </div>

    <!-- Search Tab -->
    <div v-if="activeTab === 'search'" class="space-y-6">
      <!-- Date Range Selector -->
      <div class="rounded-3xl bg-white p-6 shadow-lg">
        <h3 class="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-400">ΕΠΙΛΟΓΗ ΠΕΡΙΟΔΟΥ</h3>
        
        <div class="mb-4 flex flex-wrap gap-2">
          <button
            v-for="period in quickPeriods"
            :key="period.label"
            type="button"
            class="rounded-xl px-3 py-2 text-sm font-medium transition active:scale-95"
            :class="selectedPeriod === period.label
              ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'"
            @click="selectQuickPeriod(period)"
          >
            {{ period.label }}
          </button>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="mb-2 block text-sm font-medium text-slate-700">Από</label>
            <div class="relative">
              <input
                v-model="searchStartDate"
                type="date"
                lang="el-GR"
                class="w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-slate-900 transition focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-500/10"
                @change="selectedPeriod = 'custom'"
              />
              <span
                v-if="!searchStartDate"
                class="pointer-events-none absolute top-[3px] bottom-[3px] left-[3px] right-12 flex items-center rounded-lg bg-white pl-4 text-slate-400"
                aria-hidden="true"
              >ηη/μμ/εεεε</span>
            </div>
          </div>
          <div>
            <label class="mb-2 block text-sm font-medium text-slate-700">Έως</label>
            <div class="relative">
              <input
                v-model="searchEndDate"
                type="date"
                lang="el-GR"
                class="w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-slate-900 transition focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-500/10"
                @change="selectedPeriod = 'custom'"
              />
              <span
                v-if="!searchEndDate"
                class="pointer-events-none absolute top-[3px] bottom-[3px] left-[3px] right-12 flex items-center rounded-lg bg-white pl-4 text-slate-400"
                aria-hidden="true"
              >ηη/μμ/εεεε</span>
            </div>
          </div>
        </div>

        <button
          type="button"
          :disabled="!isValidRange || isSearching"
          class="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 py-3 font-semibold text-white shadow-lg shadow-rose-600/30 transition hover:shadow-xl hover:shadow-rose-600/40 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          @click="searchEntries"
        >
          <Loader2 v-if="isSearching" class="h-5 w-5 animate-spin" />
          <Search v-else class="h-5 w-5" />
          {{ isSearching ? 'Αναζήτηση...' : 'Αναζήτηση' }}
        </button>
      </div>

      <!-- Results -->
      <div v-if="hasSearched" class="rounded-3xl bg-white p-6 shadow-lg">
        <!-- Loading state: clear list, show searching message -->
        <div v-if="isSearching" class="flex flex-col items-center justify-center gap-3 py-12">
          <Loader2 class="h-10 w-10 animate-spin text-rose-500" />
          <p class="text-sm font-medium text-slate-500">Αναζήτηση εξόδων...</p>
        </div>

        <template v-else>
        <div v-if="reportData" class="mb-6 rounded-xl bg-rose-50 p-4">
          <div class="flex items-center justify-between">
            <span class="text-sm font-medium text-rose-700">Σύνολο Εξόδων</span>
            <span class="text-2xl font-bold text-rose-700">€ {{ formatCurrency(reportData.summary.totalExpenses) }}</span>
          </div>
        </div>

        <h3 class="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-400">ΕΓΓΡΑΦΕΣ ({{ entries.length }})</h3>
        
        <div v-if="entries.length > 0" class="space-y-3">
          <article
            v-for="entry in entries"
            :key="entry.id"
            class="flex flex-col rounded-xl border border-slate-100 bg-slate-50 p-4"
          >
            <div class="flex items-center justify-between">
              <div class="min-w-0 flex-1">
                <p class="font-semibold text-slate-900">{{ EXPENSE_CATEGORY_LABELS[entry.category as ExpenseCategory] ?? entry.category }}</p>
                <p class="text-sm text-slate-500">
                  {{ formatEntryDate(entry.date) }}
                  <span v-if="entry.source === 'recurring'" class="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-700">Πάγιο</span>
                  <span v-if="entry.source === 'invoice_payment'" class="ml-2 rounded bg-blue-100 px-1.5 py-0.5 text-xs text-blue-700">Τιμολόγιο</span>
                </p>
              </div>
              <div class="flex items-center gap-3">
                <p class="text-lg font-bold text-rose-600">€ {{ formatCurrency(entry.amount) }}</p>
                <div class="flex items-center gap-1">
                  <button
                    type="button"
                    class="flex h-8 w-8 items-center justify-center rounded-lg transition"
                    :class="entry.source === 'invoice_payment'
                      ? 'cursor-not-allowed text-slate-300'
                      : 'text-slate-400 hover:bg-slate-200 hover:text-primary-600'"
                    :disabled="entry.source === 'invoice_payment'"
                    :title="entry.source === 'invoice_payment' ? 'Δεν επιτρέπεται η επεξεργασία' : 'Επεξεργασία'"
                    @click="entry.source !== 'invoice_payment' && openEditModal(entry)"
                  >
                    <Pencil class="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    class="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-rose-100 hover:text-rose-600"
                    title="Διαγραφή"
                    @click="confirmingDeleteId = confirmingDeleteId === entry.id ? null : entry.id"
                  >
                    <Trash2 class="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
            <div v-if="entry.description || entry.createdByName" class="mt-3 border-t border-slate-200 pt-3">
              <div v-if="entry.description">
                <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Σχόλια</p>
                <p class="mt-1 text-sm text-slate-700">{{ entry.description }}</p>
              </div>
              <div v-if="entry.createdByName" class="flex items-center gap-1.5" :class="entry.description ? 'mt-2' : ''">
                <User class="h-3.5 w-3.5 text-slate-400" />
                <p class="text-xs text-slate-400">{{ entry.createdByName }}</p>
              </div>
            </div>
            <!-- Inline delete confirmation -->
            <div
              v-if="confirmingDeleteId === entry.id"
              class="mt-3 flex items-center justify-between rounded-xl bg-rose-50 p-3"
            >
              <p class="text-sm font-medium text-rose-700">Διαγραφή εγγραφής;</p>
              <div class="flex items-center gap-2">
                <button
                  type="button"
                  class="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-200"
                  @click="confirmingDeleteId = null"
                >
                  Ακύρωση
                </button>
                <button
                  type="button"
                  :disabled="isDeletingId === entry.id"
                  class="flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-rose-700 active:scale-[0.98] disabled:opacity-60"
                  @click="handleDelete(entry.id)"
                >
                  <Loader2 v-if="isDeletingId === entry.id" class="h-3.5 w-3.5 animate-spin" />
                  Ναι
                </button>
              </div>
            </div>
          </article>
        </div>

        <p v-else class="py-8 text-center text-sm text-slate-500">
          Δεν βρέθηκαν έξοδα για την επιλεγμένη περίοδο.
        </p>
        </template>
      </div>
    </div>

    <!-- Recurring Tab -->
    <div v-if="activeTab === 'recurring'" class="space-y-6">
      <!-- Add Recurring Form -->
      <div class="rounded-3xl bg-white p-6 shadow-lg">
        <h3 class="mb-6 flex items-center gap-2 text-lg font-semibold text-slate-900">
          <RefreshCw class="h-5 w-5 text-amber-600" />
          Προσθήκη Πάγιου Εξόδου
        </h3>

        <div class="grid gap-4 sm:grid-cols-2">
          <div>
            <label class="mb-2 block text-sm font-medium text-slate-700">Κατηγορία</label>
            <select
              v-model="recurringCategory"
              class="w-full rounded-xl border-2 border-slate-200 px-4 py-3 text-slate-900 transition focus:border-primary-500 focus:outline-none"
            >
              <option value="">— Επιλέξτε —</option>
              <option v-for="(label, key) in manualExpenseCategories" :key="key" :value="key">
                {{ label }}
              </option>
            </select>
          </div>

          <div>
            <label class="mb-2 block text-sm font-medium text-slate-700">Ποσό</label>
            <div class="relative">
              <input
                v-model.number="recurringAmount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                class="w-full rounded-xl border-2 border-slate-200 px-4 py-3 pr-12 text-slate-900 transition focus:border-primary-500 focus:outline-none"
              />
              <span class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">€</span>
            </div>
          </div>

          <div>
            <label class="mb-2 block text-sm font-medium text-slate-700">Ημέρα Μήνα (1-28)</label>
            <select
              v-model.number="recurringDay"
              class="w-full rounded-xl border-2 border-slate-200 px-4 py-3 text-slate-900 transition focus:border-primary-500 focus:outline-none"
            >
              <option v-for="day in 28" :key="day" :value="day">{{ day }}η</option>
            </select>
          </div>

          <div>
            <label class="mb-2 block text-sm font-medium text-slate-700">Περιγραφή</label>
            <input
              v-model="recurringDescription"
              type="text"
              placeholder="π.χ. Μηνιαίο ενοίκιο"
              class="w-full rounded-xl border-2 border-slate-200 px-4 py-3 text-slate-900 transition focus:border-primary-500 focus:outline-none"
            />
          </div>
        </div>

        <button
          type="button"
          :disabled="!canSubmitRecurring || isSubmittingRecurring"
          class="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 py-3 font-semibold text-white shadow-lg shadow-amber-600/30 transition hover:shadow-xl hover:shadow-amber-600/40 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          @click="submitRecurring"
        >
          <Loader2 v-if="isSubmittingRecurring" class="h-5 w-5 animate-spin" />
          {{ isSubmittingRecurring ? 'Αποθήκευση...' : 'Προσθήκη Πάγιου' }}
        </button>
      </div>

      <!-- Recurring List -->
      <div class="rounded-3xl bg-white p-6 shadow-lg">
        <h3 class="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-400">ΕΝΕΡΓΑ ΠΑΓΙΑ ΕΞΟΔΑ</h3>

        <div v-if="isLoadingRecurring" class="py-8 text-center text-sm text-slate-500">
          Φόρτωση...
        </div>

        <div v-else-if="recurringExpenses.length > 0" class="space-y-3">
          <article
            v-for="rec in recurringExpenses"
            :key="rec.id"
            class="flex items-center justify-between rounded-xl border p-4"
            :class="rec.isActive ? 'border-slate-100 bg-slate-50' : 'border-slate-200 bg-slate-100 opacity-60'"
          >
            <div class="flex items-center gap-3">
              <input
                type="checkbox"
                :checked="rec.isActive"
                class="h-5 w-5 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                @change="toggleRecurring(rec)"
              />
              <div>
                <p class="font-semibold text-slate-900">{{ EXPENSE_CATEGORY_LABELS[rec.category] ?? rec.category }}</p>
                <p class="text-sm text-slate-500">{{ rec.dayOfMonth }}η κάθε μήνα{{ rec.description ? ` • ${rec.description}` : '' }}</p>
              </div>
            </div>
            <p class="text-lg font-bold" :class="rec.isActive ? 'text-amber-600' : 'text-slate-400'">
              € {{ formatCurrency(rec.amount) }}
            </p>
          </article>
        </div>

        <p v-else class="py-8 text-center text-sm text-slate-500">
          Δεν υπάρχουν πάγια έξοδα.
        </p>
      </div>
    </div>

    <!-- Edit Modal -->
    <FinancialEntryEditModal
      :is-open="editModalOpen"
      :entry="selectedEntry"
      entry-type="expense"
      @close="editModalOpen = false"
      @updated="onEntryUpdated"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { Loader2, Pencil, PlusCircle, RefreshCw, Search, Trash2, User } from 'lucide-vue-next';

import FinancialEntryEditModal from '@/components/FinancialEntryEditModal.vue';
import { useNotifications } from '@/composables/useNotifications';
import {
  addFinancialEntry,
  addRecurringExpense,
  deleteFinancialEntry,
  getFinancialReport,
  getRecurringExpenses,
  updateRecurringExpense,
  EXPENSE_CATEGORY_LABELS,
  type ExpenseCategory,
  type FinancialEntry,
  type FinancialReport,
  type RecurringExpense,
} from '@/services/api/financialApi';
import { formatCurrency } from '@/utils/date';
import { QUICK_PERIODS, getDateRangeForPeriod } from '@/composables/useQuickPeriods';

const { notifySuccess, notifyError } = useNotifications();

// Tab state
const activeTab = ref<'entry' | 'search' | 'recurring'>('entry');

// Manual expense categories (exclude auto-generated ones)
const manualExpenseCategories: Partial<Record<ExpenseCategory, string>> = {
  ΡΕΥΜΑ: 'Ρεύμα',
  ΤΗΛΕΦΩΝΙΑ: 'Τηλεφωνία',
  ΕΝΟΙΚΙΟ: 'Ενοίκιο',
  ΜΙΣΘΟΙ: 'Μισθοί',
  ΛΟΓΙΣΤΗΣ: 'Λογιστής',
  ΑΛΛΑ: 'Άλλα',
};

// Entry form state
const expenseCategory = ref<ExpenseCategory | ''>('');
const expenseAmount = ref<number | null>(null);
const expenseDate = ref(new Date().toISOString().split('T')[0]);
const expenseDescription = ref('');
const isSubmitting = ref(false);
const successMessage = ref<string | null>(null);
const errorMessage = ref<string | null>(null);

// Search state
const searchStartDate = ref('');
const searchEndDate = ref('');
const selectedPeriod = ref('');
const isSearching = ref(false);
const hasSearched = ref(false);
const entries = ref<FinancialEntry[]>([]);
const reportData = ref<FinancialReport | null>(null);

// Recurring state
const recurringCategory = ref<ExpenseCategory | ''>('');
const recurringAmount = ref<number | null>(null);
const recurringDay = ref(1);
const recurringDescription = ref('');
const recurringExpenses = ref<RecurringExpense[]>([]);
const isLoadingRecurring = ref(false);
const isSubmittingRecurring = ref(false);

const quickPeriods = QUICK_PERIODS;

const selectQuickPeriod = (period: { label: string; key: string }) => {
  selectedPeriod.value = period.label;
  const { startDate: s, endDate: e } = getDateRangeForPeriod(period.key);
  searchStartDate.value = s;
  searchEndDate.value = e;
};

const canSubmitExpense = computed(() => {
  return expenseCategory.value && expenseAmount.value && expenseAmount.value > 0;
});

const canSubmitRecurring = computed(() => {
  return recurringCategory.value && recurringAmount.value && recurringAmount.value > 0;
});

const isValidRange = computed(() => {
  return searchStartDate.value && searchEndDate.value && new Date(searchStartDate.value) <= new Date(searchEndDate.value);
});

const formatEntryDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('el-GR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const submitExpense = async () => {
  if (!canSubmitExpense.value || isSubmitting.value) return;

  isSubmitting.value = true;
  successMessage.value = null;
  errorMessage.value = null;

  try {
    await addFinancialEntry({
      type: 'expense',
      category: expenseCategory.value as ExpenseCategory,
      amount: expenseAmount.value!,
      date: expenseDate.value,
      description: expenseDescription.value || undefined,
    });

    successMessage.value = `Καταχωρήθηκε έξοδο € ${formatCurrency(expenseAmount.value!)}`;
    
    // Reset form
    expenseCategory.value = '';
    expenseAmount.value = null;
    expenseDescription.value = '';
  } catch (err) {
    console.error('Failed to submit expense:', err);
    errorMessage.value = err instanceof Error ? err.message : 'Αποτυχία καταχώρησης εξόδου';
  } finally {
    isSubmitting.value = false;
  }
};

const searchEntries = async () => {
  if (!isValidRange.value || isSearching.value) return;

  isSearching.value = true;
  hasSearched.value = true;
  entries.value = [];
  reportData.value = null;

  try {
    const response = await getFinancialReport({
      startDate: searchStartDate.value,
      endDate: searchEndDate.value,
      type: 'expense',
    });

    reportData.value = response.data;
    entries.value = response.data.entries;
  } catch (err) {
    console.error('Failed to search entries:', err);
    entries.value = [];
    reportData.value = null;
  } finally {
    isSearching.value = false;
  }
};

const loadRecurringExpenses = async () => {
  if (isLoadingRecurring.value) return;

  isLoadingRecurring.value = true;
  try {
    const response = await getRecurringExpenses();
    recurringExpenses.value = response.data;
  } catch (err) {
    console.error('Failed to load recurring expenses:', err);
  } finally {
    isLoadingRecurring.value = false;
  }
};

const submitRecurring = async () => {
  if (!canSubmitRecurring.value || isSubmittingRecurring.value) return;

  isSubmittingRecurring.value = true;
  try {
    await addRecurringExpense({
      category: recurringCategory.value as ExpenseCategory,
      amount: recurringAmount.value!,
      dayOfMonth: recurringDay.value,
      description: recurringDescription.value || undefined,
    });

    // Reset form and reload list
    recurringCategory.value = '';
    recurringAmount.value = null;
    recurringDescription.value = '';
    await loadRecurringExpenses();
  } catch (err) {
    console.error('Failed to add recurring expense:', err);
  } finally {
    isSubmittingRecurring.value = false;
  }
};

const toggleRecurring = async (rec: RecurringExpense) => {
  try {
    await updateRecurringExpense({
      recurringId: rec.id,
      fields: { isActive: !rec.isActive },
    });
    rec.isActive = !rec.isActive;
  } catch (err) {
    console.error('Failed to toggle recurring:', err);
  }
};

// Edit / Delete state
const selectedEntry = ref<FinancialEntry | null>(null);
const editModalOpen = ref(false);
const confirmingDeleteId = ref<string | null>(null);
const isDeletingId = ref<string | null>(null);

const openEditModal = (entry: FinancialEntry) => {
  selectedEntry.value = entry;
  editModalOpen.value = true;
};

const onEntryUpdated = () => {
  notifySuccess('Η εγγραφή ενημερώθηκε επιτυχώς');
  searchEntries();
};

const handleDelete = async (entryId: string) => {
  isDeletingId.value = entryId;
  try {
    await deleteFinancialEntry(entryId);
    confirmingDeleteId.value = null;
    notifySuccess('Η εγγραφή διαγράφηκε επιτυχώς');
    await searchEntries();
  } catch (err) {
    console.error('Failed to delete entry:', err);
    notifyError(err instanceof Error ? err.message : 'Αποτυχία διαγραφής εγγραφής');
  } finally {
    isDeletingId.value = null;
  }
};
</script>



