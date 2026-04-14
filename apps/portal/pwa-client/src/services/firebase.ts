import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'finlogia-demo',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'finlogia-demo.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'finlogia-demo',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'finlogia-demo.appspot.com',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '123456789',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:123456789:web:abcdef',
};

export const firebaseApp = initializeApp(firebaseConfig);

if (import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true') {
  try {
    const auth = getAuth(firebaseApp);
    connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });

    const db = getFirestore(firebaseApp);
    connectFirestoreEmulator(db, 'localhost', 8080);

    const storage = getStorage(firebaseApp);
    connectStorageEmulator(storage, 'localhost', 9199);
  } catch (e) {
    console.error('Emulator connection error:', e);
  }
}
