import admin from 'firebase-admin';
import { Storage } from '@google-cloud/storage';
import { db, ACCOUNTANTS_COLLECTION, CLIENTS_SUBCOLLECTION } from './config.js';

const clientApps = new Map();

function getClientApp(projectId) {
  if (!clientApps.has(projectId)) {
    const app = admin.initializeApp(
      { credential: admin.credential.applicationDefault(), projectId },
      projectId
    );
    clientApps.set(projectId, app);
  }
  return clientApps.get(projectId);
}

function getClientDb(projectId) {
  return getClientApp(projectId).firestore();
}

function getClientBucket(bucketName) {
  return new Storage().bucket(bucketName);
}

async function validateClientAccess(accountantId, clientProjectId) {
  const clientDoc = await db
    .collection(ACCOUNTANTS_COLLECTION)
    .doc(accountantId)
    .collection(CLIENTS_SUBCOLLECTION)
    .doc(clientProjectId)
    .get();

  if (!clientDoc.exists) {
    return { error: 'Ο πελάτης δεν βρέθηκε ή δεν έχει εκχωρηθεί', status: 403 };
  }
  return { client: { id: clientDoc.id, ...clientDoc.data() } };
}

export { getClientApp, getClientDb, getClientBucket, validateClientAccess };
