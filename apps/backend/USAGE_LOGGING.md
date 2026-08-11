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

## New Accounting Offices

`setup_office.sh` runs usage logging provisioning automatically:

```bash
cd apps/backend
./scripts/setup_office.sh
```

## Existing Accounting Offices

Set the project once, then reuse it in the commands below:

```bash
PROJECT_ID="your-office-project-id"
```

Provision one existing office:

```bash
cd apps/backend
./scripts/setup_usage_logging_existing_offices.sh "$PROJECT_ID"
```

Provision multiple offices:

```bash
cd apps/backend
PROJECT_IDS=("office-project-a" "office-project-b")
./scripts/setup_usage_logging_existing_offices.sh "${PROJECT_IDS[@]}"
```

Provision every office listed in `apps/portal/clients.json`:

```bash
cd apps/backend
./scripts/setup_usage_logging_existing_offices.sh
```

Keep a 30-day copy in `_Default` as well as the 365-day telemetry bucket:

```bash
cd apps/backend
./scripts/setup_usage_logging_existing_offices.sh "$PROJECT_ID" -- --keep-default-copy
```

## Gcloud Command Reference

Set these variables once before running the commands below:

```bash
PROJECT_ID="your-office-project-id"
BUSINESS_ID="your-business-id"
BUCKET_ID="usage-events-365"
LOCATION="global"
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

Read telemetry for one business:

```bash
gcloud logging read 'jsonPayload.logType="usage_event" AND jsonPayload.businessId="'"$BUSINESS_ID"'"' \
  --bucket="$BUCKET_ID" \
  --location="$LOCATION" \
  --view="_AllLogs" \
  --project="$PROJECT_ID" \
  --limit=50 \
  --format='table(timestamp,jsonPayload.eventType,jsonPayload.backend,jsonPayload.businessId,jsonPayload.uid,jsonPayload.role,jsonPayload.status,jsonPayload.resultCount,jsonPayload.durationMs)'
```

Read telemetry for one business with a returned-entry count:

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
```

## Rollback

Rollback restores `_Default` first, then removes the telemetry sink. By default it keeps the telemetry bucket and retained logs:

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
