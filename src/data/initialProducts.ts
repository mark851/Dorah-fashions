import {
  Product,
  CategoryItem,
  BannerItem,
  ReviewItem,
} from '../types';
import heroBeadsImg from '../assets/images/hero_colorful_bag_beads_1791654401358.jpg';
import pearlBeadedToteImg from '../assets/images/product_pearl_beaded_tote_1791654412685.jpg';
import crystalBeadedBagImg from '../assets/images/product_colorful_crystal_bag_1791654422898.jpg';
import acrylicBeadsKitImg from '../assets/images/product_acrylic_bag_beads_kit_1791654433545.jpg';
import beadedClutchImg from '../assets/images/product_beaded_jewelry_clutch_1791654444069.jpg';
import goldCuffImg from '../assets/images/product_gold_sculpted_cuff_1791653745755.jpg';

export const HERO_CAMPAIGN_IMAGE = heroBeadsImg;

export const INITIAL_DORAH_PRODUCTS: Omit<Product, 'createdAt' | 'updatedAt'>[] = [
  {
    id: 'df-bag-beads-assortment',
    name: 'Luxe Bag-Making Beads Assortment (Round & Faceted)',
    sku: 'DF-BAG-101',
    category: 'Bag Beads',
    price: 45000,
    stock: 48,
    description:
      'Premium high-shine round and faceted bag-making beads in champagne gold, ivory cream, turquoise, ruby, and honey amber. Engineered for weaving structured luxury handbags.',
    imageUrl: heroBeadsImg,
    colors: ['Champagne Gold', 'Turquoise Mix', 'Ruby & Amber', 'Ivory Cream'],
    sizes: ['8mm (500g)', '10mm (500g)', '12mm (1kg)'],
    published: true,
    featured: true,
    authorId: 'dorah-atelier-seed',
  },
  {
    id: 'df-handmade-beaded-clutch',
    name: 'Sahara Handwoven Seed-Beaded Clutch & Artisanal Beads',
    sku: 'DF-HND-102',
    category: 'Handmade Beads',
    price: 110000,
    stock: 14,
    description:
      'Intricately hand-threaded artisan seed-beaded evening clutch and matching hand-rolled bead strands in warm gold, coral, and bronze.',
    imageUrl: beadedClutchImg,
    colors: ['Coral & Gold', 'Bronze & Ivory', 'Emerald & Gold'],
    sizes: ['Standard Clutch', 'Clutch + Earrings Set', 'Bead Strand Pack'],
    published: true,
    featured: true,
    authorId: 'dorah-atelier-seed',
  },
  {
    id: 'df-crystal-beads-bag',
    name: 'Zaria Jewel-Tone Faceted Crystal Beads & Woven Tote',
    sku: 'DF-CRY-103',
    category: 'Crystal Beads',
    price: 135000,
    stock: 19,
    description:
      'High-refraction bicone and square faceted crystal beads available as a finished handwoven crystal tote or bulk crystal bead pack for custom bag makers.',
    imageUrl: crystalBeadedBagImg,
    colors: ['Jewel Multicolor', 'Emerald Crystal', 'Sapphire Gold', 'Clear Champagne'],
    sizes: ['Finished Mini Tote', '8mm Crystals (500g)', '10mm Crystals (1kg)'],
    published: true,
    featured: true,
    authorId: 'dorah-atelier-seed',
  },
  {
    id: 'df-pearl-beads-handbag',
    name: 'Royale High-Luster Ivory & Gold Pearl Beads Collection',
    sku: 'DF-PRL-104',
    category: 'Pearl Beads',
    price: 160000,
    stock: 15,
    description:
      'Signature high-luster glass and ABS pearl beads with scratch-resistant coating. Choose our finished Royale Pearl Top-Handle Bag or bulk pearl packs.',
    imageUrl: pearlBeadedToteImg,
    colors: ['Ivory Pearl & Gold', 'Pure White Pearl', 'Blush Champagne', 'Warm Beige'],
    sizes: ['Finished Pearl Bag', '8mm Pearls (500g)', '10mm Pearls (1kg)', '12mm Pearls (1kg)'],
    published: true,
    featured: true,
    authorId: 'dorah-atelier-seed',
  },
  {
    id: 'df-acrylic-beads-kit',
    name: 'Atelier Faceted Acrylic Bag Beads & Master Craft Kit',
    sku: 'DF-ACR-105',
    category: 'Acrylic Beads',
    price: 65000,
    stock: 36,
    description:
      'Lightweight, colorfast faceted acrylic bag beads paired with monofilament weaving line. Ideal for vibrant everyday beaded totes and crossbody bags.',
    imageUrl: acrylicBeadsKitImg,
    colors: ['Rainbow Pastel', 'Gold & Tortoise', 'Caramel Brown', 'Crystal Clear'],
    sizes: ['Starter Pack (500g)', 'Artisan Kit (1.2kg)', 'Wholesale (2.5kg)'],
    published: true,
    featured: true,
    authorId: 'dorah-atelier-seed',
  },
  {
    id: 'df-bead-accessories-hardware',
    name: '24k Gold-Toned Bag Handles, Clasps & Statement Hardware',
    sku: 'DF-ACC-106',
    category: 'Bead Accessories',
    price: 35000,
    stock: 28,
    description:
      'Solid brass D-ring bag handles, detachable gold chain straps, magnetic pearl clasps, and 0.7mm/0.8mm heavy-duty fishing line for beaded bag finishing.',
    imageUrl: goldCuffImg,
    colors: ['24k Brushed Gold', 'Antique Brass', 'Pearl & Gold'],
    sizes: ['Pair of Handles', 'Gold Chain (120cm)', 'Full Hardware Set'],
    published: true,
    featured: false,
    authorId: 'dorah-atelier-seed',
  },
  {
    id: 'df-custom-beaded-order',
    name: 'Bespoke Custom Beaded Bag or Bulk Bridal Colorway Order',
    sku: 'DF-CUS-107',
    category: 'Custom Orders',
    price: 185000,
    stock: 10,
    description:
      'Commission a custom-designed beaded handbag, personalized initials, bridal party sets, or custom-dyed bead color combinations tailored to your exact vision.',
    imageUrl: pearlBeadedToteImg,
    colors: ['Custom Gold & Beige', 'Bridal Ivory & Pearl', 'Custom Jewel Tone', 'Client Choice'],
    sizes: ['Bespoke Mini Bag', 'Bespoke Medium Tote', 'Bridal Set (3 Bags)'],
    published: true,
    featured: true,
    authorId: 'dorah-atelier-seed',
  },
];

export const INITIAL_DORAH_CATEGORIES: Omit<CategoryItem, 'createdAt' | 'updatedAt'>[] = [
  {
    id: 'cat-bag-beads',
    name: 'Bag Beads',
    slug: 'bag-beads',
    description: 'Structured round and faceted beads engineered for handwoven luxury handbags.',
    active: true,
    sortOrder: 1,
    authorId: 'dorah-atelier-seed',
  },
  {
    id: 'cat-handmade-beads',
    name: 'Handmade Beads',
    slug: 'handmade-beads',
    description: 'Artisanal seed beads, hand-threaded clutches, and bespoke woven creations.',
    active: true,
    sortOrder: 2,
    authorId: 'dorah-atelier-seed',
  },
  {
    id: 'cat-crystal-beads',
    name: 'Crystal Beads',
    slug: 'crystal-beads',
    description: 'High-refraction bicone and square faceted crystal beads in jewel tones.',
    active: true,
    sortOrder: 3,
    authorId: 'dorah-atelier-seed',
  },
  {
    id: 'cat-pearl-beads',
    name: 'Pearl Beads',
    slug: 'pearl-beads',
    description: 'Luminous ivory, champagne, and gold-toned glass and ABS pearl beads.',
    active: true,
    sortOrder: 4,
    authorId: 'dorah-atelier-seed',
  },
  {
    id: 'cat-acrylic-beads',
    name: 'Acrylic Beads',
    slug: 'acrylic-beads',
    description: 'Lightweight, colorfast faceted acrylic bag beads and master craft kits.',
    active: true,
    sortOrder: 5,
    authorId: 'dorah-atelier-seed',
  },
  {
    id: 'cat-bead-accessories',
    name: 'Bead Accessories',
    slug: 'bead-accessories',
    description: '24k gold-toned bag handles, clasps, chain straps, and weaving line.',
    active: true,
    sortOrder: 6,
    authorId: 'dorah-atelier-seed',
  },
  {
    id: 'cat-custom-orders',
    name: 'Custom Orders',
    slug: 'custom-orders',
    description: 'Personalized beaded handbags, bridal sets, and custom bulk bead orders.',
    active: true,
    sortOrder: 7,
    authorId: 'dorah-atelier-seed',
  },
];

export const INITIAL_DORAH_BANNERS: Omit<BannerItem, 'createdAt' | 'updatedAt'>[] = [
  {
    id: 'banner-hero-main',
    title: 'Beautiful Beads. Beautiful Creations.',
    subtitle:
      'Welcome to DORAH FASHIONS, your premier destination for luxury bag beads, handmade beads, crystal beads, luminous pearl beads, acrylic beads, bead accessories, and custom beaded bag creations.',
    badgeText: 'Featured Bead & Bag Catalogue · DORAH FASHIONS',
    ctaText: 'Shop Now',
    imageUrl: heroBeadsImg,
    active: true,
    authorId: 'dorah-atelier-seed',
  },
  {
    id: 'banner-bridal-promo',
    title: 'Bridal Pearl & Gold Custom Bag Commissions',
    subtitle:
      'Order bespoke handwoven pearl handbags or wholesale bag-making kits in champagne gold and ivory with fast delivery across Kampala and East Africa.',
    badgeText: 'Limited Atelier Edition · Free Delivery Over UGX 250,000',
    ctaText: 'Explore Custom Orders',
    imageUrl: pearlBeadedToteImg,
    active: true,
    authorId: 'dorah-atelier-seed',
  },
];

export const INITIAL_DORAH_REVIEWS: Omit<ReviewItem, 'createdAt' | 'updatedAt'>[] = [
  {
    id: 'rev-1',
    customerName: 'Grace Namukasa',
    customerLocation: 'Kampala Central',
    productName: 'Royale High-Luster Ivory & Gold Pearl Beads Collection',
    rating: 5,
    comment:
      'The pearl luster is extraordinary and never peels! I ordered two 1kg packs and a finished pearl tote via WhatsApp and received same-day delivery in Kampala.',
    approved: true,
    authorId: 'dorah-atelier-seed',
  },
  {
    id: 'rev-2',
    customerName: 'Brenda Atuhaire',
    customerLocation: 'Entebbe',
    productName: 'Zaria Jewel-Tone Faceted Crystal Beads & Woven Tote',
    rating: 5,
    comment:
      'DORAH FASHIONS has the best crystal bag beads in Uganda. The gold hardware and fishing line in the kit made my custom bags look like designer pieces.',
    approved: true,
    authorId: 'dorah-atelier-seed',
  },
  {
    id: 'rev-3',
    customerName: 'Sylvia Kiconco',
    customerLocation: 'Mbarara',
    productName: 'Bespoke Custom Beaded Bag or Bulk Bridal Colorway Order',
    rating: 5,
    comment:
      'Commissioned 4 matching champagne gold beaded clutches for my bridal entourage. Every single bag was woven to perfection!',
    approved: true,
    authorId: 'dorah-atelier-seed',
  },
];
