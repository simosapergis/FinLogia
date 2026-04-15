import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';

// Load service account key
const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || path.resolve(process.cwd(), 'service-account.json');
if (!fs.existsSync(serviceAccountPath)) {
  console.error(`Service account key not found at ${serviceAccountPath}`);
  console.error('Please set GOOGLE_APPLICATION_CREDENTIALS or place service-account.json in the current directory');
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore();

async function migrateSettlementDates() {
  console.log('Starting migration of settlement dates for paid invoices...');
  
  try {
    const businessesSnapshot = await db.collection('businesses').get();
    let totalUpdated = 0;
    let totalSkipped = 0;

    for (const businessDoc of businessesSnapshot.docs) {
      const businessId = businessDoc.id;
      console.log(`\nProcessing business: ${businessId}`);
      
      const invoicesRef = businessDoc.ref.collection('invoices');
      const paidInvoicesSnapshot = await invoicesRef.where('paymentStatus', '==', 'paid').get();
      
      console.log(`Found ${paidInvoicesSnapshot.size} paid invoices.`);
      
      let businessUpdated = 0;
      let businessSkipped = 0;
      
      const batch = db.batch();
      let batchCount = 0;

      for (const invoiceDoc of paidInvoicesSnapshot.docs) {
        const invoiceData = invoiceDoc.data();
        
        // Skip if it already has a settlementDate
        if (invoiceData.settlementDate) {
          businessSkipped++;
          continue;
        }

        let settlementDate = null;

        // Try to get the latest date from paymentHistory
        if (invoiceData.paymentHistory && invoiceData.paymentHistory.length > 0) {
          let latestDate = invoiceData.paymentHistory[0].paymentDate;
          for (const entry of invoiceData.paymentHistory) {
            if (entry.paymentDate && entry.paymentDate.toMillis() > latestDate.toMillis()) {
              latestDate = entry.paymentDate;
            }
          }
          settlementDate = latestDate;
        } 
        // Fallback to invoiceDate
        else if (invoiceData.invoiceDate) {
          settlementDate = invoiceData.invoiceDate;
        }

        if (settlementDate) {
          batch.update(invoiceDoc.ref, { settlementDate });
          businessUpdated++;
          batchCount++;

          if (batchCount >= 500) {
            await batch.commit();
            batchCount = 0;
          }
        } else {
          console.warn(`Warning: Invoice ${invoiceDoc.id} has no paymentHistory or invoiceDate to derive settlementDate.`);
          businessSkipped++;
        }
      }

      if (batchCount > 0) {
        await batch.commit();
      }

      console.log(`Business ${businessId} summary: Updated ${businessUpdated}, Skipped ${businessSkipped}`);
      totalUpdated += businessUpdated;
      totalSkipped += businessSkipped;
    }

    console.log('\nMigration completed successfully!');
    console.log(`Total Updated: ${totalUpdated}`);
    console.log(`Total Skipped: ${totalSkipped}`);
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

migrateSettlementDates().then(() => process.exit(0));
