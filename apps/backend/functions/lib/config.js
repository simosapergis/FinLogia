import admin from 'firebase-admin';
import { Storage } from '@google-cloud/storage';
import { VertexAI } from '@google-cloud/vertexai';
import { defineString } from 'firebase-functions/params';

admin.initializeApp();

const storage = new Storage();
const db = admin.firestore();

// Lazy-initialize Vertex AI client
let _vertexAiClient = null;
function getVertexAIClient() {
  if (!_vertexAiClient) {
    _vertexAiClient = new VertexAI({
      project: process.env.GCLOUD_PROJECT || admin.app().options.projectId,
      location: 'europe-west3',
    });
  }
  return _vertexAiClient;
}

// Define environment parameters (type-safe, validated at deploy time)
const SERVICE_ACCOUNT_EMAIL = defineString('SERVICE_ACCOUNT_EMAIL');
const REGION = defineString('REGION', { default: 'europe-west3' });
const GCS_BUCKET = defineString('GCS_BUCKET');

const UPLOADS_PREFIX = 'uploads/';
const METADATA_INVOICE_COLLECTION = 'metadata_invoices';

const SIGNED_URL_TTL_MS = 15 * 60 * 1000;
const INVOICE_STATUS = {
  pending: 'pending',
  ready: 'ready',
  processing: 'processing',
  done: 'done',
  uploaded: 'uploaded',
  error: 'error',
};
const PAYMENT_STATUS = {
  unpaid: 'unpaid',
  paid: 'paid',
  partiallyPaid: 'partially_paid',
};

const serverTimestamp = admin.firestore.FieldValue.serverTimestamp;

function getBucketName() {
  return GCS_BUCKET.value();
}

const ATHENS_TZ = 'Europe/Athens';
const athensDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: ATHENS_TZ,
});

function getAthensToday() {
  const dateStr = athensDateFormatter.format(new Date());
  const [y, m, d] = dateStr.split('-').map(Number);
  return { utcDate: new Date(Date.UTC(y, m - 1, d)), dayOfMonth: d };
}

function formatAthensDate(date) {
  return athensDateFormatter.format(date);
}

export {
  admin,
  db,
  storage,
  getVertexAIClient,
  SERVICE_ACCOUNT_EMAIL,
  REGION,
  GCS_BUCKET,
  UPLOADS_PREFIX,
  METADATA_INVOICE_COLLECTION,
  SIGNED_URL_TTL_MS,
  INVOICE_STATUS,
  PAYMENT_STATUS,
  serverTimestamp,
  getBucketName,
  getAthensToday,
  formatAthensDate,
};
