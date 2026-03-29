<template>
  <section class="w-full">
    <header class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p class="text-xs uppercase tracking-wide text-primary-600">Ενημερώσεις</p>
        <h2 class="text-2xl font-semibold text-slate-900">Ειδοποιήσεις</h2>
        <p class="mt-1 text-sm text-slate-500">
          {{ unreadCount > 0 ? `${unreadCount} μη αναγνωσμένες` : 'Όλες οι ειδοποιήσεις έχουν αναγνωστεί' }}
        </p>
      </div>
      <div class="flex gap-2">
        <button
          v-if="unreadCount > 0"
          type="button"
          class="rounded-xl bg-primary-50 px-4 py-2 text-sm font-medium text-primary-600 transition hover:bg-primary-100 active:scale-[0.98]"
          @click="markAllAsRead"
        >
          Σήμανση όλων
        </button>
        <button
          v-if="notifications.length > 0"
          type="button"
          class="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 active:scale-[0.98]"
          @click="clearAll"
        >
          Εκκαθάριση
        </button>
      </div>
    </header>

    <div v-if="notifications.length === 0" class="rounded-3xl border border-dashed border-slate-200 bg-white p-8 text-center shadow-sm">
      <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
        <Bell class="h-8 w-8 text-slate-400" :stroke-width="1.5" />
      </div>
      <p class="text-sm font-medium text-slate-600">Δεν υπάρχουν ειδοποιήσεις</p>
      <p class="mt-1 text-xs text-slate-400">Θα λάβετε ειδοποιήσεις όταν ολοκληρωθεί η επεξεργασία των τιμολογίων σας</p>
    </div>

    <div v-else class="space-y-3">
      <article
        v-for="notification in notifications"
        :key="notification.id"
        class="cursor-pointer rounded-2xl bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
        :class="{ 'border-l-4 border-l-primary-500': !notification.read }"
        @click="handleNotificationClick(notification)"
      >
        <div class="flex items-start gap-4">
          <!-- Icon -->
          <div
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
            :class="notification.type === 'success' ? 'bg-emerald-100' : 'bg-rose-100'"
          >
            <CheckCircle2 v-if="notification.type === 'success'" class="h-5 w-5 text-emerald-600" />
            <AlertCircle v-else class="h-5 w-5 text-rose-600" />
          </div>

          <!-- Content -->
          <div class="min-w-0 flex-1">
            <div class="flex items-center justify-between gap-2">
              <p class="font-semibold text-slate-900">
                {{ notification.type === 'success' ? 'Επιτυχής επεξεργασία' : 'Σφάλμα επεξεργασίας' }}
              </p>
              <span class="shrink-0 text-xs text-slate-400">
                {{ formatTime(notification.receivedAt) }}
              </span>
            </div>

            <!-- Message from backend -->
            <p v-if="notification.message" class="mt-1 text-sm text-slate-700">
              {{ notification.message }}
            </p>

            <p v-if="notification.supplierName" class="mt-1 text-sm text-slate-600">
              {{ notification.supplierName }}
              <span v-if="notification.invoiceNumber" class="text-slate-400">
                — ΤΔΑ-{{ notification.invoiceNumber }}
              </span>
            </p>

            <p class="mt-1 text-xs text-slate-400">
              ID: {{ notification.invoiceId }}
            </p>
          </div>

          <!-- Unread indicator -->
          <div v-if="!notification.read" class="h-2.5 w-2.5 shrink-0 rounded-full bg-primary-500" />
        </div>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { Bell, CheckCircle2, AlertCircle } from 'lucide-vue-next';

import { useNotificationStore, type InvoiceNotification } from '@/store/notificationStore';
import { useInvoiceNotifications } from '@/composables/useInvoiceNotifications';

const store = useNotificationStore();
const { sortedNotifications: notifications, unreadCount } = storeToRefs(store);
const { markAsSeen } = useInvoiceNotifications();

const markAllAsRead = () => {
  // Mark all as seen in Firestore
  notifications.value.forEach((n) => {
    if (!n.read) {
      markAsSeen(n.invoiceId);
    }
  });
  store.markAllAsRead();
};

const clearAll = () => {
  store.clearAll();
};

const handleNotificationClick = (notification: InvoiceNotification) => {
  if (!notification.read) {
    store.markAsRead(notification.id);
    markAsSeen(notification.invoiceId);
  }
  // Could navigate to invoice details here if needed
  // router.push(`/invoices/${notification.invoiceId}`);
};

const formatTime = (isoString: string) => {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Μόλις τώρα';
  if (diffMins < 60) return `${diffMins} λεπτά πριν`;
  if (diffHours < 24) return `${diffHours} ώρ${diffHours === 1 ? 'α' : 'ες'} πριν`;
  if (diffDays < 7) return `${diffDays} ημέρ${diffDays === 1 ? 'α' : 'ες'} πριν`;

  return date.toLocaleDateString('el-GR', {
    day: 'numeric',
    month: 'short',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
};
</script>
