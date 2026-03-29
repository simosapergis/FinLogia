<template>
  <span :class="badgeClasses">{{ label }}</span>
</template>

<script setup lang="ts">
import { computed } from 'vue';

type Status = 'pending' | 'processing' | 'uploaded' | 'completed' | 'failed' | 'paid' | 'unpaid' | 'partially_paid';

const props = defineProps<{ 
  status: Status;
  isCredit?: boolean;
}>();

const labelMap: Record<Status, string> = {
  pending: 'Σε αναμονή',
  processing: 'Σε επεξεργασία',
  uploaded: 'Μεταφορτώθηκε',
  completed: 'Ολοκληρώθηκε',
  failed: 'Αποτυχία Μεταφόρτωσης',
  paid: 'Εξοφλημένο',
  unpaid: 'Ανεξόφλητο',
  partially_paid: 'Μερικώς εξοφλημένο',
};

const colors: Record<Status, string> = {
  pending: 'bg-amber-100 text-amber-700',
  processing: 'bg-sky-100 text-sky-700',
  uploaded: 'bg-emerald-100 text-emerald-700',
  completed: 'bg-emerald-100 text-emerald-700',
  failed: 'bg-rose-100 text-rose-700',
  paid: 'bg-emerald-100 text-emerald-700',
  unpaid: 'bg-rose-100 text-rose-700',
  partially_paid: 'bg-amber-100 text-amber-700',
};

const badgeClasses = computed(() => {
  if (props.isCredit && props.status === 'unpaid') {
    return 'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold bg-indigo-100 text-indigo-700';
  }
  return `inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${colors[props.status]}`;
});

const label = computed(() => {
  if (props.isCredit && props.status === 'unpaid') {
    return 'Ανοιχτό Πιστωτικό';
  }
  return labelMap[props.status];
});
</script>
