#!/bin/bash
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
NC='\033[0m'

DEFAULT_BUCKET_ID="usage-events-365"
DEFAULT_LOCATION="global"
DEFAULT_SINK_NAME="usage-events-to-365"
DEFAULT_EXCLUSION_NAME="exclude_usage_events_from_default"

usage() {
    cat <<EOF
Usage: ./scripts/rollback_usage_logging.sh <project-id> [options]

Rolls back FinLogia usage telemetry log routing for one project.

Default behavior:
  1. Remove the _Default exclusion so usage_event logs are stored in _Default again.
  2. Delete the usage telemetry sink.
  3. Keep the usage telemetry bucket and retained logs.

Options:
  --bucket-id <id>          Log bucket ID. Default: ${DEFAULT_BUCKET_ID}
  --location <location>     Log bucket location. Default: ${DEFAULT_LOCATION}
  --sink-name <name>        Log sink name. Default: ${DEFAULT_SINK_NAME}
  --delete-bucket           Also delete the telemetry bucket. This deletes retained telemetry logs.
  -h, --help                Show this help.

Required caller IAM on the target project:
  roles/logging.configWriter

If removing IAM bindings, the caller also needs permission to update project IAM policy.
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
SINK_NAME="${USAGE_LOG_SINK_NAME:-$DEFAULT_SINK_NAME}"
EXCLUSION_NAME="${USAGE_LOG_DEFAULT_EXCLUSION_NAME:-$DEFAULT_EXCLUSION_NAME}"
DELETE_BUCKET=false

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
        --sink-name)
            SINK_NAME="${2:-}"
            shift 2
            ;;
        --delete-bucket)
            DELETE_BUCKET=true
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

if [ -z "$PROJECT_ID" ] || [ -z "$BUCKET_ID" ] || [ -z "$LOCATION" ] || [ -z "$SINK_NAME" ]; then
    echo -e "${RED}Project, bucket, location, and sink values are required.${NC}"
    exit 1
fi

if ! command -v gcloud >/dev/null 2>&1; then
    echo -e "${RED}gcloud CLI is required.${NC}"
    exit 1
fi

echo -e "${CYAN}=== FinLogia Usage Logging Rollback ===${NC}"
echo -e "Project:          ${CYAN}${PROJECT_ID}${NC}"
echo -e "Bucket:           ${CYAN}${BUCKET_ID}${NC}"
echo -e "Location:         ${CYAN}${LOCATION}${NC}"
echo -e "Sink:             ${CYAN}${SINK_NAME}${NC}"
echo -e "Default exclusion:${CYAN}${EXCLUSION_NAME}${NC}"

echo -e "\n[1/4] Verifying project..."
gcloud projects describe "$PROJECT_ID" >/dev/null

echo -e "[2/4] Removing _Default exclusion first..."
if gcloud logging sinks update _Default \
    --remove-exclusion="$EXCLUSION_NAME" \
    --project="$PROJECT_ID" \
    --quiet >/dev/null 2>&1; then
    echo -e "  -> Removed _Default exclusion. usage_event logs can be stored in _Default again."
else
    echo -e "  ${YELLOW}-> Exclusion was not present or could not be removed. Continuing.${NC}"
fi

echo -e "[3/4] Deleting telemetry sink..."
WRITER_IDENTITY=""
if gcloud logging sinks describe "$SINK_NAME" --project="$PROJECT_ID" >/dev/null 2>&1; then
    WRITER_IDENTITY=$(gcloud logging sinks describe "$SINK_NAME" --project="$PROJECT_ID" --format="value(writerIdentity)" 2>/dev/null || true)
    gcloud logging sinks delete "$SINK_NAME" --project="$PROJECT_ID" --quiet >/dev/null
    echo -e "  -> Deleted sink ${CYAN}${SINK_NAME}${NC}."
else
    echo -e "  ${YELLOW}-> Sink ${SINK_NAME} was not present. Continuing.${NC}"
fi

if [[ "$WRITER_IDENTITY" == serviceAccount:* ]]; then
    echo -e "  -> Removing sink writer IAM bindings where present..."
    gcloud projects remove-iam-policy-binding "$PROJECT_ID" \
        --member="$WRITER_IDENTITY" \
        --role="roles/logging.logWriter" \
        --condition=None \
        --quiet >/dev/null 2>&1 || true
    gcloud projects remove-iam-policy-binding "$PROJECT_ID" \
        --member="$WRITER_IDENTITY" \
        --role="roles/logging.bucketWriter" \
        --condition=None \
        --quiet >/dev/null 2>&1 || true
fi

echo -e "[4/4] Handling telemetry bucket..."
if [ "$DELETE_BUCKET" = true ]; then
    echo -e "${YELLOW}  -> Deleting bucket ${BUCKET_ID}; retained telemetry logs will be deleted.${NC}"
    if gcloud logging buckets describe "$BUCKET_ID" --location="$LOCATION" --project="$PROJECT_ID" >/dev/null 2>&1; then
        gcloud logging buckets delete "$BUCKET_ID" \
            --location="$LOCATION" \
            --project="$PROJECT_ID" \
            --quiet >/dev/null
        echo -e "  -> Deleted bucket ${CYAN}${BUCKET_ID}${NC}."
    else
        echo -e "  ${YELLOW}-> Bucket ${BUCKET_ID} was not present. Continuing.${NC}"
    fi
else
    echo -e "  -> Kept bucket ${CYAN}${BUCKET_ID}${NC}. Use --delete-bucket only when retained telemetry can be deleted."
fi

echo -e "\n${GREEN}Usage logging rollback completed for ${PROJECT_ID}.${NC}"
