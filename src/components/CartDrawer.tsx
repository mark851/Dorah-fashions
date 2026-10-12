import React, { useState, useEffect } from 'react';
import {
  X,
  Trash2,
  ShoppingBag,
  ArrowRight,
  AlertCircle,
  Lock,
  MessageCircle,
  MapPin,
  Mail,
} from 'lucide-react';
import { User } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import {
  db,
  OperationType,
  handleFirestoreError,
  googleSignIn,
  emailPasswordAuth,
  ensureCustomerSession,
  getCanonicalUserEmail,
  isRealCustomerAccount,
  logout,
} from '../firebase';
import {
  CartItem,
  ConfirmedOrderDetails,
  DELIVERY_LOCATIONS,
  FREE_DELIVERY_THRESHOLD_UGX,
  formatUGX,
  PaymentMethodType,
  VALIDATION_RULES,
  WHATSAPP_NUMBER_DISPLAY,
} from '../types';
import { validateOrderWithBackend } from '../services/backendApi';
import { buildWhatsAppOrderUrl } from '../utils/whatsapp';

interface CartDrawerProps {
  isOpen: boolean;
  initialStep?: 'cart' | 'checkout';
  onClose: () => void;
  items: CartItem[];
  onUpdateQuantity: (
    productId: string,
    color: string,
    size: string,
    delta: number
  ) => void;
  onRemoveItem: (productId: string, color: string, size: string) => void;
  onClearCart: () => void;
  user: User | null;
  onOrderConfirmed: (details: ConfirmedOrderDetails) => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  initialStep = 'cart',
  onClose,
  items,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  user,
  onOrderConfirmed,
}) => {
  const [step, setStep] = useState<'cart' | 'checkout'>(initialStep);
  const [customerName, setCustomerName] = useState(user?.displayName || '');
  const [customerEmail, setCustomerEmail] = useState(user?.email || '');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryLocation, setDeliveryLocation] = useState<string>(
    DELIVERY_LOCATIONS[0].label
  );
  const [shippingAddress, setShippingAddress] = useState('');
  const [postalCode, setPostalCode] = useState('256');
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethodType>('Cash on Delivery');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Customer account sign-in inside checkout
  const [showEmailLogin, setShowEmailLogin] = useState(true);
  const [authPassword, setAuthPassword] = useState('');
  const [signingInEmail, setSigningInEmail] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setStep(initialStep);
    }
  }, [isOpen, initialStep]);

  useEffect(() => {
    if (user?.displayName && !customerName && user.displayName !== 'Guest Customer') {
      setCustomerName(user.displayName);
    }
    const cleanUserEmail = getCanonicalUserEmail(user?.email);
    if (cleanUserEmail && !cleanUserEmail.startsWith('guest_') && !customerEmail) {
      setCustomerEmail(cleanUserEmail);
    }
  }, [user]);

  if (!isOpen) return null;

  const subtotal = items.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const selectedLocationObj =
    DELIVERY_LOCATIONS.find((l) => l.label === deliveryLocation) ||
    DELIVERY_LOCATIONS[0];
  const shippingFee =
    subtotal === 0
      ? 0
      : subtotal >= FREE_DELIVERY_THRESHOLD_UGX
      ? 0
      : selectedLocationObj.fee;
  const totalAmount = subtotal + shippingFee;

  const whatsappCheckoutUrl = buildWhatsAppOrderUrl({
    customerName,
    items,
    totalPrice: totalAmount,
    deliveryLocation,
    shippingAddress,
  });

  const handleSignInForCheckout = async () => {
    setErrorMsg(null);
    setSigningInEmail(true);
    try {
      const res = await googleSignIn(customerEmail, authPassword);
      if (res?.user) {
        if (!customerName && res.user.displayName) {
          setCustomerName(res.user.displayName);
        }
        const canonical = getCanonicalUserEmail(res.user.email);
        if (!customerEmail && canonical) {
          setCustomerEmail(canonical);
        }
      }
    } catch {
      setShowEmailLogin(true);
      setErrorMsg(
        'Enter your Email Address below and click "Sign In / Create Account with Email" to access your account for orders.'
      );
    } finally {
      setSigningInEmail(false);
    }
  };

  const handleEmailSignInForCheckout = async () => {
    if (!customerEmail.trim() || !customerEmail.includes('@')) {
      setErrorMsg(
        'Please enter your Email Address in the box below to sign in to your account.'
      );
      return;
    }
    setSigningInEmail(true);
    setErrorMsg(null);
    try {
      const signedInUser = await emailPasswordAuth({
        email: customerEmail,
        password: authPassword,
        mode: 'signin',
        displayName: customerName || undefined,
      });
      const canonical = getCanonicalUserEmail(signedInUser.email);
      if (canonical) {
        setCustomerEmail(canonical);
      }
      setShowEmailLogin(false);
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Could not sign in to your account.'
      );
    } finally {
      setSigningInEmail(false);
    }
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanName = customerName
      .trim()
      .slice(0, VALIDATION_RULES.ORDER.NAME_MAX);
    const cleanEmail = (customerEmail.trim() || user?.email || '').slice(
      0,
      VALIDATION_RULES.ORDER.EMAIL_MAX
    );
    const cleanPhone = customerPhone
      .trim()
      .slice(0, VALIDATION_RULES.ORDER.PHONE_MAX);
    const cleanLocation = deliveryLocation
      .trim()
      .slice(0, VALIDATION_RULES.ORDER.LOCATION_MAX);
    const cleanAddress = shippingAddress
      .trim()
      .slice(0, VALIDATION_RULES.ORDER.ADDRESS_MAX);
    const cleanPostal = (postalCode.trim() || '256').slice(
      0,
      VALIDATION_RULES.ORDER.POSTAL_MAX
    );

    if (cleanName.length < VALIDATION_RULES.ORDER.NAME_MIN) {
      setErrorMsg(
        'Please enter your full recipient name (at least 2 characters).'
      );
      return;
    }
    if (
      cleanEmail.length < VALIDATION_RULES.ORDER.EMAIL_MIN ||
      !cleanEmail.includes('@')
    ) {
      setErrorMsg('Please enter a valid email address for your order receipt.');
      return;
    }
    if (cleanPhone.length < VALIDATION_RULES.ORDER.PHONE_MIN) {
      setErrorMsg(
        'Please enter a valid contact phone number (at least 5 digits).'
      );
      return;
    }
    if (cleanLocation.length < VALIDATION_RULES.ORDER.LOCATION_MIN) {
      setErrorMsg('Please select a delivery location.');
      return;
    }
    if (cleanAddress.length < VALIDATION_RULES.ORDER.ADDRESS_MIN) {
      setErrorMsg('Please enter your delivery street address or landmark.');
      return;
    }

    setSubmitting(true);

    // Automatically sign the customer into their account using their email address
    // so their order is linked to their account and visible in "My Orders"
    let activeUser = user;
    if (!isRealCustomerAccount(activeUser)) {
      try {
        activeUser = await emailPasswordAuth({
          email: cleanEmail,
          password: authPassword || undefined,
          mode: 'signin',
          displayName: cleanName,
        });
      } catch {
        activeUser = await ensureCustomerSession();
      }
    }

    const orderNum = `DF-${Date.now().toString().slice(-6)}`;
    const orderId = `order_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 7)}`;

    const summaryStr = items
      .map(
        (i) =>
          `${i.quantity}x ${i.product.name} [${i.selectedColor} / ${
            i.selectedSize
          }] @ ${formatUGX(i.product.price)}`
      )
      .join('; ')
      .slice(0, VALIDATION_RULES.ORDER.SUMMARY_MAX);

    const confirmedSnapshot: ConfirmedOrderDetails = {
      orderNumber: orderNum,
      customerName: cleanName,
      customerEmail: cleanEmail,
      customerPhone: cleanPhone,
      deliveryLocation: cleanLocation,
      shippingAddress: cleanAddress,
      postalCode: cleanPostal,
      paymentMethod,
      items: [...items],
      subtotal: Math.round(subtotal),
      shippingFee: Math.round(shippingFee),
      totalAmount: Math.round(totalAmount),
      createdAtIso: new Date().toISOString(),
    };

    if (activeUser) {
      const backendCheck = await validateOrderWithBackend({
        customerName: cleanName,
        customerEmail: cleanEmail,
        customerPhone: cleanPhone,
        deliveryLocation: cleanLocation,
        shippingAddress: cleanAddress,
        postalCode: cleanPostal,
        paymentMethod,
        totalAmount: Math.round(totalAmount),
      });
      if (!backendCheck.valid) {
        setSubmitting(false);
        setErrorMsg(backendCheck.error || 'Order validation failed.');
        return;
      }

      const orderPath = `orders/${orderId}`;
      try {
        await setDoc(doc(db, 'orders', orderId), {
          orderNumber: orderNum,
          customerId: activeUser.uid,
          customerName: cleanName,
          customerEmail: cleanEmail,
          customerPhone: cleanPhone,
          deliveryLocation: cleanLocation,
          shippingAddress: cleanAddress,
          postalCode: cleanPostal,
          paymentMethod,
          itemsSummary: summaryStr,
          itemCount,
          subtotal: Math.round(subtotal),
          shippingFee: Math.round(shippingFee),
          totalAmount: Math.round(totalAmount),
          status: 'pending',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        try {
          handleFirestoreError(err, OperationType.CREATE, orderPath);
        } catch {
          // Proceed to Order Confirmation view even if guest auth isn't enabled in console yet
        }
      }
    }

    setSubmitting(false);
    onClearCart();
    onOrderConfirmed(confirmedSnapshot);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-[#2C1E16]/60 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-label="Shopping Cart and Checkout"
    >
      <div className="w-full max-w-lg bg-[#F6F1E9] h-full flex flex-col shadow-2xl border-l border-[#E2D5C3]">
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#FFFFFF] border-b border-[#E2D5C3]">
          <div>
            <h2 className="font-display text-2xl font-semibold text-[#2C1E16]">
              {step === 'cart' ? 'Your Shopping Cart' : 'Delivery & Checkout'}
            </h2>
            <p className="text-xs text-[#6A5243] mt-0.5">
              DORAH FASHIONS · Prices in UGX
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-full text-[#2C1E16] hover:bg-[#EDE4D5] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-12">
              <ShoppingBag className="w-12 h-12 text-[#C5A059] mb-3" />
              <h3 className="font-display text-2xl font-medium text-[#2C1E16]">
                Your shopping cart is empty
              </h3>
              <p className="text-xs text-[#6A5243] mt-1 max-w-xs">
                Explore our Bag Beads, Handmade Beads, Crystal Beads, Pearl
                Beads, and Acrylic Beads catalogue to add items.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="mt-6 px-5 py-2.5 bg-[#2C1E16] text-[#FFFFFF] border border-[#C5A059] text-xs font-semibold rounded-xl hover:bg-[#3F2C21] transition-colors cursor-pointer"
              >
                Browse Product Shop
              </button>
            </div>
          ) : step === 'cart' ? (
            <div className="space-y-4">
              {/* Delivery Location Preview Selector */}
              <div className="p-3.5 bg-[#FFFFFF] border border-[#E2D5C3] rounded-xl space-y-2">
                <label className="flex items-center gap-1.5 text-xs font-semibold text-[#2C1E16]">
                  <MapPin className="w-3.5 h-3.5 text-[#A37E3B]" />
                  <span>Select Delivery Location:</span>
                </label>
                <select
                  value={deliveryLocation}
                  onChange={(e) => setDeliveryLocation(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#F6F1E9] border border-[#E2D5C3] rounded-lg text-[#2C1E16] focus:outline-none focus:border-[#C5A059]"
                >
                  {DELIVERY_LOCATIONS.map((loc) => (
                    <option key={loc.label} value={loc.label}>
                      {loc.label} ({formatUGX(loc.fee)} · {loc.eta})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-[#6A5243]">
                  {subtotal >= FREE_DELIVERY_THRESHOLD_UGX
                    ? `Complimentary Express Delivery unlocked (${formatUGX(
                        FREE_DELIVERY_THRESHOLD_UGX
                      )}+ order).`
                    : `Orders over ${formatUGX(
                        FREE_DELIVERY_THRESHOLD_UGX
                      )} qualify for free delivery (${
                        selectedLocationObj.eta
                      }).`}
                </p>
              </div>

              {/* Itemized Cart List */}
              <div className="space-y-3">
                {items.map((item) => (
                  <div
                    key={`${item.product.id}_${item.selectedColor}_${item.selectedSize}`}
                    className="p-3.5 bg-[#FFFFFF] border border-[#E2D5C3] rounded-xl flex gap-3.5"
                  >
                    <img
                      src={item.product.imageUrl}
                      alt={item.product.name}
                      referrerPolicy="no-referrer"
                      className="w-20 h-20 object-cover rounded-lg bg-[#F6F1E9] border border-[#E2D5C3] shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-xs sm:text-sm font-semibold text-[#2C1E16] truncate">
                          {item.product.name}
                        </h4>
                        <button
                          type="button"
                          onClick={() =>
                            onRemoveItem(
                              item.product.id,
                              item.selectedColor,
                              item.selectedSize
                            )
                          }
                          aria-label={`Remove ${item.product.name}`}
                          className="text-[#6A5243] hover:text-red-700 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-[11px] text-[#6A5243] mt-0.5">
                        Color: <strong>{item.selectedColor}</strong> · Size:{' '}
                        <strong>{item.selectedSize}</strong>
                      </p>
                      <div className="mt-2.5 flex items-center justify-between">
                        <div className="inline-flex items-center border border-[#E2D5C3] rounded-lg bg-[#F6F1E9]">
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateQuantity(
                                item.product.id,
                                item.selectedColor,
                                item.selectedSize,
                                -1
                              )
                            }
                            className="px-2.5 py-1 text-xs font-semibold text-[#2C1E16] hover:bg-[#EDE4D5] cursor-pointer"
                          >
                            −
                          </button>
                          <span className="px-2.5 py-1 text-xs font-mono font-semibold tabular-nums text-[#2C1E16]">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateQuantity(
                                item.product.id,
                                item.selectedColor,
                                item.selectedSize,
                                1
                              )
                            }
                            className="px-2.5 py-1 text-xs font-semibold text-[#2C1E16] hover:bg-[#EDE4D5] cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                        <span className="font-mono text-xs sm:text-sm font-semibold text-[#2C1E16] tabular-nums">
                          {formatUGX(item.product.price * item.quantity)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Step === 'checkout' */
            <form
              id="checkout-form"
              onSubmit={handlePlaceOrder}
              className="space-y-4"
            >
              {errorMsg && (
                <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-800">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {!isRealCustomerAccount(user) ? (
                <div className="p-4 bg-[#FFFFFF] border border-[#E2D5C3] rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-semibold text-[#2C1E16]">
                      <Lock className="w-4 h-4 text-[#A37E3B]" />
                      <span>Sign In to Your Account for Orders</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowEmailLogin((prev) => !prev)}
                      className="text-xs font-semibold text-[#A37E3B] underline cursor-pointer"
                    >
                      {showEmailLogin ? 'Hide Sign-In' : 'Open Sign-In'}
                    </button>
                  </div>
                  <p className="text-xs text-[#6A5243] leading-relaxed">
                    Sign in with your email below to link and track all your
                    orders in <strong>My Orders</strong>.
                  </p>

                  {showEmailLogin && (
                    <div className="pt-2.5 space-y-2.5 border-t border-[#E2D5C3]">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="email"
                          value={customerEmail}
                          onChange={(e) => setCustomerEmail(e.target.value)}
                          placeholder="Your Email Address *"
                          className="px-3 py-2 text-xs bg-[#F6F1E9] border border-[#E2D5C3] rounded-lg focus:outline-none focus:border-[#C5A059]"
                        />
                        <input
                          type="password"
                          value={authPassword}
                          onChange={(e) => setAuthPassword(e.target.value)}
                          placeholder="Password (optional)"
                          className="px-3 py-2 text-xs bg-[#F6F1E9] border border-[#E2D5C3] rounded-lg focus:outline-none focus:border-[#C5A059]"
                        />
                      </div>
                      <button
                        type="button"
                        disabled={signingInEmail}
                        onClick={handleEmailSignInForCheckout}
                        className="w-full inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold text-[#FFFFFF] bg-[#2C1E16] border border-[#C5A059] rounded-lg hover:bg-[#3F2C21] transition-colors cursor-pointer"
                      >
                        <Mail className="w-3.5 h-3.5 text-[#C5A059]" />
                        <span>
                          {signingInEmail
                            ? 'Signing in to your account...'
                            : 'Sign In / Create Account with Email'}
                        </span>
                      </button>
                      <div className="flex justify-center pt-1">
                        <button
                          type="button"
                          onClick={handleSignInForCheckout}
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
                  )}
                </div>
              ) : (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center justify-between">
                  <span>
                    Signed in as{' '}
                    <strong>{getCanonicalUserEmail(user?.email)}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => logout()}
                    className="font-semibold text-emerald-800 underline hover:text-emerald-950 cursor-pointer"
                  >
                    Switch Account
                  </button>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-[#2C1E16] mb-1">
                  Customer Full Name *
                </label>
                <input
                  type="text"
                  required
                  maxLength={VALIDATION_RULES.ORDER.NAME_MAX}
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Sarah Namukasa"
                  className="w-full px-3.5 py-2.5 text-xs bg-[#FFFFFF] border border-[#E2D5C3] rounded-xl focus:outline-none focus:border-[#C5A059]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#2C1E16] mb-1">
                    Phone / WhatsApp Number *
                  </label>
                  <input
                    type="tel"
                    required
                    maxLength={VALIDATION_RULES.ORDER.PHONE_MAX}
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="+256 775 803 896"
                    className="w-full px-3.5 py-2.5 text-xs bg-[#FFFFFF] border border-[#E2D5C3] rounded-xl focus:outline-none focus:border-[#C5A059]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#2C1E16] mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    maxLength={VALIDATION_RULES.ORDER.EMAIL_MAX}
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full px-3.5 py-2.5 text-xs bg-[#FFFFFF] border border-[#E2D5C3] rounded-xl focus:outline-none focus:border-[#C5A059]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#2C1E16] mb-1">
                  Select Delivery Location *
                </label>
                <select
                  value={deliveryLocation}
                  onChange={(e) => setDeliveryLocation(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-[#FFFFFF] border border-[#E2D5C3] rounded-xl focus:outline-none focus:border-[#C5A059]"
                >
                  {DELIVERY_LOCATIONS.map((loc) => (
                    <option key={loc.label} value={loc.label}>
                      {loc.label} — {formatUGX(loc.fee)} ({loc.eta})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#2C1E16] mb-1">
                  Delivery Street Address / Landmark *
                </label>
                <textarea
                  rows={2}
                  required
                  maxLength={VALIDATION_RULES.ORDER.ADDRESS_MAX}
                  value={shippingAddress}
                  onChange={(e) => setShippingAddress(e.target.value)}
                  placeholder="Building, Street, Town/Area, Landmark..."
                  className="w-full px-3.5 py-2 text-xs bg-[#FFFFFF] border border-[#E2D5C3] rounded-xl focus:outline-none focus:border-[#C5A059]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#2C1E16] mb-1">
                    Choose Payment Method *
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) =>
                      setPaymentMethod(e.target.value as PaymentMethodType)
                    }
                    className="w-full px-3.5 py-2.5 text-xs bg-[#FFFFFF] border border-[#E2D5C3] rounded-xl focus:outline-none focus:border-[#C5A059]"
                  >
                    <option value="Cash on Delivery">Cash on Delivery</option>
                    <option value="Mobile Money">
                      Mobile Money (MTN / Airtel)
                    </option>
                    <option value="Card Payment">Card Payment</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#2C1E16] mb-1">
                    Area / Postal Code *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={VALIDATION_RULES.ORDER.POSTAL_MAX}
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    placeholder="256"
                    className="w-full px-3.5 py-2.5 text-xs bg-[#FFFFFF] border border-[#E2D5C3] rounded-xl focus:outline-none focus:border-[#C5A059]"
                  />
                </div>
              </div>
            </form>
          )}
        </div>

        {/* Drawer Footer */}
        {items.length > 0 && (
          <div className="p-5 bg-[#FFFFFF] border-t border-[#E2D5C3] space-y-3">
            <div className="space-y-1 text-xs">
              <div className="flex justify-between text-[#6A5243]">
                <span>Subtotal ({itemCount} items)</span>
                <span className="font-mono tabular-nums">
                  {formatUGX(subtotal)}
                </span>
              </div>
              <div className="flex justify-between text-[#6A5243]">
                <span className="truncate max-w-[230px]">
                  Delivery ({deliveryLocation})
                </span>
                <span className="font-mono tabular-nums">
                  {shippingFee === 0
                    ? 'Complimentary'
                    : formatUGX(shippingFee)}
                </span>
              </div>
              <div className="pt-2 border-t border-[#E2D5C3] flex justify-between text-sm font-semibold text-[#2C1E16]">
                <span>Total Price</span>
                <span className="font-mono text-[#A37E3B] tabular-nums">
                  {formatUGX(totalAmount)}
                </span>
              </div>
            </div>

            {step === 'cart' ? (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setStep('checkout')}
                  className="w-full py-3 px-5 bg-[#2C1E16] text-[#FFFFFF] border border-[#C5A059] text-xs font-semibold rounded-xl hover:bg-[#3F2C21] transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Proceed to Checkout</span>
                  <ArrowRight className="w-4 h-4 text-[#C5A059]" />
                </button>

                <a
                  href={whatsappCheckoutUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 px-4 bg-emerald-700 text-white text-xs font-semibold rounded-xl hover:bg-emerald-800 transition-colors flex items-center justify-center gap-2"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Order on WhatsApp ({WHATSAPP_NUMBER_DISPLAY})</span>
                </a>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setStep('cart')}
                    className="px-4 py-3 bg-[#F6F1E9] text-[#2C1E16] border border-[#E2D5C3] text-xs font-semibold rounded-xl hover:bg-[#EDE4D5] transition-colors cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    form="checkout-form"
                    disabled={submitting}
                    className="flex-1 py-3 px-5 bg-[#2C1E16] text-[#FFFFFF] border border-[#C5A059] text-xs font-semibold rounded-xl hover:bg-[#3F2C21] disabled:opacity-50 transition-colors cursor-pointer"
                  >
                    {submitting
                      ? 'Confirming Order...'
                      : `Confirm Order · ${formatUGX(totalAmount)}`}
                  </button>
                </div>

                <a
                  href={whatsappCheckoutUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 px-4 bg-emerald-700 text-white text-xs font-semibold rounded-xl hover:bg-emerald-800 transition-colors flex items-center justify-center gap-2"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Order on WhatsApp ({WHATSAPP_NUMBER_DISPLAY})</span>
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
