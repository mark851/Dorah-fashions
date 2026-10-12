import React, { useEffect, useState, useMemo } from 'react';
import { User } from 'firebase/auth';
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  getDoc,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import {
  Plus,
  Edit3,
  Trash2,
  UploadCloud,
  FolderKanban,
  Package,
  ShoppingBag,
  CheckCircle2,
  AlertTriangle,
  LogOut,
  ShieldAlert,
  Sparkles,
  X,
  Users,
  Tags,
  BarChart3,
  Image as ImageIcon,
  Star,
  MessageCircle,
  Check,
  Eye,
  EyeOff,
  Mail,
  Download,
} from 'lucide-react';
import {
  db,
  storage,
  googleSignIn,
  emailPasswordAuth,
  logout,
  OperationType,
  handleFirestoreError,
  isAuthorizedAdminEmail,
} from '../firebase';
import {
  Product,
  Order,
  OrderStatus,
  CATEGORIES,
  CategoryItem,
  BannerItem,
  ReviewItem,
  CustomerSummary,
  formatUGX,
  VALIDATION_RULES,
} from '../types';
import {
  INITIAL_DORAH_PRODUCTS,
  INITIAL_DORAH_CATEGORIES,
  INITIAL_DORAH_BANNERS,
  INITIAL_DORAH_REVIEWS,
} from '../data/initialProducts';
import { validateProductWithBackend } from '../services/backendApi';

export type AdminTabType =
  | 'products'
  | 'orders'
  | 'customers'
  | 'categories'
  | 'analytics'
  | 'banners'
  | 'reviews';

interface AdminDashboardProps {
  user: User | null;
  accessToken: string | null;
  onTokenUpdate: (token: string | null) => void;
  firestoreProducts: Product[];
  firestoreCategories: CategoryItem[];
  firestoreBanners: BannerItem[];
  firestoreReviews: ReviewItem[];
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  user,
  onTokenUpdate,
  firestoreProducts,
  firestoreCategories,
  firestoreBanners,
  firestoreReviews,
}) => {
  const [activeTab, setActiveTab] = useState<AdminTabType>('products');
  const [isAdminVerified, setIsAdminVerified] = useState<boolean>(false);
  const [checkingAdmin, setCheckingAdmin] = useState<boolean>(false);

  // Admin Login Form state (Email/Password + Google Sign-In)
  const [adminEmailInput, setAdminEmailInput] = useState('');
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [signingInAdmin, setSigningInAdmin] = useState(false);
  const [authErrorMsg, setAuthErrorMsg] = useState<string | null>(null);

  // Orders state
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderFilter, setOrderFilter] = useState<'all' | OrderStatus>('all');
  const [customerSearch, setCustomerSearch] = useState<string>('');

  // Quick Inline Price & Stock Editing state
  const [quickEditId, setQuickEditId] = useState<string | null>(null);
  const [quickPrice, setQuickPrice] = useState<string>('');
  const [quickStock, setQuickStock] = useState<string>('');
  const [savingQuickId, setSavingQuickId] = useState<string | null>(null);

  // Product Form Modal state
  const [isProductModalOpen, setIsProductModalOpen] = useState<boolean>(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [category, setCategory] = useState<string>('Bag Beads');
  const [price, setPrice] = useState('45000');
  const [stock, setStock] = useState('15');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [colorsInput, setColorsInput] = useState(
    'Champagne Gold, Ivory Pearl, Turquoise'
  );
  const [sizesInput, setSizesInput] = useState(
    '8mm (500g), 10mm (500g), 12mm (1kg)'
  );
  const [published, setPublished] = useState(true);
  const [featured, setFeatured] = useState(false);
  const [savingProduct, setSavingProduct] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  // Category Form Modal state
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState<boolean>(false);
  const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(
    null
  );
  const [catName, setCatName] = useState('');
  const [catSlug, setCatSlug] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [catSortOrder, setCatSortOrder] = useState('1');
  const [catActive, setCatActive] = useState(true);
  const [savingCategory, setSavingCategory] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<CategoryItem | null>(
    null
  );

  // Banner Form Modal state
  const [isBannerModalOpen, setIsBannerModalOpen] = useState<boolean>(false);
  const [editingBanner, setEditingBanner] = useState<BannerItem | null>(null);
  const [bannerTitle, setBannerTitle] = useState('');
  const [bannerSubtitle, setBannerSubtitle] = useState('');
  const [bannerBadge, setBannerBadge] = useState('');
  const [bannerCta, setBannerCta] = useState('Shop Now');
  const [bannerImage, setBannerImage] = useState('');
  const [bannerActive, setBannerActive] = useState(true);
  const [savingBanner, setSavingBanner] = useState(false);
  const [bannerToDelete, setBannerToDelete] = useState<BannerItem | null>(null);

  // Review Form Modal state
  const [isReviewModalOpen, setIsReviewModalOpen] = useState<boolean>(false);
  const [editingReview, setEditingReview] = useState<ReviewItem | null>(null);
  const [revCustomerName, setRevCustomerName] = useState('');
  const [revCustomerLocation, setRevCustomerLocation] =
    useState('Kampala Central');
  const [revProductName, setRevProductName] = useState('');
  const [revRating, setRevRating] = useState('5');
  const [revComment, setRevComment] = useState('');
  const [revApproved, setRevApproved] = useState(true);
  const [savingReview, setSavingReview] = useState(false);
  const [reviewToDelete, setReviewToDelete] = useState<ReviewItem | null>(null);

  // Confirmation Modal for Product Deletion
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  // Available category names combining Firestore categories and default 7 categories
  const availableCategoryNames = useMemo(() => {
    if (firestoreCategories.length > 0) {
      const sorted = [...firestoreCategories].sort(
        (a, b) => a.sortOrder - b.sortOrder
      );
      return sorted.map((c) => c.name);
    }
    return [...CATEGORIES];
  }, [firestoreCategories]);

  // Check if current user is an authorized administrator
  useEffect(() => {
    let cancelled = false;
    async function verifyAdminAccess() {
      if (!user) {
        setIsAdminVerified(false);
        return;
      }
      if (isAuthorizedAdminEmail(user.email)) {
        setIsAdminVerified(true);
        return;
      }
      setCheckingAdmin(true);
      try {
        const adminSnap = await getDoc(doc(db, 'admins', user.uid));
        if (!cancelled) {
          setIsAdminVerified(adminSnap.exists());
        }
      } catch {
        if (!cancelled) setIsAdminVerified(false);
      } finally {
        if (!cancelled) setCheckingAdmin(false);
      }
    }
    verifyAdminAccess();
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Subscribe to all customer orders when admin is verified
  useEffect(() => {
    if (!user || !isAdminVerified) {
      setOrders([]);
      return;
    }

    const unsubscribe = onSnapshot(
      collection(db, 'orders'),
      (snapshot) => {
        const loaded: Order[] = snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Order, 'id'>),
        }));
        setOrders(loaded);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'orders');
      }
    );

    return () => unsubscribe();
  }, [user, isAdminVerified]);

  // Aggregate Customers from Orders
  const customersList = useMemo<CustomerSummary[]>(() => {
    const map = new Map<string, CustomerSummary>();
    for (const ord of orders) {
      const key =
        ord.customerEmail.toLowerCase().trim() ||
        ord.customerPhone.trim() ||
        ord.customerId;
      const existing = map.get(key);
      const validSpend = ord.status !== 'cancelled' ? ord.totalAmount : 0;
      if (existing) {
        existing.orderCount += 1;
        existing.totalSpent += validSpend;
        existing.lastOrderNumber = ord.orderNumber;
        if (ord.deliveryLocation) {
          existing.deliveryLocation = ord.deliveryLocation;
        }
      } else {
        map.set(key, {
          customerKey: key,
          customerName: ord.customerName,
          customerEmail: ord.customerEmail,
          customerPhone: ord.customerPhone,
          deliveryLocation: ord.deliveryLocation || 'Kampala Central',
          shippingAddress: `${ord.shippingAddress}, ${ord.postalCode}`,
          orderCount: 1,
          totalSpent: validSpend,
          lastOrderNumber: ord.orderNumber,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.totalSpent - a.totalSpent);
  }, [orders]);

  const filteredCustomers = useMemo(() => {
    const q = customerSearch.trim().toLowerCase();
    if (!q) return customersList;
    return customersList.filter(
      (c) =>
        c.customerName.toLowerCase().includes(q) ||
        c.customerEmail.toLowerCase().includes(q) ||
        c.customerPhone.toLowerCase().includes(q) ||
        c.deliveryLocation.toLowerCase().includes(q)
    );
  }, [customersList, customerSearch]);

  const handleAdminGoogleSignIn = async () => {
    setAuthErrorMsg(null);
    setSigningInAdmin(true);
    try {
      const res = await googleSignIn(adminEmailInput, adminPasswordInput);
      if (res) {
        onTokenUpdate(res.accessToken);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (
        msg.includes('AUTH_EMAIL_FALLBACK_PROMPT') ||
        msg.includes('unauthorized-domain') ||
        msg.includes('Authorized Domains')
      ) {
        setAuthErrorMsg(
          'Enter your Administrator Email above and click Sign In to access the dashboard immediately on this domain.'
        );
      } else {
        setAuthErrorMsg(
          'Enter your Administrator Email above and click Sign In to continue.'
        );
      }
    } finally {
      setSigningInAdmin(false);
    }
  };

  const handleAdminEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthErrorMsg(null);
    if (!adminEmailInput.trim() || !adminEmailInput.includes('@')) {
      setAuthErrorMsg('Please enter your valid administrator email address.');
      return;
    }
    setSigningInAdmin(true);
    try {
      await emailPasswordAuth({
        email: adminEmailInput,
        password: adminPasswordInput,
        mode: 'signin',
        displayName: 'DORAH FASHIONS Admin',
      });
    } catch (err) {
      setAuthErrorMsg(
        err instanceof Error
          ? err.message
          : 'Could not sign in with Email & Password.'
      );
    } finally {
      setSigningInAdmin(false);
    }
  };

  const handleDownloadBackupJson = () => {
    const backupPayload = {
      store: 'DORAH FASHIONS',
      domain: 'dorafashions.online',
      exportedAt: new Date().toISOString(),
      productCount: firestoreProducts.length,
      orderCount: orders.length,
      categories: firestoreCategories,
      banners: firestoreBanners,
      reviews: firestoreReviews,
      products: firestoreProducts,
      orders,
    };
    const blob = new Blob([JSON.stringify(backupPayload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `dorah_fashions_backup_${new Date()
      .toISOString()
      .slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setStatusBanner('Downloaded full store JSON backup to your device.');
  };

  // =========================================================================
  // 1. PRODUCT & STOCK HANDLERS
  // =========================================================================
  const handleSeedInitialCatalog = async () => {
    if (!user || !isAdminVerified) return;
    setSavingProduct(true);
    setStatusBanner(null);
    try {
      for (const item of INITIAL_DORAH_PRODUCTS) {
        const path = `products/${item.id}`;
        try {
          await setDoc(doc(db, 'products', item.id), {
            name: item.name,
            sku: item.sku,
            category: item.category,
            price: item.price,
            stock: item.stock,
            description: item.description,
            imageUrl: item.imageUrl,
            colors: item.colors || ['Champagne Gold', 'Ivory Pearl'],
            sizes: item.sizes,
            published: item.published,
            featured: item.featured,
            authorId: user.uid,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, path);
        }
      }
      setStatusBanner(
        'DORAH FASHIONS signature collection synced to live Firestore database.'
      );
    } finally {
      setSavingProduct(false);
    }
  };

  const startQuickEdit = (prod: Product) => {
    setQuickEditId(prod.id);
    setQuickPrice(String(prod.price));
    setQuickStock(String(prod.stock));
  };

  const handleSaveQuickPriceAndStock = async (prod: Product) => {
    if (!user || !isAdminVerified) return;
    const parsedPrice = Number(quickPrice);
    const parsedStock = Math.floor(Number(quickStock));
    if (
      Number.isNaN(parsedPrice) ||
      parsedPrice < 0 ||
      parsedPrice > VALIDATION_RULES.PRODUCT.PRICE_MAX ||
      Number.isNaN(parsedStock) ||
      parsedStock < 0 ||
      parsedStock > VALIDATION_RULES.PRODUCT.STOCK_MAX
    ) {
      setStatusBanner('Invalid price or stock amount.');
      return;
    }

    setSavingQuickId(prod.id);
    const path = `products/${prod.id}`;
    try {
      await updateDoc(doc(db, 'products', prod.id), {
        price: Math.round(parsedPrice),
        stock: parsedStock,
        updatedAt: serverTimestamp(),
      });
      setStatusBanner(
        `Updated "${prod.name}" price to ${formatUGX(parsedPrice)} and stock to ${parsedStock} units.`
      );
      setQuickEditId(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    } finally {
      setSavingQuickId(null);
    }
  };

  const openAddProductModal = () => {
    setEditingProduct(null);
    setName('');
    setSku(`DF-${Math.floor(100 + Math.random() * 900)}`);
    setCategory(availableCategoryNames[0] || 'Bag Beads');
    setPrice('45000');
    setStock('25');
    setDescription('');
    setImageUrl(INITIAL_DORAH_PRODUCTS[0].imageUrl);
    setColorsInput('Champagne Gold, Ivory Pearl, Turquoise');
    setSizesInput('Small, Medium, Large');
    setPublished(true);
    setFeatured(false);
    setFormError(null);
    setIsProductModalOpen(true);
  };

  const openEditProductModal = (prod: Product) => {
    setEditingProduct(prod);
    setName(prod.name);
    setSku(prod.sku);
    setCategory(prod.category);
    setPrice(String(prod.price));
    setStock(String(prod.stock));
    setDescription(prod.description);
    setImageUrl(prod.imageUrl);
    setColorsInput(
      prod.colors && prod.colors.length > 0
        ? prod.colors.join(', ')
        : 'Champagne Gold, Ivory Pearl'
    );
    setSizesInput(prod.sizes.join(', '));
    setPublished(prod.published);
    setFeatured(prod.featured);
    setFormError(null);
    setIsProductModalOpen(true);
  };

  // Compress uploaded photo on device so it saves reliably to Firebase
  // even when Firebase Cloud Storage bucket is not separately provisioned.
  const compressImageToDataUrl = (
    file: File,
    maxDimension = 900
  ): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Failed to read image file.'));
      reader.onload = () => {
        const img = new window.Image();
        img.onerror = () => reject(new Error('Failed to decode image file.'));
        img.onload = () => {
          let width = img.width;
          let height = img.height;
          if (width > maxDimension || height > maxDimension) {
            if (width >= height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(String(reader.result));
            return;
          }
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);

          // Try WebP first, then JPEG, stepping down quality if needed to stay well under Firestore 1MB limit
          let quality = 0.82;
          let dataUrl = canvas.toDataURL('image/webp', quality);
          if (!dataUrl.startsWith('data:image/webp')) {
            dataUrl = canvas.toDataURL('image/jpeg', quality);
          }
          while (dataUrl.length > 480000 && quality > 0.4) {
            quality -= 0.12;
            dataUrl = canvas.toDataURL('image/jpeg', quality);
          }
          resolve(dataUrl);
        };
        img.src = String(reader.result);
      };
      reader.readAsDataURL(file);
    });
  };

  // Upload Image to Firebase (Storage with automatic Firebase Firestore Data URL fallback)
  const handleFirebaseStorageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    target: 'product' | 'banner' = 'product'
  ) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      setFormError('Please select a valid image file (JPEG, PNG, WEBP).');
      return;
    }

    setUploadingImage(true);
    setFormError(null);
    try {
      const maxDim = target === 'banner' ? 1100 : 900;
      const compressedDataUrl = await compressImageToDataUrl(file, maxDim);

      let finalImageUrl = compressedDataUrl;
      try {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const folder = target === 'banner' ? 'banners' : 'products';
        const storageRef = ref(storage, `${folder}/${Date.now()}_${safeName}`);
        const storageUploadPromise = (async () => {
          await uploadBytes(storageRef, file);
          return await getDownloadURL(storageRef);
        })();
        const timeoutPromise = new Promise<string>((_, reject) =>
          setTimeout(() => reject(new Error('Storage timeout')), 2200)
        );
        const downloadUrl = await Promise.race([
          storageUploadPromise,
          timeoutPromise,
        ]);
        if (downloadUrl && downloadUrl.length <= VALIDATION_RULES.PRODUCT.IMAGE_MAX) {
          finalImageUrl = downloadUrl;
        }
      } catch {
        // Use the optimized compressedDataUrl stored directly in Firebase Firestore
        finalImageUrl = compressedDataUrl;
      }

      if (target === 'banner') {
        setBannerImage(finalImageUrl);
      } else {
        setImageUrl(finalImageUrl);
      }
      setStatusBanner('Photo uploaded and ready to save to Firebase.');
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : 'Could not process image file. Please try another photo or paste an image URL.'
      );
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !isAdminVerified) return;
    setFormError(null);

    const cleanName = name
      .trim()
      .slice(0, VALIDATION_RULES.PRODUCT.NAME_MAX);
    const rawSku =
      sku.trim() ||
      editingProduct?.sku ||
      `DF-${Math.floor(100 + Math.random() * 900)}`;
    const cleanSku =
      rawSku
        .replace(/[^a-zA-Z0-9_\-]/g, '-')
        .slice(0, VALIDATION_RULES.PRODUCT.SKU_MAX) ||
      `DF-${Date.now().toString().slice(-4)}`;
    const cleanCategory = category
      .trim()
      .slice(0, VALIDATION_RULES.PRODUCT.CATEGORY_MAX);
    const cleanDesc = description
      .trim()
      .slice(0, VALIDATION_RULES.PRODUCT.DESC_MAX);
    const cleanImg = imageUrl
      .trim()
      .slice(0, VALIDATION_RULES.PRODUCT.IMAGE_MAX);
    const parsedPrice = Number(price);
    const parsedStock = Math.floor(Number(stock));
    const parsedColors = colorsInput
      .split(',')
      .map((c) => c.trim().slice(0, 30))
      .filter(Boolean)
      .slice(0, VALIDATION_RULES.PRODUCT.COLORS_MAX);
    const parsedSizes = sizesInput
      .split(',')
      .map((s) => s.trim().slice(0, 30))
      .filter(Boolean)
      .slice(0, VALIDATION_RULES.PRODUCT.SIZES_MAX);

    if (cleanName.length < VALIDATION_RULES.PRODUCT.NAME_MIN) {
      setFormError('Product name must be at least 2 characters.');
      return;
    }
    if (cleanCategory.length < VALIDATION_RULES.PRODUCT.CATEGORY_MIN) {
      setFormError('Please select or enter a valid category.');
      return;
    }
    if (
      Number.isNaN(parsedPrice) ||
      parsedPrice < 0 ||
      parsedPrice > VALIDATION_RULES.PRODUCT.PRICE_MAX
    ) {
      setFormError('Price must be a valid number between 0 and 100,000,000 UGX.');
      return;
    }
    if (
      Number.isNaN(parsedStock) ||
      parsedStock < 0 ||
      parsedStock > VALIDATION_RULES.PRODUCT.STOCK_MAX
    ) {
      setFormError('Stock must be a valid whole number between 0 and 100,000.');
      return;
    }
    if (cleanDesc.length < VALIDATION_RULES.PRODUCT.DESC_MIN) {
      setFormError('Description must be at least 5 characters.');
      return;
    }
    if (cleanImg.length < VALIDATION_RULES.PRODUCT.IMAGE_MIN) {
      setFormError('Please provide a valid product image URL or upload an image.');
      return;
    }
    if (parsedColors.length < VALIDATION_RULES.PRODUCT.COLORS_MIN) {
      setFormError(
        'Please specify at least one available color (e.g. Champagne Gold, Ivory).'
      );
      return;
    }
    if (parsedSizes.length < VALIDATION_RULES.PRODUCT.SIZES_MIN) {
      setFormError(
        'Please specify at least one size or pack option (e.g. 8mm (500g), Medium).'
      );
      return;
    }

    setSavingProduct(true);
    const backendCheck = await validateProductWithBackend({
      name: cleanName,
      sku: cleanSku,
      category: cleanCategory,
      price: Math.round(parsedPrice),
      stock: parsedStock,
      description: cleanDesc,
      imageUrl: cleanImg,
      colors: parsedColors,
      sizes: parsedSizes,
    });
    if (!backendCheck.valid) {
      setSavingProduct(false);
      setFormError(backendCheck.error || 'Backend product validation failed.');
      return;
    }

    const productId =
      editingProduct?.id ||
      `prod_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const path = `products/${productId}`;

    try {
      if (editingProduct) {
        await updateDoc(doc(db, 'products', productId), {
          name: cleanName,
          sku: cleanSku,
          category: cleanCategory,
          price: Math.round(parsedPrice),
          stock: parsedStock,
          description: cleanDesc,
          imageUrl: cleanImg,
          colors: parsedColors,
          sizes: parsedSizes,
          published,
          featured,
          updatedAt: serverTimestamp(),
        });
        setStatusBanner(`Updated "${cleanName}" in Firestore.`);
      } else {
        await setDoc(doc(db, 'products', productId), {
          name: cleanName,
          sku: cleanSku,
          category: cleanCategory,
          price: Math.round(parsedPrice),
          stock: parsedStock,
          description: cleanDesc,
          imageUrl: cleanImg,
          colors: parsedColors,
          sizes: parsedSizes,
          published,
          featured,
          authorId: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        setStatusBanner(`Added "${cleanName}" to live catalog.`);
      }
      setIsProductModalOpen(false);
    } catch (err) {
      handleFirestoreError(
        err,
        editingProduct ? OperationType.UPDATE : OperationType.CREATE,
        path
      );
    } finally {
      setSavingProduct(false);
    }
  };

  const handleTogglePublished = async (prod: Product) => {
    const path = `products/${prod.id}`;
    try {
      await updateDoc(doc(db, 'products', prod.id), {
        published: !prod.published,
        updatedAt: serverTimestamp(),
      });
      setStatusBanner(
        `"${prod.name}" is now ${
          !prod.published ? 'Published on Storefront' : 'Hidden (Draft)'
        }.`
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  };

  const handleConfirmDeleteProduct = async () => {
    if (!productToDelete) return;
    const path = `products/${productToDelete.id}`;
    try {
      await deleteDoc(doc(db, 'products', productToDelete.id));
      setStatusBanner(`Deleted "${productToDelete.name}" from catalog.`);
      setProductToDelete(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  };

  // =========================================================================
  // 2. ORDER MANAGEMENT HANDLERS
  // =========================================================================
  const handleUpdateOrderStatus = async (
    order: Order,
    nextStatus: OrderStatus
  ) => {
    const path = `orders/${order.id}`;
    try {
      await updateDoc(doc(db, 'orders', order.id), {
        status: nextStatus,
        updatedAt: serverTimestamp(),
      });
      setStatusBanner(
        `Order #${order.orderNumber} updated to "${nextStatus}".`
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  };

  // =========================================================================
  // 3. CATEGORY MANAGEMENT HANDLERS
  // =========================================================================
  const handleSeedCategories = async () => {
    if (!user || !isAdminVerified) return;
    setSavingCategory(true);
    try {
      for (const cat of INITIAL_DORAH_CATEGORIES) {
        const path = `categories/${cat.id}`;
        try {
          await setDoc(doc(db, 'categories', cat.id), {
            name: cat.name,
            slug: cat.slug,
            description: cat.description,
            active: cat.active,
            sortOrder: cat.sortOrder,
            authorId: user.uid,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, path);
        }
      }
      setStatusBanner('Synced all 7 DORAH FASHIONS bead categories to Firestore.');
    } finally {
      setSavingCategory(false);
    }
  };

  const openAddCategoryModal = () => {
    setEditingCategory(null);
    setCatName('');
    setCatSlug('');
    setCatDesc('');
    setCatSortOrder(String(firestoreCategories.length + 1));
    setCatActive(true);
    setFormError(null);
    setIsCategoryModalOpen(true);
  };

  const openEditCategoryModal = (cat: CategoryItem) => {
    setEditingCategory(cat);
    setCatName(cat.name);
    setCatSlug(cat.slug);
    setCatDesc(cat.description);
    setCatSortOrder(String(cat.sortOrder));
    setCatActive(cat.active);
    setFormError(null);
    setIsCategoryModalOpen(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !isAdminVerified) return;
    setFormError(null);

    const cleanName = catName
      .trim()
      .slice(0, VALIDATION_RULES.CATEGORY.NAME_MAX);
    const autoSlug = (catSlug.trim() || cleanName)
      .toLowerCase()
      .replace(/[^a-z0-9_\-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, VALIDATION_RULES.CATEGORY.SLUG_MAX);
    const cleanDesc = catDesc
      .trim()
      .slice(0, VALIDATION_RULES.CATEGORY.DESC_MAX);
    const parsedOrder = Math.max(
      0,
      Math.min(1000, Math.floor(Number(catSortOrder) || 1))
    );

    if (cleanName.length < VALIDATION_RULES.CATEGORY.NAME_MIN) {
      setFormError('Category name must be at least 2 characters.');
      return;
    }
    if (autoSlug.length < VALIDATION_RULES.CATEGORY.SLUG_MIN) {
      setFormError('Category slug must be at least 2 characters.');
      return;
    }
    if (cleanDesc.length < VALIDATION_RULES.CATEGORY.DESC_MIN) {
      setFormError('Category description must be at least 2 characters.');
      return;
    }

    setSavingCategory(true);
    const categoryId =
      editingCategory?.id || `cat_${autoSlug}_${Date.now().toString(36)}`;
    const path = `categories/${categoryId}`;

    try {
      if (editingCategory) {
        await updateDoc(doc(db, 'categories', categoryId), {
          name: cleanName,
          slug: autoSlug,
          description: cleanDesc,
          active: catActive,
          sortOrder: parsedOrder,
          updatedAt: serverTimestamp(),
        });
        setStatusBanner(`Updated category "${cleanName}".`);
      } else {
        await setDoc(doc(db, 'categories', categoryId), {
          name: cleanName,
          slug: autoSlug,
          description: cleanDesc,
          active: catActive,
          sortOrder: parsedOrder,
          authorId: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        setStatusBanner(`Created new category "${cleanName}".`);
      }
      setIsCategoryModalOpen(false);
    } catch (err) {
      handleFirestoreError(
        err,
        editingCategory ? OperationType.UPDATE : OperationType.CREATE,
        path
      );
    } finally {
      setSavingCategory(false);
    }
  };

  const handleToggleCategoryActive = async (cat: CategoryItem) => {
    const path = `categories/${cat.id}`;
    try {
      await updateDoc(doc(db, 'categories', cat.id), {
        active: !cat.active,
        updatedAt: serverTimestamp(),
      });
      setStatusBanner(
        `Category "${cat.name}" is now ${!cat.active ? 'Active' : 'Hidden'}.`
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  };

  const handleConfirmDeleteCategory = async () => {
    if (!categoryToDelete) return;
    const path = `categories/${categoryToDelete.id}`;
    try {
      await deleteDoc(doc(db, 'categories', categoryToDelete.id));
      setStatusBanner(`Deleted category "${categoryToDelete.name}".`);
      setCategoryToDelete(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  };

  // =========================================================================
  // 4. WEBSITE BANNERS MANAGEMENT HANDLERS
  // =========================================================================
  const handleSeedBanners = async () => {
    if (!user || !isAdminVerified) return;
    setSavingBanner(true);
    try {
      for (const b of INITIAL_DORAH_BANNERS) {
        const path = `banners/${b.id}`;
        try {
          await setDoc(doc(db, 'banners', b.id), {
            title: b.title,
            subtitle: b.subtitle,
            badgeText: b.badgeText,
            ctaText: b.ctaText,
            imageUrl: b.imageUrl,
            active: b.active,
            authorId: user.uid,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, path);
        }
      }
      setStatusBanner('Synced DORAH FASHIONS website banners to Firestore.');
    } finally {
      setSavingBanner(false);
    }
  };

  const openAddBannerModal = () => {
    setEditingBanner(null);
    setBannerTitle('Beautiful Beads. Beautiful Creations.');
    setBannerSubtitle(
      'Discover luxury bag beads, crystal beads, luminous pearls, and handwoven custom bags.'
    );
    setBannerBadge('Featured Collection · DORAH FASHIONS');
    setBannerCta('Shop Now');
    setBannerImage(INITIAL_DORAH_BANNERS[0].imageUrl);
    setBannerActive(true);
    setFormError(null);
    setIsBannerModalOpen(true);
  };

  const openEditBannerModal = (b: BannerItem) => {
    setEditingBanner(b);
    setBannerTitle(b.title);
    setBannerSubtitle(b.subtitle);
    setBannerBadge(b.badgeText);
    setBannerCta(b.ctaText);
    setBannerImage(b.imageUrl);
    setBannerActive(b.active);
    setFormError(null);
    setIsBannerModalOpen(true);
  };

  const handleSaveBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !isAdminVerified) return;
    setFormError(null);

    const cleanTitle = bannerTitle
      .trim()
      .slice(0, VALIDATION_RULES.BANNER.TITLE_MAX);
    const cleanSubtitle = bannerSubtitle
      .trim()
      .slice(0, VALIDATION_RULES.BANNER.SUBTITLE_MAX);
    const cleanBadge = bannerBadge
      .trim()
      .slice(0, VALIDATION_RULES.BANNER.BADGE_MAX);
    const cleanCta = bannerCta
      .trim()
      .slice(0, VALIDATION_RULES.BANNER.CTA_MAX);
    const cleanImage = bannerImage
      .trim()
      .slice(0, VALIDATION_RULES.BANNER.IMAGE_MAX);

    if (
      cleanTitle.length < VALIDATION_RULES.BANNER.TITLE_MIN ||
      cleanSubtitle.length < VALIDATION_RULES.BANNER.SUBTITLE_MIN ||
      cleanBadge.length < VALIDATION_RULES.BANNER.BADGE_MIN ||
      cleanCta.length < VALIDATION_RULES.BANNER.CTA_MIN ||
      cleanImage.length < VALIDATION_RULES.BANNER.IMAGE_MIN
    ) {
      setFormError('Please fill out all banner fields and provide an image.');
      return;
    }

    setSavingBanner(true);
    const bannerId = editingBanner?.id || `banner_${Date.now()}`;
    const path = `banners/${bannerId}`;

    try {
      if (editingBanner) {
        await updateDoc(doc(db, 'banners', bannerId), {
          title: cleanTitle,
          subtitle: cleanSubtitle,
          badgeText: cleanBadge,
          ctaText: cleanCta,
          imageUrl: cleanImage,
          active: bannerActive,
          updatedAt: serverTimestamp(),
        });
        setStatusBanner(`Updated website banner "${cleanTitle}".`);
      } else {
        await setDoc(doc(db, 'banners', bannerId), {
          title: cleanTitle,
          subtitle: cleanSubtitle,
          badgeText: cleanBadge,
          ctaText: cleanCta,
          imageUrl: cleanImage,
          active: bannerActive,
          authorId: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        setStatusBanner(`Created website banner "${cleanTitle}".`);
      }
      setIsBannerModalOpen(false);
    } catch (err) {
      handleFirestoreError(
        err,
        editingBanner ? OperationType.UPDATE : OperationType.CREATE,
        path
      );
    } finally {
      setSavingBanner(false);
    }
  };

  const handleToggleBannerActive = async (b: BannerItem) => {
    const path = `banners/${b.id}`;
    try {
      await updateDoc(doc(db, 'banners', b.id), {
        active: !b.active,
        updatedAt: serverTimestamp(),
      });
      setStatusBanner(
        `Banner "${b.title}" is now ${!b.active ? 'Active on Website' : 'Inactive'}.`
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  };

  const handleConfirmDeleteBanner = async () => {
    if (!bannerToDelete) return;
    const path = `banners/${bannerToDelete.id}`;
    try {
      await deleteDoc(doc(db, 'banners', bannerToDelete.id));
      setStatusBanner(`Deleted banner "${bannerToDelete.title}".`);
      setBannerToDelete(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  };

  // =========================================================================
  // 5. CUSTOMER REVIEWS MANAGEMENT HANDLERS
  // =========================================================================
  const handleSeedReviews = async () => {
    if (!user || !isAdminVerified) return;
    setSavingReview(true);
    try {
      for (const rev of INITIAL_DORAH_REVIEWS) {
        const path = `reviews/${rev.id}`;
        try {
          await setDoc(doc(db, 'reviews', rev.id), {
            customerName: rev.customerName,
            customerLocation: rev.customerLocation,
            productName: rev.productName,
            rating: rev.rating,
            comment: rev.comment,
            approved: rev.approved,
            authorId: user.uid,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, path);
        }
      }
      setStatusBanner('Synced verified customer reviews to Firestore.');
    } finally {
      setSavingReview(false);
    }
  };

  const openAddReviewModal = () => {
    setEditingReview(null);
    setRevCustomerName('');
    setRevCustomerLocation('Kampala Central');
    setRevProductName(
      firestoreProducts[0]?.name || INITIAL_DORAH_PRODUCTS[0].name
    );
    setRevRating('5');
    setRevComment('');
    setRevApproved(true);
    setFormError(null);
    setIsReviewModalOpen(true);
  };

  const openEditReviewModal = (rev: ReviewItem) => {
    setEditingReview(rev);
    setRevCustomerName(rev.customerName);
    setRevCustomerLocation(rev.customerLocation);
    setRevProductName(rev.productName);
    setRevRating(String(rev.rating));
    setRevComment(rev.comment);
    setRevApproved(rev.approved);
    setFormError(null);
    setIsReviewModalOpen(true);
  };

  const handleSaveReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !isAdminVerified) return;
    setFormError(null);

    const cleanName = revCustomerName
      .trim()
      .slice(0, VALIDATION_RULES.REVIEW.NAME_MAX);
    const cleanLoc = revCustomerLocation
      .trim()
      .slice(0, VALIDATION_RULES.REVIEW.LOCATION_MAX);
    const cleanProd = revProductName
      .trim()
      .slice(0, VALIDATION_RULES.REVIEW.PRODUCT_MAX);
    const cleanComment = revComment
      .trim()
      .slice(0, VALIDATION_RULES.REVIEW.COMMENT_MAX);
    const parsedRating = Math.max(
      1,
      Math.min(5, Math.round(Number(revRating) || 5))
    );

    if (
      cleanName.length < VALIDATION_RULES.REVIEW.NAME_MIN ||
      cleanLoc.length < VALIDATION_RULES.REVIEW.LOCATION_MIN ||
      cleanProd.length < VALIDATION_RULES.REVIEW.PRODUCT_MIN ||
      cleanComment.length < VALIDATION_RULES.REVIEW.COMMENT_MIN
    ) {
      setFormError('Please complete all review fields (comment min 5 characters).');
      return;
    }

    setSavingReview(true);
    const reviewId = editingReview?.id || `rev_${Date.now()}`;
    const path = `reviews/${reviewId}`;

    try {
      if (editingReview) {
        await updateDoc(doc(db, 'reviews', reviewId), {
          customerName: cleanName,
          customerLocation: cleanLoc,
          productName: cleanProd,
          rating: parsedRating,
          comment: cleanComment,
          approved: revApproved,
          updatedAt: serverTimestamp(),
        });
        setStatusBanner(`Updated review from ${cleanName}.`);
      } else {
        await setDoc(doc(db, 'reviews', reviewId), {
          customerName: cleanName,
          customerLocation: cleanLoc,
          productName: cleanProd,
          rating: parsedRating,
          comment: cleanComment,
          approved: revApproved,
          authorId: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        setStatusBanner(`Added customer review from ${cleanName}.`);
      }
      setIsReviewModalOpen(false);
    } catch (err) {
      handleFirestoreError(
        err,
        editingReview ? OperationType.UPDATE : OperationType.CREATE,
        path
      );
    } finally {
      setSavingReview(false);
    }
  };

  const handleToggleReviewApproved = async (rev: ReviewItem) => {
    const path = `reviews/${rev.id}`;
    try {
      await updateDoc(doc(db, 'reviews', rev.id), {
        approved: !rev.approved,
        updatedAt: serverTimestamp(),
      });
      setStatusBanner(
        `Review by ${rev.customerName} is now ${
          !rev.approved ? 'Approved (Public)' : 'Hidden'
        }.`
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  };

  const handleConfirmDeleteReview = async () => {
    if (!reviewToDelete) return;
    const path = `reviews/${reviewToDelete.id}`;
    try {
      await deleteDoc(doc(db, 'reviews', reviewToDelete.id));
      setStatusBanner(`Deleted review by "${reviewToDelete.customerName}".`);
      setReviewToDelete(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  };

  // =========================================================================
  // COMPUTED SALES & INVENTORY STATISTICS
  // =========================================================================
  const filteredOrders =
    orderFilter === 'all'
      ? orders
      : orders.filter((o) => o.status === orderFilter);

  const validOrders = orders.filter((o) => o.status !== 'cancelled');
  const totalRevenue = validOrders.reduce((sum, o) => sum + o.totalAmount, 0);
  const deliveredRevenue = orders
    .filter((o) => o.status === 'delivered')
    .reduce((sum, o) => sum + o.totalAmount, 0);
  const totalUnitsSold = validOrders.reduce((sum, o) => sum + o.itemCount, 0);
  const avgOrderValue =
    validOrders.length > 0 ? Math.round(totalRevenue / validOrders.length) : 0;

  const catalogForStats =
    firestoreProducts.length > 0 ? firestoreProducts : INITIAL_DORAH_PRODUCTS;
  const totalInventoryUnits = catalogForStats.reduce(
    (sum, p) => sum + p.stock,
    0
  );
  const totalInventoryValuation = catalogForStats.reduce(
    (sum, p) => sum + p.price * p.stock,
    0
  );

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-8 border-b border-[#E2D5C3]">
        <div>
          <p className="text-xs uppercase tracking-widest text-[#A37E3B] font-semibold">
            DORAH FASHIONS · dorafashions.online
          </p>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold text-[#2C1E16] mt-1">
            Administrator Dashboard
          </h1>
          <p className="text-xs text-[#6A5243] mt-1">
            Manage products, images, UGX prices, stock, orders, customers,
            categories, sales statistics, website banners, and reviews.
          </p>
        </div>

        {user && !user.isAnonymous && (
          <div className="flex flex-wrap items-center gap-3">
            {isAdminVerified && (
              <button
                type="button"
                onClick={handleDownloadBackupJson}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#2C1E16] bg-[#FFFFFF] border border-[#E2D5C3] rounded-xl hover:border-[#C5A059] transition-colors cursor-pointer"
                title="Download JSON Backup"
              >
                <Download className="w-3.5 h-3.5 text-[#A37E3B]" />
                <span>Export Backup</span>
              </button>
            )}
            <div className="text-right text-xs">
              <p className="font-semibold text-[#2C1E16]">
                {isAdminVerified ? 'Administrator' : 'Customer Account'}
              </p>
              <p className="text-[#A37E3B] font-medium">
                {isAdminVerified ? 'Verified Business Owner' : 'Standard Access'}
              </p>
            </div>
            <button
              type="button"
              onClick={logout}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#2C1E16] bg-[#FFFFFF] border border-[#E2D5C3] rounded-xl hover:border-[#C5A059] transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5 text-[#A37E3B]" />
              <span>Sign Out</span>
            </button>
          </div>
        )}
      </div>

      {/* Authentication Gate */}
      {!user || user.isAnonymous ? (
        <div className="mt-10 max-w-lg mx-auto p-8 bg-[#FFFFFF] border border-[#E2D5C3] rounded-2xl shadow-xs space-y-6">
          <div className="text-center">
            <FolderKanban className="w-10 h-10 text-[#C5A059] mx-auto mb-3" />
            <h2 className="font-display text-2xl font-semibold text-[#2C1E16]">
              Administrator Sign-In
            </h2>
            <p className="text-xs text-[#6A5243] mt-1 leading-relaxed">
              Sign in with your authorized administrator credentials using Email
              &amp; Password or Google Sign-In.
            </p>
          </div>

          {authErrorMsg && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800">
              {authErrorMsg}
            </div>
          )}

          {/* Direct Email & Password Admin Sign-In (Bypasses Google OAuth Consent Screen) */}
          <form onSubmit={handleAdminEmailSignIn} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-[#2C1E16] mb-1">
                Administrator Email
              </label>
              <input
                type="email"
                required
                value={adminEmailInput}
                onChange={(e) => setAdminEmailInput(e.target.value)}
                placeholder="Enter administrator email"
                className="w-full px-3.5 py-2.5 text-xs bg-[#F6F1E9] border border-[#E2D5C3] rounded-xl focus:outline-none focus:border-[#C5A059]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#2C1E16] mb-1">
                Administrator Password (optional or min 6 characters)
              </label>
              <input
                type="password"
                value={adminPasswordInput}
                onChange={(e) => setAdminPasswordInput(e.target.value)}
                placeholder="Enter password (or leave blank for instant email sign-in)"
                className="w-full px-3.5 py-2.5 text-xs bg-[#F6F1E9] border border-[#E2D5C3] rounded-xl focus:outline-none focus:border-[#C5A059]"
              />
            </div>
            <button
              type="submit"
              disabled={signingInAdmin}
              className="w-full py-3 px-4 bg-[#2C1E16] text-[#FFFFFF] border border-[#C5A059] text-xs font-semibold rounded-xl hover:bg-[#3F2C21] transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <Mail className="w-4 h-4 text-[#C5A059]" />
              <span>
                {signingInAdmin
                  ? 'Signing In...'
                  : 'Sign In with Email & Password'}
              </span>
            </button>
          </form>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-[#E2D5C3]"></div>
            <span className="flex-shrink mx-3 text-[11px] text-[#6A5243]">
              OR SIGN IN WITH GOOGLE
            </span>
            <div className="flex-grow border-t border-[#E2D5C3]"></div>
          </div>

          <div className="flex justify-center">
            <button
              type="button"
              onClick={handleAdminGoogleSignIn}
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
      ) : checkingAdmin ? (
        <div className="py-16 text-center text-sm text-[#6A5243]">
          Verifying administrator privileges...
        </div>
      ) : !isAdminVerified ? (
        <div className="mt-12 max-w-lg mx-auto p-8 bg-amber-50/80 border border-amber-200 rounded-2xl text-center space-y-4">
          <ShieldAlert className="w-10 h-10 text-amber-800 mx-auto" />
          <h2 className="font-display text-2xl font-semibold text-[#2C1E16]">
            Restricted Administrator Access
          </h2>
          <p className="text-xs text-[#6A5243] leading-relaxed">
            This portal is restricted to authorized DORAH FASHIONS
            administrators. Please sign out and sign in with an authorized
            administrator account to manage the store.
          </p>
          <div className="pt-1">
            <button
              type="button"
              onClick={logout}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-[#FFFFFF] bg-[#2C1E16] border border-[#C5A059] rounded-xl hover:bg-[#3F2C21] transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5 text-[#C5A059]" />
              <span>Sign Out &amp; Switch Account</span>
            </button>
          </div>
        </div>
      ) : (
        /* Verified Admin Workspace */
        <div className="mt-8 space-y-8">
          {statusBanner && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-900">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{statusBanner}</span>
              </div>
              <button
                type="button"
                onClick={() => setStatusBanner(null)}
                className="text-emerald-700 hover:text-emerald-950 font-semibold cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Top KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 bg-[#FFFFFF] border border-[#E2D5C3] rounded-2xl">
              <p className="text-xs text-[#6A5243]">Products &amp; Stock</p>
              <p className="font-mono text-2xl font-semibold text-[#2C1E16] mt-1 tabular-nums">
                {firestoreProducts.length} Products
              </p>
              <p className="text-xs text-[#A37E3B] mt-1">
                {totalInventoryUnits} total units in stock
              </p>
            </div>
            <div className="p-5 bg-[#FFFFFF] border border-[#E2D5C3] rounded-2xl">
              <p className="text-xs text-[#6A5243]">Orders &amp; Customers</p>
              <p className="font-mono text-2xl font-semibold text-[#2C1E16] mt-1 tabular-nums">
                {orders.length} Orders
              </p>
              <p className="text-xs text-[#A37E3B] mt-1">
                {customersList.length} unique customers
              </p>
            </div>
            <div className="p-5 bg-[#FFFFFF] border border-[#E2D5C3] rounded-2xl">
              <p className="text-xs text-[#6A5243]">Total Sales Revenue</p>
              <p className="font-mono text-xl sm:text-2xl font-semibold text-[#2C1E16] mt-1 tabular-nums">
                {formatUGX(totalRevenue)}
              </p>
              <p className="text-xs text-[#A37E3B] mt-1">
                Avg order: {formatUGX(avgOrderValue)}
              </p>
            </div>
            <div className="p-5 bg-[#FFFFFF] border border-[#E2D5C3] rounded-2xl">
              <p className="text-xs text-[#6A5243]">
                Categories, Banners &amp; Reviews
              </p>
              <p className="font-mono text-2xl font-semibold text-[#2C1E16] mt-1 tabular-nums">
                {availableCategoryNames.length} Categories
              </p>
              <p className="text-xs text-[#A37E3B] mt-1">
                {firestoreBanners.length} banners · {firestoreReviews.length}{' '}
                reviews
              </p>
            </div>
          </div>

          {/* 7-Tab Admin Navigation Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-1.5 p-1.5 bg-[#EDE4D5] border border-[#E2D5C3] rounded-xl overflow-x-auto max-w-full">
              {(
                [
                  {
                    id: 'products',
                    label: `Products & Stock (${firestoreProducts.length})`,
                    icon: ShoppingBag,
                  },
                  {
                    id: 'orders',
                    label: `Orders (${orders.length})`,
                    icon: Package,
                  },
                  {
                    id: 'customers',
                    label: `Customers (${customersList.length})`,
                    icon: Users,
                  },
                  {
                    id: 'categories',
                    label: `Categories (${availableCategoryNames.length})`,
                    icon: Tags,
                  },
                  {
                    id: 'analytics',
                    label: 'Sales Statistics',
                    icon: BarChart3,
                  },
                  {
                    id: 'banners',
                    label: `Website Banners (${firestoreBanners.length})`,
                    icon: ImageIcon,
                  },
                  {
                    id: 'reviews',
                    label: `Reviews (${firestoreReviews.length})`,
                    icon: Star,
                  },
                ] as const
              ).map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      activeTab === tab.id
                        ? 'bg-[#2C1E16] text-[#FFFFFF] border border-[#C5A059] shadow-xs'
                        : 'text-[#6A5243] hover:text-[#2C1E16] hover:bg-[#FFFFFF]/60'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 text-[#C5A059]" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {activeTab === 'products' && (
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  disabled={savingProduct}
                  onClick={handleSeedInitialCatalog}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#2C1E16] bg-[#FFFFFF] border border-[#E2D5C3] rounded-xl hover:border-[#C5A059] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#C5A059]" />
                  <span>Sync Signature Catalog</span>
                </button>
                <button
                  type="button"
                  onClick={openAddProductModal}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-[#FFFFFF] bg-[#2C1E16] border border-[#C5A059] rounded-xl hover:bg-[#3F2C21] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-[#C5A059]" />
                  <span>Add New Product</span>
                </button>
              </div>
            )}

            {activeTab === 'categories' && (
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  disabled={savingCategory}
                  onClick={handleSeedCategories}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#2C1E16] bg-[#FFFFFF] border border-[#E2D5C3] rounded-xl hover:border-[#C5A059] transition-colors cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#C5A059]" />
                  <span>Sync Default 7 Categories</span>
                </button>
                <button
                  type="button"
                  onClick={openAddCategoryModal}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-[#FFFFFF] bg-[#2C1E16] border border-[#C5A059] rounded-xl hover:bg-[#3F2C21] transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-[#C5A059]" />
                  <span>Add Category</span>
                </button>
              </div>
            )}

            {activeTab === 'banners' && (
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  disabled={savingBanner}
                  onClick={handleSeedBanners}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#2C1E16] bg-[#FFFFFF] border border-[#E2D5C3] rounded-xl hover:border-[#C5A059] transition-colors cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#C5A059]" />
                  <span>Sync Default Banners</span>
                </button>
                <button
                  type="button"
                  onClick={openAddBannerModal}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-[#FFFFFF] bg-[#2C1E16] border border-[#C5A059] rounded-xl hover:bg-[#3F2C21] transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-[#C5A059]" />
                  <span>Add Website Banner</span>
                </button>
              </div>
            )}

            {activeTab === 'reviews' && (
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  disabled={savingReview}
                  onClick={handleSeedReviews}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#2C1E16] bg-[#FFFFFF] border border-[#E2D5C3] rounded-xl hover:border-[#C5A059] transition-colors cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#C5A059]" />
                  <span>Sync Verified Reviews</span>
                </button>
                <button
                  type="button"
                  onClick={openAddReviewModal}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-[#FFFFFF] bg-[#2C1E16] border border-[#C5A059] rounded-xl hover:bg-[#3F2C21] transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-[#C5A059]" />
                  <span>Add Customer Review</span>
                </button>
              </div>
            )}
          </div>

          {/* =================================================================
              TAB 1: PRODUCTS, IMAGES, PRICES & STOCK
          ================================================================= */}
          {activeTab === 'products' && (
            <div className="bg-[#FFFFFF] border border-[#E2D5C3] rounded-2xl overflow-hidden">
              {firestoreProducts.length === 0 ? (
                <div className="p-12 text-center">
                  <ShoppingBag className="w-10 h-10 text-[#C5A059] mx-auto mb-3" />
                  <h3 className="font-display text-2xl font-medium text-[#2C1E16]">
                    No products in live Firestore collection yet
                  </h3>
                  <p className="text-xs text-[#6A5243] mt-1 max-w-md mx-auto">
                    Click &ldquo;Sync Signature Catalog&rdquo; to populate your
                    Firestore database with the {INITIAL_DORAH_PRODUCTS.length}{' '}
                    DORAH FASHIONS signature beaded bags and bead collections,
                    or add a new product.
                  </p>
                  <button
                    type="button"
                    onClick={handleSeedInitialCatalog}
                    className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 bg-[#2C1E16] text-[#FFFFFF] border border-[#C5A059] text-xs font-semibold rounded-xl hover:bg-[#3F2C21] transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 text-[#C5A059]" />
                    <span>Sync Signature Catalog Now</span>
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[#E2D5C3] text-xs text-[#6A5243] bg-[#F6F1E9]/70">
                        <th className="py-3.5 px-4 font-semibold">Product</th>
                        <th className="py-3.5 px-4 font-semibold">Category</th>
                        <th className="py-3.5 px-4 font-semibold">
                          Price (UGX)
                        </th>
                        <th className="py-3.5 px-4 font-semibold">Stock</th>
                        <th className="py-3.5 px-4 font-semibold">Visibility</th>
                        <th className="py-3.5 px-4 font-semibold text-right">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2D5C3] text-sm">
                      {firestoreProducts.map((prod) => {
                        const isQuickEditing = quickEditId === prod.id;
                        return (
                          <tr
                            key={prod.id}
                            className="hover:bg-[#F6F1E9]/40 transition-colors"
                          >
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-3">
                                <img
                                  src={prod.imageUrl}
                                  alt={prod.name}
                                  referrerPolicy="no-referrer"
                                  className="w-12 h-14 object-cover rounded-lg bg-[#EDE4D5] border border-[#E2D5C3] shrink-0"
                                />
                                <div>
                                  <p className="font-semibold text-[#2C1E16]">
                                    {prod.name}
                                  </p>
                                  <p className="text-xs text-[#6A5243]">
                                    Colors:{' '}
                                    {(prod.colors || ['Champagne Gold']).join(
                                      ', '
                                    )}
                                  </p>
                                  <p className="text-[11px] text-[#A37E3B]">
                                    Sizes: {prod.sizes.join(', ')}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-xs font-medium text-[#2C1E16]">
                              {prod.category}
                            </td>
                            <td className="py-3.5 px-4 font-mono text-sm font-semibold text-[#2C1E16] tabular-nums">
                              {isQuickEditing ? (
                                <input
                                  type="number"
                                  min="0"
                                  step="500"
                                  value={quickPrice}
                                  onChange={(e) =>
                                    setQuickPrice(e.target.value)
                                  }
                                  className="w-28 px-2 py-1 text-xs font-mono bg-[#F6F1E9] border border-[#C5A059] rounded-md"
                                />
                              ) : (
                                formatUGX(prod.price)
                              )}
                            </td>
                            <td className="py-3.5 px-4 font-mono text-xs tabular-nums">
                              {isQuickEditing ? (
                                <input
                                  type="number"
                                  min="0"
                                  value={quickStock}
                                  onChange={(e) =>
                                    setQuickStock(e.target.value)
                                  }
                                  className="w-20 px-2 py-1 text-xs font-mono bg-[#F6F1E9] border border-[#C5A059] rounded-md"
                                />
                              ) : (
                                <span
                                  className={
                                    prod.stock > 0
                                      ? 'text-[#2C1E16] font-semibold'
                                      : 'text-red-700 font-semibold'
                                  }
                                >
                                  {prod.stock} units
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4">
                              <button
                                type="button"
                                onClick={() => handleTogglePublished(prod)}
                                className={`text-xs font-semibold underline underline-offset-4 cursor-pointer ${
                                  prod.published
                                    ? 'text-emerald-800'
                                    : 'text-[#6A5243]'
                                }`}
                              >
                                {prod.published
                                  ? 'Published (Public)'
                                  : 'Draft (Hidden)'}
                              </button>
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <div className="inline-flex items-center gap-1.5">
                                {isQuickEditing ? (
                                  <>
                                    <button
                                      type="button"
                                      disabled={savingQuickId === prod.id}
                                      onClick={() =>
                                        handleSaveQuickPriceAndStock(prod)
                                      }
                                      className="px-2.5 py-1 text-xs font-semibold text-white bg-emerald-700 rounded-md hover:bg-emerald-800 cursor-pointer"
                                    >
                                      <Check className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setQuickEditId(null)}
                                      className="px-2 py-1 text-xs text-[#6A5243] bg-[#F6F1E9] rounded-md hover:bg-[#EDE4D5] cursor-pointer"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => startQuickEdit(prod)}
                                    className="px-2.5 py-1 text-[11px] font-semibold text-[#2C1E16] bg-[#F6F1E9] border border-[#E2D5C3] rounded-md hover:border-[#C5A059] cursor-pointer"
                                    title="Quick change price or stock"
                                  >
                                    Price / Stock
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => openEditProductModal(prod)}
                                  className="p-1.5 text-[#6A5243] hover:text-[#2C1E16] hover:bg-[#F6F1E9] rounded-md transition-colors cursor-pointer"
                                  title="Edit Full Product & Upload Image"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setProductToDelete(prod)}
                                  className="p-1.5 text-[#6A5243] hover:text-red-700 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                                  title="Delete Product"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* =================================================================
              TAB 2: VIEW ORDERS & UPDATE ORDER STATUS
          ================================================================= */}
          {activeTab === 'orders' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-1.5">
                {(
                  [
                    'all',
                    'pending',
                    'processing',
                    'shipped',
                    'delivered',
                    'cancelled',
                  ] as const
                ).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setOrderFilter(st)}
                    className={`px-3.5 py-2 text-xs font-semibold rounded-lg capitalize transition-colors cursor-pointer ${
                      orderFilter === st
                        ? 'bg-[#2C1E16] text-[#FFFFFF] border border-[#C5A059]'
                        : 'bg-[#FFFFFF] border border-[#E2D5C3] text-[#6A5243] hover:text-[#2C1E16]'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>

              {filteredOrders.length === 0 ? (
                <div className="p-12 bg-[#FFFFFF] border border-[#E2D5C3] rounded-2xl text-center">
                  <Package className="w-10 h-10 text-[#C5A059] mx-auto mb-3" />
                  <h3 className="font-display text-2xl font-medium text-[#2C1E16]">
                    No matching customer orders
                  </h3>
                  <p className="text-xs text-[#6A5243] mt-1">
                    Customer orders placed on the storefront appear here in real
                    time.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredOrders.map((ord) => {
                    const cleanPhone = ord.customerPhone.replace(/[^0-9]/g, '');
                    const waFollowUpUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
                      `Hello ${ord.customerName}, this is DORAH FASHIONS regarding your Order #${ord.orderNumber} (${formatUGX(
                        ord.totalAmount
                      )}). Current status: ${ord.status.toUpperCase()}.`
                    )}`;
                    return (
                      <div
                        key={ord.id}
                        className="p-5 bg-[#FFFFFF] border border-[#E2D5C3] rounded-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                      >
                        <div className="space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2 text-xs text-[#6A5243]">
                            <span className="font-mono font-bold text-[#2C1E16]">
                              #{ord.orderNumber}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span className="font-semibold text-[#2C1E16]">
                              {ord.customerName}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span>{ord.customerEmail}</span>
                            <span aria-hidden="true">·</span>
                            <span>{ord.customerPhone}</span>
                          </div>
                          <p className="text-sm font-medium text-[#2C1E16]">
                            {ord.itemsSummary}
                          </p>
                          <p className="text-xs text-[#6A5243]">
                            Location:{' '}
                            <strong className="text-[#2C1E16]">
                              {ord.deliveryLocation || 'Standard Delivery'}
                            </strong>{' '}
                            · Address: {ord.shippingAddress}, {ord.postalCode} ·
                            Payment: <strong>{ord.paymentMethod}</strong>
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 shrink-0">
                          <div className="text-right mr-2">
                            <span className="text-xs text-[#6A5243] block">
                              Total (UGX)
                            </span>
                            <span className="font-mono text-base font-semibold text-[#2C1E16] tabular-nums">
                              {formatUGX(ord.totalAmount)}
                            </span>
                          </div>

                          <label className="text-xs text-[#6A5243] flex items-center gap-2">
                            <span>Status:</span>
                            <select
                              value={ord.status}
                              onChange={(e) =>
                                handleUpdateOrderStatus(
                                  ord,
                                  e.target.value as OrderStatus
                                )
                              }
                              className="px-3 py-2 text-xs font-semibold bg-[#F6F1E9] border border-[#E2D5C3] text-[#2C1E16] rounded-lg focus:outline-none focus:border-[#C5A059]"
                            >
                              <option value="pending">Pending</option>
                              <option value="processing">Processing</option>
                              <option value="shipped">Shipped</option>
                              <option value="delivered">Delivered</option>
                              <option value="cancelled">Cancelled</option>
                            </select>
                          </label>

                          {cleanPhone.length >= 7 && (
                            <a
                              href={waFollowUpUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 transition-colors"
                              title="Message Customer on WhatsApp"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                              <span>WhatsApp</span>
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* =================================================================
              TAB 3: VIEW CUSTOMERS
          ================================================================= */}
          {activeTab === 'customers' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#FFFFFF] border border-[#E2D5C3] rounded-2xl p-5">
                <div>
                  <h2 className="font-display text-2xl font-semibold text-[#2C1E16]">
                    Customer Directory ({customersList.length})
                  </h2>
                  <p className="text-xs text-[#6A5243]">
                    View customer contact profiles, delivery zones, order
                    history, and total spend in UGX.
                  </p>
                </div>
                <input
                  type="text"
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  placeholder="Search name, phone, email, or city..."
                  className="px-3.5 py-2 text-xs bg-[#F6F1E9] border border-[#E2D5C3] rounded-xl focus:outline-none focus:border-[#C5A059] w-full sm:w-64"
                />
              </div>

              {filteredCustomers.length === 0 ? (
                <div className="p-12 bg-[#FFFFFF] border border-[#E2D5C3] rounded-2xl text-center">
                  <Users className="w-10 h-10 text-[#C5A059] mx-auto mb-3" />
                  <h3 className="font-display text-2xl font-medium text-[#2C1E16]">
                    No customer records found
                  </h3>
                  <p className="text-xs text-[#6A5243] mt-1">
                    Customers who place orders on DORAH FASHIONS automatically
                    appear in this directory.
                  </p>
                </div>
              ) : (
                <div className="bg-[#FFFFFF] border border-[#E2D5C3] rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-[#E2D5C3] text-xs text-[#6A5243] bg-[#F6F1E9]/70">
                          <th className="py-3.5 px-4 font-semibold">
                            Customer Name
                          </th>
                          <th className="py-3.5 px-4 font-semibold">
                            Contact Details
                          </th>
                          <th className="py-3.5 px-4 font-semibold">
                            Delivery Location &amp; Address
                          </th>
                          <th className="py-3.5 px-4 font-semibold">Orders</th>
                          <th className="py-3.5 px-4 font-semibold">
                            Total Spent (UGX)
                          </th>
                          <th className="py-3.5 px-4 font-semibold text-right">
                            Direct Contact
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E2D5C3] text-sm">
                        {filteredCustomers.map((cust) => {
                          const cleanPhone = cust.customerPhone.replace(
                            /[^0-9]/g,
                            ''
                          );
                          return (
                            <tr
                              key={cust.customerKey}
                              className="hover:bg-[#F6F1E9]/40 transition-colors"
                            >
                              <td className="py-3.5 px-4">
                                <p className="font-semibold text-[#2C1E16]">
                                  {cust.customerName}
                                </p>
                                <p className="text-xs text-[#A37E3B] font-mono">
                                  Latest: #{cust.lastOrderNumber}
                                </p>
                              </td>
                              <td className="py-3.5 px-4 text-xs text-[#6A5243]">
                                <p className="font-medium text-[#2C1E16]">
                                  {cust.customerPhone}
                                </p>
                                <p>{cust.customerEmail}</p>
                              </td>
                              <td className="py-3.5 px-4 text-xs text-[#6A5243]">
                                <p className="font-semibold text-[#2C1E16]">
                                  {cust.deliveryLocation}
                                </p>
                                <p className="truncate max-w-xs">
                                  {cust.shippingAddress}
                                </p>
                              </td>
                              <td className="py-3.5 px-4 font-mono text-xs font-semibold text-[#2C1E16]">
                                {cust.orderCount}{' '}
                                {cust.orderCount === 1 ? 'order' : 'orders'}
                              </td>
                              <td className="py-3.5 px-4 font-mono text-sm font-semibold text-[#2C1E16] tabular-nums">
                                {formatUGX(cust.totalSpent)}
                              </td>
                              <td className="py-3.5 px-4 text-right">
                                {cleanPhone.length >= 7 && (
                                  <a
                                    href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent(
                                      `Hello ${cust.customerName}, thank you for shopping with DORAH FASHIONS!`
                                    )}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 transition-colors"
                                  >
                                    <MessageCircle className="w-3.5 h-3.5" />
                                    <span>WhatsApp</span>
                                  </a>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* =================================================================
              TAB 4: MANAGE CATEGORIES
          ================================================================= */}
          {activeTab === 'categories' && (
            <div className="bg-[#FFFFFF] border border-[#E2D5C3] rounded-2xl overflow-hidden">
              {firestoreCategories.length === 0 ? (
                <div className="p-12 text-center">
                  <Tags className="w-10 h-10 text-[#C5A059] mx-auto mb-3" />
                  <h3 className="font-display text-2xl font-medium text-[#2C1E16]">
                    Sync Your 7 Bead &amp; Bag Categories to Firestore
                  </h3>
                  <p className="text-xs text-[#6A5243] mt-1 max-w-md mx-auto">
                    Your storefront currently displays the 7 default categories
                    (Bag Beads, Handmade Beads, Crystal Beads, Pearl Beads,
                    Acrylic Beads, Bead Accessories, Custom Orders). Sync them
                    to Firestore to edit, reorder, or add new categories.
                  </p>
                  <button
                    type="button"
                    onClick={handleSeedCategories}
                    className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 bg-[#2C1E16] text-[#FFFFFF] border border-[#C5A059] text-xs font-semibold rounded-xl hover:bg-[#3F2C21] transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 text-[#C5A059]" />
                    <span>Sync Default 7 Categories Now</span>
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[#E2D5C3] text-xs text-[#6A5243] bg-[#F6F1E9]/70">
                        <th className="py-3.5 px-4 font-semibold">Order</th>
                        <th className="py-3.5 px-4 font-semibold">
                          Category Name
                        </th>
                        <th className="py-3.5 px-4 font-semibold">
                          Description
                        </th>
                        <th className="py-3.5 px-4 font-semibold">Products</th>
                        <th className="py-3.5 px-4 font-semibold">Status</th>
                        <th className="py-3.5 px-4 font-semibold text-right">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2D5C3] text-sm">
                      {[...firestoreCategories]
                        .sort((a, b) => a.sortOrder - b.sortOrder)
                        .map((cat) => {
                          const prodCount = catalogForStats.filter(
                            (p) => p.category === cat.name
                          ).length;
                          return (
                            <tr
                              key={cat.id}
                              className="hover:bg-[#F6F1E9]/40 transition-colors"
                            >
                              <td className="py-3.5 px-4 font-mono text-xs text-[#6A5243]">
                                #{cat.sortOrder}
                              </td>
                              <td className="py-3.5 px-4">
                                <p className="font-semibold text-[#2C1E16]">
                                  {cat.name}
                                </p>
                                <p className="font-mono text-[11px] text-[#A37E3B]">
                                  slug: {cat.slug}
                                </p>
                              </td>
                              <td className="py-3.5 px-4 text-xs text-[#6A5243] max-w-md">
                                {cat.description}
                              </td>
                              <td className="py-3.5 px-4 font-mono text-xs font-semibold text-[#2C1E16]">
                                {prodCount} items
                              </td>
                              <td className="py-3.5 px-4">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleToggleCategoryActive(cat)
                                  }
                                  className={`text-xs font-semibold underline underline-offset-4 cursor-pointer ${
                                    cat.active
                                      ? 'text-emerald-800'
                                      : 'text-[#6A5243]'
                                  }`}
                                >
                                  {cat.active ? 'Active on Shop' : 'Hidden'}
                                </button>
                              </td>
                              <td className="py-3.5 px-4 text-right">
                                <div className="inline-flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => openEditCategoryModal(cat)}
                                    className="p-1.5 text-[#6A5243] hover:text-[#2C1E16] hover:bg-[#F6F1E9] rounded-md cursor-pointer"
                                    title="Edit Category"
                                  >
                                    <Edit3 className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setCategoryToDelete(cat)}
                                    className="p-1.5 text-[#6A5243] hover:text-red-700 hover:bg-red-50 rounded-md cursor-pointer"
                                    title="Delete Category"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* =================================================================
              TAB 5: VIEW SALES STATISTICS
          ================================================================= */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              {/* Executive Financial Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 bg-[#FFFFFF] border border-[#E2D5C3] rounded-2xl">
                  <p className="text-xs text-[#6A5243]">
                    Gross Order Revenue (UGX)
                  </p>
                  <p className="font-mono text-2xl font-semibold text-[#2C1E16] mt-1 tabular-nums">
                    {formatUGX(totalRevenue)}
                  </p>
                  <p className="text-xs text-emerald-800 mt-1">
                    {validOrders.length} active/completed orders
                  </p>
                </div>
                <div className="p-5 bg-[#FFFFFF] border border-[#E2D5C3] rounded-2xl">
                  <p className="text-xs text-[#6A5243]">
                    Delivered &amp; Settled (UGX)
                  </p>
                  <p className="font-mono text-2xl font-semibold text-[#2C1E16] mt-1 tabular-nums">
                    {formatUGX(deliveredRevenue)}
                  </p>
                  <p className="text-xs text-[#A37E3B] mt-1">
                    {orders.filter((o) => o.status === 'delivered').length}{' '}
                    delivered orders
                  </p>
                </div>
                <div className="p-5 bg-[#FFFFFF] border border-[#E2D5C3] rounded-2xl">
                  <p className="text-xs text-[#6A5243]">
                    Total Items Sold &amp; Avg Basket
                  </p>
                  <p className="font-mono text-2xl font-semibold text-[#2C1E16] mt-1 tabular-nums">
                    {totalUnitsSold} Units
                  </p>
                  <p className="text-xs text-[#A37E3B] mt-1">
                    Avg Basket: {formatUGX(avgOrderValue)}
                  </p>
                </div>
                <div className="p-5 bg-[#FFFFFF] border border-[#E2D5C3] rounded-2xl">
                  <p className="text-xs text-[#6A5243]">
                    Store Inventory Valuation
                  </p>
                  <p className="font-mono text-2xl font-semibold text-[#2C1E16] mt-1 tabular-nums">
                    {formatUGX(totalInventoryValuation)}
                  </p>
                  <p className="text-xs text-[#A37E3B] mt-1">
                    Across {totalInventoryUnits} units in stock
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Revenue by Payment Method */}
                <div className="p-6 bg-[#FFFFFF] border border-[#E2D5C3] rounded-2xl space-y-4">
                  <h3 className="font-display text-2xl font-semibold text-[#2C1E16]">
                    Sales by Payment Method
                  </h3>
                  {(
                    [
                      'Mobile Money',
                      'Cash on Delivery',
                      'Card Payment',
                    ] as const
                  ).map((method) => {
                    const methodOrders = validOrders.filter(
                      (o) => o.paymentMethod === method
                    );
                    const methodTotal = methodOrders.reduce(
                      (sum, o) => sum + o.totalAmount,
                      0
                    );
                    const pct =
                      totalRevenue > 0
                        ? Math.round((methodTotal / totalRevenue) * 100)
                        : 0;
                    return (
                      <div key={method} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-[#2C1E16]">
                            {method} ({methodOrders.length} orders)
                          </span>
                          <span className="font-mono font-semibold text-[#2C1E16]">
                            {formatUGX(methodTotal)} ({pct}%)
                          </span>
                        </div>
                        <div className="w-full h-2.5 bg-[#F6F1E9] rounded-full overflow-hidden border border-[#E2D5C3]">
                          <div
                            className="h-full bg-[#C5A059] rounded-full transition-all"
                            style={{ width: `${Math.max(pct, 4)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Category Inventory & Valuation Breakdown */}
                <div className="p-6 bg-[#FFFFFF] border border-[#E2D5C3] rounded-2xl space-y-4">
                  <h3 className="font-display text-2xl font-semibold text-[#2C1E16]">
                    Inventory Valuation by Category (UGX)
                  </h3>
                  <div className="space-y-3">
                    {availableCategoryNames.map((catNameItem) => {
                      const catProds = catalogForStats.filter(
                        (p) => p.category === catNameItem
                      );
                      const catStock = catProds.reduce(
                        (sum, p) => sum + p.stock,
                        0
                      );
                      const catVal = catProds.reduce(
                        (sum, p) => sum + p.price * p.stock,
                        0
                      );
                      return (
                        <div
                          key={catNameItem}
                          className="flex items-center justify-between py-2 border-b border-[#E2D5C3]/70 last:border-b-0 text-xs"
                        >
                          <div>
                            <p className="font-semibold text-[#2C1E16]">
                              {catNameItem}
                            </p>
                            <p className="text-[#6A5243]">
                              {catProds.length} products · {catStock} units in
                              stock
                            </p>
                          </div>
                          <span className="font-mono font-semibold text-[#2C1E16] tabular-nums">
                            {formatUGX(catVal)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =================================================================
              TAB 6: MANAGE WEBSITE BANNERS
          ================================================================= */}
          {activeTab === 'banners' && (
            <div className="space-y-4">
              {firestoreBanners.length === 0 ? (
                <div className="p-12 bg-[#FFFFFF] border border-[#E2D5C3] rounded-2xl text-center">
                  <ImageIcon className="w-10 h-10 text-[#C5A059] mx-auto mb-3" />
                  <h3 className="font-display text-2xl font-medium text-[#2C1E16]">
                    Manage Your Website Hero &amp; Promotional Banners
                  </h3>
                  <p className="text-xs text-[#6A5243] mt-1 max-w-md mx-auto">
                    Sync the default DORAH FASHIONS banners to Firestore to
                    customize the homepage headline, promotional copy, CTA
                    buttons, and banner photography.
                  </p>
                  <button
                    type="button"
                    onClick={handleSeedBanners}
                    className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 bg-[#2C1E16] text-[#FFFFFF] border border-[#C5A059] text-xs font-semibold rounded-xl hover:bg-[#3F2C21] transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 text-[#C5A059]" />
                    <span>Sync Default Website Banners</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {firestoreBanners.map((b) => (
                    <div
                      key={b.id}
                      className="bg-[#FFFFFF] border border-[#E2D5C3] rounded-2xl overflow-hidden flex flex-col justify-between"
                    >
                      <div>
                        <div className="aspect-[16/9] relative bg-[#EDE4D5]">
                          <img
                            src={b.imageUrl}
                            alt={b.title}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute top-3 right-3">
                            <span
                              className={`px-3 py-1 rounded-md text-xs font-semibold ${
                                b.active
                                  ? 'bg-emerald-900/90 text-white'
                                  : 'bg-stone-800/80 text-stone-200'
                              }`}
                            >
                              {b.active ? 'Active on Website' : 'Hidden'}
                            </span>
                          </div>
                        </div>
                        <div className="p-5 space-y-2">
                          <p className="text-[11px] uppercase tracking-widest text-[#A37E3B] font-semibold">
                            {b.badgeText}
                          </p>
                          <h3 className="font-display text-2xl font-semibold text-[#2C1E16]">
                            {b.title}
                          </h3>
                          <p className="text-xs text-[#6A5243] leading-relaxed">
                            {b.subtitle}
                          </p>
                          <p className="text-xs font-semibold text-[#2C1E16] pt-1">
                            CTA Button: &ldquo;{b.ctaText}&rdquo;
                          </p>
                        </div>
                      </div>

                      <div className="px-5 py-3.5 bg-[#F6F1E9] border-t border-[#E2D5C3] flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => handleToggleBannerActive(b)}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#2C1E16] hover:text-[#A37E3B] cursor-pointer"
                        >
                          {b.active ? (
                            <>
                              <EyeOff className="w-3.5 h-3.5" />
                              <span>Deactivate</span>
                            </>
                          ) : (
                            <>
                              <Eye className="w-3.5 h-3.5" />
                              <span>Set Active</span>
                            </>
                          )}
                        </button>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openEditBannerModal(b)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-[#2C1E16] bg-[#FFFFFF] border border-[#E2D5C3] rounded-lg hover:border-[#C5A059] cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setBannerToDelete(b)}
                            className="p-1.5 text-[#6A5243] hover:text-red-700 hover:bg-red-50 rounded-lg cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* =================================================================
              TAB 7: MANAGE CUSTOMER REVIEWS
          ================================================================= */}
          {activeTab === 'reviews' && (
            <div className="space-y-4">
              {firestoreReviews.length === 0 ? (
                <div className="p-12 bg-[#FFFFFF] border border-[#E2D5C3] rounded-2xl text-center">
                  <Star className="w-10 h-10 text-[#C5A059] mx-auto mb-3" />
                  <h3 className="font-display text-2xl font-medium text-[#2C1E16]">
                    Manage Customer Reviews &amp; Testimonials
                  </h3>
                  <p className="text-xs text-[#6A5243] mt-1 max-w-md mx-auto">
                    Sync the verified buyer reviews to Firestore or add new
                    customer testimonials. Approved reviews appear on the public
                    website.
                  </p>
                  <button
                    type="button"
                    onClick={handleSeedReviews}
                    className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 bg-[#2C1E16] text-[#FFFFFF] border border-[#C5A059] text-xs font-semibold rounded-xl hover:bg-[#3F2C21] transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 text-[#C5A059]" />
                    <span>Sync Verified Customer Reviews</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {firestoreReviews.map((rev) => (
                    <div
                      key={rev.id}
                      className="p-5 bg-[#FFFFFF] border border-[#E2D5C3] rounded-2xl flex flex-col justify-between space-y-4"
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-0.5 text-[#C5A059]">
                            {Array.from({ length: rev.rating }).map((_, i) => (
                              <Star
                                key={i}
                                className="w-4 h-4 fill-[#C5A059]"
                              />
                            ))}
                          </div>
                          <span
                            className={`px-2.5 py-0.5 rounded text-[11px] font-semibold ${
                              rev.approved
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : 'bg-amber-50 text-amber-800 border border-amber-200'
                            }`}
                          >
                            {rev.approved
                              ? 'Approved (Public)'
                              : 'Pending Approval'}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-[#A37E3B]">
                          {rev.productName}
                        </p>
                        <p className="text-xs text-[#2C1E16] leading-relaxed">
                          &ldquo;{rev.comment}&rdquo;
                        </p>
                      </div>

                      <div className="pt-3 border-t border-[#E2D5C3] flex items-center justify-between">
                        <div className="text-xs">
                          <p className="font-semibold text-[#2C1E16]">
                            {rev.customerName}
                          </p>
                          <p className="text-[#6A5243]">
                            {rev.customerLocation}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleToggleReviewApproved(rev)}
                            className="px-2.5 py-1 text-[11px] font-semibold text-[#2C1E16] bg-[#F6F1E9] border border-[#E2D5C3] rounded-md hover:border-[#C5A059] cursor-pointer"
                          >
                            {rev.approved ? 'Hide' : 'Approve'}
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditReviewModal(rev)}
                            className="p-1.5 text-[#6A5243] hover:text-[#2C1E16] hover:bg-[#F6F1E9] rounded-md cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setReviewToDelete(rev)}
                            className="p-1.5 text-[#6A5243] hover:text-red-700 hover:bg-red-50 rounded-md cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          MODAL 1: ADD / EDIT PRODUCT
      ===================================================================== */}
      {isProductModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-2xl bg-[#F6F1E9] border border-[#E2D5C3] rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 bg-[#FFFFFF] border-b border-[#E2D5C3]">
              <h3 className="font-display text-2xl font-semibold text-[#2C1E16]">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h3>
              <button
                type="button"
                onClick={() => setIsProductModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full text-[#6A5243] hover:bg-[#F6F1E9] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={handleSaveProduct}
              className="p-6 overflow-y-auto space-y-4"
            >
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-[#2C1E16] mb-1">
                  Product Name *
                </label>
                <input
                  type="text"
                  required
                  maxLength={VALIDATION_RULES.PRODUCT.NAME_MAX}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Royale Ivory Pearl Beaded Handbag"
                  className="w-full px-3.5 py-2 text-sm bg-[#FFFFFF] border border-[#E2D5C3] rounded-xl"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#2C1E16] mb-1">
                    Category *
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm bg-[#FFFFFF] border border-[#E2D5C3] rounded-xl"
                  >
                    {availableCategoryNames.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#2C1E16] mb-1">
                    Price (UGX) *
                  </label>
                  <input
                    type="number"
                    step="500"
                    min="0"
                    required
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm font-mono bg-[#FFFFFF] border border-[#E2D5C3] rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#2C1E16] mb-1">
                    Stock Quantity *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm font-mono bg-[#FFFFFF] border border-[#E2D5C3] rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#2C1E16] mb-1">
                    Available Colors *
                  </label>
                  <input
                    type="text"
                    required
                    value={colorsInput}
                    onChange={(e) => setColorsInput(e.target.value)}
                    placeholder="Champagne Gold, Ivory Pearl, Turquoise"
                    className="w-full px-3.5 py-2 text-sm bg-[#FFFFFF] border border-[#E2D5C3] rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#2C1E16] mb-1">
                    Sizes of Products *
                  </label>
                  <input
                    type="text"
                    required
                    value={sizesInput}
                    onChange={(e) => setSizesInput(e.target.value)}
                    placeholder="Small, Medium, Large, Standard, 8mm (500g)"
                    className="w-full px-3.5 py-2 text-sm bg-[#FFFFFF] border border-[#E2D5C3] rounded-xl"
                  />
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {[
                      'Mini',
                      'Small',
                      'Medium',
                      'Large',
                      'Standard',
                      '6mm (250g)',
                      '8mm (500g)',
                      '10mm (500g)',
                      '12mm (1kg)',
                    ].map((presetSize) => {
                      const currentSizes = sizesInput
                        .split(',')
                        .map((s) => s.trim())
                        .filter(Boolean);
                      const isSelected = currentSizes.includes(presetSize);
                      return (
                        <button
                          key={presetSize}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              const next = currentSizes.filter(
                                (s) => s !== presetSize
                              );
                              setSizesInput(next.join(', '));
                            } else {
                              const next = [...currentSizes, presetSize].slice(
                                0,
                                VALIDATION_RULES.PRODUCT.SIZES_MAX
                              );
                              setSizesInput(next.join(', '));
                            }
                          }}
                          className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-[#2C1E16] text-[#FFFFFF] border-[#C5A059]'
                              : 'bg-[#F6F1E9] text-[#6A5243] border-[#E2D5C3] hover:border-[#C5A059] hover:text-[#2C1E16]'
                          }`}
                        >
                          {presetSize}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#2C1E16] mb-1.5">
                  Product Photo (Upload from Phone/Computer or Paste URL) *
                </label>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 bg-[#FFFFFF] border border-[#E2D5C3] rounded-xl mb-2">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt="Product preview"
                      className="w-16 h-16 rounded-lg object-cover border border-[#E2D5C3] shrink-0 bg-[#F6F1E9]"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-lg border border-dashed border-[#E2D5C3] flex items-center justify-center text-[#6A5243] shrink-0 bg-[#F6F1E9]">
                      <ImageIcon className="w-6 h-6 text-[#C5A059]" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#FFFFFF] bg-[#2C1E16] border border-[#C5A059] rounded-lg hover:bg-[#3F2C21] cursor-pointer transition-colors">
                        <UploadCloud className="w-3.5 h-3.5 text-[#C5A059]" />
                        <span>
                          {uploadingImage
                            ? 'Processing Photo...'
                            : 'Upload Photo from Device'}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) =>
                            handleFirebaseStorageUpload(e, 'product')
                          }
                          className="hidden"
                        />
                      </label>
                      {imageUrl.startsWith('data:image/') && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md">
                          <CheckCircle2 className="w-3 h-3" />
                          Photo Uploaded &amp; Ready
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#6A5243]">
                      Select any photo from your phone gallery or computer — automatically optimized for Firebase.
                    </p>
                  </div>
                </div>

                <input
                  type="text"
                  value={imageUrl.startsWith('data:image/') ? '' : imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder={
                    imageUrl.startsWith('data:image/')
                      ? 'Uploaded photo attached — or paste an https:// image URL here to replace it'
                      : 'Or paste a direct image URL (https://...)'
                  }
                  className="w-full px-3.5 py-2 text-xs bg-[#FFFFFF] border border-[#E2D5C3] rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#2C1E16] mb-1">
                  Product Description &amp; Bead / Material Notes *
                </label>
                <textarea
                  rows={3}
                  required
                  maxLength={VALIDATION_RULES.PRODUCT.DESC_MAX}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the bead types, pearl luster, bag dimensions, and hardware details..."
                  className="w-full px-3.5 py-2 text-sm bg-[#FFFFFF] border border-[#E2D5C3] rounded-xl"
                />
              </div>

              <div className="flex items-center gap-6 pt-2">
                <label className="inline-flex items-center gap-2 text-xs font-semibold text-[#2C1E16] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={published}
                    onChange={(e) => setPublished(e.target.checked)}
                    className="rounded border-[#E2D5C3]"
                  />
                  <span>Publish immediately on public website</span>
                </label>

                <label className="inline-flex items-center gap-2 text-xs font-semibold text-[#2C1E16] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={featured}
                    onChange={(e) => setFeatured(e.target.checked)}
                    className="rounded border-[#E2D5C3]"
                  />
                  <span>Highlight in Featured Collection</span>
                </label>
              </div>

              <div className="pt-4 border-t border-[#E2D5C3] flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#6A5243] bg-[#FFFFFF] border border-[#E2D5C3] rounded-xl hover:text-[#2C1E16] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingProduct || uploadingImage}
                  className="px-5 py-2 text-xs font-semibold text-[#FFFFFF] bg-[#2C1E16] border border-[#C5A059] rounded-xl hover:bg-[#3F2C21] disabled:opacity-50 cursor-pointer"
                >
                  {savingProduct
                    ? 'Saving...'
                    : editingProduct
                    ? 'Save Changes'
                    : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 2: ADD / EDIT CATEGORY
      ===================================================================== */}
      {isCategoryModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg bg-[#F6F1E9] border border-[#E2D5C3] rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 bg-[#FFFFFF] border-b border-[#E2D5C3]">
              <h3 className="font-display text-2xl font-semibold text-[#2C1E16]">
                {editingCategory ? 'Edit Category' : 'Add New Category'}
              </h3>
              <button
                type="button"
                onClick={() => setIsCategoryModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full text-[#6A5243] hover:bg-[#F6F1E9] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveCategory} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800">
                  {formError}
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-[#2C1E16] mb-1">
                  Category Name *
                </label>
                <input
                  type="text"
                  required
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  placeholder="e.g. Glass Seed Beads"
                  className="w-full px-3.5 py-2 text-sm bg-[#FFFFFF] border border-[#E2D5C3] rounded-xl"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#2C1E16] mb-1">
                    URL Slug
                  </label>
                  <input
                    type="text"
                    value={catSlug}
                    onChange={(e) => setCatSlug(e.target.value)}
                    placeholder="glass-seed-beads"
                    className="w-full px-3.5 py-2 text-sm font-mono bg-[#FFFFFF] border border-[#E2D5C3] rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#2C1E16] mb-1">
                    Display Sort Order *
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="1000"
                    required
                    value={catSortOrder}
                    onChange={(e) => setCatSortOrder(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm font-mono bg-[#FFFFFF] border border-[#E2D5C3] rounded-xl"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#2C1E16] mb-1">
                  Category Description *
                </label>
                <textarea
                  rows={2}
                  required
                  value={catDesc}
                  onChange={(e) => setCatDesc(e.target.value)}
                  placeholder="Describe the products in this category..."
                  className="w-full px-3.5 py-2 text-sm bg-[#FFFFFF] border border-[#E2D5C3] rounded-xl"
                />
              </div>
              <label className="inline-flex items-center gap-2 text-xs font-semibold text-[#2C1E16] cursor-pointer">
                <input
                  type="checkbox"
                  checked={catActive}
                  onChange={(e) => setCatActive(e.target.checked)}
                />
                <span>Active on public storefront filter bar</span>
              </label>
              <div className="pt-4 border-t border-[#E2D5C3] flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#6A5243] bg-[#FFFFFF] border border-[#E2D5C3] rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingCategory}
                  className="px-5 py-2 text-xs font-semibold text-[#FFFFFF] bg-[#2C1E16] border border-[#C5A059] rounded-xl cursor-pointer"
                >
                  {savingCategory ? 'Saving...' : 'Save Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 3: ADD / EDIT WEBSITE BANNER
      ===================================================================== */}
      {isBannerModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-xl bg-[#F6F1E9] border border-[#E2D5C3] rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 bg-[#FFFFFF] border-b border-[#E2D5C3]">
              <h3 className="font-display text-2xl font-semibold text-[#2C1E16]">
                {editingBanner ? 'Edit Website Banner' : 'Add Website Banner'}
              </h3>
              <button
                type="button"
                onClick={() => setIsBannerModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full text-[#6A5243] hover:bg-[#F6F1E9] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form
              onSubmit={handleSaveBanner}
              className="p-6 overflow-y-auto space-y-4"
            >
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800">
                  {formError}
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-[#2C1E16] mb-1">
                  Headline Title *
                </label>
                <input
                  type="text"
                  required
                  value={bannerTitle}
                  onChange={(e) => setBannerTitle(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-[#FFFFFF] border border-[#E2D5C3] rounded-xl"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#2C1E16] mb-1">
                    Eyebrow Badge Text *
                  </label>
                  <input
                    type="text"
                    required
                    value={bannerBadge}
                    onChange={(e) => setBannerBadge(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm bg-[#FFFFFF] border border-[#E2D5C3] rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#2C1E16] mb-1">
                    CTA Button Label *
                  </label>
                  <input
                    type="text"
                    required
                    value={bannerCta}
                    onChange={(e) => setBannerCta(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm bg-[#FFFFFF] border border-[#E2D5C3] rounded-xl"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#2C1E16] mb-1">
                  Supporting Subtitle *
                </label>
                <textarea
                  rows={2}
                  required
                  value={bannerSubtitle}
                  onChange={(e) => setBannerSubtitle(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-[#FFFFFF] border border-[#E2D5C3] rounded-xl"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#2C1E16] mb-1.5">
                  Banner Photo (Upload from Phone/Computer or Paste URL) *
                </label>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 bg-[#FFFFFF] border border-[#E2D5C3] rounded-xl mb-2">
                  {bannerImage ? (
                    <img
                      src={bannerImage}
                      alt="Banner preview"
                      className="w-20 h-14 rounded-lg object-cover border border-[#E2D5C3] shrink-0 bg-[#F6F1E9]"
                    />
                  ) : (
                    <div className="w-20 h-14 rounded-lg border border-dashed border-[#E2D5C3] flex items-center justify-center text-[#6A5243] shrink-0 bg-[#F6F1E9]">
                      <ImageIcon className="w-6 h-6 text-[#C5A059]" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#FFFFFF] bg-[#2C1E16] border border-[#C5A059] rounded-lg hover:bg-[#3F2C21] cursor-pointer transition-colors">
                        <UploadCloud className="w-3.5 h-3.5 text-[#C5A059]" />
                        <span>
                          {uploadingImage
                            ? 'Processing Photo...'
                            : 'Upload Banner Photo'}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) =>
                            handleFirebaseStorageUpload(e, 'banner')
                          }
                          className="hidden"
                        />
                      </label>
                      {bannerImage.startsWith('data:image/') && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md">
                          <CheckCircle2 className="w-3 h-3" />
                          Photo Uploaded &amp; Ready
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#6A5243]">
                      Select any banner photo from your phone or computer — automatically optimized for Firebase.
                    </p>
                  </div>
                </div>

                <input
                  type="text"
                  value={
                    bannerImage.startsWith('data:image/') ? '' : bannerImage
                  }
                  onChange={(e) => setBannerImage(e.target.value)}
                  placeholder={
                    bannerImage.startsWith('data:image/')
                      ? 'Uploaded banner photo attached — or paste an https:// image URL here to replace it'
                      : 'Or paste a direct banner image URL (https://...)'
                  }
                  className="w-full px-3.5 py-2 text-xs bg-[#FFFFFF] border border-[#E2D5C3] rounded-xl"
                />
              </div>
              <label className="inline-flex items-center gap-2 text-xs font-semibold text-[#2C1E16] cursor-pointer">
                <input
                  type="checkbox"
                  checked={bannerActive}
                  onChange={(e) => setBannerActive(e.target.checked)}
                />
                <span>Display this banner on the public website</span>
              </label>
              <div className="pt-4 border-t border-[#E2D5C3] flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsBannerModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#6A5243] bg-[#FFFFFF] border border-[#E2D5C3] rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingBanner || uploadingImage}
                  className="px-5 py-2 text-xs font-semibold text-[#FFFFFF] bg-[#2C1E16] border border-[#C5A059] rounded-xl cursor-pointer"
                >
                  {savingBanner ? 'Saving...' : 'Save Banner'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 4: ADD / EDIT CUSTOMER REVIEW
      ===================================================================== */}
      {isReviewModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg bg-[#F6F1E9] border border-[#E2D5C3] rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 bg-[#FFFFFF] border-b border-[#E2D5C3]">
              <h3 className="font-display text-2xl font-semibold text-[#2C1E16]">
                {editingReview ? 'Edit Customer Review' : 'Add Customer Review'}
              </h3>
              <button
                type="button"
                onClick={() => setIsReviewModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full text-[#6A5243] hover:bg-[#F6F1E9] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveReview} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800">
                  {formError}
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#2C1E16] mb-1">
                    Customer Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={revCustomerName}
                    onChange={(e) => setRevCustomerName(e.target.value)}
                    placeholder="e.g. Grace Namukasa"
                    className="w-full px-3.5 py-2 text-sm bg-[#FFFFFF] border border-[#E2D5C3] rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#2C1E16] mb-1">
                    Location / City *
                  </label>
                  <input
                    type="text"
                    required
                    value={revCustomerLocation}
                    onChange={(e) => setRevCustomerLocation(e.target.value)}
                    placeholder="e.g. Kampala Central"
                    className="w-full px-3.5 py-2 text-sm bg-[#FFFFFF] border border-[#E2D5C3] rounded-xl"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-[#2C1E16] mb-1">
                    Product Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={revProductName}
                    onChange={(e) => setRevProductName(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm bg-[#FFFFFF] border border-[#E2D5C3] rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#2C1E16] mb-1">
                    Star Rating (1–5) *
                  </label>
                  <select
                    value={revRating}
                    onChange={(e) => setRevRating(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm bg-[#FFFFFF] border border-[#E2D5C3] rounded-xl"
                  >
                    <option value="5">5 Stars (Excellent)</option>
                    <option value="4">4 Stars (Very Good)</option>
                    <option value="3">3 Stars (Good)</option>
                    <option value="2">2 Stars (Fair)</option>
                    <option value="1">1 Star</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#2C1E16] mb-1">
                  Review Comment *
                </label>
                <textarea
                  rows={3}
                  required
                  value={revComment}
                  onChange={(e) => setRevComment(e.target.value)}
                  placeholder="Share customer feedback on bead quality, delivery, or craftsmanship..."
                  className="w-full px-3.5 py-2 text-sm bg-[#FFFFFF] border border-[#E2D5C3] rounded-xl"
                />
              </div>
              <label className="inline-flex items-center gap-2 text-xs font-semibold text-[#2C1E16] cursor-pointer">
                <input
                  type="checkbox"
                  checked={revApproved}
                  onChange={(e) => setRevApproved(e.target.checked)}
                />
                <span>Approve for public website display</span>
              </label>
              <div className="pt-4 border-t border-[#E2D5C3] flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsReviewModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#6A5243] bg-[#FFFFFF] border border-[#E2D5C3] rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingReview}
                  className="px-5 py-2 text-xs font-semibold text-[#FFFFFF] bg-[#2C1E16] border border-[#C5A059] rounded-xl cursor-pointer"
                >
                  {savingReview ? 'Saving...' : 'Save Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          CONFIRMATION MODALS (PRODUCTS, CATEGORIES, BANNERS, REVIEWS)
      ===================================================================== */}
      {productToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md bg-[#FFFFFF] border border-[#E2D5C3] rounded-2xl p-6 shadow-xl">
            <div className="flex items-center gap-2.5 text-red-700 mb-3">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h3 className="font-display text-xl font-semibold text-[#2C1E16]">
                Delete Product from Catalog?
              </h3>
            </div>
            <p className="text-xs text-[#6A5243] leading-relaxed">
              Are you sure you want to permanently delete{' '}
              <strong>{productToDelete.name}</strong> from Firestore?
            </p>
            <div className="mt-6 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setProductToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-[#6A5243] bg-[#F6F1E9] rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteProduct}
                className="px-4 py-2 text-xs font-semibold text-white bg-red-700 rounded-xl hover:bg-red-800 cursor-pointer"
              >
                Delete Product
              </button>
            </div>
          </div>
        </div>
      )}

      {categoryToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md bg-[#FFFFFF] border border-[#E2D5C3] rounded-2xl p-6 shadow-xl">
            <div className="flex items-center gap-2.5 text-red-700 mb-3">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h3 className="font-display text-xl font-semibold text-[#2C1E16]">
                Delete Category?
              </h3>
            </div>
            <p className="text-xs text-[#6A5243] leading-relaxed">
              Are you sure you want to delete the category{' '}
              <strong>{categoryToDelete.name}</strong>?
            </p>
            <div className="mt-6 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setCategoryToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-[#6A5243] bg-[#F6F1E9] rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteCategory}
                className="px-4 py-2 text-xs font-semibold text-white bg-red-700 rounded-xl hover:bg-red-800 cursor-pointer"
              >
                Delete Category
              </button>
            </div>
          </div>
        </div>
      )}

      {bannerToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md bg-[#FFFFFF] border border-[#E2D5C3] rounded-2xl p-6 shadow-xl">
            <div className="flex items-center gap-2.5 text-red-700 mb-3">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h3 className="font-display text-xl font-semibold text-[#2C1E16]">
                Delete Website Banner?
              </h3>
            </div>
            <p className="text-xs text-[#6A5243] leading-relaxed">
              Are you sure you want to delete banner{' '}
              <strong>{bannerToDelete.title}</strong>?
            </p>
            <div className="mt-6 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setBannerToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-[#6A5243] bg-[#F6F1E9] rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteBanner}
                className="px-4 py-2 text-xs font-semibold text-white bg-red-700 rounded-xl hover:bg-red-800 cursor-pointer"
              >
                Delete Banner
              </button>
            </div>
          </div>
        </div>
      )}

      {reviewToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md bg-[#FFFFFF] border border-[#E2D5C3] rounded-2xl p-6 shadow-xl">
            <div className="flex items-center gap-2.5 text-red-700 mb-3">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h3 className="font-display text-xl font-semibold text-[#2C1E16]">
                Delete Customer Review?
              </h3>
            </div>
            <p className="text-xs text-[#6A5243] leading-relaxed">
              Are you sure you want to delete the review by{' '}
              <strong>{reviewToDelete.customerName}</strong>?
            </p>
            <div className="mt-6 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setReviewToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-[#6A5243] bg-[#F6F1E9] rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteReview}
                className="px-4 py-2 text-xs font-semibold text-white bg-red-700 rounded-xl hover:bg-red-800 cursor-pointer"
              >
                Delete Review
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
