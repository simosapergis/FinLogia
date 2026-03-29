#!/usr/bin/env bash
set -euo pipefail

# ─────────────────────────────────────────────────────────────────────────────
# Deploy Some Clients Script
# Automates building and deploying the FinLogia PWA for a specific list of clients.
#
# Usage: ./deploy_some.sh <projectId1> <projectId2> ...
# Example: ./deploy_some.sh finlogia-demo finlogia-amiseli
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

# ─── Input ───────────────────────────────────────────────────────────────────

if [ "$#" -lt 1 ]; then
  error "Usage: $0 <projectId1> [<projectId2> ...]"
fi

if [[ ! -f "$CLIENTS_FILE" ]]; then
  error "clients.json not found. Run ./setup_client.sh first."
fi

PROJECT_IDS=("$@")
VALID_PROJECTS=()

# Validate projects exist in clients.json
for PROJECT_ID in "${PROJECT_IDS[@]}"; do
  if jq -e ".[] | select(.projectId == \"$PROJECT_ID\")" "$CLIENTS_FILE" > /dev/null; then
    VALID_PROJECTS+=("$PROJECT_ID")
  else
    warn "Project '$PROJECT_ID' not found in clients.json. Skipping."
  fi
done

if [[ ${#VALID_PROJECTS[@]} -eq 0 ]]; then
  error "No valid projects provided to deploy."
fi

info "Found ${#VALID_PROJECTS[@]} clients to deploy:"
for PROJECT_ID in "${VALID_PROJECTS[@]}"; do
  echo " - $PROJECT_ID"
done
echo ""

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

TOTAL_COUNT=${#VALID_PROJECTS[@]}
info "Starting parallel deployment for $TOTAL_COUNT clients..."

PIDS=()
LOGS=()

for PROJECT_ID in "${VALID_PROJECTS[@]}"; do
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
  
  PROJECT_ID="${VALID_PROJECTS[$i]}"
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
