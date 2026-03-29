#!/usr/bin/env bash
set -euo pipefail

# ─────────────────────────────────────────────────────────────────────────────
# Deploy Some Clients Script
# Automates deploying the invoice_scanner backend for a specific list of clients.
#
# Usage: ./deploy_some.sh <projectId1> <projectId2> ...
# Example: ./deploy_some.sh finlogia-demo finlogia-amiseli
# ─────────────────────────────────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ─── Colors & helpers ─────────────────────────────────────────────────────────

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

info()    { echo -e "${BLUE}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[OK]${NC} $1"; }
error()   { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# ─── Input ───────────────────────────────────────────────────────────────────

if [ "$#" -lt 1 ]; then
  error "Usage: $0 <projectId1> [<projectId2> ...]"
fi

PROJECT_IDS=("$@")

info "Found ${#PROJECT_IDS[@]} clients to deploy:"
for PROJECT_ID in "${PROJECT_IDS[@]}"; do
  echo " - $PROJECT_ID"
done
echo ""

# ─── Parallel Deployment ──────────────────────────────────────────────────────

TOTAL_COUNT=${#PROJECT_IDS[@]}
info "Starting parallel deployment for $TOTAL_COUNT clients..."

PIDS=()
LOGS=()

for PROJECT_ID in "${PROJECT_IDS[@]}"; do
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
  
  PROJECT_ID="${PROJECT_IDS[$i]}"
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
