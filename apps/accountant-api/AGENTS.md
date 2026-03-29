# AGENTS.md — FinLogia Accountant API

## 0. Guiding Principles

Think like a **Principal GCP Architect**. Cost > Performance (bootstrapped project).

- Favour server-side orchestration over client-side workarounds.
- Use signed URLs for all GCS client access — never expose buckets directly.
- Minimize invocations, Firestore reads/writes, and GCS egress.
- Prefer `minInstances: 0`, smallest viable memory, short execution times.
- Use `Promise.all` for independent I/O; lazy-load heavy deps.
- Consider idempotency, retry safety, and at-least-once delivery.
- **GDPR**: data privacy and secure handling in all solutions.

## 1. Project Overview

- **Accountant portal backend** on Firebase Cloud Functions (Gen 2).
- Single shared GCP project for all accountants. Cross-project read access to FinLogia client projects via IAM.
- **Runtime**: Node.js 22, ESM (`"type": "module"`).

## 2. Architecture

**Cloud Functions** in `functions/`, modularized:
- `index.js` — handler wiring, all Cloud Function exports.
- `lib/config.js` — `admin.initializeApp()`, `defineString` params, shared constants.
- `lib/auth.js` — `authenticateRequest`, `validateAccountant`, `getUserDisplayName`.
- `lib/http-utils.js` — `HTTP_OPTS`, `requireMethod`, `sendError`.
- `lib/client-access.js` — `getClientApp`, `getClientDb`, `getClientBucket`, `validateClientAccess`.
- `lib/clients.js` — `listAccountantClients`.
- `lib/invoices.js` — `fetchClientInvoices`, `viewInvoice`, `fetchInvoiceViews`.
- `lib/invoice-export.js` — `streamClientInvoicesZip`, `getExportDownloadUrl`.

**Scripts** (`scripts/`): `setup_project.sh` (one-time provisioning), `create_accountant.sh` (Auth + Firestore, supports multiple accountants per office via custom claims), `register_client.sh` (IAM + Firestore mapping).

**Cross-project data access**: The project's default SA gets `roles/datastore.viewer` + `roles/storage.objectViewer` on each client project. `client-access.js` lazy-initializes Firebase Admin app instances per client project, cached in a `Map`.

## 3. Firebase & Deployment

- **Region**: `europe-west3`.
- **Env**: `functions/.env` with `SERVICE_ACCOUNT_EMAIL`, `REGION`, `GCS_BUCKET`. Per-project snapshots as `functions/.env.<project>`.
- **Deploy**: `firebase deploy --only functions`. Predeploy runs lint + tests.
- **Pre-commit**: `simple-git-hooks` + `lint-staged` run lint + tests on staged files.
- **Emulators**: Auth 9099, Functions 5001, Firestore 5002, Storage 5003, UI 5004.

## 4. Firestore Data Model

| Collection Path | Description |
|---|---|
| `accountants/{accountantId}` | Accounting office profile: displayName, email, createdAt |
| `accountants/{accountantId}/clients/{projectId}` | Client mapping: projectId, displayName, bucketName |
| `accountants/{accountantId}/invoice_views/{viewId}` | View tracking (viewedBy map) and manual audit status (auditStatus: registered/denied) |

## 5. Code Conventions

- 2-space indent, single quotes, always semicolons.
- `camelCase` for vars/functions, `UPPER_SNAKE_CASE` for constants.
- Always `async/await`, never callbacks.
- Auth: `authenticateRequest(req)` → `{ user }` or `{ error, status }`.
- Security: `validateClientAccess(uid, projectId)` before any cross-project read.
- Errors: `sendError(res, status, message, { details?, code? })`.
- HTTP: `HTTP_OPTS` for `onRequest`; `requireMethod(req, res, 'POST')`.
- Section markers in `index.js`: `// ═══...═══ SECTION TITLE ═══...═══`.
- Linting: ESLint 9 + Prettier. Run `npm run lint` / `npm run format`.
- Testing: Vitest in `functions/test/`, mocks in `setup.js`.
- All user-facing strings in **Greek**.

## 6. Key Patterns

- **Lazy init**: Client Firebase Admin apps created on first use, cached in `Map`.
- **Cross-project reads**: `getClientDb(projectId).collectionGroup('invoices')` for invoice queries.
- **View tracking**: `viewedBy` map on `invoice_views` docs (mirrors `downloadedBy` in invoice_scanner).
- **Export**: Stream PDFs from client GCS → archiver ZIP → upload to central bucket → signed download URL.
- **Display name**: `getUserDisplayName(decodedToken)` — fallback: name → email → uid.

## 7. Security Rules

- `accountants/{accountantId}/*` — read only if `auth.uid == accountantId` or `auth.token.officeId == accountantId`, writes denied (backend-only).
- Default deny for all other paths.

## 8. Do's and Don'ts

**Do:**
- **CRITICAL RULE:** Whenever there is an important change or addition in code, automatically update this file (`AGENTS.md`) and `README.md` to reflect the latest state.
- ESM imports only. `authenticateRequest(req)` on every HTTP function.
- `validateClientAccess(uid, projectId)` before any cross-project operation.
- `sendError(res, status, message)` for error responses. Greek user-facing strings.
- `defineString` for new env params. `_v1` suffix on Cloud Functions.
- `// ═══` banner style for `index.js` sections.
- Unit tests for every new helper/validator (`functions/test/<module>.test.js`).
- Run `npm run lint` + `npm test` after every change.
- **Keep this file current** after any change.

**Don't:**
- `functions.config()` (Gen 1 API).
- Commit `.env` files or API keys.
- Write to client projects (read-only access only).
- `Co-authored-by` or other trailers in commit messages.
