#!/bin/bash
set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}=== Add User to Business ===${NC}"

if [ -z "$1" ]; then
    echo -e "${YELLOW}Usage: ./add_user_to_business.sh <project-id>${NC}"
    exit 1
fi

PROJECT_ID=$1

echo -e "${YELLOW}Enter the Business ID (lowercase, no spaces, e.g. 'acme-corp'):${NC} \c"
read -r BUSINESS_ID

if [ -z "$BUSINESS_ID" ]; then
    echo -e "${RED}Business ID is required. Exiting.${NC}"
    exit 1
fi

# Ensure Business ID is URL safe
if [[ ! "$BUSINESS_ID" =~ ^[a-z0-9-]+$ ]]; then
    echo -e "${RED}Invalid Business ID format. Use only lowercase letters, numbers, and hyphens.${NC}"
    exit 1
fi

ACCESS_TOKEN=$(gcloud auth print-access-token)

echo -e "\n[1/3] Verifying Business exists..."
CHECK_BUSINESS=$(curl -s -w "\n%{http_code}" -X GET \
    "https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/businesses/${BUSINESS_ID}" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}")

HTTP_STATUS=$(echo "$CHECK_BUSINESS" | tail -n1)

if [ "$HTTP_STATUS" != "200" ]; then
    echo -e "${RED}Business '${BUSINESS_ID}' not found or you don't have access. HTTP Status: ${HTTP_STATUS}${NC}"
    exit 1
fi
echo -e "  -> Business found."

echo -e "\n${YELLOW}Enter the new user's email:${NC} \c"
read -r EMAIL
echo -e "${YELLOW}Enter the new user's display name (e.g. 'John Doe'):${NC} \c"
read -r DISPLAY_NAME
echo -e "${YELLOW}Enter the new user's password (min 6 chars):${NC} \c"
read -s PASSWORD
echo ""

if [ -z "$EMAIL" ] || [ -z "$PASSWORD" ]; then
    echo -e "${RED}Email and Password are required. Exiting.${NC}"
    exit 1
fi

echo -e "\n${YELLOW}Select the user's role:${NC}"
echo "1) owner (Full access, same as main owner)"
echo "2) employee (Standard access)"
echo "3) viewer (Read-only access)"
echo -e "${YELLOW}Enter choice [1-3]:${NC} \c"
read -r ROLE_CHOICE

case $ROLE_CHOICE in
    1) ROLE="owner" ;;
    2) ROLE="employee" ;;
    3) ROLE="viewer" ;;
    *) echo -e "${RED}Invalid choice. Exiting.${NC}"; exit 1 ;;
esac

echo -e "\n[2/3] Creating Firebase Auth user..."

CREATE_RESPONSE=$(curl -s -X POST \
    "https://identitytoolkit.googleapis.com/v1/projects/${PROJECT_ID}/accounts" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H "X-Goog-User-Project: ${PROJECT_ID}" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"${EMAIL}\",\"password\":\"${PASSWORD}\",\"displayName\":\"${DISPLAY_NAME}\"}")

LOCAL_ID=$(echo "$CREATE_RESPONSE" | grep -o '"localId": *"[^"]*"' | cut -d'"' -f4)

if [ -z "$LOCAL_ID" ]; then
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

echo -e "\n[3/3] Provisioning Firestore Data..."

# Map the Auth User to the Business
USER_PAYLOAD="{
  \"fields\": {
    \"businessId\": { \"stringValue\": \"${BUSINESS_ID}\" },
    \"email\": { \"stringValue\": \"${EMAIL}\" },
    \"role\": { \"stringValue\": \"${ROLE}\" },
    \"createdAt\": { \"timestampValue\": \"$(date -u +'%Y-%m-%dT%H:%M:%SZ')\" }
  }
}"

curl -s -X PATCH \
    "https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/users/${LOCAL_ID}" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "$USER_PAYLOAD" > /dev/null

echo -e "  -> User mapping created at /users/${LOCAL_ID} with role '${ROLE}'"

echo -e "\n${GREEN}=== Success! ===${NC}"
echo -e "User ${CYAN}${EMAIL}${NC} has been added to business ${CYAN}${BUSINESS_ID}${NC} as ${CYAN}${ROLE}${NC}."
