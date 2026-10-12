/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useMemo } from 'react';
import { User } from 'firebase/auth';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import {
  Search,
  ArrowRight,
  SlidersHorizontal,
  ShieldCheck,
  Sparkles,
  Globe,
  Mail,
  Phone,
  MapPin,
  CheckCircle2,
  MessageCircle,
  ArrowUpDown,
  Star,
} from 'lucide-react';
import { motion } from 'motion/react';
import {
  db,
  initAuth,
  ensureCustomerSession,
  OperationType,
  handleFirestoreError,
  isAuthorizedAdminEmail,
} from './firebase';
import {
  Product,
  CartItem,
  CATEGORIES,
  CategoryItem,
  BannerItem,
  ReviewItem,
  PriceFilterType,
  SortOptionType,
  ConfirmedOrderDetails,
  WHATSAPP_NUMBER_DISPLAY,
  VALIDATION_RULES,
} from './types';
import {
  HERO_CAMPAIGN_IMAGE,
  INITIAL_DORAH_PRODUCTS,
  INITIAL_DORAH_BANNERS,
  INITIAL_DORAH_REVIEWS,
} from './data/initialProducts';
import { buildWhatsAppOrderUrl } from './utils/whatsapp';
import { Navbar, ActiveView } from './components/Navbar';
import { ProductCard } from './components/ProductCard';
import { ProductDetailModal } from './components/ProductDetailModal';
import { CartDrawer } from './components/CartDrawer';
import { OrderConfirmationView } from './components/OrderConfirmationView';
import { CustomerOrdersView } from './components/CustomerOrdersView';
import { AdminDashboard } from './components/AdminDashboard';

export default function App() {
  const [activeView, setActiveView] = useState<ActiveView>('storefront');
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState<boolean>(false);

  // Firestore collections state
  const [firestoreProducts, setFirestoreProducts] = useState<Product[]>([]);
  const [firestoreCategories, setFirestoreCategories] = useState<
    CategoryItem[]
  >([]);
  const [firestoreBanners, setFirestoreBanners] = useState<BannerItem[]>([]);
  const [firestoreReviews, setFirestoreReviews] = useState<ReviewItem[]>([]);
  const [loadingProducts, setLoadingProducts] = useState<boolean>(true);

  // Storefront search, category filter, price filter & sorting state
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [priceFilter, setPriceFilter] = useState<PriceFilterType>('all');
  const [sortOption, setSortOption] = useState<SortOptionType>('featured');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Shopping Cart & Checkout state
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [cartInitialStep, setCartInitialStep] = useState<'cart' | 'checkout'>(
    'cart'
  );
  const [lastConfirmedOrder, setLastConfirmedOrder] =
    useState<ConfirmedOrderDetails | null>(null);

  // Contact Us Inquiry Form state
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [contactSubmitted, setContactSubmitted] = useState(false);

  // Public Customer Review Submission Form state
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewName, setReviewName] = useState('');
  const [reviewLocation, setReviewLocation] = useState('Kampala Central');
  const [reviewProduct, setReviewProduct] = useState(
    INITIAL_DORAH_PRODUCTS[0].name
  );
  const [reviewRating, setReviewRating] = useState('5');
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSubmittedMsg, setReviewSubmittedMsg] = useState<string | null>(
    null
  );

  // Initialize Firebase Auth listener
  useEffect(() => {
    const unsubscribe = initAuth(
      (loggedInUser, token) => {
        setUser(loggedInUser);
        if (loggedInUser.displayName) {
          setReviewName(loggedInUser.displayName);
        }
        if (token) setAccessToken(token);
        setAuthReady(true);
      },
      () => {
        setUser(null);
        setAccessToken(null);
        setAuthReady(true);
      }
    );
    return () => unsubscribe();
  }, []);

  // Subscribe to Firestore /products, /categories, /banners, and /reviews
  useEffect(() => {
    if (!authReady) return;

    setLoadingProducts(true);
    const isBootstrappedAdmin = isAuthorizedAdminEmail(user?.email);

    const productsQuery = isBootstrappedAdmin
      ? query(collection(db, 'products'))
      : query(collection(db, 'products'), where('published', '==', true));

    const categoriesQuery = isBootstrappedAdmin
      ? query(collection(db, 'categories'))
      : query(collection(db, 'categories'), where('active', '==', true));

    const bannersQuery = isBootstrappedAdmin
      ? query(collection(db, 'banners'))
      : query(collection(db, 'banners'), where('active', '==', true));

    const reviewsQuery = isBootstrappedAdmin
      ? query(collection(db, 'reviews'))
      : query(collection(db, 'reviews'), where('approved', '==', true));

    const unsubProducts = onSnapshot(
      productsQuery,
      (snapshot) => {
        const items: Product[] = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<Product, 'id'>),
        }));
        setFirestoreProducts(items);
        setLoadingProducts(false);
      },
      (error) => {
        setLoadingProducts(false);
        handleFirestoreError(error, OperationType.LIST, 'products');
      }
    );

    const unsubCategories = onSnapshot(
      categoriesQuery,
      (snapshot) => {
        const items: CategoryItem[] = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<CategoryItem, 'id'>),
        }));
        setFirestoreCategories(items);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'categories');
      }
    );

    const unsubBanners = onSnapshot(
      bannersQuery,
      (snapshot) => {
        const items: BannerItem[] = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<BannerItem, 'id'>),
        }));
        setFirestoreBanners(items);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'banners');
      }
    );

    const unsubReviews = onSnapshot(
      reviewsQuery,
      (snapshot) => {
        const items: ReviewItem[] = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<ReviewItem, 'id'>),
        }));
        setFirestoreReviews(items);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'reviews');
      }
    );

    return () => {
      unsubProducts();
      unsubCategories();
      unsubBanners();
      unsubReviews();
    };
  }, [authReady, user]);

  // Combine live Firestore products (or fall back to initial DORAH FASHIONS catalog until seeded)
  const displayProducts = useMemo(() => {
    const publishedFirestore = firestoreProducts.filter((p) => p.published);
    if (publishedFirestore.length > 0) {
      return publishedFirestore;
    }
    return INITIAL_DORAH_PRODUCTS;
  }, [firestoreProducts]);

  // Combine live Firestore categories (or fall back to the 7 default bead categories)
  const displayCategories = useMemo<string[]>(() => {
    const activeCats = firestoreCategories
      .filter((c) => c.active)
      .sort((a, b) => a.sortOrder - b.sortOrder);
    if (activeCats.length > 0) {
      return activeCats.map((c) => c.name);
    }
    return [...CATEGORIES];
  }, [firestoreCategories]);

  // Combine live Firestore banners (or fall back to initial hero banner)
  const activeBanners = useMemo(() => {
    const liveActive = firestoreBanners.filter((b) => b.active);
    if (liveActive.length > 0) {
      return liveActive;
    }
    return INITIAL_DORAH_BANNERS;
  }, [firestoreBanners]);

  const primaryHeroBanner = activeBanners[0] || INITIAL_DORAH_BANNERS[0];

  // Combine live approved reviews (or fall back to initial verified reviews)
  const approvedReviews = useMemo(() => {
    const liveApproved = firestoreReviews.filter((r) => r.approved);
    if (liveApproved.length > 0) {
      return liveApproved;
    }
    return INITIAL_DORAH_REVIEWS;
  }, [firestoreReviews]);

  // Filter & sort products based on search, category, price range, and sort order
  const filteredAndSortedProducts = useMemo(() => {
    const filtered = displayProducts.filter((prod) => {
      // 1. Category Filter
      const matchesCategory =
        selectedCategory === 'All' || prod.category === selectedCategory;

      // 2. Search Query (name, description, category, colors)
      const q = searchQuery.trim().toLowerCase();
      const colorsStr = (prod.colors || []).join(' ').toLowerCase();
      const matchesSearch =
        !q ||
        prod.name.toLowerCase().includes(q) ||
        prod.description.toLowerCase().includes(q) ||
        prod.category.toLowerCase().includes(q) ||
        colorsStr.includes(q);

      // 3. Price Filter (UGX)
      let matchesPrice = true;
      if (priceFilter === 'under-50k') {
        matchesPrice = prod.price < 50000;
      } else if (priceFilter === '50k-150k') {
        matchesPrice = prod.price >= 50000 && prod.price <= 150000;
      } else if (priceFilter === 'over-150k') {
        matchesPrice = prod.price > 150000;
      }

      return matchesCategory && matchesSearch && matchesPrice;
    });

    // 4. Sorting
    const sorted = [...filtered];
    if (sortOption === 'price-asc') {
      sorted.sort((a, b) => a.price - b.price);
    } else if (sortOption === 'price-desc') {
      sorted.sort((a, b) => b.price - a.price);
    } else if (sortOption === 'name-asc') {
      sorted.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortOption === 'stock-desc') {
      sorted.sort((a, b) => b.stock - a.stock);
    } else {
      sorted.sort((a, b) => Number(b.featured) - Number(a.featured));
    }

    return sorted;
  }, [displayProducts, selectedCategory, searchQuery, priceFilter, sortOption]);

  const handleAddToCart = (
    product: Product,
    selectedColor: string,
    selectedSize: string,
    quantity = 1
  ) => {
    setCartItems((prev) => {
      const existingIndex = prev.findIndex(
        (item) =>
          item.product.id === product.id &&
          item.selectedColor === selectedColor &&
          item.selectedSize === selectedSize
      );
      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + quantity,
        };
        return updated;
      }
      return [
        ...prev,
        { product, selectedColor, selectedSize, quantity },
      ];
    });
  };

  const handleBuyNow = (
    product: Product,
    selectedColor: string,
    selectedSize: string,
    quantity = 1
  ) => {
    handleAddToCart(product, selectedColor, selectedSize, quantity);
    setCartInitialStep('checkout');
    setIsCartOpen(true);
  };

  const handleUpdateCartQuantity = (
    productId: string,
    color: string,
    size: string,
    delta: number
  ) => {
    setCartItems((prev) =>
      prev
        .map((item) => {
          if (
            item.product.id === productId &&
            item.selectedColor === color &&
            item.selectedSize === size
          ) {
            const nextQty = item.quantity + delta;
            return nextQty > 0 ? { ...item, quantity: nextQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const handleRemoveCartItem = (
    productId: string,
    color: string,
    size: string
  ) => {
    setCartItems((prev) =>
      prev.filter(
        (item) =>
          !(
            item.product.id === productId &&
            item.selectedColor === color &&
            item.selectedSize === size
          )
      )
    );
  };

  const totalCartCount = cartItems.reduce((sum, i) => sum + i.quantity, 0);
  const cartSubtotal = cartItems.reduce(
    (sum, i) => sum + i.product.price * i.quantity,
    0
  );

  // Global WhatsApp Order URL (uses current cart items if any, or general inquiry)
  const globalWhatsAppUrl = buildWhatsAppOrderUrl({
    customerName: user?.displayName || undefined,
    items: cartItems,
    totalPrice: cartSubtotal,
  });

  const scrollToSection = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName.trim() || !contactEmail.trim() || !contactMessage.trim()) {
      return;
    }
    setContactSubmitted(true);
    setContactName('');
    setContactEmail('');
    setContactMessage('');
  };

  const handleCustomerSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = reviewName
      .trim()
      .slice(0, VALIDATION_RULES.REVIEW.NAME_MAX);
    const cleanLoc = reviewLocation
      .trim()
      .slice(0, VALIDATION_RULES.REVIEW.LOCATION_MAX);
    const cleanProd = reviewProduct
      .trim()
      .slice(0, VALIDATION_RULES.REVIEW.PRODUCT_MAX);
    const cleanComment = reviewComment
      .trim()
      .slice(0, VALIDATION_RULES.REVIEW.COMMENT_MAX);
    const parsedRating = Math.max(
      1,
      Math.min(5, Math.round(Number(reviewRating) || 5))
    );

    if (
      cleanName.length < VALIDATION_RULES.REVIEW.NAME_MIN ||
      cleanComment.length < VALIDATION_RULES.REVIEW.COMMENT_MIN
    ) {
      return;
    }

    setSubmittingReview(true);
    let currentUser = user;
    if (!currentUser) {
      currentUser = await ensureCustomerSession();
    }

    const reviewId = `rev_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const authorId =
      currentUser?.uid ||
      `guest_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const isAdminUser = isAuthorizedAdminEmail(currentUser?.email);

    try {
      await setDoc(doc(db, 'reviews', reviewId), {
        customerName: cleanName,
        customerLocation: cleanLoc || 'Kampala',
        productName: cleanProd,
        rating: parsedRating,
        comment: cleanComment,
        approved: Boolean(isAdminUser),
        authorId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setReviewComment('');
      setShowReviewForm(false);
      setReviewSubmittedMsg(
        isAdminUser
          ? 'Your review has been published on the storefront!'
          : 'Thank you! Your review has been submitted for administrator approval.'
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `reviews/${reviewId}`);
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F6F1E9] text-[#2C1E16]">
      {/* Top Navigation Bar */}
      <Navbar
        activeView={activeView}
        setActiveView={setActiveView}
        cartCount={totalCartCount}
        onOpenCart={() => {
          setCartInitialStep('cart');
          setIsCartOpen(true);
        }}
        onScrollToSection={scrollToSection}
      />

      {/* Main View Router */}
      <main className="flex-1">
        {activeView === 'order-confirmation' && lastConfirmedOrder ? (
          <OrderConfirmationView
            order={lastConfirmedOrder}
            onContinueShopping={() => setActiveView('storefront')}
            onViewMyOrders={() => setActiveView('orders')}
          />
        ) : activeView === 'orders' ? (
          <CustomerOrdersView
            user={user}
            onBackToShop={() => setActiveView('storefront')}
          />
        ) : activeView === 'admin' ? (
          <AdminDashboard
            user={user}
            accessToken={accessToken}
            onTokenUpdate={setAccessToken}
            firestoreProducts={firestoreProducts}
            firestoreCategories={firestoreCategories}
            firestoreBanners={firestoreBanners}
            firestoreReviews={firestoreReviews}
          />
        ) : (
          /* =================================================================
             PUBLIC E-COMMERCE STOREFRONT (dorafashions.online)
             Palette: Beige (#F6F1E9), White (#FFFFFF), Gold (#C5A059), Subtle Brown (#2C1E16)
          ================================================================= */
          <>
            {/* SECTION 1: Storefront Hero (Dynamically powered by Website Banners) */}
            <section
              id="hero"
              className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 pt-6 sm:pt-10 pb-14 sm:pb-20"
            >
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
                {/* Left Editorial Column */}
                <motion.div
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                  className="lg:col-span-5 flex flex-col justify-between py-2 sm:py-4"
                >
                  <div className="space-y-4 sm:space-y-5">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-[#A37E3B] font-semibold uppercase tracking-widest">
                      <span>DORAH FASHIONS</span>
                      <span aria-hidden="true">·</span>
                      <span>dorafashions.online</span>
                    </div>

                    <h1
                      className="font-display font-semibold text-[#2C1E16] tracking-tight leading-[1.06]"
                      style={{
                        fontSize: 'clamp(2.35rem, 4.3vw, 3.85rem)',
                        textWrap: 'balance',
                      }}
                    >
                      {primaryHeroBanner.title}
                    </h1>

                    <p className="text-sm sm:text-base text-[#6A5243] leading-relaxed max-w-xl">
                      {primaryHeroBanner.subtitle}
                    </p>
                  </div>

                  <div className="pt-8 space-y-6">
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={() => scrollToSection('collection')}
                        className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 min-h-[46px] bg-[#2C1E16] text-[#FFFFFF] border border-[#C5A059] text-xs font-semibold rounded-xl hover:bg-[#3F2C21] transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-sm"
                      >
                        <span>{primaryHeroBanner.ctaText || 'Shop Now'}</span>
                        <ArrowRight className="w-4 h-4 text-[#C5A059]" />
                      </button>
                      <button
                        type="button"
                        onClick={() => scrollToSection('contact')}
                        className="inline-flex items-center justify-center gap-2 px-6 py-3.5 min-h-[46px] bg-[#FFFFFF] border border-[#C5A059] text-[#2C1E16] text-xs font-semibold rounded-xl hover:bg-[#EDE4D5]/60 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <span>Contact Us</span>
                      </button>
                      <a
                        href={globalWhatsAppUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-2 px-5 py-3.5 min-h-[46px] bg-emerald-700 text-[#FFFFFF] text-xs font-semibold rounded-xl hover:bg-emerald-800 transition-colors whitespace-nowrap shrink-0 shadow-xs"
                      >
                        <MessageCircle className="w-4 h-4" />
                        <span>Order on WhatsApp</span>
                      </a>
                    </div>

                    <div className="pt-6 border-t border-[#E2D5C3] grid grid-cols-3 gap-3 sm:gap-4 text-xs">
                      <div>
                        <span className="font-mono font-semibold text-[#2C1E16] block tabular-nums">
                          {displayCategories.length} Bead Categories
                        </span>
                        <span className="text-[#6A5243]">
                          Pearls, Crystals &amp; Acrylic
                        </span>
                      </div>
                      <div>
                        <span className="font-mono font-semibold text-[#2C1E16] block tabular-nums">
                          Custom Orders
                        </span>
                        <span className="text-[#6A5243]">
                          Handwoven Creations
                        </span>
                      </div>
                      <div>
                        <span className="font-mono font-semibold text-[#2C1E16] block tabular-nums">
                          WhatsApp Desk
                        </span>
                        <span className="text-[#6A5243]">
                          {WHATSAPP_NUMBER_DISPLAY}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Right Showcase Image: Colorful Bag Beads & Beaded Handbags */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  className="lg:col-span-7 relative rounded-2xl overflow-hidden bg-[#EDE4D5] border border-[#C5A059]/40 min-h-[340px] sm:min-h-[440px] lg:min-h-[540px] shadow-lg"
                >
                  <img
                    src={primaryHeroBanner.imageUrl || HERO_CAMPAIGN_IMAGE}
                    alt={primaryHeroBanner.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#2C1E16]/85 via-[#2C1E16]/25 to-transparent flex flex-col justify-end p-5 sm:p-8 text-[#FFFFFF]">
                    <p className="text-xs uppercase tracking-widest text-[#C5A059] font-semibold">
                      {primaryHeroBanner.badgeText}
                    </p>
                    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mt-1.5">
                      <div>
                        <h2 className="font-display text-2xl sm:text-3xl font-medium text-[#FFFFFF]">
                          Bag Beads, Crystal Beads, Pearls &amp; Accessories
                        </h2>
                        <p className="text-xs text-[#EDE4D5] mt-1">
                          Select your preferred colors, sizes, and quantities or
                          order directly via WhatsApp ({WHATSAPP_NUMBER_DISPLAY})
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => scrollToSection('collection')}
                        className="px-4 py-2.5 min-h-[42px] bg-[#FFFFFF] text-[#2C1E16] border border-[#C5A059] text-xs font-semibold rounded-lg hover:bg-[#F6F1E9] transition-colors self-start sm:self-auto whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        Browse Product Shop
                      </button>
                    </div>
                  </div>
                </motion.div>
              </div>
            </section>

            {/* SECTION 2: Product Shop & Catalogue */}
            <section
              id="collection"
              className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-14 sm:py-18 border-t border-[#E2D5C3]"
            >
              <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8">
                <div>
                  <p className="text-xs uppercase tracking-widest text-[#A37E3B] font-semibold">
                    01. DORAH FASHIONS Product Shop
                  </p>
                  <h2 className="font-display text-3xl sm:text-4xl font-semibold text-[#2C1E16] mt-1">
                    Professional Bead &amp; Accessories Catalogue
                  </h2>
                </div>

                {/* Search, Price Filter & Sorting Controls */}
                <div className="flex flex-wrap items-center gap-3">
                  {/* Search Input */}
                  <div className="relative flex-1 sm:flex-initial">
                    <Search className="w-4 h-4 text-[#A37E3B] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search beads, colors, bags..."
                      className="pl-9 pr-4 py-2.5 min-h-[42px] text-xs bg-[#FFFFFF] border border-[#E2D5C3] text-[#2C1E16] placeholder-[#6A5243]/70 rounded-xl focus:outline-none focus:border-[#C5A059] w-full sm:w-52"
                    />
                  </div>

                  {/* Price Filter (UGX) */}
                  <div className="relative">
                    <select
                      value={priceFilter}
                      onChange={(e) =>
                        setPriceFilter(e.target.value as PriceFilterType)
                      }
                      aria-label="Filter by price in UGX"
                      className="px-3.5 py-2.5 min-h-[42px] text-xs font-medium bg-[#FFFFFF] border border-[#E2D5C3] text-[#2C1E16] rounded-xl focus:outline-none focus:border-[#C5A059] cursor-pointer"
                    >
                      <option value="all">All Prices (UGX)</option>
                      <option value="under-50k">Under UGX 50,000</option>
                      <option value="50k-150k">UGX 50,000 – 150,000</option>
                      <option value="over-150k">Over UGX 150,000</option>
                    </select>
                  </div>

                  {/* Sort Order */}
                  <div className="relative">
                    <ArrowUpDown className="w-3.5 h-3.5 text-[#A37E3B] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <select
                      value={sortOption}
                      onChange={(e) =>
                        setSortOption(e.target.value as SortOptionType)
                      }
                      aria-label="Sort products"
                      className="pl-8 pr-4 py-2.5 min-h-[42px] text-xs font-medium bg-[#FFFFFF] border border-[#E2D5C3] text-[#2C1E16] rounded-xl focus:outline-none focus:border-[#C5A059] cursor-pointer"
                    >
                      <option value="featured">Sort: Featured</option>
                      <option value="price-asc">Price: Low to High</option>
                      <option value="price-desc">Price: High to Low</option>
                      <option value="name-asc">Name: A – Z</option>
                      <option value="stock-desc">Stock: High to Low</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Dynamic Category Filters Bar */}
              <div className="flex items-center gap-1.5 p-1.5 bg-[#EDE4D5] border border-[#E2D5C3] rounded-xl overflow-x-auto mb-10">
                {(['All', ...displayCategories] as const).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3.5 py-2 min-h-[38px] text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      selectedCategory === cat
                        ? 'bg-[#2C1E16] text-[#FFFFFF] border border-[#C5A059] shadow-xs'
                        : 'text-[#6A5243] hover:text-[#2C1E16] hover:bg-[#FFFFFF]/60'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {loadingProducts ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                  {[1, 2, 3].map((n) => (
                    <div
                      key={n}
                      className="bg-[#FFFFFF] border border-[#E2D5C3] rounded-2xl overflow-hidden animate-pulse"
                    >
                      <div className="aspect-[4/3] bg-[#EDE4D5]" />
                      <div className="p-6 space-y-3">
                        <div className="h-3 bg-[#EDE4D5] rounded w-1/3" />
                        <div className="h-5 bg-[#EDE4D5] rounded w-3/4" />
                        <div className="h-4 bg-[#EDE4D5] rounded w-1/4" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredAndSortedProducts.length === 0 ? (
                <div className="p-12 bg-[#FFFFFF] border border-[#E2D5C3] rounded-2xl text-center">
                  <SlidersHorizontal className="w-8 h-8 text-[#C5A059] mx-auto mb-3" />
                  <h3 className="font-display text-2xl font-medium text-[#2C1E16]">
                    No products match your current filter
                  </h3>
                  <p className="text-xs text-[#6A5243] mt-1">
                    Try selecting a different bead category, price range, or
                    clearing your search query.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategory('All');
                      setPriceFilter('all');
                      setSearchQuery('');
                      setSortOption('featured');
                    }}
                    className="mt-4 px-5 py-2.5 text-xs font-semibold text-[#2C1E16] bg-[#F6F1E9] border border-[#C5A059] rounded-lg hover:bg-[#EDE4D5] cursor-pointer"
                  >
                    Reset All Filters
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                  {filteredAndSortedProducts.map((product, idx) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      index={idx}
                      onSelectProduct={setSelectedProduct}
                      onAddToCart={handleAddToCart}
                      onBuyNow={handleBuyNow}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* SECTION 3: Atelier Craftsmanship & Secondary Banners */}
            <section
              id="atelier"
              className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-14 sm:py-18 border-t border-[#E2D5C3]"
            >
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
                <div className="lg:col-span-5 space-y-3">
                  <p className="text-xs uppercase tracking-widest text-[#A37E3B] font-semibold">
                    02. The DORAH FASHIONS Craftsmanship
                  </p>
                  <h2
                    className="font-display text-3xl sm:text-4xl font-semibold text-[#2C1E16] leading-tight"
                    style={{ textWrap: 'balance' }}
                  >
                    Handwoven Artistry &amp; Premium Bag-Making Supplies.
                  </h2>
                  <p className="text-sm text-[#6A5243] leading-relaxed pt-2">
                    At <strong className="text-[#2C1E16]">DORAH FASHIONS</strong>{' '}
                    (<code className="font-mono text-xs">dorafashions.online</code>),
                    every beaded handbag is meticulously hand-threaded for
                    lasting structure and brilliance, while our curated bead
                    packs empower creators with high-luster pearls, faceted
                    crystals, acrylic beads, and solid gold-toned hardware.
                  </p>
                </div>

                <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-5 sm:gap-6">
                  <div className="p-6 bg-[#FFFFFF] border border-[#E2D5C3] rounded-2xl space-y-2.5 df-card-transition">
                    <Sparkles className="w-5 h-5 text-[#C5A059]" />
                    <h3 className="text-sm font-semibold text-[#2C1E16]">
                      Luminous Bead Quality
                    </h3>
                    <p className="text-xs text-[#6A5243] leading-relaxed">
                      High-gloss glass pearls, colorfast faceted crystal beads,
                      and tarnish-resistant 24k gold clasps and handles.
                    </p>
                  </div>

                  <div className="p-6 bg-[#FFFFFF] border border-[#E2D5C3] rounded-2xl space-y-2.5 df-card-transition">
                    <ShieldCheck className="w-5 h-5 text-[#C5A059]" />
                    <h3 className="text-sm font-semibold text-[#2C1E16]">
                      Flexible Checkout &amp; WhatsApp
                    </h3>
                    <p className="text-xs text-[#6A5243] leading-relaxed">
                      Order online or via WhatsApp ({WHATSAPP_NUMBER_DISPLAY})
                      with Cash on Delivery, Mobile Money, or Card payment.
                    </p>
                  </div>

                  <div className="p-6 bg-[#FFFFFF] border border-[#E2D5C3] rounded-2xl space-y-2.5 df-card-transition">
                    <Globe className="w-5 h-5 text-[#C5A059]" />
                    <h3 className="text-sm font-semibold text-[#2C1E16]">
                      Custom &amp; Bulk Orders
                    </h3>
                    <p className="text-xs text-[#6A5243] leading-relaxed">
                      Bespoke colorways for bridal parties, events, and
                      wholesale bag-making kits delivered across Uganda &amp;
                      beyond.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* SECTION 4: Customer Reviews & Testimonials */}
            <section
              id="reviews"
              className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-14 sm:py-18 border-t border-[#E2D5C3]"
            >
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
                <div>
                  <p className="text-xs uppercase tracking-widest text-[#A37E3B] font-semibold">
                    03. Client Testimonials
                  </p>
                  <h2 className="font-display text-3xl sm:text-4xl font-semibold text-[#2C1E16] mt-1">
                    Loved by Bag Creators &amp; Clients
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setShowReviewForm((prev) => !prev)}
                  className="px-4 py-2.5 bg-[#FFFFFF] border border-[#C5A059] text-[#2C1E16] text-xs font-semibold rounded-xl hover:bg-[#EDE4D5]/60 transition-colors cursor-pointer self-start sm:self-auto"
                >
                  {showReviewForm ? 'Close Review Form' : 'Write a Review'}
                </button>
              </div>

              {reviewSubmittedMsg && (
                <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-900">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{reviewSubmittedMsg}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setReviewSubmittedMsg(null)}
                    className="font-semibold underline cursor-pointer"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              {showReviewForm && (
                <form
                  onSubmit={handleCustomerSubmitReview}
                  className="mb-8 p-6 bg-[#FFFFFF] border border-[#C5A059] rounded-2xl grid grid-cols-1 sm:grid-cols-3 gap-4"
                >
                  <div>
                    <label className="block text-xs font-semibold text-[#2C1E16] mb-1">
                      Your Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={reviewName}
                      onChange={(e) => setReviewName(e.target.value)}
                      placeholder="Full Name"
                      className="w-full px-3.5 py-2 text-xs bg-[#F6F1E9] border border-[#E2D5C3] rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#2C1E16] mb-1">
                      Your City / Location *
                    </label>
                    <input
                      type="text"
                      required
                      value={reviewLocation}
                      onChange={(e) => setReviewLocation(e.target.value)}
                      placeholder="e.g. Kampala, Entebbe"
                      className="w-full px-3.5 py-2 text-xs bg-[#F6F1E9] border border-[#E2D5C3] rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#2C1E16] mb-1">
                      Rating *
                    </label>
                    <select
                      value={reviewRating}
                      onChange={(e) => setReviewRating(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs bg-[#F6F1E9] border border-[#E2D5C3] rounded-xl"
                    >
                      <option value="5">5 Stars — Excellent</option>
                      <option value="4">4 Stars — Very Good</option>
                      <option value="3">3 Stars — Good</option>
                      <option value="2">2 Stars — Fair</option>
                      <option value="1">1 Star</option>
                    </select>
                  </div>
                  <div className="sm:col-span-3">
                    <label className="block text-xs font-semibold text-[#2C1E16] mb-1">
                      Product Purchased *
                    </label>
                    <select
                      value={reviewProduct}
                      onChange={(e) => setReviewProduct(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs bg-[#F6F1E9] border border-[#E2D5C3] rounded-xl"
                    >
                      {displayProducts.map((p) => (
                        <option key={p.id} value={p.name}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-3">
                    <label className="block text-xs font-semibold text-[#2C1E16] mb-1">
                      Your Review *
                    </label>
                    <textarea
                      rows={2}
                      required
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      placeholder="Share your experience with DORAH FASHIONS beads or bags..."
                      className="w-full px-3.5 py-2 text-xs bg-[#F6F1E9] border border-[#E2D5C3] rounded-xl"
                    />
                  </div>
                  <div className="sm:col-span-3 flex justify-end">
                    <button
                      type="submit"
                      disabled={submittingReview}
                      className="px-5 py-2.5 bg-[#2C1E16] text-[#FFFFFF] border border-[#C5A059] text-xs font-semibold rounded-xl hover:bg-[#3F2C21] cursor-pointer"
                    >
                      {submittingReview ? 'Submitting...' : 'Submit Review'}
                    </button>
                  </div>
                </form>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {approvedReviews.map((rev) => (
                  <div
                    key={rev.id}
                    className="p-6 bg-[#FFFFFF] border border-[#E2D5C3] rounded-2xl flex flex-col justify-between space-y-4 df-card-transition"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center gap-1 text-[#C5A059]">
                        {Array.from({ length: rev.rating }).map((_, idx) => (
                          <Star
                            key={idx}
                            className="w-4 h-4 fill-[#C5A059]"
                          />
                        ))}
                      </div>
                      <p className="text-xs font-semibold text-[#A37E3B]">
                        {rev.productName}
                      </p>
                      <p className="text-xs sm:text-sm text-[#2C1E16] leading-relaxed">
                        &ldquo;{rev.comment}&rdquo;
                      </p>
                    </div>
                    <div className="pt-3 border-t border-[#E2D5C3] flex items-center justify-between text-xs">
                      <span className="font-semibold text-[#2C1E16]">
                        {rev.customerName}
                      </span>
                      <span className="text-[#6A5243]">
                        {rev.customerLocation}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* SECTION 5: Contact Us & WhatsApp Ordering Desk */}
            <section
              id="contact"
              className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-14 sm:py-18 border-t border-[#E2D5C3]"
            >
              <div className="bg-[#FFFFFF] border border-[#E2D5C3] rounded-2xl p-6 sm:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-5 space-y-4">
                  <p className="text-xs uppercase tracking-widest text-[#A37E3B] font-semibold">
                    04. Get in Touch &amp; WhatsApp Desk
                  </p>
                  <h2 className="font-display text-3xl font-semibold text-[#2C1E16]">
                    Contact DORAH FASHIONS
                  </h2>
                  <p className="text-xs sm:text-sm text-[#6A5243] leading-relaxed">
                    Have a question about custom beaded bag colors, wholesale
                    bead packs, or delivery? Message us directly on WhatsApp or
                    send an inquiry below.
                  </p>

                  <div className="space-y-3 pt-2 text-xs text-[#2C1E16]">
                    <div className="flex items-center gap-3">
                      <Phone className="w-4 h-4 text-[#C5A059] shrink-0" />
                      <span>
                        WhatsApp &amp; Direct Line:{' '}
                        <strong>{WHATSAPP_NUMBER_DISPLAY}</strong>
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <MapPin className="w-4 h-4 text-[#C5A059] shrink-0" />
                      <span>dorafashions.online · Bead &amp; Bag Studio</span>
                    </div>
                  </div>

                  <div className="pt-2">
                    <a
                      href={globalWhatsAppUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-5 py-3 bg-emerald-700 text-white text-xs font-semibold rounded-xl hover:bg-emerald-800 transition-colors shadow-xs"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>Order on WhatsApp ({WHATSAPP_NUMBER_DISPLAY})</span>
                    </a>
                  </div>
                </div>

                <div className="lg:col-span-7">
                  {contactSubmitted ? (
                    <div className="p-6 bg-[#F6F1E9] border border-[#C5A059] rounded-xl text-center space-y-2">
                      <CheckCircle2 className="w-8 h-8 text-[#A37E3B] mx-auto" />
                      <h3 className="font-display text-2xl font-semibold text-[#2C1E16]">
                        Thank You for Contacting Us
                      </h3>
                      <p className="text-xs text-[#6A5243]">
                        Your inquiry has been received by DORAH FASHIONS. We
                        will get back to you shortly.
                      </p>
                      <button
                        type="button"
                        onClick={() => setContactSubmitted(false)}
                        className="mt-2 px-4 py-2 text-xs font-semibold text-[#2C1E16] bg-[#FFFFFF] border border-[#E2D5C3] rounded-lg hover:border-[#C5A059] cursor-pointer"
                      >
                        Send Another Message
                      </button>
                    </div>
                  ) : (
                    <form
                      onSubmit={handleContactSubmit}
                      className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                    >
                      <div>
                        <label className="block text-xs font-semibold text-[#2C1E16] mb-1">
                          Your Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={contactName}
                          onChange={(e) => setContactName(e.target.value)}
                          placeholder="Full Name"
                          className="w-full px-3.5 py-2.5 text-xs bg-[#F6F1E9] border border-[#E2D5C3] rounded-lg focus:outline-none focus:border-[#C5A059]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[#2C1E16] mb-1">
                          Email or WhatsApp Phone *
                        </label>
                        <input
                          type="text"
                          required
                          value={contactEmail}
                          onChange={(e) => setContactEmail(e.target.value)}
                          placeholder="you@example.com or +256..."
                          className="w-full px-3.5 py-2.5 text-xs bg-[#F6F1E9] border border-[#E2D5C3] rounded-lg focus:outline-none focus:border-[#C5A059]"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-semibold text-[#2C1E16] mb-1">
                          How can we help you? *
                        </label>
                        <textarea
                          rows={3}
                          required
                          value={contactMessage}
                          onChange={(e) => setContactMessage(e.target.value)}
                          placeholder="Ask about custom beaded bags, bead pack quantities, or delivery..."
                          className="w-full px-3.5 py-2 text-xs bg-[#F6F1E9] border border-[#E2D5C3] rounded-lg focus:outline-none focus:border-[#C5A059]"
                        />
                      </div>
                      <div className="sm:col-span-2 flex justify-end">
                        <button
                          type="submit"
                          className="px-6 py-3 min-h-[44px] bg-[#2C1E16] text-[#FFFFFF] border border-[#C5A059] text-xs font-semibold rounded-xl hover:bg-[#3F2C21] transition-colors cursor-pointer"
                        >
                          Send Message
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            </section>
          </>
        )}
      </main>

      {/* Prominent Floating Order on WhatsApp Button (+256775803896) */}
      <div className="fixed bottom-5 right-5 z-40">
        <a
          href={globalWhatsAppUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2.5 px-4 py-3 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-full shadow-lg border border-white/20 transition-transform hover:scale-103"
          title={`Order on WhatsApp (${WHATSAPP_NUMBER_DISPLAY})`}
        >
          <MessageCircle className="w-4 h-4" />
          <span>Order on WhatsApp</span>
          {totalCartCount > 0 && (
            <span className="px-2 py-0.5 bg-white text-emerald-900 rounded-full font-mono text-[11px] font-bold">
              {totalCartCount}
            </span>
          )}
        </a>
      </div>

      {/* Quiet Luxury Footer */}
      <footer className="border-t border-[#E2D5C3] bg-[#FFFFFF] py-10 px-4 sm:px-6 lg:px-12 mt-16">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 text-xs text-[#6A5243]">
          <div>
            <p className="font-display text-xl font-semibold text-[#2C1E16]">
              DORAH FASHIONS
            </p>
            <p className="mt-1">
              Beautiful Beads. Beautiful Creations. · dorafashions.online ·
              WhatsApp {WHATSAPP_NUMBER_DISPLAY}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-6">
            <button
              type="button"
              onClick={() => setActiveView('storefront')}
              className="hover:text-[#2C1E16] transition-colors cursor-pointer"
            >
              Product Shop
            </button>
            <button
              type="button"
              onClick={() => setActiveView('orders')}
              className="hover:text-[#2C1E16] transition-colors cursor-pointer"
            >
              Order Tracking
            </button>
            <button
              type="button"
              onClick={() => setActiveView('admin')}
              className="hover:text-[#2C1E16] transition-colors cursor-pointer"
            >
              Administrator Login
            </button>
          </div>
        </div>
      </footer>

      {/* Product Detail Modal */}
      <ProductDetailModal
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onAddToCart={handleAddToCart}
        onBuyNow={handleBuyNow}
      />

      {/* Shopping Cart & Checkout Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        initialStep={cartInitialStep}
        onClose={() => setIsCartOpen(false)}
        items={cartItems}
        onUpdateQuantity={handleUpdateCartQuantity}
        onRemoveItem={handleRemoveCartItem}
        onClearCart={() => setCartItems([])}
        user={user}
        onOrderConfirmed={(details) => {
          setLastConfirmedOrder(details);
          setIsCartOpen(false);
          setActiveView('order-confirmation');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />
    </div>
  );
}
