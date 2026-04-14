import * as admin from 'firebase-admin';

export default async function globalSetup() {
  // Initialize the admin SDK with a dummy project ID
  if (!admin.apps.length) {
    admin.initializeApp({
      projectId: 'finlogia-demo',
    });
  }

  const auth = admin.auth();
  const db = admin.firestore();

  console.log('Seeding Firebase Emulators for E2E tests...');

  try {
    // 1. Create Accountant User
    const accountantEmail = 'accountant@test.com';
    const accountantPassword = 'password123';
    let accountantRecord;
    try {
      accountantRecord = await auth.getUserByEmail(accountantEmail);
      console.log('User already exists:', accountantRecord.uid);
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        accountantRecord = await auth.createUser({
          email: accountantEmail,
          password: accountantPassword,
          displayName: 'Test Accountant',
        });
        console.log('User created:', accountantRecord.uid);
      } else {
        throw error;
      }
    }

    // Set custom claims for the accountant
    await auth.setCustomUserClaims(accountantRecord.uid, {
      isAccountant: true,
      role: 'accountant',
    });
    console.log('Accountant created with UID:', accountantRecord.uid);

    // 2. Create Business Owner User
    const businessEmail = 'owner@test.com';
    const businessPassword = 'password123';
    let businessRecord;
    try {
      businessRecord = await auth.getUserByEmail(businessEmail);
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        businessRecord = await auth.createUser({
          email: businessEmail,
          password: businessPassword,
          displayName: 'Test Business Owner',
        });
      } else {
        throw error;
      }
    }

    // 3. Create Business Documents
    const clientAId = 'clientA';
    const clientBId = 'clientB';

    await db.collection('businesses').doc(clientAId).set({
      name: 'Client A Business',
      vatNumber: '111111111',
    });

    await db.collection('businesses').doc(clientBId).set({
      name: 'Client B Business',
      vatNumber: '222222222',
    });

    // Link business owner to Client A
    await db.collection('users').doc(businessRecord.uid).set({
      businessId: clientAId,
      role: 'business',
    });

    // Link accountant to accountant collection
    await db.collection('accountants').doc(accountantRecord.uid).set({
      name: 'Test Accountant',
      email: accountantEmail,
    });

    // 4. Create Mock Invoices
    await db.collection('businesses').doc(clientAId).collection('invoices').doc('inv-A-1').set({
      invoiceNumber: 'INV-A-001',
      supplierName: 'Supplier A',
      totalAmount: 100,
      uploadedAt: admin.firestore.FieldValue.serverTimestamp(),
      invoiceDate: admin.firestore.FieldValue.serverTimestamp(),
    });

    await db.collection('businesses').doc(clientBId).collection('invoices').doc('inv-B-1').set({
      invoiceNumber: 'INV-B-001',
      supplierName: 'Supplier B',
      totalAmount: 200,
      uploadedAt: admin.firestore.FieldValue.serverTimestamp(),
      invoiceDate: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log('Seeding complete.');
  } catch (error) {
    console.error('Error seeding data:', error);
    throw error;
  }
}
