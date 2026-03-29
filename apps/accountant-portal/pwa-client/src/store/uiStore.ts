import { defineStore } from 'pinia';
import type { NotificationMessage } from '@/services/notifications';

export const useUiStore = defineStore('ui', {
  state: () => ({
    toasts: [] as NotificationMessage[],
    updateAvailable: false,
    updateFunction: null as ((reloadPage?: boolean) => Promise<void>) | null,
    swRegistration: null as ServiceWorkerRegistration | null,
    isCheckingForUpdate: false,
  }),
  actions: {
    setUpdateAvailable(updateFn: (reloadPage?: boolean) => Promise<void>) {
      this.updateAvailable = true;
      this.updateFunction = updateFn;
    },
    setServiceWorkerRegistration(registration: ServiceWorkerRegistration) {
      this.swRegistration = registration;
    },
    async checkForUpdates() {
      if (!this.swRegistration) return false;
      
      this.isCheckingForUpdate = true;
      try {
        await this.swRegistration.update();
        return true;
      } catch (error) {
        console.error('Failed to check for updates:', error);
        return false;
      } finally {
        this.isCheckingForUpdate = false;
      }
    },
    pushToast(toast: NotificationMessage) {
      this.toasts.push(toast);
      const id = toast.id;
      const timeout = toast.timeout ?? 4000;
      if (timeout > 0) {
        setTimeout(() => {
          this.toasts = this.toasts.filter((t) => t.id !== id);
        }, timeout);
      }
    },
    removeToast(id?: string) {
      if (!id) return;
      this.toasts = this.toasts.filter((toast) => toast.id !== id);
    },
  },
});
