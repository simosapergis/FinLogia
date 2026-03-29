<template>
  <span
    class="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium"
    :class="badgeClasses"
  >
    <component :is="icon" v-if="icon" class="h-3 w-3" />
    {{ label }}
  </span>
</template>

<script setup lang="ts">
import { computed, type Component } from 'vue';
import { Eye, Download, CheckCircle, XCircle } from 'lucide-vue-next';

const props = defineProps<{
  type: 'viewed' | 'exported' | 'registered' | 'denied';
}>();

const badgeClasses = computed(() => {
  if (props.type === 'viewed') return 'bg-sky-100 text-sky-700';
  if (props.type === 'registered') return 'bg-emerald-100 text-emerald-700';
  if (props.type === 'denied') return 'bg-rose-100 text-rose-700';
  return 'bg-emerald-100 text-emerald-700'; // exported
});

const label = computed(() => {
  if (props.type === 'viewed') return 'Προβλήθηκε';
  if (props.type === 'registered') return 'Καταχωρήθηκε';
  if (props.type === 'denied') return 'Απορρίφθηκε';
  return 'Ληφθέν'; // exported
});

const icon = computed<Component | null>(() => {
  if (props.type === 'viewed') return Eye;
  if (props.type === 'exported') return Download;
  if (props.type === 'registered') return CheckCircle;
  if (props.type === 'denied') return XCircle;
  return null;
});
</script>
