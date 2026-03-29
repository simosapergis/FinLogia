import { registerSW } from 'virtual:pwa-register';
import { useUiStore } from '@/store/uiStore';

export const registerServiceWorker = () => {
  if ('serviceWorker' in navigator) {
    let swRegistration: ServiceWorkerRegistration | undefined;

    const updateSW = registerSW({
      immediate: true,
      onRegistered(r) {
        swRegistration = r;
        if (r) {
          const uiStore = useUiStore();
          uiStore.setServiceWorkerRegistration(r);
        }
      },
      onNeedRefresh() {
        console.info('New content is available, prompting user...');
        const uiStore = useUiStore();
        uiStore.setUpdateAvailable(updateSW);
      },
      onOfflineReady() {
        console.info('App ready to work offline.');
      },
    });

    // Check for updates when the app comes back to the foreground
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && swRegistration) {
        console.info('App became visible, checking for updates...');
        swRegistration.update();
      }
    });
  }
};
