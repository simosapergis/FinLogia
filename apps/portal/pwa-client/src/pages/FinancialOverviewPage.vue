<template>
  <section class="w-full">
    <header class="mb-6">
      <h2 class="text-2xl font-semibold text-slate-900">Οικονομική Απεικόνιση</h2>
      <p class="mt-1 text-sm text-slate-500">Συνολική εικόνα εσόδων και εξόδων</p>
    </header>

    <!-- Date Range Selector -->
    <div class="mb-6 rounded-3xl bg-white p-6 shadow-lg">
      <h3 class="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-400">ΕΠΙΛΟΓΗ ΠΕΡΙΟΔΟΥ</h3>
      
      <div class="mb-4 flex flex-wrap gap-2">
        <button
          v-for="period in quickPeriods"
          :key="period.label"
          type="button"
          class="rounded-xl px-3 py-2 text-sm font-medium transition active:scale-95"
          :class="selectedPeriod === period.label
            ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/30'
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
              v-model="startDate"
              type="date"
              lang="el-GR"
              class="w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-slate-900 transition focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-500/10"
              @change="selectedPeriod = 'custom'"
            />
            <span
              v-if="!startDate"
              class="pointer-events-none absolute top-[3px] bottom-[3px] left-[3px] right-12 flex items-center rounded-lg bg-white pl-4 text-slate-400"
              aria-hidden="true"
            >ηη/μμ/εεεε</span>
          </div>
        </div>
        <div>
          <label class="mb-2 block text-sm font-medium text-slate-700">Έως</label>
          <div class="relative">
            <input
              v-model="endDate"
              type="date"
              lang="el-GR"
              class="w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-slate-900 transition focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-500/10"
              @change="selectedPeriod = 'custom'"
            />
            <span
              v-if="!endDate"
              class="pointer-events-none absolute top-[3px] bottom-[3px] left-[3px] right-12 flex items-center rounded-lg bg-white pl-4 text-slate-400"
              aria-hidden="true"
            >ηη/μμ/εεεε</span>
          </div>
        </div>
      </div>

      <button
        type="button"
        :disabled="!isValidRange || isLoading"
        class="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary-600 to-primary-500 py-3 font-semibold text-white shadow-lg shadow-primary-600/30 transition hover:shadow-xl hover:shadow-primary-600/40 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
        @click="loadReport"
      >
        <Loader2 v-if="isLoading" class="h-5 w-5 animate-spin" />
        <BarChart3 v-else class="h-5 w-5" />
        {{ isLoading ? 'Φόρτωση...' : 'Εμφάνιση Αναφοράς' }}
      </button>
    </div>

    <!-- Report Content -->
    <div v-if="reportData" class="space-y-6">
      <!-- Net Balance Card -->
      <div
        class="rounded-3xl p-6 shadow-lg"
        :class="reportData.summary.netBalance >= 0 ? 'bg-gradient-to-br from-emerald-500 to-emerald-600' : 'bg-gradient-to-br from-rose-500 to-rose-600'"
      >
        <p class="text-sm font-medium uppercase tracking-wide text-white/80">ΚΑΘΑΡΟ ΥΠΟΛΟΙΠΟ</p>
        <p class="mt-2 text-4xl font-bold text-white">
          {{ reportData.summary.netBalance >= 0 ? '+' : '' }}€ {{ formatCurrency(reportData.summary.netBalance) }}
        </p>
        <p class="mt-2 text-sm text-white/70">
          {{ periodLabel }}
        </p>
      </div>

      <!-- Income & Expenses Side by Side -->
      <div class="grid gap-6 lg:grid-cols-2">
        <!-- Income Card -->
        <div class="rounded-3xl bg-white p-6 shadow-lg">
          <div class="mb-4 flex items-center justify-between">
            <h3 class="flex items-center gap-2 text-lg font-semibold text-slate-900">
              <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600"><TrendingUp class="h-5 w-5" /></span>
              Έσοδα
            </h3>
            <p class="text-2xl font-bold text-emerald-600">€ {{ formatCurrency(reportData.summary.totalIncome) }}</p>
          </div>

          <div class="space-y-3">
            <div
              v-for="(amount, category) in reportData.breakdown.income"
              :key="category"
              class="flex items-center justify-between rounded-xl bg-emerald-50 p-3"
            >
              <span class="text-sm font-medium text-emerald-700">{{ INCOME_CATEGORY_LABELS[category] ?? category }}</span>
              <span class="font-semibold text-emerald-700">€ {{ formatCurrency(amount ?? 0) }}</span>
            </div>
            <p v-if="Object.keys(reportData.breakdown.income).length === 0" class="py-4 text-center text-sm text-slate-500">
              Δεν υπάρχουν έσοδα
            </p>
          </div>
        </div>

        <!-- Expenses Card -->
        <div class="rounded-3xl bg-white p-6 shadow-lg">
          <div class="mb-4 flex items-center justify-between">
            <h3 class="flex items-center gap-2 text-lg font-semibold text-slate-900">
              <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-100 text-rose-600"><TrendingDown class="h-5 w-5" /></span>
              Έξοδα
            </h3>
            <p class="text-2xl font-bold text-rose-600">€ {{ formatCurrency(reportData.summary.totalExpenses) }}</p>
          </div>

          <div class="space-y-3">
            <div
              v-for="(amount, category) in reportData.breakdown.expenses"
              :key="category"
              class="flex items-center justify-between rounded-xl bg-rose-50 p-3"
            >
              <span class="text-sm font-medium text-rose-700">{{ EXPENSE_CATEGORY_LABELS[category] ?? category }}</span>
              <span class="font-semibold text-rose-700">€ {{ formatCurrency(amount ?? 0) }}</span>
            </div>
            <p v-if="Object.keys(reportData.breakdown.expenses).length === 0" class="py-4 text-center text-sm text-slate-500">
              Δεν υπάρχουν έξοδα
            </p>
          </div>
        </div>
      </div>

      <!-- Summary Stats -->
      <div class="grid gap-4 sm:grid-cols-3">
        <div class="flex items-center gap-4 rounded-2xl bg-white p-5 shadow-sm">
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <TrendingUp class="h-5 w-5" />
          </div>
          <div>
            <p class="text-xs uppercase tracking-wide text-slate-400">Σύνολο Εσόδων</p>
            <p class="mt-0.5 text-xl font-bold text-emerald-600">€ {{ formatCurrency(reportData.summary.totalIncome) }}</p>
          </div>
        </div>
        <div class="flex items-center gap-4 rounded-2xl bg-white p-5 shadow-sm">
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
            <TrendingDown class="h-5 w-5" />
          </div>
          <div>
            <p class="text-xs uppercase tracking-wide text-slate-400">Σύνολο Εξόδων</p>
            <p class="mt-0.5 text-xl font-bold text-rose-600">€ {{ formatCurrency(reportData.summary.totalExpenses) }}</p>
          </div>
        </div>
        <div class="flex items-center gap-4 rounded-2xl bg-white p-5 shadow-sm">
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
            <Hash class="h-5 w-5" />
          </div>
          <div>
            <p class="text-xs uppercase tracking-wide text-slate-400">Αριθμός Εγγραφών</p>
            <p class="mt-0.5 text-xl font-bold text-slate-900">{{ reportData.summary.entryCount }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else-if="!isLoading" class="rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center shadow-sm">
      <BarChart3 class="mx-auto h-14 w-14 text-slate-300" :stroke-width="1.5" />
      <p class="mt-4 text-sm font-medium text-slate-600">Επιλέξτε περίοδο και πατήστε "Εμφάνιση Αναφοράς"</p>
      <p class="mt-1 text-xs text-slate-400">Η οικονομική σας αναφορά θα εμφανιστεί εδώ</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { TrendingUp, TrendingDown, BarChart3, Loader2, Search, Hash } from 'lucide-vue-next';

import {
  getFinancialReport,
  INCOME_CATEGORY_LABELS,
  EXPENSE_CATEGORY_LABELS,
  type FinancialReport,
} from '@/services/api/financialApi';
import { formatCurrency } from '@/utils/date';
import { QUICK_PERIODS, getDateRangeForPeriod } from '@/composables/useQuickPeriods';

const startDate = ref('');
const endDate = ref('');
const selectedPeriod = ref('');
const isLoading = ref(false);
const reportData = ref<FinancialReport | null>(null);

const quickPeriods = QUICK_PERIODS;

const isValidRange = computed(() => {
  return startDate.value && endDate.value && new Date(startDate.value) <= new Date(endDate.value);
});

const periodLabel = computed(() => {
  if (!startDate.value || !endDate.value) return '';
  const formatDate = (d: string) => new Date(d).toLocaleDateString('el-GR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  if (startDate.value === endDate.value) {
    return formatDate(startDate.value);
  }
  return `${formatDate(startDate.value)} - ${formatDate(endDate.value)}`;
});

const selectQuickPeriod = (period: { label: string; key: string }) => {
  selectedPeriod.value = period.label;
  const { startDate: s, endDate: e } = getDateRangeForPeriod(period.key);
  startDate.value = s;
  endDate.value = e;
};

const loadReport = async () => {
  if (!isValidRange.value || isLoading.value) return;

  isLoading.value = true;

  try {
    const response = await getFinancialReport({
      startDate: startDate.value,
      endDate: endDate.value,
    });

    reportData.value = response.data;
  } catch (err) {
    console.error('Failed to load report:', err);
    reportData.value = null;
  } finally {
    isLoading.value = false;
  }
};
</script>



