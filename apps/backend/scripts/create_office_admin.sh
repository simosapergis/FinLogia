#!/bin/bash
set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}=== Create Accounting Office Admin ===${NC}"

if [ -z "$1" ]; then
    echo -e "${YELLOW}Usage: ./create_office_admin.sh <project-id>${NC}"
    exit 1
fi

PROJECT_ID=$1

echo -e "${YELLOW}Enter admin email:${NC} \c"
read -r EMAIL
echo -e "${YELLOW}Enter admin password (min 6 chars):${NC} \c"
read -s PASSWORD
echo ""
echo -e "${YELLOW}Enter admin display name (e.g. 'John Doe'):${NC} \c"
read -r DISPLAY_NAME

if [ -z "$EMAIL" ] || [ -z "$PASSWORD" ]; then
    echo -e "${RED}Email and password are required. Exiting.${NC}"
    exit 1
fi

echo -e "\n[1/3] Creating Firebase Auth user..."
ACCESS_TOKEN=$(gcloud auth print-access-token)

# 1. Create User
CREATE_RESPONSE=$(curl -s -X POST \
    "https://identitytoolkit.googleapis.com/v1/projects/${PROJECT_ID}/accounts" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H "X-Goog-User-Project: ${PROJECT_ID}" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"${EMAIL}\",\"password\":\"${PASSWORD}\",\"displayName\":\"${DISPLAY_NAME}\"}")

LOCAL_ID=$(echo "$CREATE_RESPONSE" | grep -o '"localId": *"[^"]*"' | cut -d'"' -f4)

if [ -z "$LOCAL_ID" ]; then
    # If user exists, we get an error. Try to look them up.
    ERROR_MSG=$(echo "$CREATE_RESPONSE" | grep -o '"message": *"[^"]*"' | cut -d'"' -f4)
    if [[ "$ERROR_MSG" == *"EMAIL_EXISTS"* ]]; then
        echo -e "  -> User already exists. Looking up UID..."
        LOOKUP_RESPONSE=$(curl -s -X POST \
            "https://identitytoolkit.googleapis.com/v1/projects/${PROJECT_ID}/accounts:lookup" \
            -H "Authorization: Bearer ${ACCESS_TOKEN}" \
            -H "X-Goog-User-Project: ${PROJECT_ID}" \
            -H "Content-Type: application/json" \
            -d "{\"email\":[\"${EMAIL}\"]}")
        LOCAL_ID=$(echo "$LOOKUP_RESPONSE" | grep -o '"localId": *"[^"]*"' | cut -d'"' -f4)
    else
        echo -e "${RED}Failed to create user: ${ERROR_MSG:-unknown error}${NC}"
        exit 1
    fi
fi

if [ -z "$LOCAL_ID" ]; then
    echo -e "${RED}Failed to extract UID. User creation may have failed.${NC}"
    exit 1
fi

echo -e "  -> User UID: ${CYAN}${LOCAL_ID}${NC}"

echo -e "\n[2/3] Setting Custom Claims (isAccountant: true)..."
CLAIMS_PAYLOAD="{\"isAccountant\":true,\"role\":\"admin\"}"
ESCAPED_CLAIMS=$(echo "$CLAIMS_PAYLOAD" | sed 's/"/\\"/g')

curl -s -X POST \
    "https://identitytoolkit.googleapis.com/v1/projects/${PROJECT_ID}/accounts:update" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H "X-Goog-User-Project: ${PROJECT_ID}" \
    -H "Content-Type: application/json" \
    -d "{\"localId\":\"${LOCAL_ID}\",\"customAttributes\":\"${ESCAPED_CLAIMS}\"}" > /dev/null

echo -e "  -> Custom claims set successfully."

echo -e "\n[3/3] Creating Accountant profile in Firestore..."
FIRESTORE_PAYLOAD="{
  \"fields\": {
    \"email\": { \"stringValue\": \"${EMAIL}\" },
    \"displayName\": { \"stringValue\": \"${DISPLAY_NAME}\" },
    \"createdAt\": { \"timestampValue\": \"$(date -u +'%Y-%m-%dT%H:%M:%SZ')\" }
  }
}"

curl -s -X PATCH \
    "https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/accountants/${LOCAL_ID}" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "$FIRESTORE_PAYLOAD" > /dev/null

echo -e "  -> Accountant profile created in Firestore."

echo -e "\n${GREEN}=== Success! ===${NC}"
echo -e "Accountant admin ${CYAN}${EMAIL}${NC} has been created in project ${CYAN}${PROJECT_ID}${NC}."
