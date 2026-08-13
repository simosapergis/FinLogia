# Usage Logging Provisioning

FinLogia usage telemetry is stored in Cloud Logging as structured logs where:

```text
jsonPayload.logType="usage_event"
```

Each accounting office GCP project should have a dedicated Cloud Logging bucket for these logs so telemetry can be retained longer than normal technical logs.

## Default Setup

The standard setup creates:

- Log bucket: `usage-events-365`
- Retention: `365` days
- Log sink: `usage-events-to-365`
- Filter: `jsonPayload.logType="usage_event"`
- `_Default` exclusion: usage telemetry is not duplicated in `_Default`

Normal technical logs remain in `_Default`. Usage telemetry is routed to `usage-events-365`.

## Runtime Telemetry Switch

Usage telemetry also has a Firebase Remote Config kill switch:

```text
telemetry_enabled
```

The standard value is `true`. When it is `true`, FinLogia writes `usage_event` logs for direct Firestore actions and Cloud Function calls. When it is `false`, the app and functions continue to work normally, but new telemetry logs are skipped.

The switch is per accounting-office Firebase project. Turning it off for one office does not affect any other office project.

Both the portal and Cloud Functions cache the value for 5 minutes. A change normally takes effect within that cache window. If Remote Config cannot be fetched, telemetry defaults to enabled; a warm runtime that already fetched `false` can keep honoring that cached disabled value until it refreshes again.

## Event Attribution

`businessId` always identifies the business whose data was accessed.

For normal business users, this is the user's own business. For accountant users working on a client, this is the client business ID, not the accountant's office/user identity.

Example:

```text
An accountant fetches invoices for client business fast-food-ez.
```

The telemetry event is attributed as:

```text
businessId = fast-food-ez
uid = accountant Firebase UID
role = accountant
```

Use these fields together:

- `jsonPayload.businessId`: which business data was accessed.
- `jsonPayload.uid`: which authenticated user performed the action.
- `jsonPayload.role`: whether the actor was `business` or `accountant`.
- `jsonPayload.eventType`: what backend action happened.

## Required IAM

The user or CI identity running these scripts needs:

```text
roles/logging.configWriter
```

If the script needs to grant the sink writer identity access to the project, the caller also needs permission to update project IAM policy.

Remote Config provisioning needs:

```text
roles/cloudconfig.admin
```

The Cloud Functions runtime service account needs:

```text
roles/cloudconfig.viewer
```

## New Accounting Offices

`setup_office.sh` runs usage logging provisioning automatically:

```bash
cd apps/backend
./scripts/setup_office.sh
```

It also provisions `telemetry_enabled=true` in Firebase Remote Config for the new office.

## Existing Accounting Offices

Set the project once, then reuse it in the commands below:

```bash
PROJECT_ID="your-office-project-id"
```

Provision one existing office:

```bash
cd apps/backend
./scripts/setup_usage_logging_existing_offices.sh "$PROJECT_ID"
./scripts/setup_remote_config_existing_offices.sh "$PROJECT_ID"
```

Provision multiple offices:

```bash
cd apps/backend
PROJECT_IDS=("office-project-a" "office-project-b")
./scripts/setup_usage_logging_existing_offices.sh "${PROJECT_IDS[@]}"
./scripts/setup_remote_config_existing_offices.sh "${PROJECT_IDS[@]}"
```

Provision every office listed in `apps/portal/clients.json`:

```bash
cd apps/backend
./scripts/setup_usage_logging_existing_offices.sh
./scripts/setup_remote_config_existing_offices.sh
```

Keep a 30-day copy in `_Default` as well as the 365-day telemetry bucket:

```bash
cd apps/backend
./scripts/setup_usage_logging_existing_offices.sh "$PROJECT_ID" -- --keep-default-copy
```

Set the initial Remote Config value explicitly:

```bash
cd apps/backend
./scripts/setup_remote_config_existing_offices.sh "$PROJECT_ID" -- --telemetry-enabled true
```

Disable or re-enable telemetry without deployment:

```bash
cd apps/backend
./scripts/set_telemetry_enabled.sh "$PROJECT_ID" false
./scripts/set_telemetry_enabled.sh "$PROJECT_ID" true
```

## Single Office Deployment Runbook

Use this runbook when applying the telemetry implementation to one existing accounting-office project. It is intentionally scoped by `PROJECT_ID`; do not use the no-argument rollout scripts unless the goal is to update every project in `apps/portal/clients.json`.

Set the target project once:

```bash
PROJECT_ID="your-office-project-id"
```

For the demo office, use:

```bash
PROJECT_ID="finlogia-demo"
```

Validate locally before deployment:

```bash
npm run test:all
```

Provision the long-retention Cloud Logging bucket, sink, and `_Default` exclusion:

```bash
cd apps/backend
./scripts/setup_usage_logging_existing_offices.sh "$PROJECT_ID"
```

Provision Firebase Remote Config for the runtime telemetry switch:

```bash
cd apps/backend
./scripts/setup_remote_config_existing_offices.sh "$PROJECT_ID" -- --telemetry-enabled true
```

Verify the Remote Config value:

```bash
TOKEN="$(gcloud auth print-access-token)"

curl -sS "https://firebaseremoteconfig.googleapis.com/v1/projects/${PROJECT_ID}/remoteConfig" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "X-Goog-User-Project: ${PROJECT_ID}" \
  | jq -r '.parameters.telemetry_enabled.defaultValue.value'
```

Deploy backend code, Firestore rules, and Storage rules to that office only:

```bash
cd apps/backend
firebase deploy --only functions,firestore:rules,storage --project "$PROJECT_ID" --force
```

Build the portal for that office. This mirrors the GitHub Actions deployment and avoids writing a persistent `.env.local` file:

```bash
cd apps/portal/pwa-client

CLIENT_CONFIG="$(jq -c '.[] | select(.projectId == "'"$PROJECT_ID"'")' ../clients.json)"
CLIENT_SLUG="${PROJECT_ID#finlogia-}"
CLIENT_NAME="$(echo "$CLIENT_SLUG" | tr '-' ' ' | awk '{for(i=1;i<=NF;i++) $i=toupper(substr($i,1,1)) tolower(substr($i,2))}1')"

VITE_FIREBASE_API_KEY="$(echo "$CLIENT_CONFIG" | jq -r .apiKey)" \
VITE_FIREBASE_AUTH_DOMAIN="$(echo "$CLIENT_CONFIG" | jq -r .authDomain)" \
VITE_FIREBASE_PROJECT_ID="$PROJECT_ID" \
VITE_FIREBASE_STORAGE_BUCKET="$(echo "$CLIENT_CONFIG" | jq -r .storageBucket)" \
VITE_FIREBASE_MESSAGING_SENDER_ID="$(echo "$CLIENT_CONFIG" | jq -r .messagingSenderId)" \
VITE_FIREBASE_APP_ID="$(echo "$CLIENT_CONFIG" | jq -r .appId)" \
VITE_FIREBASE_BUCKET_FOLDER=uploads \
VITE_INVOICE_EXPIRY_DAYS=7 \
VITE_BASE_URL="https://europe-west3-${PROJECT_ID}.cloudfunctions.net" \
VITE_SIGNED_UPLOAD_URL_PATH=/getSignedUploadUrl_v2 \
VITE_SIGNED_DOWNLOAD_URL_PATH=/getSignedDownloadUrl_v2 \
VITE_UPDATE_INVOICE_FIELDS_PATH=/updateInvoiceFields_v2 \
VITE_UPDATE_PAYMENT_STATUS_PATH=/updatePaymentStatus_v2 \
VITE_UPDATE_SUPPLIER_FIELDS_PATH=/updateSupplierFields_v2 \
VITE_ADD_FINANCIAL_ENTRY_PATH=/addFinancialEntry_v2 \
VITE_EDIT_FINANCIAL_ENTRY_PATH=/editFinancialEntry_v2 \
VITE_DELETE_FINANCIAL_ENTRY_PATH=/deleteFinancialEntry_v2 \
VITE_GET_FINANCIAL_REPORT_PATH=/getFinancialReport_v2 \
VITE_ADD_RECURRING_EXPENSE_PATH=/addRecurringExpense_v2 \
VITE_UPDATE_RECURRING_EXPENSE_PATH=/updateRecurringExpense_v2 \
VITE_GET_RECURRING_EXPENSES_PATH=/getRecurringExpenses_v2 \
VITE_EXPORT_INVOICES_PATH=/exportInvoices_v2 \
VITE_UPDATE_AUDIT_STATUS_PATH=/updateAuditStatus_v2 \
VITE_RECORD_INVOICE_VIEW_PATH=/recordInvoiceView_v2 \
VITE_CREATE_CLIENT_BUSINESS_PATH=/createClientBusiness_v2 \
VITE_ADD_USER_TO_BUSINESS_PATH=/addUserToBusiness_v2 \
VITE_ADD_ACCOUNTANT_PATH=/addAccountant_v2 \
VITE_RESET_USER_PASSWORD_PATH=/resetUserPassword_v2 \
VITE_CLIENT_NAME="$CLIENT_NAME" \
npm run build
```

Deploy portal hosting to that office only:

```bash
cd apps/portal/pwa-client
firebase deploy --only hosting --project "$PROJECT_ID"
```

Smoke-check hosting:

```bash
curl -I "https://${PROJECT_ID}.web.app"
```

Toggle telemetry without deployment after the code is deployed:

```bash
cd apps/backend
./scripts/set_telemetry_enabled.sh "$PROJECT_ID" false
./scripts/set_telemetry_enabled.sh "$PROJECT_ID" true
```

After toggling, allow up to 5 minutes for the portal and warm Cloud Function instances to refresh their cached Remote Config value.

### Single Office Rollback

Use the smallest rollback that matches the failure.

If telemetry itself is causing noise, cost, or privacy concern, disable telemetry first. This does not change app behavior and does not require deployment:

```bash
cd apps/backend
./scripts/set_telemetry_enabled.sh "$PROJECT_ID" false
```

If the custom Cloud Logging bucket or sink setup failed partway through, roll back log routing. This restores `_Default` first, then deletes the custom telemetry sink, and keeps the custom bucket and retained logs:

```bash
cd apps/backend
./scripts/rollback_usage_logging.sh "$PROJECT_ID"
```

Delete the custom telemetry bucket only when retained telemetry logs can be discarded:

```bash
cd apps/backend
./scripts/rollback_usage_logging.sh "$PROJECT_ID" --delete-bucket
```

If the backend code deployment is bad, redeploy the previous known-good commit to the same project. The provisioning scripts do not roll back Cloud Functions code:

```bash
git checkout <previous-good-commit>
cd apps/backend
firebase deploy --only functions,firestore:rules,storage --project "$PROJECT_ID" --force
```

If the portal hosting deployment is bad, rebuild and redeploy the previous known-good commit using the same office-specific environment variables from this runbook:

```bash
git checkout <previous-good-commit>
cd apps/portal/pwa-client
# Re-run the office-specific build command from this runbook.
firebase deploy --only hosting --project "$PROJECT_ID"
```

If only the Remote Config value is wrong, set the intended value again. Keeping the Remote Config parameter is preferred; it is the runtime control plane for telemetry:

```bash
cd apps/backend
./scripts/set_telemetry_enabled.sh "$PROJECT_ID" true
```

For `finlogia-demo`, the deployment performed on August 11, 2026 followed this exact sequence:

```bash
cd apps/backend
./scripts/setup_remote_config_existing_offices.sh finlogia-demo -- --telemetry-enabled true
firebase deploy --only functions,firestore:rules,storage --project finlogia-demo --force

cd ../portal/pwa-client
# Built with PROJECT_ID=finlogia-demo and the environment variables shown above.
npm run build
firebase deploy --only hosting --project finlogia-demo

TOKEN="$(gcloud auth print-access-token)"
curl -sS "https://firebaseremoteconfig.googleapis.com/v1/projects/finlogia-demo/remoteConfig" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "X-Goog-User-Project: finlogia-demo" \
  | jq -r '.parameters.telemetry_enabled.defaultValue.value'

curl -I "https://finlogia-demo.web.app"
```

## Gcloud Command Reference

Set these variables once before running the commands below:

```bash
PROJECT_ID="your-office-project-id"
BUSINESS_ID="your-business-id"
BUCKET_ID="usage-events-365"
LOCATION="global"
```

Check the current Remote Config telemetry switch:

```bash
TOKEN="$(gcloud auth print-access-token)"

curl -sS "https://firebaseremoteconfig.googleapis.com/v1/projects/${PROJECT_ID}/remoteConfig" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "X-Goog-User-Project: ${PROJECT_ID}" \
  | jq -r '.parameters.telemetry_enabled.defaultValue.value'
```

Update the switch from terminal:

```bash
cd apps/backend
./scripts/set_telemetry_enabled.sh "$PROJECT_ID" false
./scripts/set_telemetry_enabled.sh "$PROJECT_ID" true
```

Read recent telemetry from the custom bucket:

```bash
gcloud logging read 'jsonPayload.logType="usage_event"' \
  --bucket="$BUCKET_ID" \
  --location="$LOCATION" \
  --view="_AllLogs" \
  --project="$PROJECT_ID" \
  --limit=50
```

Read recent telemetry as a compact table:

```bash
gcloud logging read 'jsonPayload.logType="usage_event"' \
  --bucket="$BUCKET_ID" \
  --location="$LOCATION" \
  --view="_AllLogs" \
  --project="$PROJECT_ID" \
  --limit=20 \
  --format='table(timestamp,jsonPayload.eventType,jsonPayload.backend,jsonPayload.businessId,jsonPayload.status,jsonPayload.resultCount,jsonPayload.durationMs)'
```

Read telemetry for one business as a compact table:

```bash
gcloud logging read 'jsonPayload.logType="usage_event" AND jsonPayload.businessId="'"$BUSINESS_ID"'"' \
  --bucket="$BUCKET_ID" \
  --location="$LOCATION" \
  --view="_AllLogs" \
  --project="$PROJECT_ID" \
  --limit=50 \
  --format='table(timestamp,jsonPayload.eventType,jsonPayload.backend,jsonPayload.businessId,jsonPayload.uid,jsonPayload.role,jsonPayload.status,jsonPayload.resultCount,jsonPayload.durationMs)'
```

Default business query: read telemetry for one business with a returned-entry count and role:

```bash
gcloud logging read 'jsonPayload.logType="usage_event" AND jsonPayload.businessId="'"$BUSINESS_ID"'"' \
  --bucket="$BUCKET_ID" \
  --location="$LOCATION" \
  --view="_AllLogs" \
  --project="$PROJECT_ID" \
  --limit=50 \
  --format=json \
  | jq -r '
      "count: \(length)",
      "",
      (["timestamp","eventType","backend","businessId","uid","role","status","resultCount","durationMs"] | @tsv),
      (.[] | [
        .timestamp,
        .jsonPayload.eventType,
        .jsonPayload.backend,
        .jsonPayload.businessId,
        .jsonPayload.uid,
        .jsonPayload.role,
        .jsonPayload.status,
        (.jsonPayload.resultCount // ""),
        (.jsonPayload.durationMs // "")
      ] | @tsv)
    '
```

The count above is capped by `--limit=50`. Increase the limit when you need a larger sample.

When using zsh or bash, do not put blank lines inside continued commands, and do not leave spaces after trailing `\` characters. Otherwise, flags such as `--bucket` or `--format` can be interpreted as separate shell commands.

Read one event type:

```bash
gcloud logging read 'jsonPayload.logType="usage_event" AND jsonPayload.eventType="financial_report_requested"' \
  --bucket="$BUCKET_ID" \
  --location="$LOCATION" \
  --view="_AllLogs" \
  --project="$PROJECT_ID" \
  --limit=50
```

Read one event type for one business:

```bash
gcloud logging read 'jsonPayload.logType="usage_event" AND jsonPayload.businessId="'"$BUSINESS_ID"'" AND jsonPayload.eventType="unpaid_invoices_requested"' \
  --bucket="$BUCKET_ID" \
  --location="$LOCATION" \
  --view="_AllLogs" \
  --project="$PROJECT_ID" \
  --limit=50 \
  --format='table(timestamp,jsonPayload.eventType,jsonPayload.backend,jsonPayload.businessId,jsonPayload.uid,jsonPayload.role,jsonPayload.status,jsonPayload.resultCount,jsonPayload.durationMs)'
```

Describe the telemetry log bucket:

```bash
gcloud logging buckets describe "$BUCKET_ID" \
  --location="$LOCATION" \
  --project="$PROJECT_ID"
```

Check telemetry bytes ingested into the custom bucket over the last 30 days using the Cloud Monitoring API:

```bash
END_TIME="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
START_TIME="$(date -u -v-30d +%Y-%m-%dT%H:%M:%SZ)" # macOS/BSD date
TOKEN="$(gcloud auth print-access-token)"

curl -sG "https://monitoring.googleapis.com/v3/projects/${PROJECT_ID}/timeSeries" \
  -H "Authorization: Bearer ${TOKEN}" \
  --data-urlencode 'filter=metric.type="logging.googleapis.com/billing/bytes_ingested" AND resource.type="logging_bucket" AND resource.labels.bucket_id="'"${BUCKET_ID}"'"' \
  --data-urlencode "interval.startTime=${START_TIME}" \
  --data-urlencode "interval.endTime=${END_TIME}" \
  --data-urlencode "view=FULL"
```

On Linux, use this `START_TIME` command instead:

```bash
START_TIME="$(date -u -d '30 days ago' +%Y-%m-%dT%H:%M:%SZ)"
```

If `jq` is installed, print only timestamp and byte values:

```bash
curl -sG "https://monitoring.googleapis.com/v3/projects/${PROJECT_ID}/timeSeries" \
  -H "Authorization: Bearer ${TOKEN}" \
  --data-urlencode 'filter=metric.type="logging.googleapis.com/billing/bytes_ingested" AND resource.type="logging_bucket" AND resource.labels.bucket_id="'"${BUCKET_ID}"'"' \
  --data-urlencode "interval.startTime=${START_TIME}" \
  --data-urlencode "interval.endTime=${END_TIME}" \
  --data-urlencode "view=FULL" \
  | jq -r '.timeSeries[]?.points[]? | [.interval.endTime, (.value.int64Value // .value.doubleValue)] | @tsv'
```

Cloud Logging buckets are managed storage, not single files. The billing metric above reports bytes ingested over a period; it is not an exact current on-disk file size.

## Firestore Invoice Count Queries

These queries count stored invoice documents from Firestore. The single-business queries read from:

```text
businesses/{businessId}/invoices
```

The project-wide query scans every direct document in `businesses` and then reads each `businesses/{businessId}/invoices` collection. It does not print or require a specific `businessId`.

They count invoice documents, not uploaded pages. If one invoice has multiple pages, it still counts as one invoice document.

Use `uploadedAt` when you want the storage/upload date. Use `invoiceDate` when you want the invoice issue date.

Set the target values:

```bash
PROJECT_ID="your-office-project-id"
BUSINESS_ID="your-business-id"
DATE_FIELD="uploadedAt" # or invoiceDate
START_DATE="2026-01-01"
END_DATE="2026-08-12"
START_MONTH="2026-01"
END_MONTH="2026-08"
```

If the Node Admin SDK fails with `UNAUTHENTICATED`, use these REST commands. They use the active `gcloud` OAuth token and do not require Application Default Credentials.

Count invoices from the start of the current year through a specific day, grouped by date:

```bash
node --input-type=module <<'NODE'
import { execFileSync } from 'node:child_process';

const projectId = process.env.PROJECT_ID;
const businessId = process.env.BUSINESS_ID;
const dateField = process.env.DATE_FIELD || 'uploadedAt';
const startDate = process.env.START_DATE;
const endDate = process.env.END_DATE;
const token = execFileSync('gcloud', ['auth', 'print-access-token'], { encoding: 'utf8' }).trim();
const baseUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/businesses/${businessId}/invoices`;

const firestoreValueToDate = (value) => {
  if (!value) return null;
  if (value.timestampValue) return new Date(value.timestampValue);
  if (value.stringValue) return new Date(value.stringValue);
  if (value.integerValue) return new Date(Number(value.integerValue));
  if (value.doubleValue) return new Date(Number(value.doubleValue));
  if (value.mapValue?.fields?._seconds?.integerValue) {
    return new Date(Number(value.mapValue.fields._seconds.integerValue) * 1000);
  }
  return null;
};

const formatDate = (date) => {
  if (!date || Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Athens',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
};

let pageToken = '';
let scanned = 0;
let totalInRange = 0;
let missing = 0;
let invalid = 0;
const counts = new Map();

while (true) {
  const url = new URL(baseUrl);
  url.searchParams.set('pageSize', '1000');
  if (pageToken) url.searchParams.set('pageToken', pageToken);

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Goog-User-Project': projectId,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Firestore REST read failed: HTTP ${response.status} ${body}`);
  }

  const payload = await response.json();
  for (const document of payload.documents || []) {
    scanned += 1;
    const value = document.fields?.[dateField];
    if (!value) {
      missing += 1;
      continue;
    }
    const date = firestoreValueToDate(value);
    const day = formatDate(date);
    if (!day) {
      invalid += 1;
      continue;
    }
    if (day < startDate || day > endDate) continue;
    totalInRange += 1;
    counts.set(day, (counts.get(day) || 0) + 1);
  }

  pageToken = payload.nextPageToken || '';
  if (!pageToken) break;
}

const rows = [...counts.entries()]
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([date, count]) => ({ date, count }));

console.log(`project: ${projectId}`);
console.log(`businessId: ${businessId}`);
console.log(`dateField: ${dateField}`);
console.log(`range: ${startDate}..${endDate} Europe/Athens`);
console.log(`documentsScanned: ${scanned}`);
console.log(`totalInRange: ${totalInRange}`);
console.log(`missingDateField: ${missing}`);
console.log(`invalidDateField: ${invalid}`);
console.table(rows);
NODE
```

Count invoices from the start of the current year through a specific month, grouped by month:

```bash
node --input-type=module <<'NODE'
import { execFileSync } from 'node:child_process';

const projectId = process.env.PROJECT_ID;
const businessId = process.env.BUSINESS_ID;
const dateField = process.env.DATE_FIELD || 'uploadedAt';
const startMonth = process.env.START_MONTH;
const endMonth = process.env.END_MONTH;
const token = execFileSync('gcloud', ['auth', 'print-access-token'], { encoding: 'utf8' }).trim();
const baseUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/businesses/${businessId}/invoices`;

const firestoreValueToDate = (value) => {
  if (!value) return null;
  if (value.timestampValue) return new Date(value.timestampValue);
  if (value.stringValue) return new Date(value.stringValue);
  if (value.integerValue) return new Date(Number(value.integerValue));
  if (value.doubleValue) return new Date(Number(value.doubleValue));
  if (value.mapValue?.fields?._seconds?.integerValue) {
    return new Date(Number(value.mapValue.fields._seconds.integerValue) * 1000);
  }
  return null;
};

const formatMonth = (date) => {
  if (!date || Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Athens',
    year: 'numeric',
    month: '2-digit',
  }).format(date);
};

let pageToken = '';
let scanned = 0;
let totalInRange = 0;
let missing = 0;
let invalid = 0;
const counts = new Map();

while (true) {
  const url = new URL(baseUrl);
  url.searchParams.set('pageSize', '1000');
  if (pageToken) url.searchParams.set('pageToken', pageToken);

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Goog-User-Project': projectId,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Firestore REST read failed: HTTP ${response.status} ${body}`);
  }

  const payload = await response.json();
  for (const document of payload.documents || []) {
    scanned += 1;
    const value = document.fields?.[dateField];
    if (!value) {
      missing += 1;
      continue;
    }
    const date = firestoreValueToDate(value);
    const month = formatMonth(date);
    if (!month) {
      invalid += 1;
      continue;
    }
    if (month < startMonth || month > endMonth) continue;
    totalInRange += 1;
    counts.set(month, (counts.get(month) || 0) + 1);
  }

  pageToken = payload.nextPageToken || '';
  if (!pageToken) break;
}

const rows = [...counts.entries()]
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([month, count]) => ({ month, count }));

console.log(`project: ${projectId}`);
console.log(`businessId: ${businessId}`);
console.log(`dateField: ${dateField}`);
console.log(`range: ${startMonth}..${endMonth} Europe/Athens`);
console.log(`documentsScanned: ${scanned}`);
console.log(`totalInRange: ${totalInRange}`);
console.log(`missingDateField: ${missing}`);
console.log(`invalidDateField: ${invalid}`);
console.table(rows);
NODE
```

Count invoices across the whole office project, grouped by month and date:

```bash
node --input-type=module <<'NODE'
import { execFileSync } from 'node:child_process';

const projectId = process.env.PROJECT_ID;
const dateField = process.env.DATE_FIELD || 'uploadedAt';
const startDate = process.env.START_DATE;
const endDate = process.env.END_DATE;
const startMonth = process.env.START_MONTH;
const endMonth = process.env.END_MONTH;
const token = execFileSync('gcloud', ['auth', 'print-access-token'], { encoding: 'utf8' }).trim();
const rootUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;

const fetchJson = async (url) => {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Goog-User-Project': projectId,
    },
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Firestore REST read failed: HTTP ${response.status} ${body}`);
  }
  return response.json();
};

const firestoreValueToDate = (value) => {
  if (!value) return null;
  if (value.timestampValue) return new Date(value.timestampValue);
  if (value.stringValue) return new Date(value.stringValue);
  if (value.integerValue) return new Date(Number(value.integerValue));
  if (value.doubleValue) return new Date(Number(value.doubleValue));
  if (value.mapValue?.fields?._seconds?.integerValue) {
    return new Date(Number(value.mapValue.fields._seconds.integerValue) * 1000);
  }
  return null;
};

const formatDate = (date) => {
  if (!date || Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Athens',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
};

const formatMonth = (date) => {
  if (!date || Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Athens',
    year: 'numeric',
    month: '2-digit',
  }).format(date);
};

const listCollection = async (path) => {
  let pageToken = '';
  const documents = [];
  while (true) {
    const url = new URL(`${rootUrl}/${path}`);
    url.searchParams.set('pageSize', '1000');
    if (pageToken) url.searchParams.set('pageToken', pageToken);
    const payload = await fetchJson(url);
    documents.push(...(payload.documents || []));
    pageToken = payload.nextPageToken || '';
    if (!pageToken) break;
  }
  return documents;
};

const businesses = await listCollection('businesses');
const countsByDate = new Map();
const countsByMonth = new Map();
let documentsScanned = 0;
let totalInDateRange = 0;
let totalInMonthRange = 0;
let missing = 0;
let invalid = 0;

for (const business of businesses) {
  const businessId = business.name.split('/').pop();
  const invoices = await listCollection(`businesses/${businessId}/invoices`);
  for (const invoice of invoices) {
    documentsScanned += 1;
    const value = invoice.fields?.[dateField];
    if (!value) {
      missing += 1;
      continue;
    }
    const date = firestoreValueToDate(value);
    const day = formatDate(date);
    const month = formatMonth(date);
    if (!day || !month) {
      invalid += 1;
      continue;
    }
    if (day >= startDate && day <= endDate) {
      totalInDateRange += 1;
      countsByDate.set(day, (countsByDate.get(day) || 0) + 1);
    }
    if (month >= startMonth && month <= endMonth) {
      totalInMonthRange += 1;
      countsByMonth.set(month, (countsByMonth.get(month) || 0) + 1);
    }
  }
}

const dateRows = [...countsByDate.entries()]
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([date, count]) => ({ date, count }));
const monthRows = [...countsByMonth.entries()]
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([month, count]) => ({ month, count }));

console.log(`project: ${projectId}`);
console.log(`dateField: ${dateField}`);
console.log(`businessesScanned: ${businesses.length}`);
console.log(`documentsScanned: ${documentsScanned}`);
console.log(`dateRange: ${startDate}..${endDate} Europe/Athens`);
console.log(`totalInDateRange: ${totalInDateRange}`);
console.log(`monthRange: ${startMonth}..${endMonth} Europe/Athens`);
console.log(`totalInMonthRange: ${totalInMonthRange}`);
console.log(`missingDateField: ${missing}`);
console.log(`invalidDateField: ${invalid}`);
console.log('\nGrouped by month');
console.table(monthRows);
console.log('\nGrouped by date');
console.table(dateRows);
NODE
```

## Custom Values

The reusable setup script supports custom bucket, location, retention, and sink values:

```bash
cd apps/backend
./scripts/setup_usage_logging.sh "$PROJECT_ID" \
  --bucket-id usage-events-365 \
  --location global \
  --retention-days 365 \
  --sink-name usage-events-to-365
```

For all options:

```bash
cd apps/backend
./scripts/setup_usage_logging.sh --help
./scripts/setup_usage_logging_existing_offices.sh --help
./scripts/setup_remote_config.sh --help
./scripts/setup_remote_config_existing_offices.sh --help
```

## Rollback

Rollback for telemetry has three separate layers:

- Remote Config switch: fastest way to stop telemetry without deployment.
- Cloud Logging routing: restores `_Default`, deletes the custom telemetry sink, and optionally deletes the custom bucket.
- Application code: redeploy a previous known-good backend/portal commit to the target project.

Disable telemetry immediately:

```bash
cd apps/backend
./scripts/set_telemetry_enabled.sh "$PROJECT_ID" false
```

Roll back Cloud Logging routing. By default this keeps the telemetry bucket and retained logs:

```bash
cd apps/backend
./scripts/rollback_usage_logging.sh "$PROJECT_ID"
```

Delete the telemetry bucket too only when retained telemetry logs can be discarded:

```bash
cd apps/backend
./scripts/rollback_usage_logging.sh "$PROJECT_ID" --delete-bucket
```

For all rollback options:

```bash
cd apps/backend
./scripts/rollback_usage_logging.sh --help
```
