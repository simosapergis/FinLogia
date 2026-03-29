# AGENTS.md — FinLogia

## Project Overview

**FinLogia** is a procurement and invoicing automation PWA for Greek small and medium businesses.
Users scan/upload invoices, manage suppliers, track income/expenses, and generate financial reports.

- **Framework**: Vue 3.4 + TypeScript 5.6 (Composition API with `<script setup lang="ts">` exclusively)
- **Styling**: Tailwind CSS 3.4 (utility classes only, no component library)
- **Icons**: `lucide-vue-next`
- **State**: Pinia 2.1
- **Routing**: Vue Router 4.3 (lazy-loaded routes, `src/router/index.ts`)
- **Backend**: Firebase 11 (Auth, Firestore, Storage, Cloud Messaging)
- **Cloud Functions**: europe-west3 region, called via REST with Firebase Auth ID tokens
- **PWA**: vite-plugin-pwa with Workbox (auto-update, offline support)
- **Build**: Vite 5 (manual chunks: firebase-app, firebase-auth, firebase-firestore, vue-vendor)
- **Testing**: Vitest — test files collocated in `__tests__/` dirs
- **Hosting**: Firebase Hosting
- **Locale**: Greek UI (`el-GR`), currency formatting with `Intl.NumberFormat('el-GR')`
- **Path alias**: `@` → `./src` (in `vite.config.ts` and `tsconfig.json`)
- **Linting**: No ESLint or Prettier configured. Pre-commit: `simple-git-hooks` + `lint-staged`

## Screens

All routes except `/login` require auth (`meta.requiresAuth`). Guard in `router/index.ts` uses `waitForAuthReady()` via `onAuthStateChanged`; unauthenticated users redirect to `/login?redirect=<path>`.

| Path | Page | Description |
|------|------|-------------|
| `/` | OverviewPage | Dashboard: unpaid invoices, today's deliveries |
| `/login` | LoginPage | Email/password auth |
| `/upload` | UploadPage | Multi-page invoice scan with quality checks |
| `/invoices` | InvoicesPage | Date-range invoice search, grouped results |
| `/suppliers` | SuppliersPage | Supplier grid with search |
| `/suppliers/:id/invoices` | SupplierInvoicesPage | Per-supplier invoices + details + edit |
| `/notifications` | NotificationsPage | Real-time invoice processing alerts |
| `/income` | IncomePage | Daily income entry ("Κλείσιμο Ημέρας") + reports |
| `/expenses` | ExpensesPage | Expense entry + recurring expenses + reports |
| `/financial-overview` | FinancialOverviewPage | Combined income/expense dashboard |
| `/export-invoices` | ExportInvoicesPage | Select & export invoices as ZIP |

## Architecture

```
pwa-client/
├── src/
│   ├── main.ts                 # App entry: Pinia, Router, mount
│   ├── App.vue                 # Root layout: header, nav, sidebar, toasts
│   ├── env.d.ts                # TypeScript ambient declarations
│   ├── registerServiceWorker.ts
│   ├── router/                 # Route definitions + auth guard
│   ├── pages/                  # Route-level components (*Page.vue)
│   ├── components/             # Reusable UI (PascalCase.vue)
│   ├── composables/            # Composition hooks (use*.ts)
│   ├── store/                  # Pinia stores (*Store.ts)
│   ├── services/
│   │   ├── firebase.ts         # Firebase app init
│   │   ├── notifications.ts    # Pub/sub toast bus
│   │   └── api/                # REST API modules (one per endpoint group)
│   ├── modules/
│   │   ├── invoices/           # Invoice types, UploadFlow, DetectQuality
│   │   └── suppliers/          # Supplier types
│   ├── utils/                  # Pure helpers (date, image, file, uuid)
│   └── assets/styles/          # Global CSS (Tailwind base)
├── public/                     # Static assets, PWA manifest, messaging SW
├── index.html
├── vite.config.ts
├── tailwind.config.cjs         # primary (indigo) + accent (amber) palettes
├── tsconfig.json / tsconfig.node.json
├── postcss.config.cjs
├── firebase.json               # Hosting config (SPA fallback)
├── .firebaserc                 # Project: {ProjectID}
└── deploy.sh                   # Runs tests + type-check before deploy
```

## Domain Flows

**Invoice Upload**: quality check (`DetectQuality.ts` → `utils/image.ts`) → signed URL (`requestSignedUrl.ts`) → direct PUT to Cloud Storage. Multi-page, sequential. PDF bypasses quality check. Orchestrated by `UploadFlow` class in `modules/invoices/UploadFlow.ts`.

**Notifications**: `onSnapshot` on Firestore `metadata_invoices` → `useInvoiceNotifications` composable → `notificationStore` (Pinia) + `localStorage` (key: `app_notifications`, capped at 100). Toasts bridged via `notifications.ts` pub/sub → `uiStore`.

**Financial**: Income = daily "Κλείσιμο Ημέρας" (cash/card/other). Expenses = one-off + recurring (monthly, day-of-month). Reports = date-range with category breakdowns. All via `financialApi.ts`. Greek category labels: `INCOME_CATEGORY_LABELS`, `EXPENSE_CATEGORY_LABELS`.

## Inventory

- **Components (10)**: CameraButton, ExpiryBadge, FinancialEntryEditModal, InvoiceDetailView, InvoicePreviewCard, Loader, PaymentModal, StatusBadge, SupplierCard, SupplierEditModal
- **Composables (8)**: useAuth, useFirestore, useInvoiceNotifications, useInvoiceUpload, useNotifications, useQuickPeriods, useSupplierInvoices, useSuppliers
- **Stores (4)**: notificationStore, supplierStore, uiStore, userStore
- **API services (8)**: apiClient, editFinancialEntry (in financialApi), exportInvoices, financialApi, requestSignedDownloadUrl, requestSignedUrl, updateInvoiceFields, updatePaymentStatus, updateSupplierFields

## Conventions

### File Naming
- Pages: `*Page.vue` — Components: `PascalCase.vue` — Composables: `use*.ts` — Stores: `*Store.ts`
- API services: descriptive camelCase (e.g., `updatePaymentStatus.ts`, `financialApi.ts`)
- Tests: collocated `__tests__/*.test.ts` next to source

### Vue Components
- Always `<script setup lang="ts">` — no Options API
- Props via `defineProps<{...}>()`, emits via `defineEmits<{...}>()`
- Order: template → script → scoped styles

### API Calls
- New services **must** use `apiRequest` from `services/api/apiClient.ts` (shared auth + fetch wrapper)
- `apiRequest` attaches `Authorization: Bearer <token>` via `getAuthToken()` (Firebase Auth)
- Legacy services using direct `fetch`: requestSignedUrl, requestSignedDownloadUrl, updatePaymentStatus, exportInvoices
- Base URL and endpoint paths configured via `VITE_*` env vars
- Error messages are in Greek

### Firestore Structure
- `invoices` — top-level collection
- `suppliers` — top-level collection
- `suppliers/{supplierId}/invoices` — per-supplier sub-collection
- `metadata_invoices` — invoice processing metadata (notifications)
- Cross-supplier queries: `collectionGroup('invoices')`

### Styling
- Tailwind utility classes only; no inline styles
- Palettes in `tailwind.config.cjs`: `primary` (indigo), `accent` (amber)
- Rounded: `rounded-xl` small, `rounded-2xl`/`rounded-3xl` cards
- Shadows: `shadow-sm` subtle, `shadow-lg` prominent
- Responsive: mobile-first, `sm:` and `lg:` breakpoints

## Environment & Config

All `VITE_`-prefixed, accessed via `import.meta.env`. Full list in `.env.example`.
- `VITE_FIREBASE_BUCKET_FOLDER` — Cloud Storage upload folder (default: `uploads`)
- `VITE_INVOICE_EXPIRY_DAYS` — days until expiry warning (default: `7`)
- `VITE_BASE_URL` — Cloud Functions base (e.g., `https://europe-west3-<project>.cloudfunctions.net`)
- Firebase config vars (`API_KEY`, `AUTH_DOMAIN`, `PROJECT_ID`, etc.) + 13 endpoint path vars

## Deployment

`deploy.sh` runs tests (`vitest run`) and type-check (`vue-tsc --noEmit`) before building.
```bash
cd pwa-client
./deploy.sh production   # Production deploy (with confirmation)
./deploy.sh staging      # 7-day Firebase preview channel
```

### New Client Setup

`setup_client.sh` (repo root) automates adding a new customer to the multi-tenant setup. Requires `firebase`, `node`, `jq`.

```bash
./setup_client.sh        # Interactive: lists projects, prompts for config JSON
```

Steps: select project → paste Firebase config JSON → appends config to `clients.json`.

### Multi-Tenant Deployment

The application uses a single-branch multi-tenant architecture. All client configurations are stored in `clients.json` (gitignored).

```bash
./deploy_client.sh <projectId>  # Deploys to a single client
./deploy_all.sh                 # Deploys to all clients in clients.json
```

Deployment steps: reads config from `clients.json` → writes `.env.local` and `.firebaserc` → `npm install` → `npm run build` → `firebase deploy --only hosting --project <projectId>`. `VITE_CLIENT_NAME` is derived from the projectId (title-cased, `finlogia-` prefix stripped).

## Gotchas

- All user-facing strings must be in Greek.
- `formatCurrency` lives in `utils/date.ts` (historical).
- `Invoice` interface: `modules/invoices/InvoiceMapper.ts` — canonical type used everywhere.
- `Supplier` types (incl. `SupplierDelivery`): `modules/suppliers/Supplier.ts`.
- Ensure `.env.local` is set up from `.env.example` before running.
- PWA manifest in `vite.config.ts` overrides `public/manifest.webmanifest` at build time.
- `exportInvoicesHelpers.ts` lives in `pages/` (convention exception).

## Prompt Response Format
- Always provide your response in chat starting with "Simo, <your response>"
