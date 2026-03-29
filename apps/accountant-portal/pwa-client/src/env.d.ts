/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN: string;
  readonly VITE_FIREBASE_PROJECT_ID: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string;
  readonly VITE_FIREBASE_APP_ID: string;
  readonly VITE_FIREBASE_MEASUREMENT_ID: string;

  readonly VITE_BASE_URL: string;
  readonly VITE_LIST_CLIENTS_PATH: string;
  readonly VITE_GET_CLIENT_INVOICES_PATH: string;
  readonly VITE_VIEW_INVOICE_DETAILS_PATH: string;
  readonly VITE_GET_SIGNED_INVOICE_URL_PATH: string;
  readonly VITE_EXPORT_CLIENT_INVOICES_PATH: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module 'virtual:pwa-register' {
  export function registerSW(options?: {
    immediate?: boolean;
    onNeedRefresh?: () => void;
    onOfflineReady?: () => void;
    onRegistered?: (registration: ServiceWorkerRegistration | undefined) => void;
    onRegisteredSW?: (swUrl: string, registration: ServiceWorkerRegistration | undefined) => void;
    onRegisterError?: (error: unknown) => void;
  }): (reloadPage?: boolean) => Promise<void>;
}

declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<object, object, unknown>;
  export default component;
}

declare const __APP_VERSION__: string;
