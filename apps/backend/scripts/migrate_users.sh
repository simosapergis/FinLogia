#!/bin/bash
set -e

TARGET_PROJECT="finlogia-mdellatolas"
HASH_ALGO="SCRYPT"
HASH_KEY="UKWARLrEY2jTYDlGVACr1QQl7zW9ed31qStzsO/FuxBq130GtqSr3N8hEwJpFQx7s/aHD41K5eW2zfIKriREIQ=="
SALT_SEPARATOR="Bw=="
ROUNDS="8"
MEM_COST="14"

PROJECTS=(
  "finlogia-amiseli"
  "finlogia-elisavet-kaloumenou"
  "finlogia-ggiannakakis"
  "finlogia-gmavris"
  "finlogia-nvotsis"
  "finlogia-soul-of-tinos"
  "finlogia-zotfos"
)

for PROJECT in "${PROJECTS[@]}"; do
  echo "----------------------------------------"
  echo "Processing $PROJECT..."
  echo "Exporting users..."
  firebase auth:export "${PROJECT}_users.json" --project "$PROJECT"
  
  echo "Importing users to $TARGET_PROJECT..."
  firebase auth:import "${PROJECT}_users.json" \
    --project "$TARGET_PROJECT" \
    --hash-algo="$HASH_ALGO" \
    --hash-key="$HASH_KEY" \
    --salt-separator="$SALT_SEPARATOR" \
    --rounds="$ROUNDS" \
    --mem-cost="$MEM_COST"
done

echo "All users imported successfully."