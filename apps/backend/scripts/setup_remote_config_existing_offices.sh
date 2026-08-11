#!/bin/bash
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
CLIENTS_JSON="${BACKEND_DIR}/../portal/clients.json"

usage() {
    cat <<EOF
Usage: ./scripts/setup_remote_config_existing_offices.sh [project-id ...] [-- setup-options]

Runs Remote Config provisioning for existing accounting-office projects.

Examples:
  ./scripts/setup_remote_config_existing_offices.sh finlogia-demo
  ./scripts/setup_remote_config_existing_offices.sh finlogia-demo finlogia-mdellatolas
  ./scripts/setup_remote_config_existing_offices.sh
  ./scripts/setup_remote_config_existing_offices.sh -- --telemetry-enabled false

When no project IDs are supplied, projects are read from:
  ${CLIENTS_JSON}

Any arguments after "--" are passed to setup_remote_config.sh.
EOF
}

if [ "${1:-}" = "-h" ] || [ "${1:-}" = "--help" ]; then
    usage
    exit 0
fi

PROJECTS=()
PASSTHROUGH=()
COLLECT_PASSTHROUGH=false

while [ $# -gt 0 ]; do
    if [ "$1" = "--" ]; then
        COLLECT_PASSTHROUGH=true
        shift
        continue
    fi

    if [ "$COLLECT_PASSTHROUGH" = true ]; then
        PASSTHROUGH+=("$1")
    else
        PROJECTS+=("$1")
    fi
    shift
done

if [ "${#PROJECTS[@]}" -eq 0 ]; then
    if [ ! -f "$CLIENTS_JSON" ]; then
        echo -e "${RED}No project IDs supplied and clients.json was not found: ${CLIENTS_JSON}${NC}"
        exit 1
    fi
    if ! command -v jq >/dev/null 2>&1; then
        echo -e "${RED}jq is required when no project IDs are supplied.${NC}"
        echo -e "${YELLOW}Install jq or pass project IDs explicitly, for example:${NC}"
        echo -e "${CYAN}./scripts/setup_remote_config_existing_offices.sh finlogia-demo${NC}"
        exit 1
    fi
    while IFS= read -r PROJECT_ID; do
        [ -n "$PROJECT_ID" ] && PROJECTS+=("$PROJECT_ID")
    done < <(jq -r '.[].projectId' "$CLIENTS_JSON")
fi

if [ "${#PROJECTS[@]}" -eq 0 ]; then
    echo -e "${RED}No project IDs found.${NC}"
    exit 1
fi

echo -e "${CYAN}=== Existing Office Remote Config Rollout ===${NC}"
printf "Projects:\n"
printf "  - %s\n" "${PROJECTS[@]}"

for PROJECT_ID in "${PROJECTS[@]}"; do
    echo -e "\n${CYAN}--- ${PROJECT_ID} ---${NC}"
    if [ "${#PASSTHROUGH[@]}" -gt 0 ]; then
        "${SCRIPT_DIR}/setup_remote_config.sh" "$PROJECT_ID" "${PASSTHROUGH[@]}"
    else
        "${SCRIPT_DIR}/setup_remote_config.sh" "$PROJECT_ID"
    fi
done

echo -e "\n${GREEN}Remote Config telemetry switch configured for ${#PROJECTS[@]} project(s).${NC}"
