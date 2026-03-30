import { admin, db } from './config.js';

function extractBearerToken(headerValue) {
  if (!headerValue) return null;
  const match = headerValue.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : null;
}

/**
 * Validates and extracts the authenticated user from the request
 */
async function authenticateRequest(req) {
  const idToken = extractBearerToken(req.headers.authorization);
  if (!idToken) {
    return { error: 'Missing or invalid Authorization header', status: 401 };
  }
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    
    // Fetch businessId from users collection
    const userDoc = await db.collection('users').doc(decodedToken.uid).get();
    if (userDoc.exists) {
      decodedToken.businessId = userDoc.data().businessId;
    }
    
    return { user: decodedToken };
  } catch (error) {
    console.error('Token verification failed:', error);
    return { error: 'Invalid or expired token', status: 401 };
  }
}

function getUserDisplayName(decodedToken) {
  return decodedToken.name || decodedToken.email || decodedToken.uid;
}

/**
 * Validates if the user has access to the specified businessId
 */
function validateBusinessAccess(user, targetBusinessId) {
  if (!targetBusinessId) {
    return { error: 'businessId is required', status: 400 };
  }
  
  if (user.isAccountant === true) {
    return { success: true };
  }
  
  if (user.businessId === targetBusinessId) {
    return { success: true };
  }
  
  return { error: 'Unauthorized access to this business', status: 403 };
}

export { extractBearerToken, authenticateRequest, getUserDisplayName, validateBusinessAccess };
