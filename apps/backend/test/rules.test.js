import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { describe, it, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let testEnv;

beforeAll(async () => {
  // Load rules files
  const firestoreRules = readFileSync(resolve(__dirname, '../firestore.rules'), 'utf8');
  const storageRules = readFileSync(resolve(__dirname, '../storage.rules'), 'utf8');

  // Initialize test environment
  testEnv = await initializeTestEnvironment({
    projectId: 'finlogia-rules-test',
    firestore: {
      rules: firestoreRules,
      host: '127.0.0.1',
      port: 8080,
    },
    storage: {
      rules: storageRules,
      host: '127.0.0.1',
      port: 9199,
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  await testEnv.clearStorage();
});

describe('Firestore Security Rules', () => {
  it('should deny unauthenticated access', async () => {
    const unauthedDb = testEnv.unauthenticatedContext().firestore();
    await assertFails(unauthedDb.collection('businesses').doc('business_A').get());
  });

  it('should prevent cross-tenant leakage', async () => {
    // Setup test data
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await db.collection('users').doc('user_A').set({ businessId: 'business_A' });
      await db.collection('businesses').doc('business_B').collection('invoices').doc('inv1').set({ amount: 100 });
    });

    const authedDb = testEnv.authenticatedContext('user_A').firestore();
    
    // Attempt to read Business B's data as User A (who belongs to Business A)
    await assertFails(authedDb.collection('businesses').doc('business_B').collection('invoices').doc('inv1').get());
  });

  it('should allow business owner access to their own data', async () => {
    // Setup test data
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await db.collection('users').doc('user_A').set({ businessId: 'business_A' });
      await db.collection('businesses').doc('business_A').collection('metadata_invoices').doc('meta1').set({ ownerUid: 'user_A' });
    });

    const authedDb = testEnv.authenticatedContext('user_A').firestore();
    
    // Attempt to read Business A's data as User A
    await assertSucceeds(authedDb.collection('businesses').doc('business_A').collection('metadata_invoices').doc('meta1').get());
  });

  it('should enforce accountant least privilege', async () => {
    // Setup test data
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await db.collection('businesses').doc('business_A').collection('invoices').doc('inv1').set({ amount: 100 });
    });

    // Authenticate as accountant (custom claim isAccountant: true)
    const accountantDb = testEnv.authenticatedContext('accountant_X', { isAccountant: true }).firestore();
    
    // Accountant can read invoices
    await assertSucceeds(accountantDb.collection('businesses').doc('business_A').collection('invoices').doc('inv1').get());
    
    // Accountant CANNOT write invoices
    await assertFails(accountantDb.collection('businesses').doc('business_A').collection('invoices').doc('inv1').set({ amount: 200 }));
  });
});

describe('Storage Security Rules', () => {
  it('should deny unauthenticated access', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const storage = context.storage();
      await storage.ref('businesses/business_A/invoices/file.pdf').putString('fake-content');
    });

    const unauthedStorage = testEnv.unauthenticatedContext().storage();
    const fileRef = unauthedStorage.ref('businesses/business_A/invoices/file.pdf');
    await assertFails(fileRef.getDownloadURL());
  });

  it('should prevent cross-tenant leakage', async () => {
    // Setup test data
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await db.collection('users').doc('user_A').set({ businessId: 'business_A' });
      
      const storage = context.storage();
      await storage.ref('businesses/business_B/invoices/file.pdf').putString('fake-content');
    });

    const authedStorage = testEnv.authenticatedContext('user_A').storage();
    const fileRef = authedStorage.ref('businesses/business_B/invoices/file.pdf');
    
    // Attempt to read Business B's storage as User A
    await assertFails(fileRef.getDownloadURL());
  });

  it('should allow accountant to read PDFs but not other files', async () => {
    // Setup test data: upload the files first!
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const storage = context.storage();
      await storage.ref('businesses/business_A/invoices/invoice.pdf').putString('fake-pdf-content');
      await storage.ref('businesses/business_A/invoices/invoice.jpg').putString('fake-jpg-content');
    });

    const accountantStorage = testEnv.authenticatedContext('accountant_X', { isAccountant: true }).storage();
    
    // Accountant can read PDF
    const pdfRef = accountantStorage.ref('businesses/business_A/invoices/invoice.pdf');
    await assertSucceeds(pdfRef.getDownloadURL());
    
    // Accountant CANNOT read JPG
    const jpgRef = accountantStorage.ref('businesses/business_A/invoices/invoice.jpg');
    await assertFails(jpgRef.getDownloadURL());
  });
});
