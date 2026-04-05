#!/bin/bash
set -e

# Check if project ID is provided as an argument, otherwise default to finlogia-mdellatolas
PROJECT_ID=${1:-"finlogia-mdellatolas"}

echo "============================================================"
echo "Upgrading Project: $PROJECT_ID for Vertex AI OCR"
echo "============================================================"

echo "Fetching project number for $PROJECT_ID..."
PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format="value(projectNumber)")

echo -e "\n1. Enabling Vertex AI API..."
gcloud services enable aiplatform.googleapis.com --project="$PROJECT_ID"

echo -e "\n2. Ensuring Vertex AI Service Agent exists..."
gcloud beta services identity create --service=aiplatform.googleapis.com --project="$PROJECT_ID" || true

echo -e "\n3. Granting Vertex AI User role to App Engine default service account..."
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${PROJECT_ID}@appspot.gserviceaccount.com" \
  --role="roles/aiplatform.user" \
  --condition=None

echo -e "\n4. Granting Vertex AI User role to Firebase Admin SDK service account..."
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:firebase-adminsdk-fbsvc@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/aiplatform.user" \
  --condition=None

echo -e "\n5. Granting Storage Object Viewer role to Vertex AI Service Agent..."
# This allows Gemini to read the gs:// URIs from Cloud Storage
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:service-${PROJECT_NUMBER}@gcp-sa-aiplatform.iam.gserviceaccount.com" \
  --role="roles/storage.objectViewer" \
  --condition=None

echo -e "\n============================================================"
echo "✅ Done! The project $PROJECT_ID is now ready for the Vertex AI OCR deployment."
echo "You can now run: firebase deploy --only functions --project $PROJECT_ID"
echo "============================================================"
