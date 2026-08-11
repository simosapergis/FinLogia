#!/bin/bash
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
NC='\033[0m'

DEFAULT_BUCKET_ID="usage-events-365"
DEFAULT_LOCATION="global"
DEFAULT_RETENTION_DAYS="365"
DEFAULT_SINK_NAME="usage-events-to-365"
DEFAULT_EXCLUSION_NAME="exclude_usage_events_from_default"
USAGE_FILTER='jsonPayload.logType="usage_event"'

usage() {
    cat <<EOF
Usage: ./scripts/setup_usage_logging.sh <project-id> [options]

Creates the dedicated Cloud Logging bucket and routing needed for FinLogia usage telemetry.

Options:
  --bucket-id <id>          Log bucket ID. Default: ${DEFAULT_BUCKET_ID}
  --location <location>     Log bucket location. Default: ${DEFAULT_LOCATION}
  --retention-days <days>   Log bucket retention. Default: ${DEFAULT_RETENTION_DAYS}
  --sink-name <name>        Log sink name. Default: ${DEFAULT_SINK_NAME}
  --keep-default-copy       Do not exclude usage_event logs from _Default.
  -h, --help                Show this help.

Required caller IAM on the target project:
  roles/logging.configWriter

If the sink gets a dedicated writer identity, this script also grants it:
  roles/logging.logWriter
  roles/logging.bucketWriter
EOF
}

if [ "${1:-}" = "-h" ] || [ "${1:-}" = "--help" ]; then
    usage
    exit 0
fi

if [ $# -lt 1 ]; then
    usage
    exit 1
fi

PROJECT_ID="$1"
shift

BUCKET_ID="${USAGE_LOG_BUCKET_ID:-$DEFAULT_BUCKET_ID}"
LOCATION="${USAGE_LOG_BUCKET_LOCATION:-$DEFAULT_LOCATION}"
RETENTION_DAYS="${USAGE_LOG_RETENTION_DAYS:-$DEFAULT_RETENTION_DAYS}"
SINK_NAME="${USAGE_LOG_SINK_NAME:-$DEFAULT_SINK_NAME}"
EXCLUSION_NAME="${USAGE_LOG_DEFAULT_EXCLUSION_NAME:-$DEFAULT_EXCLUSION_NAME}"
EXCLUDE_FROM_DEFAULT=true

while [ $# -gt 0 ]; do
    case "$1" in
        --bucket-id)
            BUCKET_ID="${2:-}"
            shift 2
            ;;
        --location)
            LOCATION="${2:-}"
            shift 2
            ;;
        --retention-days)
            RETENTION_DAYS="${2:-}"
            shift 2
            ;;
        --sink-name)
            SINK_NAME="${2:-}"
            shift 2
            ;;
        --keep-default-copy)
            EXCLUDE_FROM_DEFAULT=false
            shift
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            usage
            exit 1
            ;;
    esac
done

if [ -z "$PROJECT_ID" ] || [ -z "$BUCKET_ID" ] || [ -z "$LOCATION" ] || [ -z "$RETENTION_DAYS" ] || [ -z "$SINK_NAME" ]; then
    echo -e "${RED}Project, bucket, location, retention, and sink values are required.${NC}"
    exit 1
fi

if ! command -v gcloud >/dev/null 2>&1; then
    echo -e "${RED}gcloud CLI is required.${NC}"
    exit 1
fi

echo -e "${CYAN}=== FinLogia Usage Logging Setup ===${NC}"
echo -e "Project:          ${CYAN}${PROJECT_ID}${NC}"
echo -e "Bucket:           ${CYAN}${BUCKET_ID}${NC}"
echo -e "Location:         ${CYAN}${LOCATION}${NC}"
echo -e "Retention:        ${CYAN}${RETENTION_DAYS} days${NC}"
echo -e "Sink:             ${CYAN}${SINK_NAME}${NC}"
echo -e "Filter:           ${CYAN}${USAGE_FILTER}${NC}"

ACTIVE_ACCOUNT=$(gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>/dev/null | head -n 1 || true)
if [ -n "$ACTIVE_ACCOUNT" ]; then
    echo -e "Active account:   ${CYAN}${ACTIVE_ACCOUNT}${NC}"
fi

echo -e "\n[1/5] Verifying project and enabling Cloud Logging API..."
gcloud projects describe "$PROJECT_ID" >/dev/null
gcloud services enable logging.googleapis.com --project="$PROJECT_ID" --quiet >/dev/null

echo -e "[2/5] Creating or updating telemetry log bucket..."
if gcloud logging buckets describe "$BUCKET_ID" --location="$LOCATION" --project="$PROJECT_ID" >/dev/null 2>&1; then
    gcloud logging buckets update "$BUCKET_ID" \
        --location="$LOCATION" \
        --retention-days="$RETENTION_DAYS" \
        --project="$PROJECT_ID" \
        --quiet >/dev/null
    echo -e "  -> Updated existing bucket retention."
else
    gcloud logging buckets create "$BUCKET_ID" \
        --location="$LOCATION" \
        --retention-days="$RETENTION_DAYS" \
        --description="FinLogia usage telemetry logs" \
        --project="$PROJECT_ID" \
        --quiet >/dev/null
    echo -e "  -> Created telemetry bucket."
fi

DESTINATION="logging.googleapis.com/projects/${PROJECT_ID}/locations/${LOCATION}/buckets/${BUCKET_ID}"

echo -e "[3/5] Creating or updating telemetry log sink..."
if gcloud logging sinks describe "$SINK_NAME" --project="$PROJECT_ID" >/dev/null 2>&1; then
    gcloud logging sinks update "$SINK_NAME" "$DESTINATION" \
        --log-filter="$USAGE_FILTER" \
        --description="Route FinLogia usage telemetry logs to ${BUCKET_ID}" \
        --project="$PROJECT_ID" \
        --quiet >/dev/null
    echo -e "  -> Updated existing sink."
else
    gcloud logging sinks create "$SINK_NAME" "$DESTINATION" \
        --log-filter="$USAGE_FILTER" \
        --description="Route FinLogia usage telemetry logs to ${BUCKET_ID}" \
        --project="$PROJECT_ID" \
        --quiet >/dev/null
    echo -e "  -> Created telemetry sink."
fi

WRITER_IDENTITY=$(gcloud logging sinks describe "$SINK_NAME" --project="$PROJECT_ID" --format="value(writerIdentity)" 2>/dev/null || true)
if [[ "$WRITER_IDENTITY" == serviceAccount:* ]]; then
    echo -e "[4/5] Granting sink writer permissions..."
    gcloud projects add-iam-policy-binding "$PROJECT_ID" \
        --member="$WRITER_IDENTITY" \
        --role="roles/logging.logWriter" \
        --condition=None \
        --quiet >/dev/null
    gcloud projects add-iam-policy-binding "$PROJECT_ID" \
        --member="$WRITER_IDENTITY" \
        --role="roles/logging.bucketWriter" \
        --condition=None \
        --quiet >/dev/null
    echo -e "  -> Granted writer roles to ${CYAN}${WRITER_IDENTITY}${NC}."
else
    echo -e "[4/5] No dedicated writer identity returned; same-project logging sink authorization is handled by Cloud Logging."
fi

if [ "$EXCLUDE_FROM_DEFAULT" = true ]; then
    echo -e "[5/5] Excluding usage telemetry from _Default to avoid duplicate storage..."
    gcloud logging sinks update _Default \
        --remove-exclusion="$EXCLUSION_NAME" \
        --project="$PROJECT_ID" \
        --quiet >/dev/null 2>&1 || true

    gcloud logging sinks update _Default \
        --add-exclusion="name=${EXCLUSION_NAME},description=Store FinLogia usage events only in ${BUCKET_ID},filter=${USAGE_FILTER}" \
        --project="$PROJECT_ID" \
        --quiet >/dev/null
    echo -e "  -> _Default exclusion configured."
else
    echo -e "[5/5] Keeping a 30-day copy in _Default as requested."
fi

echo -e "\n${GREEN}Usage telemetry logging is configured for ${PROJECT_ID}.${NC}"
echo -e "Read from the custom bucket with:"
echo -e "${CYAN}gcloud logging read '${USAGE_FILTER}' --bucket='${BUCKET_ID}' --location='${LOCATION}' --view='_AllLogs' --project='${PROJECT_ID}' --limit=50${NC}"
