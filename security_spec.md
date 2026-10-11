# DORAH FASHIONS (`dorafashions.online`) — Security Architecture & Payload-First TDD Specification

## 1. Data Invariants & Relationship Mapping (Master Source of Truth)

1. **Global Catch-All Deny**: Any path not explicitly matched in `/products/{productId}`, `/orders/{orderId}`, or `/admins/{adminId}` is unconditionally denied (`allow read, write: if false;`).
2. **Administrator Identity Invariant**: Admin privileges are never trusted from client-supplied claims or profile fields. An user is an administrator if and only if they are authenticated with a verified email matching the bootstrapped owner (`markniaras@gmail.com` with `email_verified == true`) OR their `request.auth.uid` exists in `/databases/$(database)/documents/admins/$(request.auth.uid)` with `email_verified == true`.
3. **Product Catalog Invariant (`/products/{productId}`)**:
   - Public storefront visitors may `get` or `list` products ONLY if `resource.data.published == true`.
   - Administrators (`isAdmin()`) may `get`, `list`, `create`, `update`, and `delete` any product document.
   - Every product creation and update must pass `isValidProduct(incoming())`, enforcing exact key allowlists (`hasAll` + `hasOnly`), string length boundaries (`name <= 120`, `sku <= 40`, `description <= 1200`, `imageUrl <= 1000`), bounded array checks (`sizes.size() >= 1 && sizes.size() <= 8 && sizes[0] is string`), non-negative numeric bounds (`price >= 0`, `stock >= 0`), and strict server timestamps (`request.time`).
   - During product updates, `authorId` and `createdAt` are immutable (`incoming().authorId == existing().authorId && incoming().createdAt == existing().createdAt`).
4. **Customer Order & PII Isolation Invariant (`/orders/{orderId}`)**:
   - Orders contain customer shipping PII (`customerEmail`, `customerPhone`, `shippingAddress`, `postalCode`).
   - Blanket reads are strictly forbidden. `get` and `list` are restricted to the order owner (`isSignedIn() && resource.data.customerId == request.auth.uid`) or `isAdmin()`.
   - Order creation requires a verified authenticated user (`isSignedIn() && isVerified()`), `incoming().customerId == request.auth.uid`, initial status `'pending'`, and `incoming().createdAt == request.time && incoming().updatedAt == request.time`.
   - Terminal State Locking: Once an order reaches `'delivered'` or `'cancelled'`, non-admin users cannot mutate it (`!(existing().status in ['delivered', 'cancelled']) || isAdmin()`).
   - Customer Tier 2 Update: A customer may only cancel their own `'pending'` order (`incoming().status == 'cancelled'` and `affectedKeys().hasOnly(['status', 'updatedAt'])`).

---

## 2. The "Dirty Dozen" Adversarial Payloads

1. **Payload 1 (Shadow Field Injection on Product Create)**: Admin sends valid Product payload plus `"isSuperFeatured": true`. Rejected by `data.keys().hasOnly(...)`.
2. **Payload 2 (Unverified Admin Email Spoof)**: Attacker authenticates with unverified `markniaras@gmail.com` (`email_verified: false`) and attempts to create a product. Rejected by `isVerified()`.
3. **Payload 3 (Unpublished Product Scraping)**: Unauthenticated visitor attempts to `get` or `list` a draft product where `published == false`. Rejected by `resource.data.published == true || isAdmin()`.
4. **Payload 4 (Order PII Blanket Read / Horizontal Escalation)**: Authenticated User B (`uid: "user_b"`) attempts to `get` or `list` an order belonging to User A (`customerId: "user_a"`). Rejected by `resource.data.customerId == request.auth.uid || isAdmin()`.
5. **Payload 5 (Identity Spoofing on Order Create)**: Authenticated User A attempts to create an order with `customerId: "user_victim"`. Rejected by `incoming().customerId == request.auth.uid`.
6. **Payload 6 (State Shortcutting on Order Create)**: Customer attempts to create an order directly with `status: "delivered"`. Rejected by `incoming().status == 'pending'`.
7. **Payload 7 (Terminal State Mutation)**: Customer attempts to update an already `'delivered'` order to `'cancelled'`. Rejected by terminal state lock `existing().status == 'pending'`.
8. **Payload 8 (Price / Total Tampering on Customer Order Update)**: Customer attempts to update `totalAmount: 1` while cancelling their order. Rejected by `incoming().diff(existing()).affectedKeys().hasOnly(['status', 'updatedAt'])`.
9. **Payload 9 (Denial-of-Wallet 1MB String Poisoning)**: Attacker sends a 5,000-character string in `shippingAddress` or `productId` path variable > 128 chars. Rejected by `isValidId()` and `.size() <= 400`.
10. **Payload 10 (Unbounded Array Injection)**: Admin/attacker sends 50 elements in `sizes` array. Rejected by `data.sizes.size() <= 8`.
11. **Payload 11 (Timestamp Forgery)**: Client supplies a forged past or future `createdAt` or `updatedAt` timestamp instead of `request.time`. Rejected by `incoming().createdAt == request.time`.
12. **Payload 12 (Self-Assigned Admin Escalation)**: Regular user `uid: "attacker_1"` attempts to write `/admins/attacker_1` to grant themselves admin rights. Rejected because only the bootstrapped verified admin can write to `/admins/{adminId}`.
