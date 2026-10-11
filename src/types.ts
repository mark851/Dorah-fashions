export type CategoryType =
  | 'Bag Beads'
  | 'Handmade Beads'
  | 'Crystal Beads'
  | 'Pearl Beads'
  | 'Acrylic Beads'
  | 'Bead Accessories'
  | 'Custom Orders';

export const CATEGORIES: CategoryType[] = [
  'Bag Beads',
  'Handmade Beads',
  'Crystal Beads',
  'Pearl Beads',
  'Acrylic Beads',
  'Bead Accessories',
  'Custom Orders',
];

export type PriceFilterType =
  | 'all'
  | 'under-50k'
  | '50k-150k'
  | 'over-150k';

export type SortOptionType =
  | 'featured'
  | 'price-asc'
  | 'price-desc'
  | 'name-asc'
  | 'stock-desc';

export interface DeliveryLocationOption {
  label: string;
  fee: number;
  eta: string;
}

export const FREE_DELIVERY_THRESHOLD_UGX = 250000;

export const DELIVERY_LOCATIONS: DeliveryLocationOption[] = [
  { label: 'Kampala Central', fee: 10000, eta: 'Same-Day / 24h Delivery' },
  { label: 'Entebbe & Wakiso District', fee: 15000, eta: '1–2 Business Days' },
  { label: 'Jinja & Eastern Region', fee: 20000, eta: '2–3 Business Days' },
  { label: 'Mbarara & Western Region', fee: 25000, eta: '2–3 Business Days' },
  { label: 'Gulu & Northern Region', fee: 25000, eta: '2–4 Business Days' },
];

export const WHATSAPP_NUMBER_DISPLAY = '+256775803896';
export const WHATSAPP_NUMBER_DIGITS = '256775803896';

/**
 * Formats a numeric price in Ugandan Shillings (e.g., "UGX 45,000")
 */
export function formatUGX(amount: number): string {
  return `UGX ${Math.round(amount).toLocaleString('en-UG')}`;
}

export type OrderStatus =
  | 'pending'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

export type PaymentMethodType =
  | 'Cash on Delivery'
  | 'Mobile Money'
  | 'Card Payment';

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: CategoryType | string;
  price: number;
  stock: number;
  description: string;
  imageUrl: string;
  colors?: string[];
  sizes: string[];
  published: boolean;
  featured: boolean;
  authorId: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  description: string;
  active: boolean;
  sortOrder: number;
  authorId: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface BannerItem {
  id: string;
  title: string;
  subtitle: string;
  badgeText: string;
  ctaText: string;
  imageUrl: string;
  active: boolean;
  authorId: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface ReviewItem {
  id: string;
  customerName: string;
  customerLocation: string;
  productName: string;
  rating: number;
  comment: string;
  approved: boolean;
  authorId: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface CustomerSummary {
  customerKey: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  deliveryLocation: string;
  shippingAddress: string;
  orderCount: number;
  totalSpent: number;
  lastOrderNumber: string;
}

export interface CartItem {
  product: Product;
  selectedColor: string;
  selectedSize: string;
  quantity: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  deliveryLocation?: string;
  shippingAddress: string;
  postalCode: string;
  paymentMethod: PaymentMethodType;
  itemsSummary: string;
  itemCount: number;
  subtotal: number;
  shippingFee: number;
  totalAmount: number;
  status: OrderStatus;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface ConfirmedOrderDetails {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  deliveryLocation: string;
  shippingAddress: string;
  postalCode: string;
  paymentMethod: PaymentMethodType;
  items: CartItem[];
  subtotal: number;
  shippingFee: number;
  totalAmount: number;
  createdAtIso: string;
}

export interface DriveFileItem {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  webContentLink?: string;
  thumbnailLink?: string;
  createdTime?: string;
  size?: string;
}

// Validation constants synchronized verbatim with firebase-blueprint.json & firestore.rules
export const VALIDATION_RULES = {
  ID_REGEX: /^[a-zA-Z0-9_\-]+$/,
  PRODUCT: {
    NAME_MIN: 2,
    NAME_MAX: 120,
    SKU_MIN: 2,
    SKU_MAX: 40,
    CATEGORY_MIN: 2,
    CATEGORY_MAX: 60,
    DESC_MIN: 5,
    DESC_MAX: 1200,
    IMAGE_MIN: 5,
    IMAGE_MAX: 750000,
    COLORS_MIN: 1,
    COLORS_MAX: 8,
    SIZES_MIN: 1,
    SIZES_MAX: 8,
    PRICE_MAX: 100000000,
    STOCK_MAX: 100000,
  },
  ORDER: {
    ORDER_NUM_MIN: 4,
    ORDER_NUM_MAX: 40,
    NAME_MIN: 2,
    NAME_MAX: 120,
    EMAIL_MIN: 3,
    EMAIL_MAX: 160,
    PHONE_MIN: 5,
    PHONE_MAX: 40,
    LOCATION_MIN: 2,
    LOCATION_MAX: 120,
    ADDRESS_MIN: 5,
    ADDRESS_MAX: 400,
    POSTAL_MIN: 2,
    POSTAL_MAX: 24,
    SUMMARY_MAX: 1500,
  },
  CATEGORY: {
    NAME_MIN: 2,
    NAME_MAX: 60,
    SLUG_MIN: 2,
    SLUG_MAX: 60,
    DESC_MIN: 2,
    DESC_MAX: 300,
  },
  BANNER: {
    TITLE_MIN: 2,
    TITLE_MAX: 120,
    SUBTITLE_MIN: 2,
    SUBTITLE_MAX: 350,
    BADGE_MIN: 2,
    BADGE_MAX: 80,
    CTA_MIN: 2,
    CTA_MAX: 40,
    IMAGE_MIN: 5,
    IMAGE_MAX: 750000,
  },
  REVIEW: {
    NAME_MIN: 2,
    NAME_MAX: 80,
    LOCATION_MIN: 2,
    LOCATION_MAX: 80,
    PRODUCT_MIN: 2,
    PRODUCT_MAX: 120,
    COMMENT_MIN: 5,
    COMMENT_MAX: 600,
  },
} as const;
