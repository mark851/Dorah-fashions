import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
  updateProfile,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDocFromServer,
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../firebase-applet-config.json';

// ============================================================================
// Domain & Hosting Configuration (Spaceship -> cPanel -> Firebase SDK)
// ============================================================================
export const PRODUCTION_DOMAIN = 'dorafashions.online';
export const PRODUCTION_ORIGINS = [
  'https://dorafashions.online',
  'https://www.dorafashions.online',
];

// Single shared Firebase app instance configured in code
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const storage = getStorage(app);

export { firebaseConfig };

// ============================================================================
// Standard Firebase Google Auth Provider (Basic Profile & Email ONLY)
// Zero sensitive Workspace scopes so users are never blocked by Google's
// unverified OAuth scope screen!
// ============================================================================
const provider = new GoogleAuthProvider();
provider.setCustomParameters({
  prompt: 'select_account',
});

let isSigningIn = false;
let cachedAccessToken: string | null = null;

export const initAuth = (
  onAuthSuccess?: (user: User, token: string | null) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (onAuthSuccess) {
        onAuthSuccess(user, cachedAccessToken);
      }
    } else {
      if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    }
  });
};

/**
 * Standard Google Sign-In using only basic profile/email scopes.
 */
export const googleSignIn = async (): Promise<{
  user: User;
  accessToken: string | null;
} | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    cachedAccessToken = credential?.accessToken || null;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: unknown) {
    console.error('Sign in error:', error);
    if (
      error instanceof Error &&
      error.message.includes('auth/unauthorized-domain')
    ) {
      throw new Error(
        `Domain "${window.location.hostname}" is not yet listed in Firebase Authorized Domains. Go to Firebase Console -> Authentication -> Settings -> Authorized domains and add "${PRODUCTION_DOMAIN}" and "www.${PRODUCTION_DOMAIN}".`
      );
    }
    throw error;
  } finally {
    isSigningIn = false;
  }
};

/**
 * Email & Password Sign-In or Account Creation.
 * Allows customers and administrators to sign in directly without opening
 * Google's external OAuth consent screen.
 */
export const emailPasswordAuth = async (params: {
  email: string;
  password: string;
  mode: 'signin' | 'signup';
  displayName?: string;
}): Promise<User> => {
  const cleanEmail = params.email.trim().toLowerCase();
  const cleanPassword = params.password;
  if (params.mode === 'signup') {
    const cred = await createUserWithEmailAndPassword(
      auth,
      cleanEmail,
      cleanPassword
    );
    if (params.displayName?.trim()) {
      await updateProfile(cred.user, {
        displayName: params.displayName.trim(),
      });
    }
    return cred.user;
  } else {
    try {
      const cred = await signInWithEmailAndPassword(
        auth,
        cleanEmail,
        cleanPassword
      );
      return cred.user;
    } catch (err: unknown) {
      // If user hasn't created their password account yet, automatically create it on first login if valid password
      const msg = err instanceof Error ? err.message : String(err);
      if (
        msg.includes('auth/user-not-found') ||
        msg.includes('auth/invalid-credential')
      ) {
        try {
          const created = await createUserWithEmailAndPassword(
            auth,
            cleanEmail,
            cleanPassword
          );
          if (params.displayName?.trim()) {
            await updateProfile(created.user, {
              displayName: params.displayName.trim(),
            });
          }
          return created.user;
        } catch {
          throw err;
        }
      }
      throw err;
    }
  }
};

/**
 * Ensures a customer session exists for placing orders or submitting reviews
 * without forcing a Google OAuth popup.
 */
export const ensureCustomerSession = async (): Promise<User | null> => {
  if (auth.currentUser) {
    return auth.currentUser;
  }
  try {
    const anonCred = await signInAnonymously(auth);
    return anonCred.user;
  } catch {
    return null;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const logout = async () => {
  await auth.signOut();
  cachedAccessToken = null;
};

// ============================================================================
// Boot-Time Firestore Connection Validation
// ============================================================================
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes('the client is offline')
    ) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
testConnection();

// ============================================================================
// Standardized Firestore Permission & Operation Error Handler
// ============================================================================
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: boolean | string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((p) => ({
          providerId: p.providerId,
          email: p.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const BOOTSTRAPPED_ADMIN_EMAIL = 'markniaras@gmail.com';
export const ADMIN_EMAILS = [
  'markniaras@gmail.com',
  'namatakadoreen89@gmail.com',
];

export function isAuthorizedAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.trim().toLowerCase());
}

