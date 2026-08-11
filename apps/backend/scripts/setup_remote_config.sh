#!/bin/bash
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
NC='\033[0m'

TELEMETRY_PARAM="telemetry_enabled"
DEFAULT_TELEMETRY_ENABLED="true"

usage() {
    cat <<EOF
Usage: ./scripts/setup_remote_config.sh <project-id> [options]

Creates or updates the Firebase Remote Config parameter used by FinLogia usage telemetry.

Options:
  --telemetry-enabled <true|false>  Default value for telemetry_enabled. Default: ${DEFAULT_TELEMETRY_ENABLED}
  -h, --help                        Show this help.

Required caller IAM on the target project:
  roles/cloudconfig.admin

If the script needs to grant runtime access, the caller also needs permission to update project IAM policy.
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
TELEMETRY_ENABLED="${TELEMETRY_ENABLED:-$DEFAULT_TELEMETRY_ENABLED}"

while [ $# -gt 0 ]; do
    case "$1" in
        --telemetry-enabled)
            TELEMETRY_ENABLED="${2:-}"
            shift 2
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

if [ "$TELEMETRY_ENABLED" != "true" ] && [ "$TELEMETRY_ENABLED" != "false" ]; then
    echo -e "${RED}--telemetry-enabled must be true or false.${NC}"
    exit 1
fi

for CMD in gcloud curl jq; do
    if ! command -v "$CMD" >/dev/null 2>&1; then
        echo -e "${RED}${CMD} is required.${NC}"
        exit 1
    fi
done

echo -e "${CYAN}=== FinLogia Remote Config Setup ===${NC}"
echo -e "Project:              ${CYAN}${PROJECT_ID}${NC}"
echo -e "Parameter:            ${CYAN}${TELEMETRY_PARAM}${NC}"
echo -e "telemetry_enabled:    ${CYAN}${TELEMETRY_ENABLED}${NC}"

ACTIVE_ACCOUNT=$(gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>/dev/null | head -n 1 || true)
if [ -n "$ACTIVE_ACCOUNT" ]; then
    echo -e "Active account:       ${CYAN}${ACTIVE_ACCOUNT}${NC}"
fi

echo -e "\n[1/4] Verifying project and enabling Remote Config APIs..."
gcloud projects describe "$PROJECT_ID" >/dev/null
gcloud services enable \
    firebaseremoteconfig.googleapis.com \
    firebaseinstallations.googleapis.com \
    --project="$PROJECT_ID" \
    --quiet >/dev/null

TOKEN="$(gcloud auth print-access-token)"
REMOTE_CONFIG_URL="https://firebaseremoteconfig.googleapis.com/v1/projects/${PROJECT_ID}/remoteConfig"
HEADERS_FILE="$(mktemp)"
TEMPLATE_FILE="$(mktemp)"
UPDATED_TEMPLATE_FILE="$(mktemp)"
trap 'rm -f "$HEADERS_FILE" "$TEMPLATE_FILE" "$UPDATED_TEMPLATE_FILE"' EXIT

echo -e "[2/4] Fetching current Remote Config template..."
HTTP_STATUS=$(curl -sS -D "$HEADERS_FILE" -o "$TEMPLATE_FILE" -w "%{http_code}" \
    "$REMOTE_CONFIG_URL" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "X-Goog-User-Project: ${PROJECT_ID}")

if [ "$HTTP_STATUS" = "404" ]; then
    echo '{"parameters":{}}' > "$TEMPLATE_FILE"
    ETAG="*"
elif [ "$HTTP_STATUS" -ge 200 ] && [ "$HTTP_STATUS" -lt 300 ]; then
    ETAG=$(awk 'tolower($1) == "etag:" {print $2}' "$HEADERS_FILE" | tr -d '\r' | tail -n 1)
    if [ -z "$ETAG" ]; then
        ETAG="*"
    fi
else
    echo -e "${RED}Failed to fetch Remote Config template. HTTP ${HTTP_STATUS}.${NC}"
    cat "$TEMPLATE_FILE"
    exit 1
fi

echo -e "[3/4] Creating or updating ${TELEMETRY_PARAM}..."
jq \
    --arg enabled "$TELEMETRY_ENABLED" \
    --arg description "Controls FinLogia usage telemetry emission. true logs usage_event entries; false skips telemetry without changing app behavior." \
    '.parameters = (.parameters // {}) |
     .parameters.telemetry_enabled = {
       "defaultValue": { "value": $enabled },
       "description": $description,
       "valueType": "BOOLEAN"
     }' \
    "$TEMPLATE_FILE" > "$UPDATED_TEMPLATE_FILE"

curl -fsS -X PUT "$REMOTE_CONFIG_URL" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "X-Goog-User-Project: ${PROJECT_ID}" \
    -H "Content-Type: application/json; UTF-8" \
    -H "If-Match: ${ETAG}" \
    --data-binary "@${UPDATED_TEMPLATE_FILE}" >/dev/null

echo -e "  -> Remote Config parameter updated."

echo -e "[4/4] Granting Cloud Functions runtime read access..."
SA_EMAIL=$(gcloud iam service-accounts list \
    --project "$PROJECT_ID" \
    --format="value(email)" \
    --filter="email:firebase-adminsdk" \
    | head -n 1 || true)

if [ -n "$SA_EMAIL" ]; then
    gcloud projects add-iam-policy-binding "$PROJECT_ID" \
        --member="serviceAccount:${SA_EMAIL}" \
        --role="roles/cloudconfig.viewer" \
        --condition=None \
        --quiet >/dev/null
    echo -e "  -> Granted roles/cloudconfig.viewer to ${CYAN}${SA_EMAIL}${NC}."
else
    echo -e "  ${YELLOW}-> Firebase Admin SDK service account not found. Grant roles/cloudconfig.viewer after it exists.${NC}"
fi

echo -e "\n${GREEN}Remote Config telemetry switch is configured for ${PROJECT_ID}.${NC}"
echo -e "Toggle without deployment with:"
echo -e "${CYAN}./scripts/set_telemetry_enabled.sh ${PROJECT_ID} false${NC}"
echo -e "${CYAN}./scripts/set_telemetry_enabled.sh ${PROJECT_ID} true${NC}"
