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

## 5. Do's and Don'ts

**Do:**
- **Monorepo Testing:** Before considering any task complete, you must verify nothing broke across the monorepo by running `npm run test:all` from the workspace root. (App-specific testing rules are in their respective `.mdc` files).
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
