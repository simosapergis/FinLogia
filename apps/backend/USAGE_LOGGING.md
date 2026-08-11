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

## Verify Logs

Read telemetry from the custom bucket:

```bash
gcloud logging read 'jsonPayload.logType="usage_event"' \
  --bucket="usage-events-365" \
  --location="global" \
  --view="_AllLogs" \
  --project="$PROJECT_ID" \
  --limit=50
```

Read a specific event type:

```bash
gcloud logging read 'jsonPayload.logType="usage_event" AND jsonPayload.eventType="financial_report_requested"' \
  --bucket="usage-events-365" \
  --location="global" \
  --view="_AllLogs" \
  --project="$PROJECT_ID" \
  --limit=50
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
