#!/usr/bin/env bash
set -euo pipefail

# ─────────────────────────────────────────────────────────────────────────────
# Deploy All Clients Script
# Automates building and deploying the FinLogia PWA for all clients in clients.json
#
# Usage: ./deploy_all.sh
# ─────────────────────────────────────────────────────────────────────────────

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

if [[ ! -f "$CLIENTS_FILE" ]]; then
  error "clients.json not found. Run ./setup_client.sh first."
fi

# Get all project IDs
PROJECT_IDS=$(jq -r '.[].projectId' "$CLIENTS_FILE")

if [[ -z "$PROJECT_IDS" ]]; then
  warn "No clients found in clients.json."
  exit 0
fi

info "Found the following clients to deploy:"
echo "$PROJECT_IDS"
echo ""

read -p "Are you sure you want to deploy to ALL these clients? (y/N) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    info "Deployment cancelled."
    exit 1
fi

# ─── Version Bump & Pre-Deployment Checks ─────────────────────────────────────

"${SCRIPT_DIR}/bump_version.sh"
export SKIP_VERSION_BUMP=1

PWA_DIR="${SCRIPT_DIR}/pwa-client"

info "Running tests..."
if (cd "$PWA_DIR" && npm run test:run); then
  success "Tests passed"
else
  error "Tests failed. Fix failing tests before deploying."
fi

info "Running TypeScript type check..."
if (cd "$PWA_DIR" && npx vue-tsc --noEmit); then
  success "Type check passed"
else
  error "Type check failed. Fix TypeScript errors before deploying."
fi

# ─── Parallel Deployment ──────────────────────────────────────────────────────

PROJECT_IDS_ARRAY=($PROJECT_IDS)
TOTAL_COUNT=${#PROJECT_IDS_ARRAY[@]}

info "Starting parallel deployment for $TOTAL_COUNT clients..."

PIDS=()
LOGS=()

for PROJECT_ID in "${PROJECT_IDS_ARRAY[@]}"; do
  LOG_FILE=$(mktemp "/tmp/deploy_${PROJECT_ID}.XXXXXX")
  LOGS+=("$LOG_FILE")
  
  info "Queuing deployment for $PROJECT_ID..."
  "${SCRIPT_DIR}/deploy_client.sh" "$PROJECT_ID" > "$LOG_FILE" 2>&1 &
  PIDS+=($!)
done

info "Waiting for all deployments to finish..."

SUCCESS_COUNT=0
FAILED_PROJECTS=()

for i in "${!PIDS[@]}"; do
  EXIT_CODE=0
  wait "${PIDS[$i]}" || EXIT_CODE=$?
  
  PROJECT_ID="${PROJECT_IDS_ARRAY[$i]}"
  LOG_FILE="${LOGS[$i]}"

  if [ $EXIT_CODE -eq 0 ]; then
    SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
    success "Client '$PROJECT_ID' deployed successfully."
  else
    echo -e "${RED}[ERROR]${NC} Client '$PROJECT_ID' failed to deploy. Log output:"
    cat "$LOG_FILE"
    FAILED_PROJECTS+=("$PROJECT_ID")
  fi
  rm -f "$LOG_FILE"
done

echo ""
if [ $SUCCESS_COUNT -eq $TOTAL_COUNT ]; then
  success "$SUCCESS_COUNT/$TOTAL_COUNT clients deployed successfully!"
else
  warn "$SUCCESS_COUNT/$TOTAL_COUNT clients deployed successfully."
  echo -e "${RED}[ERROR]${NC} Failed clients: ${FAILED_PROJECTS[*]}"
  exit 1
fi
