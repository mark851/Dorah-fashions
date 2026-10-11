import { auth } from '../firebase';
import { CategoryType, PaymentMethodType } from '../types';

export interface BackendHealthStatus {
  status: string;
  business: string;
  domain: string;
  whatsappNumber?: string;
  architecture: {
    website: string;
    domain: string;
    productDatabase: string;
    productImageStorage: string;
    administratorLogin: string;
    backendOperations: string;
  };
  firebaseProject: {
    projectId: string;
    firestoreDatabaseId: string;
    storageBucket: string;
    authDomain: string;
  };
  timestamp: string;
}

export async function fetchBackendHealth(): Promise<BackendHealthStatus | null> {
  try {
    const res = await fetch('/api/health');
    if (!res.ok) return null;
    return (await res.json()) as BackendHealthStatus;
  } catch {
    return null;
  }
}

/**
 * Validates product data against the secured backend API (/api/validate-product)
 * using the administrator's Firebase Auth ID token. Gracefully falls back if
 * hosted on static-only cPanel where Firestore Security Rules enforce validation.
 */
export async function validateProductWithBackend(payload: {
  name: string;
  sku: string;
  category: CategoryType | string;
  price: number;
  stock: number;
  description: string;
  imageUrl: string;
  colors?: string[];
  sizes: string[];
}): Promise<{ valid: boolean; error?: string }> {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      return { valid: false, error: 'Not signed in as administrator.' };
    }
    const idToken = await currentUser.getIdToken();
    const res = await fetch('/api/validate-product', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify(payload),
    });

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return { valid: true };
    }

    const data = await res.json();
    if (!res.ok || !data.valid) {
      const msg = Array.isArray(data.errors)
        ? data.errors.join(' ')
        : data.error || 'Backend product validation failed.';
      return { valid: false, error: msg };
    }
    return { valid: true };
  } catch {
    return { valid: true };
  }
}

/**
 * Validates customer order payload against the secured backend API (/api/validate-order)
 * using the customer's Firebase Auth ID token.
 */
export async function validateOrderWithBackend(payload: {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  deliveryLocation?: string;
  shippingAddress: string;
  postalCode: string;
  paymentMethod: PaymentMethodType;
  totalAmount: number;
}): Promise<{ valid: boolean; error?: string }> {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      return {
        valid: false,
        error: 'Please sign in with Google to place an order.',
      };
    }
    const idToken = await currentUser.getIdToken();
    const res = await fetch('/api/validate-order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify(payload),
    });

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return { valid: true };
    }

    const data = await res.json();
    if (!res.ok || !data.valid) {
      const msg = Array.isArray(data.errors)
        ? data.errors.join(' ')
        : data.error || 'Backend order validation failed.';
      return { valid: false, error: msg };
    }
    return { valid: true };
  } catch {
    return { valid: true };
  }
}
