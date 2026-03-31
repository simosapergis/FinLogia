#!/bin/bash
set -e

TARGET_PROJECT="finlogia-mdellatolas"

PROJECTS=(
  "finlogia-amiseli"
  "finlogia-elisavet-kaloumenou"
  "finlogia-ggiannakakis"
  "finlogia-gmavris"
  "finlogia-nvotsis"
)

ACCESS_TOKEN=$(gcloud auth print-access-token)

for PROJECT in "${PROJECTS[@]}"; do
  echo "----------------------------------------"
  echo "Fetching config for $PROJECT..."
  
  CONFIG_JSON=$(curl -s -X GET \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H "x-goog-user-project: ${PROJECT}" \
    "https://identitytoolkit.googleapis.com/admin/v2/projects/${PROJECT}/config")
  
  SIGNER_KEY=$(echo "$CONFIG_JSON" | grep -o '"signerKey": *"[^"]*"' | cut -d'"' -f4)
  
  if [ -z "$SIGNER_KEY" ]; then
    echo "Could not find signerKey for $PROJECT. Skipping."
    continue
  fi
  
  echo "Found signerKey: $SIGNER_KEY"
  
  echo "Importing users to $TARGET_PROJECT..."
  firebase auth:import "${PROJECT}_users.json" \
    --project "$TARGET_PROJECT" \
    --hash-algo="SCRYPT" \
    --hash-key="$SIGNER_KEY" \
    --salt-separator="Bw==" \
    --rounds="8" \
    --mem-cost="14"
done

echo "All users re-imported successfully with correct hash keys."