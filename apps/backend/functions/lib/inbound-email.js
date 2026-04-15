import { onRequest } from 'firebase-functions/v2/https';
import busboy from 'busboy';
import os from 'os';
import path from 'path';
import fs from 'fs';
import crypto from 'node:crypto';
import { db, storage, getBucketName, METADATA_INVOICE_COLLECTION, serverTimestamp } from './config.js';
import { sendOcrErrorEmail } from './email-utils.js';

export const handleInboundEmail = onRequest(
  {
    region: 'europe-west3',
    minInstances: 0,
  },
  (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).send('Method Not Allowed');
      return;
    }

    const bb = busboy({ headers: req.headers });
    const tmpdir = os.tmpdir();
    const uploads = [];
    const fields = {};
    const fileWrites = [];

    bb.on('field', (fieldname, val) => {
      fields[fieldname] = val;
    });

    bb.on('file', (fieldname, file, info) => {
      const { filename, mimeType } = info;
      
      // Only accept PDF files
      if (mimeType !== 'application/pdf' && !filename.toLowerCase().endsWith('.pdf')) {
        console.log(`Ignoring non-PDF attachment: ${filename} (${mimeType})`);
        file.resume(); // Consume the stream to avoid hanging
        return;
      }

      const filepath = path.join(tmpdir, `${crypto.randomUUID()}-${filename}`);
      const writeStream = fs.createWriteStream(filepath);
      file.pipe(writeStream);
      
      const writePromise = new Promise((resolve, reject) => {
        file.on('end', () => {
          writeStream.end();
        });
        writeStream.on('finish', () => {
          uploads.push({ filepath, filename, mimeType });
          resolve();
        });
        writeStream.on('error', reject);
      });
      
      fileWrites.push(writePromise);
    });

    bb.on('close', async () => {
      try {
        await Promise.all(fileWrites);

        const toAddress = fields.to || '';
        const fromAddress = fields.from || '';

        // Extract sender email from 'from' address
        // Format can be "Name <email@example.com>" or just "email@example.com"
        let senderEmail = fromAddress;
        const fromMatch = fromAddress.match(/<([^>]+)>/);
        if (fromMatch) {
          senderEmail = fromMatch[1];
        }
        senderEmail = senderEmail.trim();

        // Extract businessId from 'to' address
        // Expected format: upload-<businessId>@office.invoices.finlogia.online
        const toMatch = toAddress.match(/upload-([^@]+)@/i);
        if (!toMatch) {
          console.warn(`Could not extract businessId from 'to' address: ${toAddress}`);
          if (senderEmail) {
            await sendOcrErrorEmail(senderEmail, `Η διεύθυνση email παραλήπτη δεν είναι έγκυρη (${toAddress}).`);
          }
          res.status(400).send('Invalid recipient address');
          return;
        }
        const businessId = toMatch[1];

        // Verify business exists
        const businessDoc = await db.collection('businesses').doc(businessId).get();
        if (!businessDoc.exists) {
          console.warn(`Business not found: ${businessId}`);
          if (senderEmail) {
            await sendOcrErrorEmail(senderEmail, `Δεν βρέθηκε επιχείρηση με αυτό το αναγνωριστικό (${businessId}).`);
          }
          res.status(404).send('Business not found');
          return;
        }

        // Verify sender is authorized
        const usersQuery = await db.collection('users')
          .where('email', '==', senderEmail)
          .where('businessId', '==', businessId)
          .limit(1)
          .get();
        
        const businessData = businessDoc.data();
        const authorizedEmails = businessData.authorizedEmails || [];
        
        let ownerUid = null;
        let ownerName = null;
        
        if (!usersQuery.empty) {
          // Sender is a registered user for this business
          const userDoc = usersQuery.docs[0];
          ownerUid = userDoc.id;
          // We don't have displayName in users collection, but we could fetch it from auth if needed.
          // For now, leaving ownerName as null or we could use the email.
        } else if (authorizedEmails.includes(senderEmail)) {
          // Sender is in the authorized emails list
          // ownerUid remains null
        } else {
          console.warn(`Unauthorized sender: ${senderEmail} for business: ${businessId}`);
          await sendOcrErrorEmail(senderEmail, `Δεν έχετε εξουσιοδότηση να ανεβάσετε τιμολόγια για αυτή την επιχείρηση.`);
          res.status(403).send('Unauthorized sender');
          return;
        }

        if (uploads.length === 0) {
          console.warn(`No valid PDF attachments found from ${senderEmail}`);
          await sendOcrErrorEmail(senderEmail, `Δεν βρέθηκαν έγκυρα αρχεία PDF στο email σας. Παρακαλώ επισυνάψτε μόνο αρχεία PDF.`);
          res.status(400).send('No valid PDF attachments');
          return;
        }

        const bucketName = getBucketName();
        const bucket = storage.bucket(bucketName);

        // Process each PDF attachment
        for (const upload of uploads) {
          const invoiceId = db.collection('businesses').doc(businessId).collection('invoices').doc().id;
          
          // Create initial metadata document
          const metadataRef = db.collection('businesses').doc(businessId).collection(METADATA_INVOICE_COLLECTION).doc(invoiceId);
          await metadataRef.set({
            invoiceId,
            businessId,
            status: 'pending',
            totalPages: 1,
            senderEmail,
            ownerUid,
            ownerName,
            bucket: bucketName,
            storageFolder: `businesses/${businessId}/uploads/${invoiceId}`,
            isPaidAtUpload: true, // Invoices from email are always marked as paid
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });

          // Upload file to Storage
          const destinationPath = `businesses/${businessId}/uploads/${invoiceId}/page-1-${upload.filename}`;
          await bucket.upload(upload.filepath, {
            destination: destinationPath,
            metadata: {
              contentType: upload.mimeType,
            }
          });

          console.log(`Uploaded ${upload.filename} for business ${businessId} to ${destinationPath}`);
          
          // Clean up temp file
          fs.unlinkSync(upload.filepath);
        }

        res.status(200).send('OK');
      } catch (error) {
        console.error('Error processing inbound email:', error);
        // Clean up any remaining temp files
        for (const upload of uploads) {
          if (fs.existsSync(upload.filepath)) {
            fs.unlinkSync(upload.filepath);
          }
        }
        res.status(500).send('Internal Server Error');
      }
    });

    if (req.rawBody) {
      bb.end(req.rawBody);
    } else {
      req.pipe(bb);
    }
  }
);
