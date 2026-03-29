import { admin, db, ACCOUNTANTS_COLLECTION } from './config.js';

function extractBearerToken(headerValue) {
  if (!headerValue) return null;
  const match = headerValue.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : null;
}

async function authenticateRequest(req) {
  const idToken = extractBearerToken(req.headers.authorization);
  if (!idToken) {
    return { error: 'Missing or invalid Authorization header', status: 401 };
  }
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    return { user: decodedToken };
  } catch (error) {
    console.error('Token verification failed:', error);
    return { error: 'Invalid or expired token', status: 401 };
  }
}

async function validateAccountant(accountantId) {
  const accountantDoc = await db.collection(ACCOUNTANTS_COLLECTION).doc(accountantId).get();
  if (!accountantDoc.exists) {
    return { error: 'Ο λογαριασμός δεν βρέθηκε', status: 403 };
  }
  return { accountant: { id: accountantDoc.id, ...accountantDoc.data() } };
}

function getUserDisplayName(decodedToken) {
  return decodedToken.name || decodedToken.email || decodedToken.uid;
}

export { extractBearerToken, authenticateRequest, validateAccountant, getUserDisplayName };
