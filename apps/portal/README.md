# FinLogia — Procurement Client

A procurement and invoicing automation PWA for Greek small and medium businesses.
Built with Vue 3 + TypeScript, Tailwind CSS, Firebase, and Vite.

## Prerequisites

- Node.js 18+
- Firebase CLI (`npm install -g firebase-tools`)

## Getting Started

```bash
cp pwa-client/.env.example pwa-client/.env.local   # then fill in secrets
cd pwa-client
npm install
npm run dev
```

## Deployment

### Staging (7-day preview channel)

```bash
cd pwa-client
npm run deploy:staging
```

### Production

```bash
cd pwa-client
npm run deploy:prod
```

Both scripts run tests (`vitest run`) and TypeScript type-check (`vue-tsc --noEmit`) before building. Production deploys require explicit confirmation.

### Manual Deploy

```bash
cd pwa-client
npm run build
firebase deploy --only hosting
```

## New Client Setup

`setup_client.sh` automates deploying the PWA for a new customer. Requires `firebase`, `node`, `jq`, and `git`.

```bash
npm run setup:client
```

The script will:

1. List your Firebase projects and prompt you to pick one
2. Create a git branch named after the project ID
3. Ask you to paste the Firebase config JSON
4. Write `.env.local`, `.env.example`, and `.firebaserc`
5. Install dependencies, build, and deploy to Firebase Hosting

It is resumable — safe to re-run if a step fails partway through (state tracked in `.setup_state_<project-id>`).

## Project Structure

```
procurement-client/
├── pwa-client/          # Vue 3 PWA (main application)
│   ├── src/
│   │   ├── pages/       # Route-level views (*Page.vue)
│   │   ├── components/  # Reusable UI components
│   │   ├── composables/ # Composition API hooks (use*.ts)
│   │   ├── store/       # Pinia stores
│   │   ├── services/    # Firebase init + REST API modules
│   │   ├── modules/     # Domain types (invoices, suppliers)
│   │   └── utils/       # Pure helpers
│   ├── deploy.sh        # Deploy script (staging/production)
│   └── vite.config.ts
├── setup_client.sh      # New client onboarding script
└── package.json         # Root: git hooks + lint-staged
```

See `AGENTS.md` for detailed architecture, conventions, and domain flows.
