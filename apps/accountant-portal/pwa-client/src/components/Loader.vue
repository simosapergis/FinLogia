<template>
  <div class="flex flex-col items-center justify-center py-20">
    <div class="h-10 w-10 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
    <p v-if="message" class="mt-4 text-sm text-slate-500">{{ message }}</p>
  </div>
</template>

<script setup lang="ts">
defineProps<{ message?: string }>();
</script>
