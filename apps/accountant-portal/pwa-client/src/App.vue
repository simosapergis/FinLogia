<template>
  <div class="flex min-h-screen flex-col bg-slate-100">
    <header v-if="$route.path !== '/login'" class="sticky top-0 z-50 border-b border-white/10 bg-white/80 backdrop-blur-lg">
      <div class="mx-auto flex max-w-6xl items-center justify-between px-3 py-3 sm:px-6 sm:py-4">
        <RouterLink to="/" class="flex items-center gap-2 text-base font-bold text-primary-600 sm:text-lg">
          <div class="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 shadow-md shadow-primary-500/30">
            <Briefcase class="h-4 w-4 text-white" :stroke-width="2.5" />
          </div>
          <span class="hidden sm:inline">{{ accountantName }}</span>
          <span class="sm:hidden">FinLogia</span>
        </RouterLink>

        <nav v-if="isAuthenticated" class="hidden items-center gap-1 text-sm font-medium text-slate-600 lg:flex">
          <RouterLink
            v-for="link in navLinks"
            :key="link.to"
            :to="link.to"
            class="relative rounded-lg px-3 py-2 transition hover:bg-slate-100 hover:text-primary-600"
            :class="isActiveRoute(link.to) ? 'bg-primary-50 text-primary-600 font-semibold' : ''"
          >
            {{ link.label }}
            <span v-if="isActiveRoute(link.to)" class="absolute inset-x-2 -bottom-3 h-0.5 rounded-full bg-primary-500" />
          </RouterLink>

          <div class="relative ml-1">
            <button
              type="button"
              class="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-primary-700 text-sm font-semibold text-white shadow-md shadow-primary-500/20 transition hover:shadow-lg hover:shadow-primary-500/30 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
              @click="userMenuOpen = !userMenuOpen"
            >
              {{ userInitial }}
            </button>

            <Transition
              enter-active-class="transition ease-out duration-100"
              enter-from-class="transform opacity-0 scale-95"
              enter-to-class="transform opacity-100 scale-100"
              leave-active-class="transition ease-in duration-75"
              leave-from-class="transform opacity-100 scale-100"
              leave-to-class="transform opacity-0 scale-95"
            >
              <div
                v-if="userMenuOpen"
                class="absolute right-0 z-50 mt-2 w-56 origin-top-right rounded-2xl bg-white py-2 shadow-lg ring-1 ring-black/5"
                @click.stop
              >
                <div class="border-b border-slate-100 px-4 py-3">
                  <p class="text-xs text-slate-400">Συνδεδεμένος ως</p>
                  <p class="truncate text-sm font-medium text-slate-900">{{ userEmail }}</p>
                </div>
                <button
                  type="button"
                  class="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-slate-700 transition hover:bg-slate-50"
                  @click="handleLogout"
                >
                  <LogOut class="h-4 w-4 text-slate-400" />
                  Αποσύνδεση
                </button>
              </div>
            </Transition>
          </div>
        </nav>

        <div v-if="isAuthenticated" class="flex items-center gap-1 lg:hidden">
          <button
            type="button"
            class="flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 transition hover:bg-slate-100"
            @click="sidebarOpen = true"
          >
            <Menu class="h-6 w-6" />
          </button>
        </div>

        <nav v-if="!isAuthenticated" class="flex items-center gap-4 text-sm font-medium text-slate-600">
          <RouterLink to="/login" class="rounded-xl bg-gradient-to-r from-primary-600 to-primary-500 px-5 py-2.5 font-semibold text-white shadow-md shadow-primary-600/30 transition hover:shadow-lg hover:shadow-primary-600/40 active:scale-[0.98]">
            Σύνδεση
          </RouterLink>
        </nav>
      </div>
    </header>

    <Teleport to="body">
      <Transition name="sidebar-backdrop">
        <div
          v-if="sidebarOpen"
          class="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-sm lg:hidden"
          @click="sidebarOpen = false"
        />
      </Transition>

      <Transition name="sidebar">
        <aside
          v-if="sidebarOpen"
          class="fixed inset-y-0 right-0 z-[70] flex w-72 flex-col bg-white shadow-2xl lg:hidden"
        >
          <div class="flex items-center justify-between bg-gradient-to-r from-primary-600 to-primary-500 px-5 py-5">
            <div class="flex items-center gap-2">
              <div class="flex h-8 w-8 items-center justify-center rounded-xl bg-white/20">
                <Briefcase class="h-4 w-4 text-white" :stroke-width="2.5" />
              </div>
              <span class="text-lg font-bold text-white">FinLogia</span>
            </div>
            <button
              type="button"
              class="flex h-10 w-10 items-center justify-center rounded-xl text-white/70 transition hover:bg-white/10 hover:text-white"
              @click="sidebarOpen = false"
            >
              <X class="h-6 w-6" />
            </button>
          </div>

          <div class="border-b border-slate-100 px-5 py-4">
            <div class="flex items-center gap-3">
              <div class="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-primary-700 text-lg font-semibold text-white shadow-md shadow-primary-500/20">
                {{ userInitial }}
              </div>
              <div class="min-w-0 flex-1">
                <p class="text-xs text-slate-400">Συνδεδεμένος ως</p>
                <p class="truncate text-sm font-medium text-slate-900">{{ userEmail }}</p>
              </div>
            </div>
          </div>

          <nav class="flex-1 overflow-y-auto px-3 py-4">
            <p class="mb-2 px-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Πλοήγηση</p>
            <RouterLink
              v-for="link in navLinks"
              :key="link.to"
              :to="link.to"
              class="mb-1 flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
              :class="{ 'bg-primary-50 text-primary-600 font-semibold': $route.path === link.to }"
              @click="sidebarOpen = false"
            >
              <component :is="link.icon" class="h-5 w-5" />
              {{ link.label }}
            </RouterLink>
          </nav>

          <div class="mt-auto border-t border-slate-100 p-4">
            <button
              v-if="isStandalone"
              type="button"
              class="mb-2 flex w-full items-center justify-center gap-3 rounded-xl bg-primary-50 px-4 py-3 text-sm font-medium text-primary-700 transition hover:bg-primary-100 active:scale-[0.98]"
              @click="handleManualUpdateCheck"
              :disabled="uiStore.isCheckingForUpdate"
            >
              <RefreshCw class="h-5 w-5" :class="{ 'animate-spin': uiStore.isCheckingForUpdate }" />
              Έλεγχος Ενημερώσεων
            </button>
            <button
              type="button"
              class="flex w-full items-center justify-center gap-3 rounded-xl bg-slate-100 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-200 active:scale-[0.98]"
              @click="handleLogout"
            >
              <LogOut class="h-5 w-5" />
              Αποσύνδεση
            </button>
            <div class="mt-4 text-center text-[10px] font-medium text-primary-500/50">
              v{{ appVersion }}
            </div>
          </div>
        </aside>
      </Transition>
    </Teleport>

    <div v-if="userMenuOpen" class="fixed inset-0 z-40" @click="userMenuOpen = false" />

    <!-- Update Banner -->
    <Transition
      enter-active-class="transition ease-out duration-300 transform"
      enter-from-class="-translate-y-full opacity-0"
      enter-to-class="translate-y-0 opacity-100"
      leave-active-class="transition ease-in duration-300 transform"
      leave-from-class="translate-y-0 opacity-100"
      leave-to-class="-translate-y-full opacity-0"
    >
      <div v-if="updateAvailable" class="sticky top-[60px] z-40 w-full sm:top-[72px]">
        <div class="bg-gradient-to-r from-primary-600 to-primary-500 px-4 py-3 shadow-md sm:px-6">
          <div class="mx-auto flex max-w-6xl items-center justify-between gap-4">
            <div class="flex items-center gap-3 text-white">
              <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/20">
                <component :is="isUpdating ? Loader : Download" class="h-4 w-4" :class="{ 'animate-spin': isUpdating }" />
              </div>
              <div class="text-sm font-medium">
                <span v-if="isUpdating">Γίνεται ενημέρωση...</span>
                <span v-else>Νέα έκδοση διαθέσιμη!</span>
              </div>
            </div>
            <button
              v-if="!isUpdating"
              type="button"
              class="shrink-0 rounded-lg bg-white px-4 py-1.5 text-sm font-semibold text-primary-600 shadow-sm transition hover:bg-primary-50 active:scale-95"
              @click="handleUpdate"
            >
              Ανανέωση
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <main class="mx-auto flex w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-10">
      <RouterView v-slot="{ Component, route: currentRoute }">
        <Transition name="page" mode="out-in">
          <component :is="Component" :key="currentRoute.path" />
        </Transition>
      </RouterView>
    </main>

    <div class="pointer-events-none fixed inset-x-0 top-16 z-[100] flex justify-center sm:top-20">
      <transition-group name="toast" tag="div" class="space-y-2 px-4">
        <div
          v-for="toast in uiStore.toasts"
          :key="toast.id"
          class="pointer-events-auto flex max-w-sm items-center gap-3 rounded-2xl px-5 py-3 text-sm font-medium text-white shadow-xl"
          :class="toastClasses(toast.type)"
          @click="uiStore.removeToast(toast.id)"
        >
          <component :is="toastIcon(toast.type)" class="h-5 w-5 shrink-0" />
          {{ toast.message }}
        </div>
      </transition-group>
    </div>

    <!-- App Version (Center Bottom - Conditionally shown) -->
    <div 
      v-if="!isAuthenticated" 
      class="pointer-events-none fixed bottom-2 left-0 right-0 z-[40] flex justify-center text-[10px] font-medium text-primary-500/50"
    >
      v{{ appVersion }}
    </div>
    <div 
      v-else 
      class="pointer-events-none fixed bottom-2 left-0 right-0 z-[40] hidden justify-center text-[10px] font-medium text-primary-500/50 lg:flex"
    >
      v{{ appVersion }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import {
  Home,
  Building2,
  FileText,
  Briefcase,
  LogOut,
  Menu,
  X,
  CheckCircle2,
  XCircle,
  Info,
  Loader,
  Download,
  RefreshCw,
} from 'lucide-vue-next';

import { useAuth } from '@/composables/useAuth';
import { useNotifications } from '@/composables/useNotifications';
import { useUserStore } from '@/store/userStore';
import { useUiStore } from '@/store/uiStore';
import { useAccountantStore } from '@/store/accountantStore';
import { onMounted } from 'vue';

const route = useRoute();
const router = useRouter();
useAuth();
useNotifications();
const userStore = useUserStore();
const uiStore = useUiStore();
const accountantStore = useAccountantStore();

const { updateAvailable } = storeToRefs(uiStore);
const appVersion = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev';

const userMenuOpen = ref(false);
const sidebarOpen = ref(false);
const isUpdating = ref(false);
const isStandalone = ref(false);

onMounted(() => {
  isStandalone.value = window.matchMedia('(display-mode: standalone)').matches || 
                       (window.navigator as any).standalone === true;
});

const handleUpdate = async () => {
  if (!uiStore.updateFunction) return;
  
  isUpdating.value = true;
  await new Promise((resolve) => setTimeout(resolve, 800));
  
  try {
    await uiStore.updateFunction(true);
  } catch (error) {
    console.error('Failed to update service worker:', error);
    isUpdating.value = false;
  }
};

const isAuthenticated = computed(() => userStore.isAuthenticated);
const accountantName = computed(() => accountantStore.displayName);

const navLinks = [
  { to: '/', label: 'Σύνοψη', icon: Home },
  { to: '/clients', label: 'Πελάτες', icon: Building2 },
];

const isActiveRoute = (to: string): boolean => {
  if (to === '/') return route.path === '/';
  return route.path.startsWith(to);
};

const userEmail = computed(() => userStore.user?.email ?? '');
const userInitial = computed(() => {
  const email = userEmail.value;
  if (!email) return '?';
  return email.charAt(0).toUpperCase();
});

const handleLogout = async () => {
  userMenuOpen.value = false;
  sidebarOpen.value = false;
  const { logout } = useAuth();
  await logout();
  router.push('/login');
};

const handleManualUpdateCheck = async () => {
  await uiStore.checkForUpdates();
  
  if (!uiStore.updateAvailable) {
    uiStore.pushToast({
      id: Date.now().toString(),
      type: 'info',
      message: 'Έχετε ήδη την πιο πρόσφατη έκδοση.',
      timeout: 4000
    });
  }
};

watch(() => router.currentRoute.value.path, () => {
  sidebarOpen.value = false;
});

const toastClasses = (type: string) => {
  switch (type) {
    case 'success': return 'bg-emerald-500/90 backdrop-blur-sm';
    case 'error': return 'bg-rose-500/90 backdrop-blur-sm';
    default: return 'bg-slate-900/90 backdrop-blur-sm';
  }
};

const toastIcon = (type: string) => {
  switch (type) {
    case 'success': return CheckCircle2;
    case 'error': return XCircle;
    default: return Info;
  }
};
</script>

<style scoped>
.page-enter-active, .page-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.page-enter-from { opacity: 0; transform: translateY(6px); }
.page-leave-to { opacity: 0; transform: translateY(-6px); }

.toast-enter-active, .toast-leave-active { transition: all 0.25s ease; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateY(-10px); }

.sidebar-backdrop-enter-active, .sidebar-backdrop-leave-active { transition: opacity 0.3s ease; }
.sidebar-backdrop-enter-from, .sidebar-backdrop-leave-to { opacity: 0; }

.sidebar-enter-active, .sidebar-leave-active {
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.sidebar-enter-from, .sidebar-leave-to { transform: translateX(100%); }
</style>
