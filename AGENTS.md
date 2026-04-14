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
- Update this `AGENTS.md` file whenever architectural changes are made or new features are added to either the business or accountant portal.

**Don't:**
- Do not use `collectionGroup` queries across different businesses.
- Do not expose Cloud Storage buckets directly; use signed URLs.
- Do not commit secrets or `.env` files.
- Do not leave temporary scripts or files (e.g., one-off Node.js or bash scripts) in the workspace; always delete them after use.

## 6. AI, OCR & Ingestion Architecture

- **Invoice Processing**: We use Google Cloud Vertex AI with the `gemini-2.5-flash` multimodal model to process uploaded invoices directly from Cloud Storage (`gs://` URIs).
- **Cost Optimization**: We bypass the Cloud Vision API and OpenAI entirely. Gemini directly reads the images/PDFs and outputs structured JSON.
- **Regions**: We use the default project region (e.g., `europe-west3`) for Vertex AI calls since `gemini-2.5-flash` is available there.
- **Email Ingestion**: Invoices can be forwarded via email (using SendGrid or similar inbound parse webhooks), processed by `inbound-email.js`, and automatically uploaded to Cloud Storage for OCR.

## 7. Core Features & Portals

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
