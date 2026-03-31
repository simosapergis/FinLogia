#!/bin/bash
set -e

TARGET_PROJECT="finlogia-mdellatolas"

PROJECTS=(
  "finlogia-amiseli"
  "finlogia-elisavet-kaloumenou"
  "finlogia-ggiannakakis"
  "finlogia-gmavris"
  "finlogia-nvotsis"
  "finlogia-zotfos"
)

for PROJECT in "${PROJECTS[@]}"; do
  echo "----------------------------------------"
  echo "Migrating data for $PROJECT..."
  GOOGLE_APPLICATION_CREDENTIALS="" node /Users/Shared/side_projects/FinLogia/apps/backend/scripts/migrate_cross_project.js "$PROJECT" "$TARGET_PROJECT" "$PROJECT"
done

echo "All data migrated successfully."