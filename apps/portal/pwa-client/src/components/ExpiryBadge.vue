<template>
  <span v-if="expiryInfo" :class="badgeClasses">{{ expiryInfo.label }}</span>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { getDaysUntilExpiry, INVOICE_EXPIRY_DAYS } from '@/utils/date';

type DateInput = string | Date | { seconds: number };

const props = defineProps<{ invoiceDate?: DateInput }>();

interface ExpiryInfo {
  label: string;
  colorClass: string;
}

const expiryInfo = computed<ExpiryInfo | null>(() => {
  const daysRemaining = getDaysUntilExpiry(props.invoiceDate);
  
  if (daysRemaining === null) return null;

  // Already expired (past the invoice month)
  if (daysRemaining < 0) {
    return {
      label: 'Έληξε',
      colorClass: 'bg-rose-100 text-rose-700',
    };
  }

  // Expires today (last day of month)
  if (daysRemaining === 0) {
    return {
      label: 'Λήγει σήμερα',
      colorClass: 'bg-orange-100 text-orange-700',
    };
  }

  // Only show badge if days remaining <= threshold
  if (daysRemaining <= INVOICE_EXPIRY_DAYS) {
    if (daysRemaining <= 7) {
      // Urgent - within a week
      return {
        label: `Λήγει σε ${daysRemaining} ${daysRemaining === 1 ? 'μέρα' : 'μέρες'}`,
        colorClass: 'bg-amber-100 text-amber-700',
      };
    }
    
    // More than a week but within threshold
    return {
      label: `Λήγει σε ${daysRemaining} μέρες`,
      colorClass: 'bg-slate-100 text-slate-600',
    };
  }

  // More days remaining than threshold - don't show badge
  return null;
});

const badgeClasses = computed(() =>
  `inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${expiryInfo.value?.colorClass ?? ''}`
);
</script>
