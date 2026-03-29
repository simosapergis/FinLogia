<template>
  <div class="flex flex-col items-center justify-center gap-4 py-10">
    <div class="relative">
      <div class="h-10 w-10 animate-spin rounded-full border-[3px] border-slate-200 border-t-primary-500" />
      <div class="absolute inset-0 h-10 w-10 animate-ping rounded-full border-[3px] border-primary-200 opacity-20" />
    </div>
    <p class="text-sm font-medium text-slate-500">{{ props.label }}</p>
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{ label?: string }>(),
  {
    label: 'Φόρτωση...'
  }
);
</script>
