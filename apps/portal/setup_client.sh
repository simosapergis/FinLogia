#!/usr/bin/env bash
set -euo pipefail

# ─────────────────────────────────────────────────────────────────────────────
# Client Setup Script
# Automates adding a new client to the multi-tenant setup:
#   1. Lists Firebase projects so you can pick a project ID
#   2. Prompts for Firebase config JSON
#   3. Appends the config to clients.json
#
# Usage: ./setup_client.sh
# ─────────────────────────────────────────────────────────────────────────────

REGION="europe-west3"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLIENTS_FILE="${SCRIPT_DIR}/clients.json"

# ─── Colors & helpers ─────────────────────────────────────────────────────────

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

info()    { echo -e "${BLUE}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[OK]${NC} $1"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $1"; }
error()   { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# ─── Prerequisites ────────────────────────────────────────────────────────────

for cmd in firebase node jq; do
  if ! command -v "$cmd" &>/dev/null; then
    error "'${cmd}' is required but not found. Please install it first."
  fi
done

if [[ ! -f "$CLIENTS_FILE" ]]; then
  echo "[]" > "$CLIENTS_FILE"
fi

# ─── Input: Project ID ───────────────────────────────────────────────────────

info "Fetching Firebase projects..."
echo ""
firebase projects:list
echo ""

read -rp "Enter the Project ID to setup: " PROJECT_ID
[[ -z "$PROJECT_ID" ]] && error "Project ID cannot be empty."

# Check if project already exists in clients.json
if jq -e ".[] | select(.projectId == \"$PROJECT_ID\")" "$CLIENTS_FILE" > /dev/null; then
  error "Project '$PROJECT_ID' already exists in clients.json."
fi

info "Selected project: ${PROJECT_ID}"

# ─── Input: Firebase config JSON ─────────────────────────────────────────────

echo ""
info "Paste the Firebase config JSON below, then press Enter on an empty line to finish:"
echo ""
CONFIG_JSON=""
while IFS= read -r line; do
  [[ -z "$line" ]] && break
  CONFIG_JSON+="$line"
done

if ! echo "$CONFIG_JSON" | jq empty 2>/dev/null; then
  error "Invalid JSON. Please check the config and try again."
fi

API_KEY=$(echo "$CONFIG_JSON" | jq -r '.apiKey // empty')
AUTH_DOMAIN=$(echo "$CONFIG_JSON" | jq -r '.authDomain // empty')
CONFIG_PROJECT_ID=$(echo "$CONFIG_JSON" | jq -r '.projectId // empty')
STORAGE_BUCKET=$(echo "$CONFIG_JSON" | jq -r '.storageBucket // empty')
MESSAGING_SENDER_ID=$(echo "$CONFIG_JSON" | jq -r '.messagingSenderId // empty')
APP_ID=$(echo "$CONFIG_JSON" | jq -r '.appId // empty')

for field in API_KEY AUTH_DOMAIN CONFIG_PROJECT_ID STORAGE_BUCKET MESSAGING_SENDER_ID APP_ID; do
  if [[ -z "${!field}" ]]; then
    error "Missing required field in config JSON. Could not extract: ${field}"
  fi
done

if [[ "$CONFIG_PROJECT_ID" != "$PROJECT_ID" ]]; then
  error "Config projectId '${CONFIG_PROJECT_ID}' does not match selected project '${PROJECT_ID}'."
fi

CLIENT_SLUG="${PROJECT_ID#finlogia-}"
VITE_CLIENT_NAME=$(echo "$CLIENT_SLUG" | tr '-' ' ' | awk '{for(i=1;i<=NF;i++) $i=toupper(substr($i,1,1)) tolower(substr($i,2))}1')

success "Config parsed — project: ${PROJECT_ID}, client name: ${VITE_CLIENT_NAME}"

# ─── Append to clients.json ──────────────────────────────────────────────────

info "Adding client to clients.json..."

# Create a temporary file
TMP_FILE=$(mktemp)

# Append the new client to the array
jq --arg projectId "$PROJECT_ID" \
   --arg appId "$APP_ID" \
   --arg storageBucket "$STORAGE_BUCKET" \
   --arg apiKey "$API_KEY" \
   --arg authDomain "$AUTH_DOMAIN" \
   --arg messagingSenderId "$MESSAGING_SENDER_ID" \
   --arg projectNumber "$MESSAGING_SENDER_ID" \
   --arg version "2" \
   '. += [{
     projectId: $projectId,
     appId: $appId,
     storageBucket: $storageBucket,
     apiKey: $apiKey,
     authDomain: $authDomain,
     messagingSenderId: $messagingSenderId,
     projectNumber: $projectNumber,
     version: $version
   }]' "$CLIENTS_FILE" > "$TMP_FILE"

mv "$TMP_FILE" "$CLIENTS_FILE"

success "Client '${PROJECT_ID}' added to clients.json!"
echo ""

read -rp "Do you want to deploy to ${PROJECT_ID} now? (y/N): " deploy_choice
if [[ "$deploy_choice" == "y" || "$deploy_choice" == "Y" ]]; then
  echo ""
  SKIP_VERSION_BUMP=1 "${SCRIPT_DIR}/deploy_client.sh" "$PROJECT_ID"
else
  info "To deploy this client later, run: ./deploy_client.sh ${PROJECT_ID}"
  echo ""
fi
