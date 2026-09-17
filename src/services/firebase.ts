import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

/**
 * Firebase Client Configuration derived exclusively from Vite environment variables.
 * Never hardcode secrets or credentials in source files.
 */
const metaEnv = typeof import.meta !== 'undefined' && (import.meta as any).env ? (import.meta as any).env : {};

const firebaseConfig = {
  apiKey: metaEnv.VITE_FIREBASE_API_KEY || '',
  authDomain: metaEnv.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: metaEnv.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: metaEnv.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: metaEnv.VITE_FIREBASE_APP_ID || '',
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;
let isFirebaseConfigured = false;
let firebaseInitError: string | null = null;

// Graceful verification: Ensure required parameters are provided before initializing
if (firebaseConfig.apiKey && firebaseConfig.projectId) {
  try {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
    isFirebaseConfigured = true;
  } catch (err: any) {
    firebaseInitError = err?.message || 'Failed to initialize Firebase SDK';
    console.warn('[Firebase] Initialization error. Running in local fallback mode:', firebaseInitError);
  }
} else {
  // Graceful local development fallback: Log warning without crashing the app
  console.info(
    '[Firebase] Environment variables (VITE_FIREBASE_API_KEY, VITE_FIREBASE_PROJECT_ID) not detected. Operating in local / fallback mode.'
  );
}

export { app, auth, db, storage, isFirebaseConfigured, firebaseInitError };
export const defaultHotelSlug = metaEnv.VITE_DEFAULT_HOTEL_SLUG || 'swiss-flora-royal';

