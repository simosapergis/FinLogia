import admin from 'firebase-admin';

async function run() {
  const projectId = 'finlogia-mdellatolas';

  admin.initializeApp({
    projectId: projectId,
  });

  const db = admin.firestore();

  const clients = [
    {
      uid: 'ljUjXwrMYcOgvNkLpylPjrWuPkg2',
      email: 'amiselitinos@gmail.com',
      displayName: 'Αμισέλι Τήνος',
      businessId: 'finlogia-amiseli',
    },
    {
      uid: 'fUvrNntwJ7aTRfuLfPHRCbPRN6F3',
      email: 'kaloumenouelisavet@gmail.com',
      displayName: 'Ελισάβετ Καλουμένου',
      businessId: 'finlogia-elisavet-kaloumenou',
    },
    {
      uid: 'ZrHSliqz3NPmkhdF1ihzHBey7hy2',
      email: 'georg.giann1991@gmail.com',
      displayName: 'Γιώργος Γιαννακάκης',
      businessId: 'finlogia-ggiannakakis',
    },
    {
      uid: 'w7GPJiSHwOTh9P3iHVvGCA9fpPn1',
      email: 'giorgosmavris.gm@gmail.com',
      displayName: 'Γιώργος Μαυρής',
      businessId: 'finlogia-gmavris',
    },
    {
      uid: 'aaNm1H7hDqPR3c4ImVkJGn47oi92',
      email: 'nvotsis@otenet.gr',
      displayName: 'Νίκος Βότσης',
      businessId: 'finlogia-nvotsis',
    },
    {
      uid: 'ziZte1GTn5NMd306AmCYmcqICxp2',
      email: 'zotfos@gmail.com',
      displayName: 'Φόνσος Σωτήρης',
      businessId: 'finlogia-zotfos',
    }
  ];

  console.log(`Setting up imported users in ${projectId}...`);

  for (const client of clients) {
    console.log(`\nProcessing ${client.email} (${client.businessId})...`);
    
    // 1. Create Business profile
    await db.collection('businesses').doc(client.businessId).set({
      displayName: client.displayName,
      bucketName: `${client.businessId}.appspot.com`,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log(`  -> Created business profile: businesses/${client.businessId}`);

    // 2. Map User to Business
    await db.collection('users').doc(client.uid).set({
      businessId: client.businessId,
      role: 'owner',
      email: client.email,
      displayName: client.displayName,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log(`  -> Created user mapping: users/${client.uid}`);
  }

  console.log('\nAll users set up successfully.');
  process.exit(0);
}

run().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});