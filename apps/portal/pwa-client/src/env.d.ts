/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Firebase Config
  readonly VITE_FIREBASE_API_KEY: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN: string;
  readonly VITE_FIREBASE_PROJECT_ID: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string;
  readonly VITE_FIREBASE_APP_ID: string;
  readonly VITE_FIREBASE_MEASUREMENT_ID: string;
  readonly VITE_FIREBASE_BUCKET_FOLDER: string;

  // App Config
  readonly VITE_INVOICE_EXPIRY_DAYS: string;

  // API Endpoints
  readonly VITE_BASE_URL: string;
  readonly VITE_SIGNED_UPLOAD_URL_PATH: string;
  readonly VITE_SIGNED_DOWNLOAD_URL_PATH: string;
  readonly VITE_UPDATE_INVOICE_FIELDS_PATH: string;
  readonly VITE_UPDATE_PAYMENT_STATUS_PATH: string;
  readonly VITE_UPDATE_SUPPLIER_FIELDS_PATH: string;
  readonly VITE_ADD_FINANCIAL_ENTRY_PATH: string;
  readonly VITE_DELETE_FINANCIAL_ENTRY_PATH: string;
  readonly VITE_GET_FINANCIAL_REPORT_PATH: string;
  readonly VITE_ADD_RECURRING_EXPENSE_PATH: string;
  readonly VITE_UPDATE_RECURRING_EXPENSE_PATH: string;
  readonly VITE_GET_RECURRING_EXPENSES_PATH: string;
  readonly VITE_EXPORT_INVOICES_PATH: string;
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
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

declare const __APP_VERSION__: string;
