import React, { useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import {
  Package,
  Clock,
  CheckCircle2,
  XCircle,
  Truck,
  AlertTriangle,
  Mail,
  LogOut,
} from 'lucide-react';
import {
  db,
  googleSignIn,
  emailPasswordAuth,
  getCanonicalUserEmail,
  isRealCustomerAccount,
  logout,
  OperationType,
  handleFirestoreError,
} from '../firebase';
import { Order, formatUGX } from '../types';

interface CustomerOrdersViewProps {
  user: User | null;
  onBackToShop: () => void;
}

export const CustomerOrdersView: React.FC<CustomerOrdersViewProps> = ({
  user,
  onBackToShop,
}) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [confirmCancelOrder, setConfirmCancelOrder] = useState<Order | null>(
    null
  );
  const [cancelling, setCancelling] = useState<boolean>(false);

  // Email & Password sign-in state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);

  useEffect(() => {
    if (!user || !isRealCustomerAccount(user)) {
      setOrders([]);
      return;
    }

    setLoading(true);
    const q = query(
      collection(db, 'orders'),
      where('customerId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: Order[] = snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Order, 'id'>),
        }));
        setOrders(list);
        setLoading(false);
      },
      (error) => {
        setLoading(false);
        handleFirestoreError(error, OperationType.LIST, 'orders');
      }
    );

    return () => unsubscribe();
  }, [user]);

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    if (!email.trim() || !email.includes('@')) {
      setAuthError('Please enter a valid email address.');
      return;
    }
    setSigningIn(true);
    try {
      await emailPasswordAuth({
        email,
        password,
        mode: 'signin',
      });
    } catch (err) {
      setAuthError(
        err instanceof Error ? err.message : 'Failed to sign in with email.'
      );
    } finally {
      setSigningIn(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setAuthError(null);
    setSigningIn(true);
    try {
      await googleSignIn(email, password);
    } catch {
      setAuthError(
        'Enter your Email Address above and click Sign In to access your orders immediately on this domain.'
      );
    } finally {
      setSigningIn(false);
    }
  };

  const handleConfirmCancel = async () => {
    if (!confirmCancelOrder) return;
    setCancelling(true);
    const path = `orders/${confirmCancelOrder.id}`;
    try {
      await updateDoc(doc(db, 'orders', confirmCancelOrder.id), {
        status: 'cancelled',
        updatedAt: serverTimestamp(),
      });
      setConfirmCancelOrder(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    } finally {
      setCancelling(false);
    }
  };

  return (
    <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-12 py-12">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-8 border-b border-[#E2D5C3]">
        <div>
          <p className="text-xs uppercase tracking-widest text-[#A37E3B] font-semibold">
            Client Fulfillment Portal
          </p>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold text-[#2C1E16] mt-1">
            My DORAH FASHIONS Orders
          </h1>
          {isRealCustomerAccount(user) && (
            <p className="text-xs text-[#6A5243] mt-1">
              Signed in as{' '}
              <strong className="text-[#2C1E16]">
                {getCanonicalUserEmail(user?.email)}
              </strong>
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          {isRealCustomerAccount(user) && (
            <button
              type="button"
              onClick={() => logout()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#2C1E16] bg-[#FFFFFF] border border-[#E2D5C3] rounded-xl hover:border-[#C5A059] transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5 text-[#A37E3B]" />
              <span>Switch Account</span>
            </button>
          )}
          <button
            type="button"
            onClick={onBackToShop}
            className="px-4 py-2 text-xs font-semibold text-[#2C1E16] bg-[#FFFFFF] border border-[#E2D5C3] rounded-xl hover:border-[#C5A059] transition-colors cursor-pointer"
          >
            Return to Storefront
          </button>
        </div>
      </div>

      {!isRealCustomerAccount(user) ? (
        <div className="mt-10 p-8 bg-[#FFFFFF] border border-[#E2D5C3] rounded-2xl max-w-md mx-auto space-y-5 shadow-xs">
          <div className="text-center">
            <Package className="w-10 h-10 text-[#C5A059] mx-auto mb-3" />
            <h2 className="font-display text-2xl font-semibold text-[#2C1E16]">
              Sign in to view your orders
            </h2>
            <p className="text-xs text-[#6A5243] mt-1 leading-relaxed">
              Sign in with your Email &amp; Password or Google account to view
              your order status and delivery updates.
            </p>
          </div>

          {authError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800">
              {authError}
            </div>
          )}

          <form onSubmit={handleEmailSignIn} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-[#2C1E16] mb-1">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-3.5 py-2.5 text-xs bg-[#F6F1E9] border border-[#E2D5C3] rounded-xl focus:outline-none focus:border-[#C5A059]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#2C1E16] mb-1">
                Password (optional or min 6 characters)
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="•••••••• (optional)"
                className="w-full px-3.5 py-2.5 text-xs bg-[#F6F1E9] border border-[#E2D5C3] rounded-xl focus:outline-none focus:border-[#C5A059]"
              />
            </div>
            <button
              type="submit"
              disabled={signingIn}
              className="w-full py-2.5 px-4 bg-[#2C1E16] text-[#FFFFFF] border border-[#C5A059] text-xs font-semibold rounded-xl hover:bg-[#3F2C21] transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <Mail className="w-4 h-4 text-[#C5A059]" />
              <span>
                {signingIn
                  ? 'Signing in...'
                  : 'Sign In / Create Account with Email'}
              </span>
            </button>
          </form>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-[#E2D5C3]"></div>
            <span className="flex-shrink mx-3 text-[11px] text-[#6A5243]">
              OR
            </span>
            <div className="flex-grow border-t border-[#E2D5C3]"></div>
          </div>

          <div className="flex justify-center">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              className="gsi-material-button"
            >
              <div className="gsi-material-button-state"></div>
              <div className="gsi-material-button-content-wrapper">
                <div className="gsi-material-button-icon">
                  <svg
                    version="1.1"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 48 48"
                    style={{ display: 'block' }}
                  >
                    <path
                      fill="#EA4335"
                      d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                    ></path>
                    <path
                      fill="#4285F4"
                      d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                    ></path>
                    <path
                      fill="#FBBC05"
                      d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                    ></path>
                    <path
                      fill="#34A853"
                      d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                    ></path>
                    <path fill="none" d="M0 0h48v48H0z"></path>
                  </svg>
                </div>
                <span className="gsi-material-button-contents">
                  Sign in with Google
                </span>
              </div>
            </button>
          </div>
        </div>
      ) : loading ? (
        <div className="py-16 text-center text-sm text-[#6A5243]">
          Loading your order history...
        </div>
      ) : orders.length === 0 ? (
        <div className="mt-10 p-10 bg-[#FFFFFF] border border-[#E2D5C3] rounded-2xl text-center">
          <Package className="w-10 h-10 text-[#C5A059] mx-auto mb-3" />
          <h3 className="font-display text-2xl font-medium text-[#2C1E16]">
            No orders placed yet
          </h3>
          <p className="text-xs text-[#6A5243] mt-1">
            Orders placed with your account will appear here with real-time
            status updates.
          </p>
        </div>
      ) : (
        <div className="mt-8 space-y-4">
          {orders.map((order) => (
            <div
              key={order.id}
              className="p-6 bg-[#FFFFFF] border border-[#E2D5C3] rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-6"
            >
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2 text-xs text-[#6A5243]">
                  <span className="font-mono font-semibold text-[#2C1E16]">
                    #{order.orderNumber}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{order.paymentMethod}</span>
                  <span aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1 font-medium text-[#2C1E16]">
                    {order.status === 'pending' && (
                      <Clock className="w-3.5 h-3.5 text-amber-700" />
                    )}
                    {order.status === 'processing' && (
                      <Package className="w-3.5 h-3.5 text-blue-700" />
                    )}
                    {order.status === 'shipped' && (
                      <Truck className="w-3.5 h-3.5 text-indigo-700" />
                    )}
                    {order.status === 'delivered' && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                    )}
                    {order.status === 'cancelled' && (
                      <XCircle className="w-3.5 h-3.5 text-red-700" />
                    )}
                    <span className="capitalize">{order.status}</span>
                  </span>
                </div>

                <p className="text-sm font-medium text-[#2C1E16]">
                  {order.itemsSummary}
                </p>

                <p className="text-xs text-[#6A5243]">
                  Delivering to: {order.customerName} · {order.shippingAddress},{' '}
                  {order.postalCode} ({order.customerPhone})
                </p>
              </div>

              <div className="flex items-center justify-between md:justify-end gap-4 shrink-0 border-t md:border-t-0 pt-4 md:pt-0 border-[#E2D5C3]">
                <div className="text-left md:text-right">
                  <span className="text-xs text-[#6A5243] block">
                    Order Total
                  </span>
                  <span className="font-mono text-lg font-semibold text-[#2C1E16] tabular-nums">
                    {formatUGX(order.totalAmount)}
                  </span>
                </div>

                {order.status === 'pending' && (
                  <button
                    type="button"
                    onClick={() => setConfirmCancelOrder(order)}
                    className="px-3.5 py-2 text-xs font-medium text-red-700 border border-red-200 rounded-xl hover:bg-red-50 transition-colors cursor-pointer"
                  >
                    Cancel Order
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirmation Modal for Order Cancellation */}
      {confirmCancelOrder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md bg-[#FFFFFF] border border-[#E2D5C3] rounded-2xl p-6 shadow-xl">
            <div className="flex items-center gap-2.5 text-amber-800 mb-3">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h3 className="font-display text-xl font-semibold text-[#2C1E16]">
                Cancel Order #{confirmCancelOrder.orderNumber}?
              </h3>
            </div>
            <p className="text-xs text-[#6A5243] leading-relaxed">
              Are you sure you want to cancel this order? Once cancelled, it
              will not be dispatched by the DORAH FASHIONS fulfillment team.
            </p>
            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={cancelling}
                onClick={() => setConfirmCancelOrder(null)}
                className="px-4 py-2 text-xs font-medium text-[#6A5243] bg-[#F6F1E9] rounded-xl hover:bg-[#EDE4D5] cursor-pointer"
              >
                Keep Order
              </button>
              <button
                type="button"
                disabled={cancelling}
                onClick={handleConfirmCancel}
                className="px-4 py-2 text-xs font-semibold text-white bg-red-700 rounded-xl hover:bg-red-800 disabled:opacity-50 cursor-pointer"
              >
                {cancelling ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
