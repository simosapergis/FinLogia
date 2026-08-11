# AGENTS.md — FinLogia Monorepo

## 0. Guiding Principles

Think like a **Principal GCP Architect**. Evaluate every decision through GCP-native services, pricing, and limits.

- **Clean Code Principles**: Apply DRY (Don't Repeat Yourself), YAGNI (You Aren't Gonna Need It), and KISS (Keep It Simple, Stupid) to every change, whether it's a bug fix or a new feature.
- **Cost > Performance** (bootstrapped project). Cost wins unless degradation is user-facing and severe.
- **Multi-Tenancy**: The architecture is "1 GCP Project per Accounting Office". Each project hosts multiple client businesses.
- **Tenant Isolation**: Data is isolated at the `businessId` level. Never leak data across businesses.
- **GDPR**: Data privacy and secure handling must be considered in all solutions.

## 1. Project Structure

- **Monorepo**: npm workspaces (`apps/*`).
- `apps/backend`: Unified Firebase Cloud Functions (Gen 2), Firestore Rules, Storage Rules.
- `apps/portal`: Unified Vue 3 PWA for both Accountants and Business Owners.

## 2. Data Model (Firestore)

Flat structure scoped by `businessId`:
- `/users/{uid}`: Maps a Firebase Auth user to their `businessId`.
- `/accountants/{uid}`: Accountant profiles.
- `/businesses/{businessId}`: Business profile.
- `/businesses/{businessId}/suppliers/{supplierId}`
- `/businesses/{businessId}/invoices/{invoiceId}`
- `/businesses/{businessId}/metadata_invoices/{invoiceId}`
- `/businesses/{businessId}/financial_entries/{entryId}`
- `/businesses/{businessId}/recurring_expenses/{expenseId}`

## 3. Authentication & RBAC

- **Role-Based Access Control**: Managed via Firebase Auth Custom Claims (`isAccountant: true`).
- **Security Rules**: Firestore and Storage rules strictly enforce access based on `businessId` and `isAccountant` claims. Accountants have read-only access to specific resources (e.g., PDF invoices).

## 4. Deployment

- **CI/CD**: GitHub Actions Matrix strategy deploys to all Accounting Office GCP projects in parallel.
- **Provisioning**: Scripts in `apps/backend/scripts/` handle creating new offices and onboarding client businesses.
- **Versioning (Semantic Release)**: We use Angular Commit Convention to automate versioning and releases:
  - **Major (x.0.0)**: `BREAKING CHANGE:` in footer or `type!:` (e.g., `feat!: new API`)
  - **Minor (0.x.0)**: `feat:` (e.g., `feat: add portal`)
  - **Patch (0.0.x)**: `fix:`, `perf:` (e.g., `fix: resolve crash`)
  - **No Release**: `chore:`, `docs:`, `style:`, `refactor:`, `test:`, `build:`, `ci:`

## 4.1 Usage Telemetry

- **Cloud Logging Only**: Usage telemetry is emitted as structured `usage_event` logs. Do not add Firestore writes or other persisted telemetry stores for this concern.
- **Dedicated Retention Bucket**: Provision each accounting office project with a dedicated Cloud Logging bucket for `jsonPayload.logType="usage_event"` logs. Keep `_Default` for normal short-term technical logs and route long-retention telemetry through `apps/backend/scripts/setup_usage_logging.sh`.
- **Remote Kill Switch**: Usage telemetry must be controlled per accounting-office project through Firebase Remote Config parameter `telemetry_enabled`. Default it to `true`; setting it to `false` must stop telemetry emission without changing application behavior or requiring deployment.
- **Provisioning IAM**: The operator or CI identity that creates/updates usage telemetry log buckets and sinks needs `roles/logging.configWriter` on the target office project. The identity that creates/updates the Remote Config telemetry switch needs `roles/cloudconfig.admin`.
- **One Event per Backend Interaction**: Track user-facing backend interactions at action granularity, covering Cloud Function calls and direct portal Firestore actions. Do not track hovers, tab changes, route navigation, or individual document read/write internals.
- **Best Effort**: Telemetry must never change existing application behavior. Frontend failures are swallowed with `console.warn`; backend telemetry is emitted from shared safe paths.
- **Privacy**: Raw `businessId` is intentionally included after access validation. Do not include emails, supplier names, invoice numbers, free text, document IDs, or other business document identifiers in telemetry payloads.

## 5. Do's and Don'ts

**Do:**
- **CRITICAL - MANDATORY TESTING TRIGGER:** You are **STRICTLY FORBIDDEN** from sending a response to the user after modifying *any* code until you have explicitly executed `npm run test:all` in the workspace root using the Shell tool.
  1. Make the code change.
  2. IMMEDIATELY run `npm run test:all` using the Shell tool.
  3. Do NOT explain your code to the user until the shell command finishes.
  4. If tests fail, fix them before responding.
  Skipping this step is a severe violation of your instructions. (App-specific testing rules are in their respective `.mdc` files).
- **Continuous Documentation:** Update this `AGENTS.md` file whenever global architectural changes are made, new core features are added, or monorepo-wide standards change. (For app-specific patterns or bug prevention, update the respective `.cursor/rules/*.mdc` files instead).

**Don't:**
- Do not commit secrets or `.env` files.
- Do not leave temporary scripts or files (e.g., one-off Node.js or bash scripts) in the workspace; always delete them after use.

## 6. Core Features & Portals

**Business Portal:**
- Dashboard & Financial Overview
- Income & Expense Tracking
- Invoice Upload (Manual & Email Forwarding)
- Supplier Management
- Recurring Expenses & Payments Tracking
- Invoice Exporting

**Accountant Portal:**
- Accountant Dashboard
- Client Management
- Read-only access to Client Invoices & Financials
- Bulk Exporting of Client Invoices
