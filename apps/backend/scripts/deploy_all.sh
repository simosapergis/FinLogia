#!/usr/bin/env bash
set -euo pipefail

# ─────────────────────────────────────────────────────────────────────────────
# Deploy All Clients Script
# Automates deploying the invoice_scanner backend for all configured clients.
# Discovers clients by looking for functions/.env.<projectId> files.
#
# Usage: ./deploy_all.sh
# ─────────────────────────────────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
FUNCTIONS_DIR="${ROOT_DIR}/functions"

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

# ─── Discovery ───────────────────────────────────────────────────────────────

if [[ ! -d "$FUNCTIONS_DIR" ]]; then
  error "Functions directory not found: $FUNCTIONS_DIR"
fi

PROJECT_IDS=()

# Find all .env.* files in functions directory, excluding .env and .env.example
for env_file in "${FUNCTIONS_DIR}"/.env.*; do
  # Skip if no files match the glob
  [ -e "$env_file" ] || continue
  
  filename=$(basename "$env_file")
  
  # Skip .env.example or other non-client env files if any exist
  if [[ "$filename" == ".env.example" ]]; then
    continue
  fi
  
  # Extract projectId (everything after .env.)
  project_id="${filename#.env.}"
  
  if [[ -n "$project_id" ]]; then
    PROJECT_IDS+=("$project_id")
  fi
done

if [[ ${#PROJECT_IDS[@]} -eq 0 ]]; then
  warn "No client environment files found in functions/.env.*"
  exit 0
fi

info "Found ${#PROJECT_IDS[@]} clients to deploy:"
for PROJECT_ID in "${PROJECT_IDS[@]}"; do
  echo " - $PROJECT_ID"
done
echo ""

# ─── Confirmation ────────────────────────────────────────────────────────────

read -p "Are you sure you want to deploy to ALL these clients? (y/N) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    info "Deployment cancelled."
    exit 1
fi

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
