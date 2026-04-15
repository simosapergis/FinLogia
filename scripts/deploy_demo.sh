#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

echo "========================================================"
echo "🚀 Deploying FinLogia to Demo Environment (finlogia-demo)"
echo "========================================================"

# 1. Deploy Backend
echo ""
echo "📦 [1/2] Deploying Backend (Functions, Firestore Rules, Storage Rules)..."
cd apps/backend
firebase deploy --only functions,firestore:rules,storage --project finlogia-demo --force
cd ../..

# 2. Deploy Portal
echo ""
echo "🖥️  [2/2] Deploying Portal (PWA Client)..."
cd apps/portal/pwa-client

echo "⚙️  Generating .env.local for finlogia-demo..."
CLIENT_CONFIG=$(jq -c '.[] | select(.projectId == "finlogia-demo")' ../clients.json)

if [ -z "$CLIENT_CONFIG" ]; then
  echo "❌ Error: Could not find configuration for finlogia-demo in clients.json"
  exit 1
fi

echo "VITE_FIREBASE_API_KEY=$(echo $CLIENT_CONFIG | jq -r .apiKey)" > .env.local
echo "VITE_FIREBASE_AUTH_DOMAIN=$(echo $CLIENT_CONFIG | jq -r .authDomain)" >> .env.local
echo "VITE_FIREBASE_PROJECT_ID=finlogia-demo" >> .env.local
echo "VITE_FIREBASE_STORAGE_BUCKET=$(echo $CLIENT_CONFIG | jq -r .storageBucket)" >> .env.local
echo "VITE_FIREBASE_MESSAGING_SENDER_ID=$(echo $CLIENT_CONFIG | jq -r .messagingSenderId)" >> .env.local
echo "VITE_FIREBASE_APP_ID=$(echo $CLIENT_CONFIG | jq -r .appId)" >> .env.local

echo "VITE_FIREBASE_BUCKET_FOLDER=uploads" >> .env.local
echo "VITE_INVOICE_EXPIRY_DAYS=7" >> .env.local
echo "VITE_BASE_URL=https://europe-west3-finlogia-demo.cloudfunctions.net" >> .env.local

echo "VITE_SIGNED_UPLOAD_URL_PATH=/getSignedUploadUrl_v2" >> .env.local
echo "VITE_SIGNED_DOWNLOAD_URL_PATH=/getSignedDownloadUrl_v2" >> .env.local
echo "VITE_UPDATE_INVOICE_FIELDS_PATH=/updateInvoiceFields_v2" >> .env.local
echo "VITE_UPDATE_PAYMENT_STATUS_PATH=/updatePaymentStatus_v2" >> .env.local
echo "VITE_UPDATE_SUPPLIER_FIELDS_PATH=/updateSupplierFields_v2" >> .env.local
echo "VITE_ADD_FINANCIAL_ENTRY_PATH=/addFinancialEntry_v2" >> .env.local
echo "VITE_EDIT_FINANCIAL_ENTRY_PATH=/editFinancialEntry_v2" >> .env.local
echo "VITE_DELETE_FINANCIAL_ENTRY_PATH=/deleteFinancialEntry_v2" >> .env.local
echo "VITE_GET_FINANCIAL_REPORT_PATH=/getFinancialReport_v2" >> .env.local
echo "VITE_ADD_RECURRING_EXPENSE_PATH=/addRecurringExpense_v2" >> .env.local
echo "VITE_UPDATE_RECURRING_EXPENSE_PATH=/updateRecurringExpense_v2" >> .env.local
echo "VITE_GET_RECURRING_EXPENSES_PATH=/getRecurringExpenses_v2" >> .env.local
echo "VITE_EXPORT_INVOICES_PATH=/exportInvoices_v2" >> .env.local
echo "VITE_UPDATE_AUDIT_STATUS_PATH=/updateAuditStatus_v2" >> .env.local
echo "VITE_RECORD_INVOICE_VIEW_PATH=/recordInvoiceView_v2" >> .env.local
echo "VITE_CREATE_CLIENT_BUSINESS_PATH=/createClientBusiness_v2" >> .env.local
echo "VITE_ADD_USER_TO_BUSINESS_PATH=/addUserToBusiness_v2" >> .env.local
echo "VITE_ADD_ACCOUNTANT_PATH=/addAccountant_v2" >> .env.local
echo "VITE_RESET_USER_PASSWORD_PATH=/resetUserPassword_v2" >> .env.local
echo "VITE_CLIENT_NAME=\"Demo\"" >> .env.local

echo "🔨 Building portal..."
npm run build

echo "🚀 Deploying to Firebase Hosting..."
firebase deploy --only hosting --project finlogia-demo

echo ""
echo "✅ Deployment to Demo Environment completed successfully!"
echo "🔗 https://finlogia-demo.web.app"
