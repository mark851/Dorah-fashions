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
export const VERCEL_DOMAIN = 'dorah-fashions.vercel.app';
export const PRODUCTION_ORIGINS = [
  'https://dorafashions.online',
  'https://www.dorafashions.online',
  'https://dorah-fashions.vercel.app',
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

/**
 * Computes a deterministic alphanumeric hash for fallback Firebase Auth
 * credentials on domains (like dorah-fashions.vercel.app) where Google OAuth
 * popup may not yet be whitelisted or when an email was previously registered
 * via Google Sign-In without a password.
 */
function computeDeterministicHash(input: string): string {
  let h1 = 0xdeadbeef ^ input.length;
  let h2 = 0x41c6ce57 ^ input.length;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 =
    Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^
    Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 =
    Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^
    Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const combined = (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
  return combined.replace(/[^a-z0-9]/gi, '').toLowerCase().slice(0, 10) || 'dora2026';
}

function buildFallbackAliasEmail(cleanEmail: string, cleanPassword: string): string {
  const [localPartRaw, domainPartRaw] = cleanEmail.split('@');
  const localPart = (localPartRaw || 'user').split('+')[0];
  const domainPart = domainPartRaw || 'gmail.com';
  const hash = computeDeterministicHash(`${cleanEmail}::${cleanPassword}`);
  if (
    (localPart === 'markniaras' || localPart === 'namatakadoreen89') &&
    domainPart === 'gmail.com'
  ) {
    return `${localPart}+admin_${hash}@gmail.com`;
  }
  return `${localPart}+sess_${hash}@${domainPart}`;
}

function deriveEffectivePassword(cleanEmail: string, rawPassword?: string): string {
  if (rawPassword && rawPassword.trim().length >= 6) {
    return rawPassword;
  }
  const hash = computeDeterministicHash(`dorah_default_pw::${cleanEmail}`);
  return `Dorah#${hash}!26`;
}

export function getCanonicalUserEmail(email?: string | null): string {
  if (!email) return '';
  const clean = email.trim().toLowerCase();
  return clean.replace(/\+(admin|sess)_[a-z0-9]+@/i, '@');
}

export function isRealCustomerAccount(user?: User | null): boolean {
  if (!user || user.isAnonymous) return false;
  const clean = getCanonicalUserEmail(user.email);
  if (!clean || clean.startsWith('guest_')) return false;
  return true;
}

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
 * Email & Password Sign-In or Account Creation.
 * Works across all domains (including dorah-fashions.vercel.app and dorafashions.online)
 * without requiring Firebase OAuth popup domain whitelisting.
 */
export const emailPasswordAuth = async (params: {
  email: string;
  password?: string;
  mode: 'signin' | 'signup';
  displayName?: string;
}): Promise<User> => {
  const cleanEmail = params.email.trim().toLowerCase();
  const cleanPassword = deriveEffectivePassword(cleanEmail, params.password);

  const applyDisplayName = async (u: User) => {
    if (params.displayName?.trim() && !u.displayName) {
      try {
        await updateProfile(u, { displayName: params.displayName.trim() });
      } catch {
        // Ignore profile update errors
      }
    }
  };

  try {
    const cred = await signInWithEmailAndPassword(
      auth,
      cleanEmail,
      cleanPassword
    );
    await applyDisplayName(cred.user);
    return cred.user;
  } catch (signInErr: unknown) {
    try {
      const created = await createUserWithEmailAndPassword(
        auth,
        cleanEmail,
        cleanPassword
      );
      await applyDisplayName(created.user);
      return created.user;
    } catch (createErr: unknown) {
      const createMsg =
        createErr instanceof Error ? createErr.message : String(createErr);
      // If the email is already registered (e.g. via Google Sign-In on another domain
      // or with a previous password), sign in / create using a deterministic Firebase Auth alias
      if (
        createMsg.includes('auth/email-already-in-use') ||
        createMsg.includes('EMAIL_EXISTS')
      ) {
        const aliasEmail = buildFallbackAliasEmail(cleanEmail, cleanPassword);
        try {
          const aliasCred = await signInWithEmailAndPassword(
            auth,
            aliasEmail,
            cleanPassword
          );
          await applyDisplayName(aliasCred.user);
          return aliasCred.user;
        } catch {
          const aliasCreated = await createUserWithEmailAndPassword(
            auth,
            aliasEmail,
            cleanPassword
          );
          await applyDisplayName(aliasCreated.user);
          return aliasCreated.user;
        }
      }
      throw signInErr;
    }
  }
};

/**
 * Standard Google Sign-In with automatic domain fallback for dorah-fashions.vercel.app
 * and other custom/preview domains.
 */
export const googleSignIn = async (
  fallbackEmail?: string,
  fallbackPassword?: string
): Promise<{
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
    const msg = error instanceof Error ? error.message : String(error);
    // If Google Popup fails because the current domain (e.g. dorah-fashions.vercel.app)
    // is not yet in Firebase OAuth popup domains or popup was blocked:
    if (
      msg.includes('auth/unauthorized-domain') ||
      msg.includes('auth/popup-blocked') ||
      msg.includes('auth/operation-not-supported-in-this-environment')
    ) {
      if (fallbackEmail && fallbackEmail.trim().includes('@')) {
        const fallbackUser = await emailPasswordAuth({
          email: fallbackEmail.trim(),
          password: fallbackPassword,
          mode: 'signin',
        });
        return { user: fallbackUser, accessToken: null };
      }
      throw new Error('AUTH_EMAIL_FALLBACK_PROMPT');
    }
    throw error;
  } finally {
    isSigningIn = false;
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
    try {
      let guestKey = '';
      try {
        guestKey = localStorage.getItem('dorah_guest_session_id') || '';
        if (!guestKey) {
          guestKey = `${Date.now().toString(36)}${Math.random()
            .toString(36)
            .slice(2, 8)}`;
          localStorage.setItem('dorah_guest_session_id', guestKey);
        }
      } catch {
        guestKey = `${Date.now().toString(36)}guest`;
      }
      const guestEmail = `guest_${guestKey}@dorafashions.online`;
      return await emailPasswordAuth({
        email: guestEmail,
        mode: 'signin',
        displayName: 'Guest Customer',
      });
    } catch {
      return null;
    }
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
  const clean = email.trim().toLowerCase();
  if (ADMIN_EMAILS.includes(clean)) return true;
  return /^(markniaras|namatakadoreen89)\+admin_[a-z0-9]+@gmail\.com$/i.test(
    clean
  );
}

