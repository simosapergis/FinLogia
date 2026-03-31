import admin from 'firebase-admin';

async function run() {
  const args = process.argv.slice(2);
  if (args.length < 3) {
    console.error('Usage: node migrate_cross_project.js <source-project-id> <target-project-id> <target-business-id>');
    process.exit(1);
  }

  const sourceProjectId = args[0];
  const targetProjectId = args[1];
  const targetBusinessId = args[2];

  console.log(`Starting cross-project migration from ${sourceProjectId} to ${targetProjectId}`);
  console.log(`Target Business ID: ${targetBusinessId}`);

  const sourceApp = admin.initializeApp({
    projectId: sourceProjectId,
    storageBucket: `${sourceProjectId}.appspot.com`,
  }, 'source');

  const targetApp = admin.initializeApp({
    projectId: targetProjectId,
    storageBucket: `${targetProjectId}.appspot.com`,
  }, 'target');

  const sourceDb = sourceApp.firestore();
  const sourceBucket = sourceApp.storage().bucket();
  
  const targetDb = targetApp.firestore();
  const targetBucket = targetApp.storage().bucket();

  const collectionsToMigrate = [
    'suppliers',
    'metadata_invoices',
    'financial_entries',
    'recurring_expenses',
  ];

  console.log('\n--- Migrating Firestore Root Collections ---');
  for (const collectionName of collectionsToMigrate) {
    console.log(`Migrating collection: ${collectionName}...`);
    const snapshot = await sourceDb.collection(collectionName).get();
    
    if (snapshot.empty) {
      console.log(`  No documents found in ${collectionName}.`);
      continue;
    }

    let batch = targetDb.batch();
    let count = 0;
    let totalCount = 0;

    for (const doc of snapshot.docs) {
      const data = doc.data();
      const newDocRef = targetDb.collection('businesses').doc(targetBusinessId).collection(collectionName).doc(doc.id);

      // Special handling for metadata_invoices
      if (collectionName === 'metadata_invoices' && data.processedInvoicePath) {
        data.processedInvoicePath = `businesses/${targetBusinessId}/invoices/${doc.id}`;
      }

      batch.set(newDocRef, data);
      count++;
      totalCount++;

      if (count === 500) {
        await batch.commit();
        batch = targetDb.batch();
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
  const invoicesSnapshot = await sourceDb.collectionGroup('invoices').get();
  
  if (invoicesSnapshot.empty) {
    console.log('  No invoices found.');
  } else {
    let batch = targetDb.batch();
    let count = 0;
    let totalCount = 0;

    for (const doc of invoicesSnapshot.docs) {
      if (!doc.ref.path.startsWith('suppliers/')) {
        continue;
      }

      const data = doc.data();
      
      if (!data.supplierId) {
        const supplierId = doc.ref.parent.parent.id;
        data.supplierId = supplierId;
      }

      if (data.filePath) {
        const fileName = data.filePath.split('/').pop();
        data.filePath = `businesses/${targetBusinessId}/invoices/${fileName}`;
      }

      const newDocRef = targetDb.collection('businesses').doc(targetBusinessId).collection('invoices').doc(doc.id);
      batch.set(newDocRef, data);
      count++;
      totalCount++;

      if (count === 500) {
        await batch.commit();
        batch = targetDb.batch();
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
    const [files] = await sourceBucket.getFiles({ prefix: `${folder}/` });
    
    if (files.length === 0) {
      console.log(`  No files found in ${folder}.`);
      continue;
    }

    let copiedCount = 0;
    for (const file of files) {
      let newPath;
      if (file.name.startsWith('suppliers/') && file.name.includes('/invoices/')) {
        const fileName = file.name.split('/').pop();
        newPath = `businesses/${targetBusinessId}/invoices/${fileName}`;
      } else if (file.name.startsWith('uploads/')) {
        const suffix = file.name.substring('uploads/'.length);
        newPath = `businesses/${targetBusinessId}/uploads/${suffix}`;
      } else if (file.name.startsWith('invoices/')) {
        const fileName = file.name.split('/').pop();
        newPath = `businesses/${targetBusinessId}/invoices/${fileName}`;
      } else {
        continue;
      }
      
      try {
        // Cross-bucket copy requires downloading and uploading
        // file.copy() only works within the same location/bucket easily, or we can use targetBucket.file(newPath)
        // Let's try file.copy(targetBucket.file(newPath))
        await file.copy(targetBucket.file(newPath));
        copiedCount++;
      } catch (err) {
        console.error(`  Error copying ${file.name} to ${newPath}:`, err.message);
      }
    }
    console.log(`  Finished copying ${copiedCount} files from ${folder}.`);
  }

  console.log('\n=== Migration Completed Successfully ===');
  process.exit(0);
}

run().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});