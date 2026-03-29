# FinLogia Accountant API

Cloud Functions backend for the FinLogia Accountant Portal — enables accountants to view and export their clients' invoices across multiple FinLogia projects.

## Prerequisites

- Node.js 22+
- Firebase CLI (`npm install -g firebase-tools`)
- Google Cloud SDK (`gcloud`)
- `jq` (for setup scripts)

## Quick Start

```bash
npm install
cd functions && npm install && cd ..
```

## Architecture

Single shared GCP project hosting all accountants. Cloud Functions read invoice data from FinLogia client projects via cross-project IAM (read-only). Firestore stores per-accountant client mappings and invoice view tracking.

### Cloud Functions

| Function | Method | Description |
|---|---|---|
| `listClients_v1` | GET | Returns assigned clients for the authenticated accountant |
| `getClientInvoices_v1` | POST | Fetches invoices from a client project with date range filter |
| `viewInvoiceDetails_v1` | POST | Gets invoice details and records the view |
| `getSignedInvoiceUrl_v1` | POST | Generates signed download URL for invoice PDF |
| `exportClientInvoices_v1` | POST | Exports selected invoices as ZIP |
| `updateAuditStatus_v1` | POST | Updates the manual audit status (registered/denied) for an invoice |

## Admin Scripts

```bash
# One-time project setup
npm run setup:project

# Create an accountant user (supports creating multiple users under the same office)
npm run create:accountant

# Assign a FinLogia client to an accountant office
npm run register:client
```

## Maintenance

**CRITICAL RULE:** Whenever there is an important change or addition in code, automatically update this file (`README.md`) and `AGENTS.md` to reflect the latest state.

## Deployment

```bash
cd functions
firebase deploy --only functions    # Runs lint + test before deploy
```

## Emulators

```bash
firebase emulators:start
```

Ports: Auth 9099, Functions 5001, Firestore 5002, Storage 5003, UI 5004.

## Testing

```bash
cd functions
npm test              # Run once
npm run test:watch    # Watch mode
```

See `AGENTS.md` for detailed architecture, conventions, and patterns.
