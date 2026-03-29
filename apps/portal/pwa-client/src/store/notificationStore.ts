import { defineStore } from 'pinia';

export interface InvoiceNotification {
  id: string;
  type: 'success' | 'error';
  invoiceId: string;
  supplierId?: string;
  supplierName?: string;
  invoiceNumber?: string;
  message?: string;
  errorMessage?: string;
  read: boolean;
  receivedAt: string;
}

const STORAGE_KEY = 'app_notifications';

const loadFromStorage = (): InvoiceNotification[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const saveToStorage = (notifications: InvoiceNotification[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
  } catch {
    // Storage full or unavailable
  }
};

export const useNotificationStore = defineStore('notifications', {
  state: () => ({
    notifications: loadFromStorage() as InvoiceNotification[],
  }),

  getters: {
    unreadCount: (state) => state.notifications.filter((n) => !n.read).length,
    sortedNotifications: (state) =>
      [...state.notifications].sort(
        (a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime()
      ),
  },

  actions: {
    addNotification(notification: Omit<InvoiceNotification, 'id' | 'read' | 'receivedAt'>) {
      const newNotification: InvoiceNotification = {
        ...notification,
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        read: false,
        receivedAt: new Date().toISOString(),
      };
      this.notifications.unshift(newNotification);
      // Keep only last 100 notifications
      if (this.notifications.length > 100) {
        this.notifications = this.notifications.slice(0, 100);
      }
      saveToStorage(this.notifications);
    },

    markAsRead(id: string) {
      const notification = this.notifications.find((n) => n.id === id);
      if (notification) {
        notification.read = true;
        saveToStorage(this.notifications);
      }
    },

    markAllAsRead() {
      this.notifications.forEach((n) => {
        n.read = true;
      });
      saveToStorage(this.notifications);
    },

    clearAll() {
      this.notifications = [];
      saveToStorage(this.notifications);
    },
  },
});
