import { storeToRefs } from 'pinia';

import { subscribe, notify } from '@/services/notifications';
import { useUiStore } from '@/store/uiStore';

let unsubscribe: (() => void) | null = null;

export function useNotifications() {
  const uiStore = useUiStore();
  const { toasts } = storeToRefs(uiStore);

  if (!unsubscribe) {
    unsubscribe = subscribe((payload) => {
      uiStore.pushToast(payload);
    });
  }

  const notifySuccess = (message: string) => notify({ message, type: 'success' });
  const notifyError = (message: string) => notify({ message, type: 'error' });
  const notifyInfo = (message: string) => notify({ message, type: 'info' });

  return { notifySuccess, notifyError, notifyInfo, toasts, dismiss: uiStore.removeToast };
}
