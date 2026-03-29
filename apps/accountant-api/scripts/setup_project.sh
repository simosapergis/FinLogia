#!/bin/bash
set -e

LOG_FILE="setup_project.log"
> "$LOG_FILE"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
NC='\033[0m'

handle_error() {
    local exit_code=$?
    local line_no=$1
    local command="$2"
    echo -e "\n${RED}Error at line $line_no${NC}"
    echo -e "${RED}Command: ${command}${NC}"
    echo -e "${RED}Exit code: $exit_code${NC}"
    echo -e "\n${YELLOW}Last 20 lines of log ($LOG_FILE):${NC}"
    tail -n 20 "$LOG_FILE"
    echo -e "\nFix the issue and re-run — completed steps will be skipped."
    exit $exit_code
}
trap 'handle_error ${LINENO} "$BASH_COMMAND"' ERR

TOTAL_STEPS=12

echo -e "${CYAN}=== FinLogia Accountant API — Project Setup ===${NC}"
echo -e "Provisions a new GCP project for the accountant portal."
echo -e "Logs written to ${LOG_FILE}\n"

# ── 1. Collect Inputs ──────────────────────────────────────────────────────────

echo -e "${YELLOW}Enter the Project ID (lowercase, 6-30 chars):${NC} \c"
read -r PROJECT_ID
[[ -z "$PROJECT_ID" ]] && { echo -e "${RED}Project ID cannot be empty.${NC}"; exit 1; }

echo -e "${YELLOW}Enter a display name (e.g. 'FinLogia Accountant Portal'):${NC} \c"
read -r DISPLAY_NAME
[[ -z "$DISPLAY_NAME" ]] && DISPLAY_NAME="$PROJECT_ID"

echo -e "\n${CYAN}Fetching available Organizations...${NC}"
ORGS_LIST=$(gcloud organizations list --format="value(displayName,name)" || true)
ORG_COUNT=$(echo "$ORGS_LIST" | grep -c . || true)

ORG_ID=""
if [ "$ORG_COUNT" -eq 0 ]; then
    echo -e "  ${YELLOW}-> No organizations found. Project will be created without an organization.${NC}"
elif [ "$ORG_COUNT" -eq 1 ]; then
    ORG_NAME=$(echo "$ORGS_LIST" | awk -F'\t' '{print $1}')
    ORG_ID=$(echo "$ORGS_LIST" | awk -F'\t' '{print $2}')
    echo -e "  -> Auto-selected Organization: ${CYAN}${ORG_NAME} (${ORG_ID})${NC}"
else
    echo -e "\n${CYAN}Available Organizations:${NC}"
    echo -e "  #) Organization Name              | Organization ID"
    echo -e "  ---------------------------------------------------"
    
    IFS=$'\n' read -rd '' -a ORG_LINES <<<"$ORGS_LIST" || true
    if [ ${#ORG_LINES[@]} -eq 0 ] && [ -n "$ORGS_LIST" ]; then
        ORG_LINES=("$ORGS_LIST")
    fi
    
    i=1
    declare -a ORG_IDS
    for line in "${ORG_LINES[@]}"; do
        name=$(echo "$line" | awk -F'\t' '{print $1}')
        id=$(echo "$line" | awk -F'\t' '{print $2}')
        ORG_IDS[$i]=$id
        printf "  %d) %-30s | %s\n" "$i" "$name" "$id"
        ((i++))
    done
    
    echo -e "\n${YELLOW}Select an organization (1-$((i-1))) or press Enter to type ID manually (or skip):${NC} \c"
    read -r SELECTION
    
    if [[ "$SELECTION" =~ ^[0-9]+$ ]] && [ "$SELECTION" -ge 1 ] && [ "$SELECTION" -lt "$i" ]; then
        ORG_ID="${ORG_IDS[$SELECTION]}"
        echo -e "  -> Selected Organization ID: ${CYAN}${ORG_ID}${NC}"
    elif [ -n "$SELECTION" ]; then
        ORG_ID="$SELECTION"
        echo -e "  -> Using manually entered Organization ID: ${CYAN}${ORG_ID}${NC}"
    else
        echo -e "  -> No organization selected."
    fi
fi

echo -e "\n${GREEN}Setting up project: $PROJECT_ID ($DISPLAY_NAME)${NC}"

# ── Resumability ──────────────────────────────────────────────────────────────

STATE_FILE=".setup_state_${PROJECT_ID}"
touch "$STATE_FILE"
mark_step_done() { echo "$1" >> "$STATE_FILE"; }
is_step_done()   { grep -q "^$1$" "$STATE_FILE" 2>/dev/null; }

# ── 2. Create GCP Project ──────────────────────────────────────────────────────

if is_step_done "create_project"; then
    echo -e "[1/${TOTAL_STEPS}] GCP project already created. Skipping..."
else
    echo -e "[1/${TOTAL_STEPS}] Creating GCP project..."
    if gcloud projects describe "$PROJECT_ID" >> "$LOG_FILE" 2>&1; then
        echo -e "  ${YELLOW}-> Project already exists. Skipping creation.${NC}"
    else
        if [ -n "$ORG_ID" ]; then
            gcloud projects create "$PROJECT_ID" --name="$DISPLAY_NAME" --organization="$ORG_ID" >> "$LOG_FILE" 2>&1
        else
            gcloud projects create "$PROJECT_ID" --name="$DISPLAY_NAME" >> "$LOG_FILE" 2>&1
        fi
    fi
    mark_step_done "create_project"
fi

# ── 3. Link Billing ──────────────────────────────────────────────────────────

if is_step_done "link_billing"; then
    echo -e "[2/${TOTAL_STEPS}] Billing already linked. Skipping..."
else
    echo -e "[2/${TOTAL_STEPS}] Linking billing account..."
    BILLING_ACCOUNTS=$(gcloud billing accounts list --filter="open=true" --format="value(displayName,name)")
    BILLING_COUNT=$(echo "$BILLING_ACCOUNTS" | grep -c . || true)

    if [ "$BILLING_COUNT" -eq 0 ]; then
        echo -e "${RED}No active billing accounts found.${NC}"
        exit 1
    elif [ "$BILLING_COUNT" -eq 1 ]; then
        BILLING_NAME=$(echo "$BILLING_ACCOUNTS" | awk -F'\t' '{print $1}')
        BILLING_ACCOUNT_ID=$(echo "$BILLING_ACCOUNTS" | awk -F'\t' '{print $2}')
        echo -e "  -> Auto-selected: ${CYAN}${BILLING_NAME} (${BILLING_ACCOUNT_ID})${NC}"
    else
        echo -e "\n${CYAN}Available Billing Accounts:${NC}"
        echo -e "  #) Billing Account Name           | Billing Account ID"
        echo -e "  ------------------------------------------------------"
        
        IFS=$'\n' read -rd '' -a BILLING_LINES <<<"$BILLING_ACCOUNTS" || true
        if [ ${#BILLING_LINES[@]} -eq 0 ] && [ -n "$BILLING_ACCOUNTS" ]; then
            BILLING_LINES=("$BILLING_ACCOUNTS")
        fi
        
        i=1
        declare -a BILLING_IDS
        for line in "${BILLING_LINES[@]}"; do
            name=$(echo "$line" | awk -F'\t' '{print $1}')
            id=$(echo "$line" | awk -F'\t' '{print $2}')
            BILLING_IDS[$i]=$id
            printf "  %d) %-30s | %s\n" "$i" "$name" "$id"
            ((i++))
        done
        
        echo -e "\n${YELLOW}Select a billing account (1-$((i-1))) or press Enter to type ID manually:${NC} \c"
        read -r SELECTION
        
        if [[ "$SELECTION" =~ ^[0-9]+$ ]] && [ "$SELECTION" -ge 1 ] && [ "$SELECTION" -lt "$i" ]; then
            BILLING_ACCOUNT_ID="${BILLING_IDS[$SELECTION]}"
            echo -e "  -> Selected Billing Account ID: ${CYAN}${BILLING_ACCOUNT_ID}${NC}"
        else
            echo -e "${YELLOW}Enter the Billing Account ID:${NC} \c"
            read -r BILLING_ACCOUNT_ID
        fi
        
        [[ -z "$BILLING_ACCOUNT_ID" ]] && { echo -e "${RED}Billing ID required.${NC}"; exit 1; }
    fi

    gcloud billing projects link "$PROJECT_ID" --billing-account="$BILLING_ACCOUNT_ID" >> "$LOG_FILE" 2>&1
    mark_step_done "link_billing"
fi

# ── 4. Add Firebase ──────────────────────────────────────────────────────────

if is_step_done "add_firebase"; then
    echo -e "[3/${TOTAL_STEPS}] Firebase already added. Skipping..."
else
    echo -e "[3/${TOTAL_STEPS}] Adding Firebase..."
    firebase projects:addfirebase "$PROJECT_ID" >> "$LOG_FILE" 2>&1
    mark_step_done "add_firebase"
fi

# ── 5. Set Active Project ──────────────────────────────────────────────────────

echo -e "[4/${TOTAL_STEPS}] Setting active project..."
firebase use "$PROJECT_ID" >> "$LOG_FILE" 2>&1
gcloud config set project "$PROJECT_ID" >> "$LOG_FILE" 2>&1

# ── 6. Enable APIs ──────────────────────────────────────────────────────────

if is_step_done "enable_apis"; then
    echo -e "[5/${TOTAL_STEPS}] APIs already enabled. Skipping..."
else
    echo -e "[5/${TOTAL_STEPS}] Enabling GCP APIs..."
    gcloud services enable \
        cloudfunctions.googleapis.com \
        firestore.googleapis.com \
        storage.googleapis.com \
        cloudbuild.googleapis.com \
        eventarc.googleapis.com \
        run.googleapis.com \
        artifactregistry.googleapis.com \
        identitytoolkit.googleapis.com \
        pubsub.googleapis.com \
        --project "$PROJECT_ID" >> "$LOG_FILE" 2>&1

    gcloud beta services identity create --service=pubsub.googleapis.com --project="$PROJECT_ID" --quiet >> "$LOG_FILE" 2>&1
    gcloud beta services identity create --service=eventarc.googleapis.com --project="$PROJECT_ID" --quiet >> "$LOG_FILE" 2>&1
    gcloud storage service-agent --project="$PROJECT_ID" >> "$LOG_FILE" 2>&1
    mark_step_done "enable_apis"
fi

# ── 7. Provision Firestore + Storage ────────────────────────────────────────

if is_step_done "provision_resources"; then
    echo -e "[6/${TOTAL_STEPS}] Resources already provisioned. Skipping..."
else
    echo -e "[6/${TOTAL_STEPS}] Provisioning Firestore + Storage..."
    if ! gcloud firestore databases describe --database="(default)" --project "$PROJECT_ID" >> "$LOG_FILE" 2>&1; then
        gcloud firestore databases create --location=europe-west3 --type=firestore-native --project "$PROJECT_ID" >> "$LOG_FILE" 2>&1
    fi
    sleep 5
    firebase deploy --only firestore --project "$PROJECT_ID" >> "$LOG_FILE" 2>&1

    BUCKET_NAME="gs://${PROJECT_ID}.appspot.com"
    if ! gcloud storage buckets describe "$BUCKET_NAME" --project "$PROJECT_ID" >> "$LOG_FILE" 2>&1; then
        gcloud app create --region=europe-west3 --project "$PROJECT_ID" >> "$LOG_FILE" 2>&1 || true
    fi
    mark_step_done "provision_resources"
fi

# ── 8. IAM Roles ────────────────────────────────────────────────────────────

if is_step_done "iam_roles"; then
    echo -e "[7/${TOTAL_STEPS}] IAM already configured. Skipping..."
else
    echo -e "[7/${TOTAL_STEPS}] Assigning IAM roles..."
    SA_EMAIL=$(gcloud iam service-accounts list --project "$PROJECT_ID" --format="value(email)" --filter="email:firebase-adminsdk")
    PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format="value(projectNumber)")

    ROLES=(
        "roles/datastore.user"
        "roles/cloudfunctions.admin"
        "roles/firebasestorage.admin"
        "roles/iam.serviceAccountTokenCreator"
        "roles/iam.serviceAccountUser"
        "roles/storage.admin"
    )
    for ROLE in "${ROLES[@]}"; do
        gcloud projects add-iam-policy-binding "$PROJECT_ID" \
            --member="serviceAccount:${SA_EMAIL}" --role="$ROLE" --condition=None \
            >> "$LOG_FILE" 2>&1 || echo -e "  ${YELLOW}Warning: $ROLE${NC}"
    done

    gcloud projects add-iam-policy-binding "$PROJECT_ID" \
        --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
        --role="roles/cloudbuild.builds.builder" --condition=None >> "$LOG_FILE" 2>&1 || true

    gcloud projects add-iam-policy-binding "$PROJECT_ID" \
        --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
        --role="roles/artifactregistry.reader" --condition=None >> "$LOG_FILE" 2>&1 || true

    gcloud projects add-iam-policy-binding "$PROJECT_ID" \
        --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
        --role="roles/run.invoker" --condition=None >> "$LOG_FILE" 2>&1 || true

    gcloud projects add-iam-policy-binding "$PROJECT_ID" \
        --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
        --role="roles/eventarc.eventReceiver" --condition=None >> "$LOG_FILE" 2>&1 || true

    gcloud projects add-iam-policy-binding "$PROJECT_ID" \
        --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
        --role="roles/logging.logWriter" --condition=None >> "$LOG_FILE" 2>&1 || true

    gcloud projects add-iam-policy-binding "$PROJECT_ID" \
        --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
        --role="roles/artifactregistry.writer" --condition=None >> "$LOG_FILE" 2>&1 || true

    gcloud projects add-iam-policy-binding "$PROJECT_ID" \
        --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
        --role="roles/storage.admin" --condition=None >> "$LOG_FILE" 2>&1 || true

    echo -e "  -> Waiting 30s for IAM propagation..."
    sleep 30
    mark_step_done "iam_roles"
fi

# ── 9. CORS + Env ───────────────────────────────────────────────────────────

if is_step_done "cors_env"; then
    echo -e "[8/${TOTAL_STEPS}] CORS + env already configured. Skipping..."
else
    echo -e "[8/${TOTAL_STEPS}] Configuring CORS + env..."
    CORS_TEMP=$(mktemp)
    cat > "$CORS_TEMP" << CORS_EOF
[
  {
    "maxAgeSeconds": 3600,
    "method": ["GET", "PUT", "POST", "HEAD", "OPTIONS"],
    "origin": [
      "http://localhost:5173",
      "https://${PROJECT_ID}.web.app",
      "https://${PROJECT_ID}.firebaseapp.com"
    ],
    "responseHeader": [
      "Content-Type",
      "Authorization",
      "Content-Length",
      "Access-Control-Allow-Origin"
    ]
  }
]
CORS_EOF
    gsutil cors set "$CORS_TEMP" "gs://${PROJECT_ID}.appspot.com" >> "$LOG_FILE" 2>&1 || true
    rm -f "$CORS_TEMP"

    SA_EMAIL=${SA_EMAIL:-$(gcloud iam service-accounts list --project "$PROJECT_ID" --format="value(email)" --filter="email:firebase-adminsdk")}
    cat > "functions/.env.${PROJECT_ID}" << ENV_EOF
SERVICE_ACCOUNT_EMAIL=${SA_EMAIL}
REGION=europe-west3
GCS_BUCKET=${PROJECT_ID}.appspot.com
ENV_EOF
    echo -e "  -> Created functions/.env.${PROJECT_ID}"
    mark_step_done "cors_env"
fi

# ── 10. Auth Setup ───────────────────────────────────────────────────────────

if is_step_done "auth_setup"; then
    echo -e "[9/${TOTAL_STEPS}] Auth already configured. Skipping..."
else
    echo -e "[9/${TOTAL_STEPS}] Enabling Email/Password auth..."
    ACCESS_TOKEN=$(gcloud auth print-access-token)

    curl -s -X POST \
        "https://identitytoolkit.googleapis.com/v2/projects/${PROJECT_ID}/identityPlatform:initializeAuth" \
        -H "Authorization: Bearer ${ACCESS_TOKEN}" \
        -H "X-Goog-User-Project: ${PROJECT_ID}" \
        -H "Content-Type: application/json" >> "$LOG_FILE" 2>&1

    curl -s -X PATCH \
        "https://identitytoolkit.googleapis.com/admin/v2/projects/${PROJECT_ID}/config?updateMask=signIn.email" \
        -H "Authorization: Bearer ${ACCESS_TOKEN}" \
        -H "X-Goog-User-Project: ${PROJECT_ID}" \
        -H "Content-Type: application/json" \
        -d '{"signIn":{"email":{"enabled":true,"passwordRequired":true}}}' >> "$LOG_FILE" 2>&1

    mark_step_done "auth_setup"
fi

# ── 11. Deploy Functions ──────────────────────────────────────────────────────

if is_step_done "deployment"; then
    echo -e "[10/${TOTAL_STEPS}] Already deployed. Skipping..."
else
    echo -e "[10/${TOTAL_STEPS}] Deploying Cloud Functions..."
    firebase deploy --only functions --project "$PROJECT_ID" --non-interactive --force >> "$LOG_FILE" 2>&1
    mark_step_done "deployment"
fi

# ── 12. Cleanup Policy ────────────────────────────────────────────────────────

if is_step_done "cleanup_policy"; then
    echo -e "[11/${TOTAL_STEPS}] Cleanup policy already configured. Skipping..."
else
    echo -e "[11/${TOTAL_STEPS}] Configuring Artifact Registry cleanup policy..."
    POLICY_TEMP=$(mktemp)
    cat > "$POLICY_TEMP" << POLICY_EOF
[
  {
    "name": "delete-old-images",
    "action": { "type": "Delete" },
    "condition": {
      "tagState": "ANY",
      "olderThan": "2592000s"
    }
  },
  {
    "name": "keep-recent-images",
    "action": { "type": "Keep" },
    "mostRecentVersions": {
      "keepCount": 3
    }
  }
]
POLICY_EOF
    
    # The repository gcf-artifacts is created on first deploy
    gcloud artifacts repositories set-cleanup-policies gcf-artifacts \
        --project="$PROJECT_ID" \
        --location=europe-west3 \
        --policy="$POLICY_TEMP" >> "$LOG_FILE" 2>&1 || echo -e "  ${YELLOW}Warning: Could not set cleanup policy. Repository might not exist yet.${NC}"
    
    rm -f "$POLICY_TEMP"
    mark_step_done "cleanup_policy"
fi

# ── 13. Register Web App ──────────────────────────────────────────────────────

if is_step_done "register_web_app"; then
    echo -e "[12/${TOTAL_STEPS}] Firebase Web App already registered. Skipping..."
else
    echo -e "[12/${TOTAL_STEPS}] Registering Firebase Web App..."
    EXISTING_APP=$(firebase apps:list WEB --project "$PROJECT_ID" 2>/dev/null | grep -c "App ID" || true)
    if [ "$EXISTING_APP" -eq 0 ]; then
        firebase apps:create WEB "${DISPLAY_NAME:-$PROJECT_ID}" --project "$PROJECT_ID" >> "$LOG_FILE" 2>&1
    fi

    CONFIG_FILE="firebase-config.${PROJECT_ID}.json"
    firebase apps:sdkconfig WEB --project "$PROJECT_ID" --json | node -e "
        const chunks = [];
        process.stdin.on('data', c => chunks.push(c));
        process.stdin.on('end', () => {
            const raw = JSON.parse(chunks.join(''));
            const cfg = raw.result.sdkConfig;
            console.log(JSON.stringify(cfg, null, 2));
        });
    " > "$CONFIG_FILE"
    echo -e "  -> Saved config to ${CYAN}${CONFIG_FILE}${NC}"
    mark_step_done "register_web_app"
fi

echo -e "\n${GREEN}=== Setup Complete! ===${NC}"
echo -e "Project ${CYAN}${PROJECT_ID}${NC} is ready."
echo -e "\n${YELLOW}NEXT STEPS:${NC}"
echo -e "1. Create accountants: ${CYAN}npm run create:accountant${NC}"
echo -e "2. Register clients:   ${CYAN}npm run register:client${NC}"
echo -e "3. Deploy frontend:    See finlogia-accountant-portal repo"
