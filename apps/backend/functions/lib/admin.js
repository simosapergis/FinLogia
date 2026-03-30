import { admin, db, serverTimestamp } from './config.js';

/**
 * Creates a new client business and its owner user.
 * Equivalent to create_client_business.sh
 */
async function createClientBusiness({ businessId, displayName, email, password, projectId }) {
  // 1. Create Firebase Auth user
  const userRecord = await admin.auth().createUser({
    email,
    password,
    displayName,
  });

  // 2. Provision Firestore Data
  const batch = db.batch();

  // Create Business Profile
  const businessRef = db.collection('businesses').doc(businessId);
  batch.set(businessRef, {
    displayName,
    bucketName: `${projectId}.appspot.com`,
    createdAt: serverTimestamp(),
  });

  // Map Auth User to Business
  const userRef = db.collection('users').doc(userRecord.uid);
  batch.set(userRef, {
    businessId,
    email,
    role: 'owner',
    createdAt: serverTimestamp(),
  });

  await batch.commit();

  return { uid: userRecord.uid, businessId };
}

/**
 * Adds a new user to an existing business.
 * Equivalent to add_user_to_business.sh
 */
async function addUserToBusiness({ businessId, email, password, displayName, role }) {
  // 1. Verify Business exists
  const businessDoc = await db.collection('businesses').doc(businessId).get();
  if (!businessDoc.exists) {
    throw new Error(`Business '${businessId}' not found`);
  }

  // 2. Create Firebase Auth user
  const userRecord = await admin.auth().createUser({
    email,
    password,
    displayName,
  });

  // 3. Map Auth User to Business
  await db.collection('users').doc(userRecord.uid).set({
    businessId,
    email,
    role,
    createdAt: serverTimestamp(),
  });

  return { uid: userRecord.uid };
}

/**
 * Adds a new accountant to the office.
 * Equivalent to add_accountant.sh
 */
async function addAccountant({ email, password, displayName, role }) {
  // 1. Create Firebase Auth user
  const userRecord = await admin.auth().createUser({
    email,
    password,
    displayName,
  });

  // 2. Set Custom Claims
  await admin.auth().setCustomUserClaims(userRecord.uid, {
    isAccountant: true,
    role,
  });

  // 3. Create Accountant profile in Firestore
  await db.collection('accountants').doc(userRecord.uid).set({
    email,
    displayName,
    createdAt: serverTimestamp(),
  });

  return { uid: userRecord.uid };
}

/**
 * Sends a password reset email to the user.
 */
async function resetUserPassword({ email }) {
  // We don't need to use the Admin SDK to generate a link manually.
  // Instead, we can just return success, and the frontend will use the 
  // Client SDK (sendPasswordResetEmail) to trigger the built-in Firebase email.
  
  // We just verify the user exists first
  await admin.auth().getUserByEmail(email);
  
  return { success: true };
}

export {
  createClientBusiness,
  addUserToBusiness,
  addAccountant,
  resetUserPassword,
};
