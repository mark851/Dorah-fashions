/**
 * Verification suite for DORAH FASHIONS Firestore Security Rules ("Dirty Dozen" Payloads).
 */

export interface SecurityTestCase {
  id: number;
  name: string;
  collection: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  auth: { uid: string; email: string; email_verified: boolean } | null;
  payload?: Record<string, unknown>;
  expectedResult: 'PERMISSION_DENIED' | 'ALLOWED';
}

export const DIRTY_DOZEN_TESTS: SecurityTestCase[] = [
  {
    id: 1,
    name: 'Shadow Field Injection on Product Create',
    collection: '/products/prod_1',
    operation: 'create',
    auth: { uid: 'admin_1', email: 'markniaras@gmail.com', email_verified: true },
    payload: {
      name: 'Royale Pearl Beaded Bag',
      sku: 'DF-BAG-101',
      category: 'Beaded Bags',
      price: 145,
      stock: 10,
      description: 'Handwoven luxury pearl and gold beaded handbag.',
      imageUrl: 'https://dorafashions.online/pearl-bag.jpg',
      sizes: ['Mini', 'Medium', 'Large'],
      published: true,
      featured: true,
      authorId: 'admin_1',
      isSuperFeatured: true
    },
    expectedResult: 'PERMISSION_DENIED'
  },
  {
    id: 2,
    name: 'Unverified Admin Email Spoof',
    collection: '/products/prod_1',
    operation: 'create',
    auth: { uid: 'spoof_admin', email: 'markniaras@gmail.com', email_verified: false },
    payload: {},
    expectedResult: 'PERMISSION_DENIED'
  },
  {
    id: 3,
    name: 'Unpublished Product Scraping by Public Visitor',
    collection: '/products/draft_prod',
    operation: 'get',
    auth: null,
    expectedResult: 'PERMISSION_DENIED'
  },
  {
    id: 4,
    name: 'Order PII Horizontal Escalation Read',
    collection: '/orders/order_user_a',
    operation: 'get',
    auth: { uid: 'user_b', email: 'b@example.com', email_verified: true },
    expectedResult: 'PERMISSION_DENIED'
  },
  {
    id: 5,
    name: 'Identity Spoofing on Order Create',
    collection: '/orders/order_spoof',
    operation: 'create',
    auth: { uid: 'user_a', email: 'a@example.com', email_verified: true },
    payload: { customerId: 'user_victim', status: 'pending' },
    expectedResult: 'PERMISSION_DENIED'
  },
  {
    id: 6,
    name: 'State Shortcutting on Order Create',
    collection: '/orders/order_shortcut',
    operation: 'create',
    auth: { uid: 'user_a', email: 'a@example.com', email_verified: true },
    payload: { customerId: 'user_a', status: 'delivered' },
    expectedResult: 'PERMISSION_DENIED'
  },
  {
    id: 7,
    name: 'Terminal State Mutation on Delivered Order',
    collection: '/orders/order_delivered',
    operation: 'update',
    auth: { uid: 'user_a', email: 'a@example.com', email_verified: true },
    payload: { status: 'cancelled' },
    expectedResult: 'PERMISSION_DENIED'
  },
  {
    id: 8,
    name: 'Price Tampering on Customer Order Update',
    collection: '/orders/order_pending',
    operation: 'update',
    auth: { uid: 'user_a', email: 'a@example.com', email_verified: true },
    payload: { status: 'cancelled', totalAmount: 0.01 },
    expectedResult: 'PERMISSION_DENIED'
  },
  {
    id: 9,
    name: 'Resource Poisoning Overlong Path ID',
    collection: `/orders/${'x'.repeat(200)}`,
    operation: 'get',
    auth: { uid: 'user_a', email: 'a@example.com', email_verified: true },
    expectedResult: 'PERMISSION_DENIED'
  },
  {
    id: 10,
    name: 'Unbounded Array Injection in Product Sizes',
    collection: '/products/prod_array',
    operation: 'create',
    auth: { uid: 'admin_1', email: 'markniaras@gmail.com', email_verified: true },
    payload: { sizes: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'] },
    expectedResult: 'PERMISSION_DENIED'
  },
  {
    id: 11,
    name: 'Client Timestamp Forgery on Order Create',
    collection: '/orders/order_time',
    operation: 'create',
    auth: { uid: 'user_a', email: 'a@example.com', email_verified: true },
    payload: { createdAt: '2020-01-01T00:00:00Z' },
    expectedResult: 'PERMISSION_DENIED'
  },
  {
    id: 12,
    name: 'Self-Assigned Admin Privilege Escalation',
    collection: '/admins/attacker_1',
    operation: 'create',
    auth: { uid: 'attacker_1', email: 'attacker@example.com', email_verified: true },
    payload: { uid: 'attacker_1', email: 'attacker@example.com', role: 'admin' },
    expectedResult: 'PERMISSION_DENIED'
  }
];
