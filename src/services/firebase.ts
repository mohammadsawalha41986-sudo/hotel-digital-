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

// Explicit Environment Detection Helpers
export const isDevEnvironment = (): boolean => {
  // Check Node.js process environment (used during tests or SSR)
  if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'production') {
    return false;
  }
  // Check Vite client environment
  if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
    if ((import.meta as any).env.DEV === true) return true;
    if ((import.meta as any).env.PROD === true) return false;
    if ((import.meta as any).env.MODE === 'production') return false;
  }
  return true;
};

export const isProductionEnvironment = (): boolean => !isDevEnvironment();

// Graceful verification: Ensure required parameters are provided before initializing
if (firebaseConfig.apiKey && firebaseConfig.projectId) {
  try {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    isFirebaseConfigured = true;

    // Decoupled Storage: Do not fail app or firestore initialization if Storage is unprovisioned
    if (firebaseConfig.storageBucket) {
      try {
        storage = getStorage(app);
      } catch (storageErr: any) {
        console.info('[Firebase] Storage not provisioned or disabled; skipping storage initialization:', storageErr?.message);
      }
    }
  } catch (err: any) {
    firebaseInitError = err?.message || 'Failed to initialize Firebase SDK';
    console.warn('[Firebase] Initialization error:', firebaseInitError);
  }
} else {
  if (isProductionEnvironment()) {
    firebaseInitError = 'Firebase credentials missing in production environment.';
    console.error('[Firebase CRITICAL] Missing Firebase credentials in production environment.');
  } else {
    // Graceful local development fallback: Log info without crashing the app
    console.info(
      '[Firebase] Environment variables (VITE_FIREBASE_API_KEY, VITE_FIREBASE_PROJECT_ID) not detected. Operating in local / dev fallback mode.'
    );
  }
}

export { app, auth, db, storage, isFirebaseConfigured, firebaseInitError };
export const defaultHotelSlug = metaEnv.VITE_DEFAULT_HOTEL_SLUG || 'swiss-flora-royal';


