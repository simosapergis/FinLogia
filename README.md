# FinLogia Monorepo

Welcome to the FinLogia monorepo. This repository contains the unified codebase for the FinLogia SaaS platform, adopting a multi-tenant architecture ("1 GCP Project per Accounting Office").

## Architecture Overview

*   **Multi-Tenancy:** Each Accounting Office gets its own dedicated GCP Project.
*   **Tenant Isolation:** Within a GCP project, multiple client businesses are managed. Data is strictly isolated using a flat Firestore structure (`/businesses/{businessId}/...`) and robust Security Rules.
*   **Unified Portal:** A single Vue 3 PWA (`apps/portal`) serves both Accountants and Business Owners, utilizing Role-Based Access Control (RBAC) via Firebase Auth Custom Claims.
*   **Backend:** A unified Firebase Cloud Functions backend (`apps/backend`) handles all logic, scoped by `businessId`.

## Workspaces

*   `apps/backend`: Firebase Cloud Functions, Firestore Rules, Storage Rules, and provisioning scripts.
*   `apps/portal`: The unified Vue 3 PWA client.

## Deployment

Deployment is managed via GitHub Actions Matrix strategy to deploy across all configured Accounting Office GCP projects in parallel.
