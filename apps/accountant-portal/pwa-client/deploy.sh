#!/bin/bash
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
NC='\033[0m'

MODE="${1:-staging}"

echo -e "${CYAN}=== FinLogia Accountant Portal — Deploy ===${NC}"
echo -e "Mode: ${YELLOW}${MODE}${NC}\n"

if [[ "${SKIP_VERSION_BUMP:-0}" != "1" ]]; then
  "$(dirname "$0")/../bump_version.sh"
fi

echo -e "[1/4] Running tests..."
npx vitest run
echo -e "${GREEN}Tests passed.${NC}\n"

echo -e "[2/4] Type-checking..."
npx vue-tsc --noEmit
echo -e "${GREEN}Type check passed.${NC}\n"

echo -e "[3/4] Building..."
npx vite build
echo -e "${GREEN}Build complete.${NC}\n"

echo -e "[4/4] Deploying..."
if [ "$MODE" = "production" ]; then
  echo -e "${RED}WARNING: You are deploying to PRODUCTION.${NC}"
  echo -e "Press Enter to continue or Ctrl+C to abort..."
  read -r
  firebase deploy --only hosting
  echo -e "\n${GREEN}Production deploy complete!${NC}"
elif [ "$MODE" = "staging" ]; then
  firebase hosting:channel:deploy staging --expires 7d
  echo -e "\n${GREEN}Staging preview channel deployed (expires in 7 days).${NC}"
else
  echo -e "${RED}Unknown mode: ${MODE}. Use 'production' or 'staging'.${NC}"
  exit 1
fi
