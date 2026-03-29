#!/usr/bin/env bash
set -euo pipefail

# ─────────────────────────────────────────────────────────────────────────────
# Version Bump Script
# Reads current version from pwa-client/package.json, calculates next patch,
# and prompts user to bump or enter a custom version.
# ─────────────────────────────────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PWA_DIR="${SCRIPT_DIR}/pwa-client"
PACKAGE_JSON="${PWA_DIR}/package.json"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

info()    { echo -e "${BLUE}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[OK]${NC} $1"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $1"; }
error()   { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# Check if jq is installed
if ! command -v jq &> /dev/null; then
  error "jq is required but not found. Please install it."
fi

# Get current version
CURRENT_VERSION=$(jq -r '.version' "$PACKAGE_JSON")
if [[ -z "$CURRENT_VERSION" || "$CURRENT_VERSION" == "null" ]]; then
  error "Could not read version from $PACKAGE_JSON"
fi

# Calculate next patch version
IFS='.' read -r major minor patch <<< "$CURRENT_VERSION"
NEXT_PATCH=$((patch + 1))
NEXT_VERSION="${major}.${minor}.${NEXT_PATCH}"

echo ""
info "Current version is: ${CURRENT_VERSION}"
read -rp "Bump to ${NEXT_VERSION}? [Y/n/custom]: " choice

if [[ -z "$choice" || "$choice" == "y" || "$choice" == "Y" ]]; then
  TARGET_VERSION="$NEXT_VERSION"
elif [[ "$choice" == "n" || "$choice" == "N" ]]; then
  info "Skipping version bump."
  exit 0
else
  # Validate custom version format (x.y.z)
  if [[ ! "$choice" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    error "Invalid version format. Must be x.y.z (e.g., 1.2.3)"
  fi
  TARGET_VERSION="$choice"
fi

info "Bumping version to ${TARGET_VERSION}..."

# Update package.json using npm
(cd "$PWA_DIR" && npm version "$TARGET_VERSION" --no-git-tag-version)

# Automatically commit the version bump
info "Committing version bump..."
git add "${PWA_DIR}/package.json" "${PWA_DIR}/package-lock.json"
git commit -m "chore: bump version to ${TARGET_VERSION}" > /dev/null

success "Version updated to ${TARGET_VERSION} and committed."
echo ""