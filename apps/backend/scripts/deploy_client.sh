#!/usr/bin/env bash
set -euo pipefail

# ─────────────────────────────────────────────────────────────────────────────
# Deploy Client Script
# Automates deploying the invoice_scanner backend for a specific client.
#
# Usage: ./deploy_client.sh <projectId> [--only <targets>]
# Example: ./deploy_client.sh finlogia-demo --only functions
# ─────────────────────────────────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

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
  error "Usage: $0 <projectId> [additional firebase deploy args...]"
fi

PROJECT_ID="$1"
shift # Shift so any remaining arguments can be passed to firebase deploy

ENV_FILE="${ROOT_DIR}/functions/.env.${PROJECT_ID}"

if [[ ! -f "$ENV_FILE" ]]; then
  error "Environment file not found for project '${PROJECT_ID}': ${ENV_FILE}\nRun setup_new_client.sh first to provision this client."
fi

info "Deploying client: ${PROJECT_ID}"

# ─── Deploy ──────────────────────────────────────────────────────────────────

cd "$ROOT_DIR"

info "Running firebase deploy --project ${PROJECT_ID} $@"
if firebase deploy --project "$PROJECT_ID" "$@"; then
  echo ""
  success "Client '${PROJECT_ID}' successfully deployed!"
else
  echo ""
  error "Failed to deploy client '${PROJECT_ID}'."
fi
