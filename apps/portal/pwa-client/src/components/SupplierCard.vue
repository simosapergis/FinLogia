<template>
  <article class="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
    <header class="flex items-center justify-between gap-3">
      <div class="min-w-0 flex-1">
        <h3 class="text-base font-semibold text-slate-900">{{ supplier.name }}</h3>
        <p v-if="supplier.supplierTaxNumber || supplier.id" class="mt-0.5 text-xs text-slate-400">
          ΑΦΜ: {{ supplier.supplierTaxNumber ?? supplier.id }}
        </p>
      </div>
      <span v-if="supplier.status" :class="badgeClass">{{ statusLabel }}</span>
    </header>
    <div v-if="supplier.contactEmail || supplier.contactPhone" class="mt-3 space-y-1">
      <p v-if="supplier.contactEmail" class="flex items-center gap-2 text-sm text-slate-500">
        <Mail class="h-4 w-4 text-slate-400" />
        {{ supplier.contactEmail }}
      </p>
      <p v-if="supplier.contactPhone" class="flex items-center gap-2 text-sm text-slate-500">
        <Phone class="h-4 w-4 text-slate-400" />
        {{ supplier.contactPhone }}
      </p>
    </div>
    <p v-if="supplier.city || supplier.country" class="mt-3 text-xs text-slate-400">
      {{ [supplier.city, supplier.country].filter(Boolean).join(', ') }}
    </p>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Mail, Phone } from 'lucide-vue-next';

import type { Supplier } from '@/modules/suppliers/Supplier';

const props = defineProps<{ supplier: Supplier }>();

const badgeClass = computed(() => {
  const base = 'shrink-0 rounded-full px-3 py-1 text-xs font-semibold';
  switch (props.supplier.status) {
    case 'active':
      return `${base} bg-emerald-50 text-emerald-700`;
    case 'prospect':
      return `${base} bg-amber-50 text-amber-700`;
    case 'inactive':
      return `${base} bg-slate-100 text-slate-500`;
    default:
      return `${base} bg-slate-100 text-slate-600`;
  }
});

const statusLabel = computed(() => {
  switch (props.supplier.status) {
    case 'active':
      return 'Ενεργός';
    case 'prospect':
      return 'Υποψήφιος';
    case 'inactive':
      return 'Ανενεργός';
    default:
      return props.supplier.status ?? '';
  }
});
</script>




