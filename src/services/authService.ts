import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db, isFirebaseConfigured, isDevEnvironment } from './firebase';
import { AdminUser, StaffRole, canonicalizeStaffRole } from '../types/auth';

// In-memory active authenticated user
let currentAdminUser: AdminUser | null = null;
const listeners: Array<(user: AdminUser | null, loading: boolean) => void> = [];

function notifyListeners(loading: boolean) {
  listeners.forEach((fn) => fn(currentAdminUser, loading));
}

// Development session fallback key (session-only, never persisted long term)
const DEV_SESSION_KEY = 'hotel_hub_dev_admin_session';

/**
 * Maps a Firebase user and Firestore profile/claims to a typed AdminUser
 */
async function resolveAdminProfile(firebaseUser: FirebaseUser): Promise<AdminUser> {
  let role: StaffRole = 'HOTEL_ADMIN';
  let allowedHotelIds: string[] = [];
  let displayName = firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Staff Member';

  // 1. Attempt to read custom claims if provisioned
  try {
    const idTokenResult = await firebaseUser.getIdTokenResult();
    if (idTokenResult.claims.role) {
      role = canonicalizeStaffRole(String(idTokenResult.claims.role));
    }
    if (Array.isArray(idTokenResult.claims.allowedHotelIds)) {
      allowedHotelIds = idTokenResult.claims.allowedHotelIds as string[];
    }
  } catch (err) {
    console.warn('[AuthService] Could not read token claims:', err);
  }

  // 2. Attempt to read Firestore admin document if db is available
  if (db) {
    try {
      const adminDocRef = doc(db, 'admins', firebaseUser.uid);
      const snapshot = await getDoc(adminDocRef);
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.role) role = canonicalizeStaffRole(String(data.role));
        if (Array.isArray(data.allowedHotelIds)) allowedHotelIds = data.allowedHotelIds;
        if (data.displayName) displayName = data.displayName;
      }
    } catch (err) {
      console.warn('[AuthService] Could not fetch admin profile from Firestore:', err);
    }
  }

  // If role is SUPER_ADMIN and no hotels specified, default to all
  if (role === 'SUPER_ADMIN' && allowedHotelIds.length === 0) {
    allowedHotelIds = ['*'];
  }

  return {
    uid: firebaseUser.uid,
    email: firebaseUser.email || '',
    displayName,
    role,
    allowedHotelIds,
    lastLoginAt: new Date().toISOString(),
  };
}

/**
 * Initializes Firebase Auth observer or development fallback
 */
export function initializeAuthObserver(): void {
  if (isFirebaseConfigured && auth) {
    onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        currentAdminUser = await resolveAdminProfile(firebaseUser);
        notifyListeners(false);
      } else {
        currentAdminUser = null;
        notifyListeners(false);
      }
    });
  } else {
    // In production, NEVER restore dev session storage
    if (!isDevEnvironment()) {
      currentAdminUser = null;
      notifyListeners(false);
      return;
    }

    // Development fallback mode: Check sessionStorage for active session
    try {
      const saved = sessionStorage.getItem(DEV_SESSION_KEY);
      if (saved) {
        currentAdminUser = JSON.parse(saved);
      }
    } catch (e) {
      currentAdminUser = null;
    }
    notifyListeners(false);
  }
}

// Auto-initialize observer
initializeAuthObserver();

/**
 * Sign in admin user with email and password
 */
export async function loginAdmin(email: string, pass: string): Promise<AdminUser> {
  const cleanEmail = email.trim().toLowerCase();
  
  if (isFirebaseConfigured && auth) {
    const credential = await signInWithEmailAndPassword(auth, cleanEmail, pass);
    currentAdminUser = await resolveAdminProfile(credential.user);
    notifyListeners(false);
    return currentAdminUser;
  }

  // CRITICAL PRODUCTION HARDENING GUARD:
  // Fallback dev authentication is strictly prohibited in production builds!
  if (!isDevEnvironment()) {
    throw new Error(
      'Authentication service is unavailable: Production mode requires active Firebase credentials. Local fallback authentication is disabled.'
    );
  }

  // Development Fallback Mode (only active in development when Firebase environment variables are missing)
  if (!cleanEmail || !pass) {
    throw new Error('Please provide both email and password.');
  }

  if (pass.length < 6) {
    throw new Error('Password must be at least 6 characters.');
  }

  // Determine demo role from email prefix for dev testing
  let devRole: StaffRole = 'HOTEL_ADMIN';
  let allowedHotels = ['11', 'royal', 'swiss-flora-royal'];

  if (cleanEmail.startsWith('super') || cleanEmail.startsWith('admin@')) {
    devRole = 'SUPER_ADMIN';
    allowedHotels = ['*'];
  } else if (cleanEmail.startsWith('fnb')) {
    devRole = 'FNB_MANAGER';
  } else if (cleanEmail.startsWith('housekeeping')) {
    devRole = 'HOUSEKEEPING_SUPERVISOR';
  } else if (cleanEmail.startsWith('laundry')) {
    devRole = 'LAUNDRY_MANAGER';
  } else if (cleanEmail.startsWith('engineering')) {
    devRole = 'ENGINEERING_CHIEF';
  } else if (cleanEmail.startsWith('spa')) {
    devRole = 'SPA_MANAGER';
  } else if (cleanEmail.startsWith('frontoffice') || cleanEmail.startsWith('reception')) {
    devRole = 'FRONT_OFFICE';
  } else if (cleanEmail.startsWith('editor')) {
    devRole = 'CONTENT_EDITOR';
  } else if (cleanEmail.startsWith('viewer')) {
    devRole = 'VIEWER';
  }

  currentAdminUser = {
    uid: `dev-user-${Date.now()}`,
    email: cleanEmail,
    displayName: cleanEmail.split('@')[0].toUpperCase(),
    role: canonicalizeStaffRole(devRole),
    allowedHotelIds: allowedHotels,
    lastLoginAt: new Date().toISOString(),
  };

  try {
    sessionStorage.setItem(DEV_SESSION_KEY, JSON.stringify(currentAdminUser));
  } catch (e) {
    // ignore
  }

  notifyListeners(false);
  return currentAdminUser;
}

/**
 * Signs out the currently authenticated admin
 */
export async function logoutAdmin(): Promise<void> {
  if (isFirebaseConfigured && auth) {
    await signOut(auth);
  } else {
    try {
      sessionStorage.removeItem(DEV_SESSION_KEY);
    } catch (e) {
      // ignore
    }
  }
  currentAdminUser = null;
  notifyListeners(false);
}

/**
 * Gets the current active admin user synchronously
 */
export function getCurrentAdminUser(): AdminUser | null {
  return currentAdminUser;
}

/**
 * Subscribes to authentication state changes
 */
export function subscribeToAuthState(
  callback: (user: AdminUser | null, loading: boolean) => void
): () => void {
  listeners.push(callback);
  // Initial callback with current state
  callback(currentAdminUser, false);

  return () => {
    const idx = listeners.indexOf(callback);
    if (idx !== -1) listeners.splice(idx, 1);
  };
}

/**
 * Standard alias for signOut
 */
export const signOutAdminUser = logoutAdmin;

/**
 * Standard alias for onAuthStateChanged observer
 */
export function onAuthStateChangedListener(
  callback: (user: AdminUser | null) => void
): () => void {
  return subscribeToAuthState((user) => callback(user));
}

