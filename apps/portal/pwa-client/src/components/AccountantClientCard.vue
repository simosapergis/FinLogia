<template>
  <RouterLink
    :to="`/clients/${client.projectId}/invoices`"
    class="group flex flex-col rounded-2xl bg-white p-6 shadow-sm transition hover:shadow-lg hover:shadow-primary-500/10"
  >
    <div class="flex items-start justify-between">
      <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-50 text-primary-600 transition group-hover:bg-primary-100">
        <Building2 class="h-6 w-6" />
      </div>
      <ChevronRight class="h-5 w-5 text-slate-300 transition group-hover:text-primary-500" />
    </div>

    <h3 class="mt-4 text-base font-semibold text-slate-900 group-hover:text-primary-600">
      {{ client.displayName }}
    </h3>
    <p class="mt-1 text-xs text-slate-400">{{ client.projectId }}</p>
  </RouterLink>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router';
import { Building2, ChevronRight } from 'lucide-vue-next';
import type { Client } from '@/modules/clients/Client';

defineProps<{ client: Client }>();
</script>
