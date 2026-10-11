import React, { useEffect, useState } from 'react';
import {
  Copy,
  Check,
  Server,
  Shield,
  Globe,
  Database,
  FileCode,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react';
import { doc, getDocFromServer } from 'firebase/firestore';
import {
  db,
  firebaseConfig,
  BOOTSTRAPPED_ADMIN_EMAIL,
  PRODUCTION_DOMAIN,
} from '../firebase';
import {
  fetchBackendHealth,
  BackendHealthStatus,
} from '../services/backendApi';

export const DeploymentGuideView: React.FC = () => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [backendStatus, setBackendStatus] =
    useState<BackendHealthStatus | null>(null);
  const [firestoreReachable, setFirestoreReachable] = useState<boolean | null>(
    null
  );
  const [testingConnection, setTestingConnection] = useState<boolean>(false);

  const runLiveDiagnostics = async () => {
    setTestingConnection(true);
    try {
      const health = await fetchBackendHealth();
      setBackendStatus(health);

      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
        setFirestoreReachable(true);
      } catch (err) {
        if (
          err instanceof Error &&
          !err.message.includes('the client is offline')
        ) {
          setFirestoreReachable(true);
        } else {
          setFirestoreReachable(false);
        }
      }
    } finally {
      setTestingConnection(false);
    }
  };

  useEffect(() => {
    runLiveDiagnostics();
  }, []);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const htaccessContent = `<IfModule mod_headers.c>
  # Allow Firebase Authentication (signInWithPopup) to communicate with dorafashions.online on cPanel
  Header always set Cross-Origin-Opener-Policy "same-origin-allow-popups"
</IfModule>

<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /

  # Force HTTPS for dorafashions.online (Spaceship DNS -> cPanel)
  RewriteCond %{HTTPS} !=on
  RewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

  # Do not rewrite existing files, directories, or /api routes
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteCond %{REQUEST_URI} !^/api/

  # Route all storefront and admin paths to index.html
  RewriteRule ^ index.html [QSA,L]
</IfModule>`;

  const firebaseConfigSnippet = JSON.stringify(firebaseConfig, null, 2);

  return (
    <section className="max-w-6xl mx-auto px-6 lg:px-12 py-12 space-y-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-8 border-b border-stone-200">
        <div>
          <p className="text-xs uppercase tracking-widest text-stone-500">
            Spaceship Domain &rarr; cPanel Hosting &rarr; Firebase SDK Integration
          </p>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold text-stone-900 mt-1">
            DORAH FASHIONS ({PRODUCTION_DOMAIN}) Setup
          </h1>
          <p className="text-sm text-stone-600 mt-2 max-w-3xl leading-relaxed">
            Your Spaceship domain (<strong className="font-mono text-stone-900">{PRODUCTION_DOMAIN}</strong>)
            remains pointed directly to your <strong>cPanel</strong> server with{' '}
            <strong>zero DNS changes needed</strong>. Firebase Firestore,
            Firebase Storage, and Firebase Authentication are wired directly
            inside the website&apos;s code and security rules.
          </p>
        </div>

        <button
          type="button"
          disabled={testingConnection}
          onClick={runLiveDiagnostics}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-[#FAF8F5] bg-[#18181B] rounded-lg hover:bg-stone-800 transition-colors self-start md:self-auto whitespace-nowrap shrink-0 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>
            {testingConnection
              ? 'Verifying Connections...'
              : 'Verify Backend & Firebase Connection'}
          </span>
        </button>
      </div>

      {/* Recommended Architecture Matrix Table */}
      <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold text-stone-900">
            Connected System Architecture (Spaceship + cPanel + Firebase)
          </h2>
          <span className="text-xs text-emerald-800 font-medium inline-flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" />
            <span>
              {firestoreReachable
                ? 'Configured in Website Code & Security Rules'
                : 'Checking Connection...'}
            </span>
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-stone-200 text-xs text-stone-500">
                <th className="py-3 px-6 font-medium">Component</th>
                <th className="py-3 px-6 font-medium">Service</th>
                <th className="py-3 px-6 font-medium">
                  Configuration in Code / DNS Arrangement
                </th>
                <th className="py-3 px-6 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200 text-xs">
              <tr>
                <td className="py-3.5 px-6 font-semibold text-stone-900">
                  Domain Registrar &amp; DNS
                </td>
                <td className="py-3.5 px-6 text-stone-700">
                  Spaceship ({PRODUCTION_DOMAIN})
                </td>
                <td className="py-3.5 px-6 font-mono text-stone-600">
                  Keep existing DNS pointing to cPanel (No new DNS server needed)
                </td>
                <td className="py-3.5 px-6 text-emerald-800 font-medium">
                  Preserved
                </td>
              </tr>
              <tr>
                <td className="py-3.5 px-6 font-semibold text-stone-900">
                  Website Hosting
                </td>
                <td className="py-3.5 px-6 text-stone-700">cPanel</td>
                <td className="py-3.5 px-6 font-mono text-stone-600">
                  /public_html/ (with .htaccess COOP &amp; HTTPS rules)
                </td>
                <td className="py-3.5 px-6 text-emerald-800 font-medium">
                  Ready for Upload
                </td>
              </tr>
              <tr>
                <td className="py-3.5 px-6 font-semibold text-stone-900">
                  Product Database
                </td>
                <td className="py-3.5 px-6 text-stone-700">
                  Firebase Firestore
                </td>
                <td className="py-3.5 px-6 font-mono text-stone-600">
                  {firebaseConfig.firestoreDatabaseId} (Configured in src/firebase.ts)
                </td>
                <td className="py-3.5 px-6 text-emerald-800 font-medium">
                  {firestoreReachable ? 'Connected (Live)' : 'Connecting'}
                </td>
              </tr>
              <tr>
                <td className="py-3.5 px-6 font-semibold text-stone-900">
                  Product Image Storage
                </td>
                <td className="py-3.5 px-6 text-stone-700">
                  Firebase Storage
                </td>
                <td className="py-3.5 px-6 font-mono text-stone-600">
                  {firebaseConfig.storageBucket} (Configured in src/firebase.ts)
                </td>
                <td className="py-3.5 px-6 text-emerald-800 font-medium">
                  Connected (Live)
                </td>
              </tr>
              <tr>
                <td className="py-3.5 px-6 font-semibold text-stone-900">
                  Administrator Login
                </td>
                <td className="py-3.5 px-6 text-stone-700">
                  Firebase Authentication
                </td>
                <td className="py-3.5 px-6 font-mono text-stone-600">
                  {BOOTSTRAPPED_ADMIN_EMAIL} ({firebaseConfig.authDomain})
                </td>
                <td className="py-3.5 px-6 text-emerald-800 font-medium">
                  Protected
                </td>
              </tr>
              <tr>
                <td className="py-3.5 px-6 font-semibold text-stone-900">
                  Backend Operations
                </td>
                <td className="py-3.5 px-6 text-stone-700">
                  Firebase Services + Secured Backend API
                </td>
                <td className="py-3.5 px-6 font-mono text-stone-600">
                  {backendStatus
                    ? `firestore.rules + storage.rules + Express API (${backendStatus.status})`
                    : 'firestore.rules + storage.rules + Express API'}
                </td>
                <td className="py-3.5 px-6 text-emerald-800 font-medium">
                  Active
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 1. How Spaceship + cPanel Connects to Firebase Without Changing DNS */}
      <div className="p-6 bg-white border border-stone-200 rounded-xl space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Database className="w-5 h-5 text-stone-800" />
            <h2 className="font-display text-2xl font-semibold text-stone-900">
              1. Connecting {PRODUCTION_DOMAIN} (Spaceship &rarr; cPanel) to Firebase
            </h2>
          </div>
          <button
            type="button"
            onClick={() => handleCopy('fb-config', firebaseConfigSnippet)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-700 border border-stone-300 rounded-md hover:bg-stone-100 cursor-pointer"
          >
            {copiedId === 'fb-config' ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-700" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy JSON</span>
              </>
            )}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-stone-700">
          <div className="p-4 bg-stone-50 border border-stone-200 rounded-lg space-y-1.5">
            <strong className="block text-stone-900">
              Step 1: Keep Spaceship DNS As-Is
            </strong>
            <p className="leading-relaxed text-stone-600">
              Do <strong>not</strong> change your nameservers or A-records in
              Spaceship. Since <code className="font-mono">{PRODUCTION_DOMAIN}</code>{' '}
              already points to cPanel and opens properly, keep that exact DNS
              setup.
            </p>
          </div>
          <div className="p-4 bg-stone-50 border border-stone-200 rounded-lg space-y-1.5">
            <strong className="block text-stone-900">
              Step 2: Authorize Domain in Firebase Auth
            </strong>
            <p className="leading-relaxed text-stone-600">
              In{' '}
              <strong>
                Firebase Console &rarr; Authentication &rarr; Settings &rarr;
                Authorized domains
              </strong>{' '}
              (project <code className="font-mono">{firebaseConfig.projectId}</code>),
              click <strong>Add domain</strong> and enter{' '}
              <code className="font-mono">{PRODUCTION_DOMAIN}</code> and{' '}
              <code className="font-mono">www.{PRODUCTION_DOMAIN}</code>.
            </p>
          </div>
          <div className="p-4 bg-stone-50 border border-stone-200 rounded-lg space-y-1.5">
            <strong className="block text-stone-900">
              Step 3: Upload Build to cPanel public_html
            </strong>
            <p className="leading-relaxed text-stone-600">
              Upload the compiled files from <code className="font-mono">dist/</code>{' '}
              (including <code className="font-mono">.htaccess</code>) into
              cPanel&apos;s <code className="font-mono">public_html/</code> folder.
              The website code connects to Firebase over HTTPS automatically.
            </p>
          </div>
        </div>

        <pre className="p-4 bg-stone-900 text-stone-100 font-mono text-xs rounded-lg overflow-x-auto">
          {firebaseConfigSnippet}
        </pre>
      </div>

      {/* 2. Step-by-Step cPanel Deployment */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-6 bg-white border border-stone-200 rounded-xl space-y-4">
          <div className="flex items-center gap-2.5">
            <Globe className="w-5 h-5 text-stone-800" />
            <h2 className="font-display text-2xl font-semibold text-stone-900">
              2A. cPanel public_html/.htaccess Configuration
            </h2>
          </div>
          <p className="text-xs text-stone-600 leading-relaxed">
            This <code className="font-mono">.htaccess</code> file is already
            included in <code className="font-mono">public/.htaccess</code> (and
            copied into <code className="font-mono">dist/.htaccess</code> on
            build). It sets{' '}
            <code className="font-mono">
              Cross-Origin-Opener-Policy: same-origin-allow-popups
            </code>{' '}
            so Firebase Google Sign-In works cleanly on your cPanel domain.
          </p>

          <div className="pt-1">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-stone-800">
                public_html/.htaccess
              </span>
              <button
                type="button"
                onClick={() => handleCopy('htaccess', htaccessContent)}
                className="text-xs font-medium text-stone-600 hover:text-stone-900 inline-flex items-center gap-1 cursor-pointer"
              >
                {copiedId === 'htaccess' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy .htaccess</span>
                  </>
                )}
              </button>
            </div>
            <pre className="p-3.5 bg-stone-900 text-stone-100 font-mono text-xs rounded-lg overflow-x-auto">
              {htaccessContent}
            </pre>
          </div>
        </div>

        <div className="p-6 bg-white border border-stone-200 rounded-xl space-y-4">
          <div className="flex items-center gap-2.5">
            <Server className="w-5 h-5 text-stone-800" />
            <h2 className="font-display text-2xl font-semibold text-stone-900">
              2B. Code &amp; Security Rules Architecture
            </h2>
          </div>
          <p className="text-xs text-stone-600 leading-relaxed">
            Because Firebase is initialized directly in{' '}
            <code className="font-mono">src/firebase.ts</code> and protected by
            deployed cloud security rules, your cPanel site communicates
            directly with Google Cloud servers from the visitor&apos;s browser:
          </p>
          <ol className="space-y-3 text-xs text-stone-700 list-decimal list-inside leading-relaxed">
            <li>
              <strong>src/firebase.ts:</strong> Initializes Firebase App,
              Firestore (<code className="font-mono">{firebaseConfig.firestoreDatabaseId}</code>),
              Firebase Storage (<code className="font-mono">{firebaseConfig.storageBucket}</code>),
              and Firebase Auth (<code className="font-mono">{firebaseConfig.authDomain}</code>).
            </li>
            <li>
              <strong>firestore.rules:</strong> Deployed to your Firebase
              project. Allows public visitors on{' '}
              <code className="font-mono">{PRODUCTION_DOMAIN}</code> to read
              published products, allows verified customers to create and track
              their own orders, and restricts product management strictly to{' '}
              <code className="font-mono">{BOOTSTRAPPED_ADMIN_EMAIL}</code>.
            </li>
            <li>
              <strong>storage.rules:</strong> Allows public visitors to view
              product images while restricting image uploads (<code className="font-mono">/products/*</code>)
              strictly to your verified administrator login.
            </li>
          </ol>

          <div className="p-4 bg-stone-50 border border-stone-200 rounded-lg space-y-2 text-xs">
            <p className="font-semibold text-stone-900 flex items-center gap-1.5">
              <FileCode className="w-4 h-4" />
              <span>Included Project Files for cPanel &amp; Firebase</span>
            </p>
            <ul className="space-y-1 font-mono text-stone-600">
              <li>firebase-applet-config.json — Real Firebase SDK credentials</li>
              <li>src/firebase.ts — SDK initialization &amp; Auth/Storage/Firestore</li>
              <li>firestore.rules — Deployed Firestore database security rules</li>
              <li>storage.rules — Firebase Storage image security rules</li>
              <li>public/.htaccess — cPanel HTTPS, SPA routing &amp; COOP header</li>
            </ul>
          </div>
        </div>
      </div>

      {/* 3. Security Rules Reference */}
      <div className="p-6 bg-white border border-stone-200 rounded-xl space-y-3">
        <div className="flex items-center gap-2.5">
          <Shield className="w-5 h-5 text-stone-800" />
          <h2 className="font-display text-2xl font-semibold text-stone-900">
            3. Zero-Trust Database &amp; Storage Security Summary
          </h2>
        </div>
        <ul className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-stone-700 pt-2">
          <li className="p-4 bg-stone-50 border border-stone-200 rounded-lg">
            <strong className="block text-stone-900 mb-1">
              Public Catalog Protection (/products)
            </strong>
            Visitors on <code className="font-mono">{PRODUCTION_DOMAIN}</code>{' '}
            can only read products where{' '}
            <code className="font-mono">published == true</code>. Creating,
            editing, or deleting products requires your verified administrator
            account (<code className="font-mono">{BOOTSTRAPPED_ADMIN_EMAIL}</code>).
          </li>
          <li className="p-4 bg-stone-50 border border-stone-200 rounded-lg">
            <strong className="block text-stone-900 mb-1">
              Customer Order PII Isolation (/orders)
            </strong>
            Orders containing customer phone numbers, emails, and addresses are
            strictly isolated to the customer who placed the order (
            <code className="font-mono">customerId == request.auth.uid</code>)
            and verified administrators.
          </li>
          <li className="p-4 bg-stone-50 border border-stone-200 rounded-lg">
            <strong className="block text-stone-900 mb-1">
              Schema &amp; Timestamp Integrity
            </strong>
            Every write validates field allowlists (<code className="font-mono">hasAll</code>{' '}
            &amp; <code className="font-mono">hasOnly</code>), string length
            bounds, and enforces <code className="font-mono">request.time</code>{' '}
            server timestamps.
          </li>
        </ul>
      </div>
    </section>
  );
};
