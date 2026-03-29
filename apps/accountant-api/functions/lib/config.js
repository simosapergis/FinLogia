import admin from 'firebase-admin';
import { Storage } from '@google-cloud/storage';
import { defineString } from 'firebase-functions/params';

admin.initializeApp();

const storage = new Storage();
const db = admin.firestore();

const SERVICE_ACCOUNT_EMAIL = defineString('SERVICE_ACCOUNT_EMAIL');
const REGION = defineString('REGION', { default: 'europe-west3' });
const GCS_BUCKET = defineString('GCS_BUCKET');

const ACCOUNTANTS_COLLECTION = 'accountants';
const CLIENTS_SUBCOLLECTION = 'clients';
const INVOICE_VIEWS_SUBCOLLECTION = 'invoice_views';

const SIGNED_URL_TTL_MS = 15 * 60 * 1000;

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
  SERVICE_ACCOUNT_EMAIL,
  REGION,
  GCS_BUCKET,
  ACCOUNTANTS_COLLECTION,
  CLIENTS_SUBCOLLECTION,
  INVOICE_VIEWS_SUBCOLLECTION,
  SIGNED_URL_TTL_MS,
  serverTimestamp,
  getBucketName,
  getAthensToday,
  formatAthensDate,
};
