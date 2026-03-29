#!/bin/bash
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}=== Create Accountant / Employee ===${NC}"
echo -e "Creates a Firebase Auth user and optionally a new Firestore accountant office document.\n"

PROJECT_ID="finlogia-accountant-portal"

echo -e "${YELLOW}Enter the Firebase Project ID [${PROJECT_ID}]:${NC} \c"
read -r INPUT_PROJECT_ID
if [ -n "$INPUT_PROJECT_ID" ]; then
    PROJECT_ID="$INPUT_PROJECT_ID"
fi

if [ -z "$PROJECT_ID" ]; then
    echo -e "${RED}Project ID is required.${NC}"
    exit 1
fi
echo -e "Project: ${CYAN}${PROJECT_ID}${NC}\n"

echo -e "Are you creating a new office or adding an employee to an existing office?"
echo -e "  1) Create a NEW office"
echo -e "  2) Add employee to an EXISTING office"
echo -e "${YELLOW}Select an option (1 or 2):${NC} \c"
read -r OPTION

if [ "$OPTION" != "1" ] && [ "$OPTION" != "2" ]; then
    echo -e "${RED}Invalid option.${NC}"
    exit 1
fi

ACCESS_TOKEN=$(gcloud auth print-access-token || true)
if [ -z "$ACCESS_TOKEN" ]; then
    echo -e "${RED}Failed to get gcloud access token. Are you authenticated? Run: gcloud auth login${NC}"
    exit 1
fi

OFFICE_ID=""
OFFICE_DISPLAY_NAME=""

if [ "$OPTION" == "2" ]; then
    echo -e "\nFetching offices from Firestore..."
    ACCOUNTANTS_JSON=$(curl -s -X GET \
        "https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/accountants" \
        -H "Authorization: Bearer ${ACCESS_TOKEN}" \
        -H "X-Goog-User-Project: ${PROJECT_ID}")
    
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

    if [ -z "$ACCOUNTANTS_LIST" ]; then
        echo -e "${YELLOW}No offices found. Enter the Office ID manually:${NC} \c"
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
        
        echo -e "\n${YELLOW}Select an office (1-$((i-1))) or press Enter to type ID manually:${NC} \c"
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
fi

echo -e "\n${YELLOW}Enter employee email:${NC} \c"
read -r EMAIL
[ -z "$EMAIL" ] && { echo -e "${RED}Email required.${NC}"; exit 1; }

echo -e "${YELLOW}Enter employee display name:${NC} \c"
read -r DISPLAY_NAME
[ -z "$DISPLAY_NAME" ] && { echo -e "${RED}Display name required.${NC}"; exit 1; }

echo -e "${YELLOW}Enter password (min 6 chars):${NC} \c"
read -s PASSWORD
echo ""
[ ${#PASSWORD} -lt 6 ] && { echo -e "${RED}Password must be at least 6 characters.${NC}"; exit 1; }

if [ "$OPTION" == "1" ]; then
    echo -e "${YELLOW}Enter Office Display Name (e.g. Papadopoulos Accounting):${NC} \c"
    read -r OFFICE_DISPLAY_NAME
    [ -z "$OFFICE_DISPLAY_NAME" ] && { echo -e "${RED}Office Display Name required.${NC}"; exit 1; }
fi

echo -e "\nCreating Firebase Auth user..."

RESPONSE=$(curl -s -X POST \
    "https://identitytoolkit.googleapis.com/v1/projects/${PROJECT_ID}/accounts" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H "X-Goog-User-Project: ${PROJECT_ID}" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"${EMAIL}\",\"password\":\"${PASSWORD}\",\"displayName\":\"${DISPLAY_NAME}\"}")

if [[ "$RESPONSE" == *'"localId"'* ]]; then
    ACCOUNTANT_UID=$(node -pe "try { JSON.parse(process.argv[1]).localId || '' } catch(e) { '' }" "$RESPONSE")
    echo -e "  -> ${GREEN}Auth user created${NC}: ${EMAIL} (UID: ${CYAN}${ACCOUNTANT_UID}${NC})"
else
    ERROR_MSG=$(node -pe "try { JSON.parse(process.argv[1]).error.message || '' } catch(e) { '' }" "$RESPONSE")
    if [ -z "$ERROR_MSG" ]; then
        echo -e "  ${RED}Failed. Raw response:${NC}\n$RESPONSE"
    else
        echo -e "  ${RED}Failed: ${ERROR_MSG}${NC}"
    fi
    exit 1
fi

if [ "$OPTION" == "1" ]; then
    OFFICE_ID="office_${ACCOUNTANT_UID}"
    echo -e "  -> ${CYAN}New office detected. Generated Office ID: ${OFFICE_ID}${NC}"
fi

echo -e "\nSetting custom claims (officeId: ${OFFICE_ID})..."
CLAIM_RESPONSE=$(curl -s -X POST \
    "https://identitytoolkit.googleapis.com/v1/projects/${PROJECT_ID}/accounts:update" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H "X-Goog-User-Project: ${PROJECT_ID}" \
    -H "Content-Type: application/json" \
    -d "{\"localId\":\"${ACCOUNTANT_UID}\",\"customAttributes\":\"{\\\"officeId\\\":\\\"${OFFICE_ID}\\\"}\"}")
    
if [[ "$CLAIM_RESPONSE" == *'"localId"'* ]]; then
    echo -e "  -> ${GREEN}Custom claim set successfully.${NC}"
else
    echo -e "  ${RED}Failed to set custom claim. Raw response:${NC}\n$CLAIM_RESPONSE"
    exit 1
fi

if [ "$OPTION" == "1" ]; then
    echo -e "\nCreating Firestore document: accountants/${OFFICE_ID}..."
    TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    FIRESTORE_URL="https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/accountants/${OFFICE_ID}"
    
    FS_RESPONSE=$(curl -s -X PATCH \
        "$FIRESTORE_URL" \
        -H "Authorization: Bearer ${ACCESS_TOKEN}" \
        -H "X-Goog-User-Project: ${PROJECT_ID}" \
        -H "Content-Type: application/json" \
        -d "{
          \"fields\": {
            \"displayName\": { \"stringValue\": \"${OFFICE_DISPLAY_NAME}\" },
            \"createdAt\": { \"timestampValue\": \"${TIMESTAMP}\" },
            \"createdBy\": { \"stringValue\": \"setup-script\" }
          }
        }")
    
    if [[ "$FS_RESPONSE" == *'"error"'* ]]; then
        FS_ERROR=$(node -pe "try { JSON.parse(process.argv[1]).error.message || '' } catch(e) { '' }" "$FS_RESPONSE")
        echo -e "  ${RED}Failed to create Firestore document: ${FS_ERROR}${NC}"
        echo -e "  Raw response: $FS_RESPONSE"
        exit 1
    else
        echo -e "  -> ${GREEN}Firestore document created.${NC}"
    fi
fi

echo -e "\n${GREEN}=== Accountant/Employee Created ===${NC}"
echo -e "  Email:        ${CYAN}${EMAIL}${NC}"
echo -e "  Display Name: ${CYAN}${DISPLAY_NAME}${NC}"
echo -e "  User UID:     ${CYAN}${ACCOUNTANT_UID}${NC}"
echo -e "  Office ID:    ${CYAN}${OFFICE_ID}${NC}"
if [ "$OPTION" == "1" ]; then
    echo -e "  Office Name:  ${CYAN}${OFFICE_DISPLAY_NAME}${NC}"
fi
echo -e "\n${YELLOW}Next:${NC} Assign clients with ${CYAN}npm run register:client${NC}"
