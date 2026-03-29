# FinLogia Accountant Portal

Vue 3 PWA for accountants to view and export their FinLogia clients' invoices.

## Prerequisites

- Node.js 18+
- Firebase CLI (`npm install -g firebase-tools`)

## Quick Start

```bash
cd pwa-client
cp .env.example .env.local   # Fill in Firebase config + API endpoints
npm install
npm run dev                   # http://localhost:5173
```

## Architecture

Single-page application served from Firebase Hosting. All data fetched via Cloud Functions REST API (Bearer token auth). Dynamic branding from Firestore accountant profile.

### Screens

| Path | Description |
|---|---|
| `/login` | Email/password authentication |
| `/` | Dashboard: client count overview |
| `/clients` | Client grid with search |
| `/clients/:projectId/invoices` | Date filter (with quick period pills) + provider search + grouped invoices + view + export |

## Maintenance

**CRITICAL RULE:** Whenever there is an important change or addition in code, automatically update this file (`README.md`) and `AGENTS.md` to reflect the latest state.

## Deployment

```bash
cd pwa-client

# Production
./deploy.sh production

# Staging (7-day preview channel)
./deploy.sh staging
```

## Testing

```bash
cd pwa-client
npm run test         # Watch mode
npm run test:run     # Single run
```

## Design System

Identical to the FinLogia client app:
- **Colors**: Primary (indigo), Accent (amber)
- **Cards**: `rounded-2xl`/`rounded-3xl`, `shadow-sm`/`shadow-lg`
- **Background**: `bg-slate-100`
- **Font**: Inter
- **Icons**: lucide-vue-next

See `AGENTS.md` for detailed conventions.
