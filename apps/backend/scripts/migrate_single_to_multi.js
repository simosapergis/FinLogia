import admin from 'firebase-admin';

async function run() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error('Usage: node migrate_single_to_multi.js <project-id> <target-business-id>');
    process.exit(1);
  }

  const projectId = args[0];
  const targetBusinessId = args[1];

  console.log(`Starting migration for project: ${projectId}`);
  console.log(`Target Business ID: ${targetBusinessId}`);

  admin.initializeApp({
    projectId: projectId,
    storageBucket: `${projectId}.appspot.com`,
  });

  const db = admin.firestore();
  const bucket = admin.storage().bucket();

  const collectionsToMigrate = [
    'suppliers',
    'metadata_invoices',
    'financial_entries',
    'recurring_expenses',
  ];

  console.log('\n--- Migrating Firestore Root Collections ---');
  for (const collectionName of collectionsToMigrate) {
    console.log(`Migrating collection: ${collectionName}...`);
    const snapshot = await db.collection(collectionName).get();
    
    if (snapshot.empty) {
      console.log(`  No documents found in ${collectionName}.`);
      continue;
    }

    let batch = db.batch();
    let count = 0;
    let totalCount = 0;

    for (const doc of snapshot.docs) {
      const data = doc.data();
      const newDocRef = db.collection('businesses').doc(targetBusinessId).collection(collectionName).doc(doc.id);

      // Special handling for metadata_invoices
      if (collectionName === 'metadata_invoices' && data.processedInvoicePath) {
        data.processedInvoicePath = `businesses/${targetBusinessId}/invoices/${doc.id}`;
      }

      batch.set(newDocRef, data);
      count++;
      totalCount++;

      if (count === 500) {
        await batch.commit();
        batch = db.batch();
        count = 0;
        console.log(`  Copied ${totalCount} documents so far...`);
      }
    }

    if (count > 0) {
      await batch.commit();
    }
    console.log(`  Finished copying ${totalCount} documents in ${collectionName}.`);
  }

  console.log('\n--- Migrating Invoices (from suppliers subcollections) ---');
  const invoicesSnapshot = await db.collectionGroup('invoices').get();
  
  if (invoicesSnapshot.empty) {
    console.log('  No invoices found.');
  } else {
    let batch = db.batch();
    let count = 0;
    let totalCount = 0;

    for (const doc of invoicesSnapshot.docs) {
      // Only migrate invoices that are actually under suppliers/{supplierId}/invoices
      // to avoid migrating already migrated ones if run twice
      if (!doc.ref.path.startsWith('suppliers/')) {
        continue;
      }

      const data = doc.data();
      
      // Ensure supplierId is set in the invoice document (it should be, but just in case)
      if (!data.supplierId) {
        const supplierId = doc.ref.parent.parent.id;
        data.supplierId = supplierId;
      }

      // Also update the filePath if it exists
      if (data.filePath) {
        // e.g. suppliers/sup-1/invoices/inv-1.pdf -> businesses/{targetBusinessId}/invoices/inv-1.pdf
        const fileName = data.filePath.split('/').pop();
        data.filePath = `businesses/${targetBusinessId}/invoices/${fileName}`;
      }

      const newDocRef = db.collection('businesses').doc(targetBusinessId).collection('invoices').doc(doc.id);
      batch.set(newDocRef, data);
      count++;
      totalCount++;

      if (count === 500) {
        await batch.commit();
        batch = db.batch();
        count = 0;
        console.log(`  Copied ${totalCount} invoices so far...`);
      }
    }

    if (count > 0) {
      await batch.commit();
    }
    console.log(`  Finished copying ${totalCount} invoices.`);
  }

  console.log('\n--- Migrating Cloud Storage ---');
  const foldersToMigrate = ['invoices', 'uploads', 'suppliers'];

  for (const folder of foldersToMigrate) {
    console.log(`Migrating folder: ${folder}...`);
    const [files] = await bucket.getFiles({ prefix: `${folder}/` });
    
    if (files.length === 0) {
      console.log(`  No files found in ${folder}.`);
      continue;
    }

    let copiedCount = 0;
    for (const file of files) {
      // file.name is like 'suppliers/sup-1/invoices/inv-1.pdf' or 'uploads/inv-1/page-1.jpg'
      // We want to flatten invoices to `businesses/{targetBusinessId}/invoices/{filename}`
      // and uploads to `businesses/{targetBusinessId}/uploads/{filename}`
      
      let newPath;
      if (file.name.startsWith('suppliers/') && file.name.includes('/invoices/')) {
        const fileName = file.name.split('/').pop();
        newPath = `businesses/${targetBusinessId}/invoices/${fileName}`;
      } else if (file.name.startsWith('uploads/')) {
        // uploads/inv-1/page-1.jpg -> businesses/{targetBusinessId}/uploads/inv-1/page-1.jpg
        const suffix = file.name.substring('uploads/'.length);
        newPath = `businesses/${targetBusinessId}/uploads/${suffix}`;
      } else if (file.name.startsWith('invoices/')) {
        // just in case there are files directly in invoices/
        const fileName = file.name.split('/').pop();
        newPath = `businesses/${targetBusinessId}/invoices/${fileName}`;
      } else {
        // Skip other files for now
        continue;
      }
      
      try {
        await file.copy(bucket.file(newPath));
        copiedCount++;
      } catch (err) {
        console.error(`  Error copying ${file.name} to ${newPath}:`, err.message);
      }
    }
    console.log(`  Finished copying ${copiedCount} files from ${folder}.`);
  }

  console.log('\n=== Migration Completed Successfully ===');
  console.log('NOTE: Original root collections and storage folders were NOT deleted.');
  process.exit(0);
}

run().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});