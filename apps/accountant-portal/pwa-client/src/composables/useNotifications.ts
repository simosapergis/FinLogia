import { onMounted, onUnmounted } from 'vue';
import { subscribe, type NotificationMessage } from '@/services/notifications';
import { useUiStore } from '@/store/uiStore';

export function useNotifications() {
  const uiStore = useUiStore();
  let unsubscribe: (() => void) | null = null;

  onMounted(() => {
    unsubscribe = subscribe((payload: NotificationMessage) => {
      uiStore.pushToast(payload);
    });
  });

  onUnmounted(() => {
    unsubscribe?.();
  });
}
