import { db, ACCOUNTANTS_COLLECTION, CLIENTS_SUBCOLLECTION } from './config.js';

async function listAccountantClients(accountantId) {
  const snapshot = await db
    .collection(ACCOUNTANTS_COLLECTION)
    .doc(accountantId)
    .collection(CLIENTS_SUBCOLLECTION)
    .orderBy('displayName')
    .get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
}

export { listAccountantClients };
