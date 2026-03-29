#!/bin/bash
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}=== Register FinLogia Client ===${NC}"
echo -e "Assigns a FinLogia client project to an accountant.\n"

ACCOUNTANT_PROJECT_ID="finlogia-accountant-portal"

echo -e "${YELLOW}Enter the accountant portal Project ID [${ACCOUNTANT_PROJECT_ID}]:${NC} \c"
read -r INPUT_PROJECT_ID
if [ -n "$INPUT_PROJECT_ID" ]; then
    ACCOUNTANT_PROJECT_ID="$INPUT_PROJECT_ID"
fi

if [ -z "$ACCOUNTANT_PROJECT_ID" ]; then
    echo -e "${RED}Accountant Project ID is required.${NC}"
    exit 1
fi
echo -e "Accountant Project: ${CYAN}${ACCOUNTANT_PROJECT_ID}${NC}\n"

echo -e "Fetching offices from Firestore..."
ACCESS_TOKEN=$(gcloud auth print-access-token 2>/dev/null || true)
if [ -n "$ACCESS_TOKEN" ]; then
    ACCOUNTANTS_JSON=$(curl -s -X GET \
        "https://firestore.googleapis.com/v1/projects/${ACCOUNTANT_PROJECT_ID}/databases/(default)/documents/accountants" \
        -H "Authorization: Bearer ${ACCESS_TOKEN}")
    
    ACCOUNTANTS_LIST=$(node -pe "
        try {
            const data = JSON.parse(process.argv[1]);
            if (!data.documents) process.exit(0);
            data.documents.map(doc => {
                const id = doc.name.split('/').pop();
                const name = doc.fields.displayName?.stringValue || 'N/A';
                return \`\${id}|\${name}\`;
            }).join('\n');
        } catch(e) { '' }
    " "$ACCOUNTANTS_JSON")
else
    ACCOUNTANTS_LIST=""
fi

if [ -z "$ACCOUNTANTS_LIST" ]; then
    echo -e "${YELLOW}No offices found or could not fetch. Enter the Office ID manually:${NC} \c"
    read -r OFFICE_ID
else
    echo -e "\n${CYAN}Available Offices:${NC}"
    echo -e "  #) Name                           | Office ID"
    echo -e "  --------------------------------------------------------------------------------"
    
    IFS=$'\n' read -rd '' -a ACCOUNTANT_LINES <<<"$ACCOUNTANTS_LIST" || true
    if [ ${#ACCOUNTANT_LINES[@]} -eq 0 ] && [ -n "$ACCOUNTANTS_LIST" ]; then
        ACCOUNTANT_LINES=("$ACCOUNTANTS_LIST")
    fi
    
    i=1
    declare -a UIDS
    for line in "${ACCOUNTANT_LINES[@]}"; do
        IFS='|' read -r uid name <<< "$line"
        UIDS[$i]=$uid
        printf "  %d) %-30s | %s\n" "$i" "$name" "$uid"
        ((i++))
    done
    
    echo -e "\n${YELLOW}Select an office (1-$((i-1))) or press Enter to type Office ID manually:${NC} \c"
    read -r SELECTION
    
    if [[ "$SELECTION" =~ ^[0-9]+$ ]] && [ "$SELECTION" -ge 1 ] && [ "$SELECTION" -lt "$i" ]; then
        OFFICE_ID="${UIDS[$SELECTION]}"
        echo -e "Selected Office ID: ${CYAN}${OFFICE_ID}${NC}\n"
    else
        echo -e "${YELLOW}Enter the Office ID:${NC} \c"
        read -r OFFICE_ID
    fi
fi

[ -z "$OFFICE_ID" ] && { echo -e "${RED}Office ID required.${NC}"; exit 1; }

echo -e "${YELLOW}Enter the FinLogia client Project ID:${NC} \c"
read -r CLIENT_PROJECT_ID
[ -z "$CLIENT_PROJECT_ID" ] && { echo -e "${RED}Client Project ID required.${NC}"; exit 1; }

echo -e "${YELLOW}Enter client display name (business name):${NC} \c"
read -r CLIENT_DISPLAY_NAME
[ -z "$CLIENT_DISPLAY_NAME" ] && CLIENT_DISPLAY_NAME="$CLIENT_PROJECT_ID"

# ── Grant IAM (idempotent) ──────────────────────────────────────────────────

echo -e "\nGranting cross-project IAM access..."

SA_EMAIL=$(gcloud iam service-accounts list --project "$ACCOUNTANT_PROJECT_ID" --format="value(email)" --filter="email:firebase-adminsdk")
if [ -z "$SA_EMAIL" ]; then
    echo -e "${RED}Firebase Admin SDK SA not found in ${ACCOUNTANT_PROJECT_ID}.${NC}"
    exit 1
fi
echo -e "  SA: ${CYAN}${SA_EMAIL}${NC}"

echo -e "  -> Granting roles/datastore.viewer on ${CLIENT_PROJECT_ID}..."
gcloud projects add-iam-policy-binding "$CLIENT_PROJECT_ID" \
    --member="serviceAccount:${SA_EMAIL}" \
    --role="roles/datastore.viewer" \
    --condition=None --quiet 2>/dev/null || echo -e "  ${YELLOW}(already granted or warning)${NC}"

echo -e "  -> Granting roles/storage.objectViewer on ${CLIENT_PROJECT_ID}..."
gcloud projects add-iam-policy-binding "$CLIENT_PROJECT_ID" \
    --member="serviceAccount:${SA_EMAIL}" \
    --role="roles/storage.objectViewer" \
    --condition=None --quiet 2>/dev/null || echo -e "  ${YELLOW}(already granted or warning)${NC}"

# ── Resolve bucket name ──────────────────────────────────────────────────────

# Try to guess the bucket name
GUESSED_BUCKET="${CLIENT_PROJECT_ID}.appspot.com"
if ! gsutil ls "gs://${GUESSED_BUCKET}" 2>/dev/null; then
    GUESSED_BUCKET="${CLIENT_PROJECT_ID}.firebasestorage.app"
fi

echo -e "\n${YELLOW}Enter the client's Firebase Storage bucket name [${GUESSED_BUCKET}]:${NC} \c"
read -r BUCKET_NAME
if [ -z "$BUCKET_NAME" ]; then
    BUCKET_NAME="$GUESSED_BUCKET"
fi

echo -e "  -> Bucket: ${CYAN}${BUCKET_NAME}${NC}"

# ── Create Firestore mapping ──────────────────────────────────────────────────

echo -e "\nCreating Firestore mapping: accountants/${OFFICE_ID}/clients/${CLIENT_PROJECT_ID}..."
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
FS_RESPONSE=$(curl -s -X PATCH \
    "https://firestore.googleapis.com/v1/projects/${ACCOUNTANT_PROJECT_ID}/databases/(default)/documents/accountants/${OFFICE_ID}/clients/${CLIENT_PROJECT_ID}" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "{
      \"fields\": {
        \"projectId\": { \"stringValue\": \"${CLIENT_PROJECT_ID}\" },
        \"displayName\": { \"stringValue\": \"${CLIENT_DISPLAY_NAME}\" },
        \"bucketName\": { \"stringValue\": \"${BUCKET_NAME}\" },
        \"addedAt\": { \"timestampValue\": \"${TIMESTAMP}\" },
        \"addedBy\": { \"stringValue\": \"setup-script\" }
      }
    }")

if [[ "$FS_RESPONSE" == *'"error"'* ]]; then
    FS_ERROR=$(node -pe "try { JSON.parse(process.argv[1]).error.message || '' } catch(e) { '' }" "$FS_RESPONSE")
    echo -e "  ${RED}Failed to create Firestore mapping: ${FS_ERROR}${NC}"
    echo -e "  Raw response: $FS_RESPONSE"
    exit 1
else
    echo -e "  -> ${GREEN}Firestore mapping created.${NC}"
fi

echo -e "\n${GREEN}=== Client Registered ===${NC}"
echo -e "  Client:      ${CYAN}${CLIENT_DISPLAY_NAME}${NC} (${CLIENT_PROJECT_ID})"
echo -e "  Office ID:   ${CYAN}${OFFICE_ID}${NC}"
echo -e "  Bucket:      ${CYAN}${BUCKET_NAME}${NC}"
echo -e "\nThe office employees can now see this client's invoices in the portal."
