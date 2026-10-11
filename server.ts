import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface FirebaseAppletConfig {
  projectId: string;
  appId: string;
  apiKey: string;
  authDomain: string;
  firestoreDatabaseId: string;
  storageBucket: string;
  messagingSenderId: string;
  oAuthClientId?: string;
}

interface VerifiedFirebaseUser {
  uid: string;
  email: string;
  emailVerified: boolean;
  idToken: string;
}

declare global {
  namespace Express {
    interface Request {
      firebaseUser?: VerifiedFirebaseUser;
    }
  }
}

const ADMIN_EMAILS = [
  'markniaras@gmail.com',
  'namatakadoreen89@gmail.com',
];
const ALLOWED_PRODUCTION_ORIGINS = [
  'https://dorafashions.online',
  'https://www.dorafashions.online',
  'http://dorafashions.online',
  'http://www.dorafashions.online',
];

const ALLOWED_CATEGORIES = [
  'Bag Beads',
  'Handmade Beads',
  'Crystal Beads',
  'Pearl Beads',
  'Acrylic Beads',
  'Bead Accessories',
  'Custom Orders',
  'Beaded Bags',
  'Bag Beads & Pearls',
  'Crystal & Acrylic Beads',
  'Beaded Accessories',
  'Bag Handles & Kits',
];

function loadFirebaseConfig(): FirebaseAppletConfig {
  const raw = fs.readFileSync(
    path.join(__dirname, 'firebase-applet-config.json'),
    'utf-8'
  );
  return JSON.parse(raw) as FirebaseAppletConfig;
}

/**
 * Verifies a Firebase Authentication ID token via Google Identity Toolkit REST API.
 */
async function verifyFirebaseIdToken(
  idToken: string,
  apiKey: string
): Promise<VerifiedFirebaseUser | null> {
  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(
        apiKey
      )}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      users?: Array<{
        localId: string;
        email?: string;
        emailVerified?: boolean;
      }>;
    };
    const user = data.users?.[0];
    if (!user) return null;
    return {
      uid: user.localId,
      email: user.email || '',
      emailVerified: Boolean(user.emailVerified),
      idToken,
    };
  } catch {
    return null;
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;
  const fbConfig = loadFirebaseConfig();

  // Allow requests from dorafashions.online (cPanel) and allow Firebase Auth popups
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin && ALLOWED_PRODUCTION_ORIGINS.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader(
        'Access-Control-Allow-Headers',
        'Origin, X-Requested-With, Content-Type, Accept, Authorization'
      );
      res.setHeader(
        'Access-Control-Allow-Methods',
        'GET, POST, PUT, PATCH, DELETE, OPTIONS'
      );
    }
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
    next();
  });

  app.use(express.json({ limit: '4mb' }));

  const firestoreBaseUrl = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
    fbConfig.projectId
  )}/databases/${encodeURIComponent(fbConfig.firestoreDatabaseId)}/documents`;

  // Middleware: Require valid Firebase Authentication ID token
  const requireAuth = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        error: 'Missing Firebase Authentication Bearer token.',
      });
      return;
    }
    const idToken = authHeader.slice('Bearer '.length).trim();
    const verified = await verifyFirebaseIdToken(idToken, fbConfig.apiKey);
    if (!verified) {
      res.status(401).json({
        error: 'Invalid or expired Firebase Authentication ID token.',
      });
      return;
    }
    req.firebaseUser = verified;
    next();
  };

  // Middleware: Require verified administrator account
  const requireAdmin = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    await requireAuth(req, res, async () => {
      const user = req.firebaseUser;
      if (!user || !user.email) {
        res.status(403).json({
          error: 'Authenticated email required for administrator operations.',
        });
        return;
      }

      if (ADMIN_EMAILS.includes(user.email.trim().toLowerCase())) {
        next();
        return;
      }

      // Check /admins/{uid} in Firestore
      try {
        const adminDocRes = await fetch(
          `${firestoreBaseUrl}/admins/${encodeURIComponent(user.uid)}`,
          {
            headers: { Authorization: `Bearer ${user.idToken}` },
          }
        );
        if (adminDocRes.ok) {
          next();
          return;
        }
      } catch {
        // Ignore and deny below
      }

      res.status(403).json({
        error:
          'Access denied. Only authorized DORAH FASHIONS administrators may manage products.',
      });
    });
  };

  // =========================================================================
  // 1. Architecture & Health Endpoint
  // =========================================================================
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'connected',
      business: 'DORAH FASHIONS',
      domain: 'dorafashions.online',
      whatsappNumber: '+256775803896',
      dnsArrangement:
        'Spaceship DNS -> cPanel (No DNS changes required for Firebase)',
      architecture: {
        website: 'cPanel (public_html static or Node.js passenger app)',
        domain: 'dorafashions.online (Spaceship DNS -> cPanel)',
        productDatabase: `Firebase Firestore (${fbConfig.firestoreDatabaseId})`,
        productImageStorage: `Firebase Storage (${fbConfig.storageBucket})`,
        administratorLogin: `Firebase Authentication (${fbConfig.authDomain})`,
        backendOperations:
          'Secured Express Backend API + Firebase Security Rules',
      },
      firebaseProject: {
        projectId: fbConfig.projectId,
        firestoreDatabaseId: fbConfig.firestoreDatabaseId,
        storageBucket: fbConfig.storageBucket,
        authDomain: fbConfig.authDomain,
      },
      timestamp: new Date().toISOString(),
    });
  });

  // =========================================================================
  // 2. Categories Endpoint
  // =========================================================================
  app.get('/api/categories', (_req, res) => {
    res.json({
      categories: [
        'Bag Beads',
        'Handmade Beads',
        'Crystal Beads',
        'Pearl Beads',
        'Acrylic Beads',
        'Bead Accessories',
        'Custom Orders',
      ],
    });
  });

  // =========================================================================
  // 3. Public & Admin Products REST Endpoints (Connected to Firestore)
  // =========================================================================
  app.get('/api/products', async (req, res) => {
    try {
      const headers: Record<string, string> = {};
      if (req.headers.authorization) {
        headers.Authorization = req.headers.authorization;
      }
      const fsRes = await fetch(`${firestoreBaseUrl}/products`, { headers });
      if (!fsRes.ok) {
        res.status(fsRes.status).json({
          error:
            'Firestore query requires published filter for unauthenticated requests.',
          firestoreDatabaseId: fbConfig.firestoreDatabaseId,
        });
        return;
      }
      const data = await fsRes.json();
      res.json({
        source: 'Firebase Firestore',
        databaseId: fbConfig.firestoreDatabaseId,
        documents: data.documents || [],
      });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Failed to fetch products',
      });
    }
  });

  // Admin-Protected Product Validation & Verification Endpoint
  app.post('/api/validate-product', requireAdmin, (req, res) => {
    const {
      name,
      sku,
      category,
      price,
      stock,
      description,
      imageUrl,
      colors,
      sizes,
    } = req.body || {};

    const errors: string[] = [];
    if (
      typeof name !== 'string' ||
      name.trim().length < 2 ||
      name.length > 120
    ) {
      errors.push('Product name must be 2–120 characters.');
    }
    if (typeof sku !== 'string' || !/^[a-zA-Z0-9_\-]{2,40}$/.test(sku)) {
      errors.push(
        'SKU must be 2–40 alphanumeric characters, hyphens, or underscores.'
      );
    }
    if (typeof category !== 'string' || category.trim().length < 2 || category.length > 60) {
      errors.push('Category must be between 2 and 60 characters.');
    }
    if (typeof price !== 'number' || price < 0 || price > 100000000) {
      errors.push('Price must be between 0 and 100,000,000 UGX.');
    }
    if (typeof stock !== 'number' || stock < 0 || stock > 100000) {
      errors.push('Stock must be between 0 and 100,000.');
    }
    if (
      typeof description !== 'string' ||
      description.trim().length < 5 ||
      description.length > 1200
    ) {
      errors.push('Description must be 5–1200 characters.');
    }
    if (
      typeof imageUrl !== 'string' ||
      imageUrl.trim().length < 5 ||
      imageUrl.length > 750000
    ) {
      errors.push('Image URL or uploaded photo data must be valid.');
    }
    if (
      colors !== undefined &&
      (!Array.isArray(colors) || colors.length < 1 || colors.length > 8)
    ) {
      errors.push('Colors must be an array of 1–8 items.');
    }
    if (!Array.isArray(sizes) || sizes.length < 1 || sizes.length > 8) {
      errors.push('Sizes must be an array of 1–8 items.');
    }

    if (errors.length > 0) {
      res.status(400).json({ valid: false, errors });
      return;
    }

    res.json({
      valid: true,
      verifiedAdmin: req.firebaseUser?.email,
      uid: req.firebaseUser?.uid,
      timestamp: new Date().toISOString(),
    });
  });

  // =========================================================================
  // 4. Customer Order Validation & Verification Endpoint
  // =========================================================================
  app.post('/api/validate-order', requireAuth, (req, res) => {
    const {
      customerName,
      customerEmail,
      customerPhone,
      deliveryLocation,
      shippingAddress,
      postalCode,
      paymentMethod,
      totalAmount,
    } = req.body || {};

    const errors: string[] = [];
    if (typeof customerName !== 'string' || customerName.trim().length < 2) {
      errors.push('Customer name is required.');
    }
    if (typeof customerEmail !== 'string' || !customerEmail.includes('@')) {
      errors.push('Valid customer email is required.');
    }
    if (typeof customerPhone !== 'string' || customerPhone.trim().length < 5) {
      errors.push('Valid customer phone number is required.');
    }
    if (
      deliveryLocation !== undefined &&
      (typeof deliveryLocation !== 'string' ||
        deliveryLocation.trim().length < 2)
    ) {
      errors.push('Please select a valid delivery location.');
    }
    if (
      typeof shippingAddress !== 'string' ||
      shippingAddress.trim().length < 5
    ) {
      errors.push('Complete shipping address is required.');
    }
    if (typeof postalCode !== 'string' || postalCode.trim().length < 2) {
      errors.push('Valid postal code is required.');
    }
    if (
      !['Cash on Delivery', 'Mobile Money', 'Card Payment'].includes(
        paymentMethod
      )
    ) {
      errors.push('Invalid payment method.');
    }
    if (typeof totalAmount !== 'number' || totalAmount < 0) {
      errors.push('Invalid total amount.');
    }

    if (errors.length > 0) {
      res.status(400).json({ valid: false, errors });
      return;
    }

    res.json({
      valid: true,
      verifiedCustomerUid: req.firebaseUser?.uid,
      verifiedCustomerEmail: req.firebaseUser?.email,
      timestamp: new Date().toISOString(),
    });
  });

  // =========================================================================
  // Vite Middleware (Development) or Static Dist Serving (Production)
  // =========================================================================
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(
      `DORAH FASHIONS Backend API & Server running on http://0.0.0.0:${PORT} (dorafashions.online)`
    );
  });
}

startServer();
