# AGENTS.md — FinLogia Accountant Portal

## Project Overview

**FinLogia Accountant Portal** is a Vue 3 PWA for accountants to view and export their FinLogia clients' invoices.

- **Framework**: Vue 3.4 + TypeScript 5.6 (Composition API with `<script setup lang="ts">`)
- **Styling**: Tailwind CSS 3.4 (utility classes only)
- **Icons**: `lucide-vue-next`
- **State**: Pinia 2.1
- **Routing**: Vue Router 4.3 (lazy-loaded routes)
- **Backend**: Firebase 11 (Auth, Firestore for accountant profile)
- **Cloud Functions**: Called via REST with Firebase Auth ID tokens
- **PWA**: vite-plugin-pwa with Workbox
- **Build**: Vite 5 (manual chunks: firebase-app, firebase-auth, firebase-firestore, vue-vendor)
- **Hosting**: Firebase Hosting (single site, dynamic branding)
- **Locale**: Greek UI (`el-GR`)
- **Path alias**: `@` → `./src`

## Screens

| Path | Page | Description |
|------|------|-------------|
| `/login` | LoginPage | Email/password auth |
| `/` | DashboardPage | Client count, quick links |
| `/clients` | ClientsPage | Client grid with search |
| `/clients/:projectId/invoices` | ClientInvoicesPage | Date filter (with quick period pills) + provider search + grouped invoices + view + export + manual audit status (register/deny) |

## Architecture

```
pwa-client/
├── src/
│   ├── main.ts
│   ├── App.vue                  # Header (dynamic accountant name), nav, sidebar, toasts
│   ├── router/index.ts
│   ├── pages/
│   │   ├── LoginPage.vue
│   │   ├── DashboardPage.vue
│   │   ├── ClientsPage.vue
│   │   └── ClientInvoicesPage.vue
│   ├── components/
│   │   ├── ClientCard.vue
│   │   ├── InvoiceDetailModal.vue
│   │   ├── StatusBadge.vue
│   │   └── Loader.vue
│   ├── composables/
│   │   ├── useAuth.ts
│   │   ├── useClients.ts
│   │   ├── useClientInvoices.ts
│   │   └── useNotifications.ts
│   ├── store/
│   │   ├── userStore.ts
│   │   ├── accountantStore.ts
│   │   └── uiStore.ts
│   ├── services/
│   │   ├── firebase.ts
│   │   ├── notifications.ts
│   │   └── api/
│   │       ├── apiClient.ts
│   │       ├── clientsApi.ts
│   │       ├── invoicesApi.ts
│   │       └── exportApi.ts
│   ├── modules/
│   │   ├── clients/Client.ts
│   │   └── invoices/Invoice.ts
│   └── utils/date.ts
├── public/
├── vite.config.ts
├── tailwind.config.cjs
├── deploy.sh
└── firebase.json
```

## Inventory

- **Components (4)**: ClientCard, InvoiceDetailModal, StatusBadge, Loader
- **Composables (5)**: useAuth, useClients, useClientInvoices, useNotifications, useQuickPeriods
- **Stores (3)**: userStore, accountantStore, uiStore
- **API services (4)**: apiClient, clientsApi, invoicesApi, exportApi

## Conventions

### File Naming
- Pages: `*Page.vue` — Components: `PascalCase.vue` — Composables: `use*.ts` — Stores: `*Store.ts`

### Vue Components
- Always `<script setup lang="ts">` — no Options API
- Props via `defineProps<{...}>()`, emits via `defineEmits<{...}>()`

### API Calls
- All services use `apiRequest` from `services/api/apiClient.ts`
- `apiRequest` attaches `Authorization: Bearer <token>` via Firebase Auth
- Base URL and endpoint paths from `VITE_*` env vars
- Error messages in Greek

### Styling
- Tailwind utility classes only
- Palettes: `primary` (indigo), `accent` (amber)
- Rounded: `rounded-xl` small, `rounded-2xl`/`rounded-3xl` cards
- Shadows: `shadow-sm` subtle, `shadow-lg` prominent

### Dynamic Branding
- After login, `accountantStore` fetches `accountants/{uid}` for `displayName`
- Used in App.vue header

## Do's and Don'ts

**Do:**
- **CRITICAL RULE:** Whenever there is an important change or addition in code, automatically update this file (`AGENTS.md`) and `README.md` to reflect the latest state.
- `<script setup lang="ts">` exclusively
- Use `apiRequest` for all API calls
- Greek user-facing strings
- Same design system as procurement-client
- Keep this file current after changes

**Don't:**
- Options API
- Inline styles
- Direct bucket access (always via signed URLs from backend)
