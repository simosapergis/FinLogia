#!/bin/bash
set -euo pipefail

RED='\033[0;31m'
NC='\033[0m'

usage() {
    cat <<EOF
Usage: ./scripts/set_telemetry_enabled.sh <project-id> <true|false>

Enables or disables FinLogia usage telemetry through Firebase Remote Config without deployment.
EOF
}

if [ "${1:-}" = "-h" ] || [ "${1:-}" = "--help" ]; then
    usage
    exit 0
fi

if [ $# -ne 2 ]; then
    usage
    exit 1
fi

PROJECT_ID="$1"
TELEMETRY_ENABLED="$2"

if [ "$TELEMETRY_ENABLED" != "true" ] && [ "$TELEMETRY_ENABLED" != "false" ]; then
    echo -e "${RED}telemetry value must be true or false.${NC}"
    exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
"${SCRIPT_DIR}/setup_remote_config.sh" "$PROJECT_ID" --telemetry-enabled "$TELEMETRY_ENABLED"
