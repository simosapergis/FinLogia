# AGENTS.md — FinLogia Monorepo

## 0. Guiding Principles

Think like a **Principal GCP Architect**. Evaluate every decision through GCP-native services, pricing, and limits.

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
- Always scope database queries and storage paths with `businessId`.
- Use `apiRequest` in the frontend to automatically inject `businessId`.
- Implement Cursor-based Pagination for unbounded lists to protect performance and cost.
- Ensure all user-facing strings are in **Greek**.
- Update this `AGENTS.md` file whenever architectural changes are made.

**Don't:**
- Do not use `collectionGroup` queries across different businesses.
- Do not expose Cloud Storage buckets directly; use signed URLs.
- Do not commit secrets or `.env` files.
- Do not leave temporary scripts or files (e.g., one-off Node.js or bash scripts) in the workspace; always delete them after use.
