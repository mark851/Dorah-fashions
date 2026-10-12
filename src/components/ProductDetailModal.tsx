import React, { useState } from 'react';
import {
  X,
  Check,
  ShoppingBag,
  Zap,
  ShieldCheck,
  Truck,
  MessageCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Product, formatUGX, WHATSAPP_NUMBER_DISPLAY } from '../types';
import { buildWhatsAppOrderUrl } from '../utils/whatsapp';

interface ProductDetailModalProps {
  product: Product | null;
  onClose: () => void;
  onAddToCart: (
    product: Product,
    color: string,
    size: string,
    quantity: number
  ) => void;
  onBuyNow: (
    product: Product,
    color: string,
    size: string,
    quantity: number
  ) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  onClose,
  onAddToCart,
  onBuyNow,
}) => {
  const availableColors =
    product?.colors && product.colors.length > 0
      ? product.colors
      : ['Champagne Gold', 'Ivory Pearl'];
  const availableSizes =
    product?.sizes && product.sizes.length > 0
      ? product.sizes
      : ['Standard'];

  const [selectedColor, setSelectedColor] = useState<string>(availableColors[0]);
  const [selectedSize, setSelectedSize] = useState<string>(availableSizes[0]);
  const [quantity, setQuantity] = useState<number>(1);
  const [imgError, setImgError] = useState<boolean>(false);
  const [addedToast, setAddedToast] = useState<boolean>(false);

  if (!product) return null;

  const activeColor = availableColors.includes(selectedColor)
    ? selectedColor
    : availableColors[0];
  const activeSize = availableSizes.includes(selectedSize)
    ? selectedSize
    : availableSizes[0];

  const handleAdd = () => {
    if (product.stock <= 0) return;
    onAddToCart(product, activeColor, activeSize, quantity);
    setAddedToast(true);
    setTimeout(() => setAddedToast(false), 1800);
  };

  const handleImmediateBuyNow = () => {
    if (product.stock <= 0) return;
    onBuyNow(product, activeColor, activeSize, quantity);
    onClose();
  };

  const whatsappUrl = buildWhatsAppOrderUrl({
    items: [
      {
        product,
        selectedColor: activeColor,
        selectedSize: activeSize,
        quantity,
      },
    ],
    totalPrice: product.price * quantity,
  });

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6 bg-[#2C1E16]/60 backdrop-blur-xs"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pdp-title"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.97, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: 16 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-4xl bg-[#FFFFFF] border border-[#E2D5C3] rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-2 max-h-[92vh]"
        >
          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close product details"
            className="absolute top-4 right-4 z-10 w-11 h-11 flex items-center justify-center rounded-full bg-[#FFFFFF]/90 border border-[#E2D5C3] text-[#2C1E16] hover:bg-[#2C1E16] hover:text-[#FFFFFF] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Left: Product Image Gallery */}
          <div className="relative bg-[#F6F1E9] min-h-[260px] sm:min-h-[360px] md:min-h-[480px] flex items-center justify-center overflow-hidden">
            {!imgError ? (
              <img
                src={product.imageUrl}
                alt={product.name}
                referrerPolicy="no-referrer"
                onError={() => setImgError(true)}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex flex-col items-center justify-center p-8 text-center text-[#6A5243]">
                <ShoppingBag className="w-10 h-10 mb-3 text-[#C5A059]" />
                <p className="font-display text-lg text-[#2C1E16]">
                  {product.name}
                </p>
                <p className="text-xs text-[#6A5243] mt-1">
                  DORAH FASHIONS Bead &amp; Bag Catalogue
                </p>
              </div>
            )}
          </div>

          {/* Right: Contiguous Purchase Module */}
          <div className="p-6 sm:p-8 flex flex-col justify-between overflow-y-auto bg-[#FFFFFF]">
            <div>
              {/* Clean Unboxed Metadata */}
              <div className="flex flex-wrap items-center gap-2 text-xs text-[#6A5243] uppercase tracking-wider">
                <span className="text-[#A37E3B] font-semibold">
                  {product.category}
                </span>
                <span aria-hidden="true">·</span>
                <span
                  className={
                    product.stock > 0
                      ? 'text-emerald-800 font-semibold'
                      : 'text-red-700 font-semibold'
                  }
                >
                  {product.stock > 0
                    ? `In Stock (${product.stock} available)`
                    : 'Out of Stock'}
                </span>
              </div>

              <h2
                id="pdp-title"
                className="font-display text-2xl sm:text-3xl font-semibold text-[#2C1E16] mt-2 leading-tight"
              >
                {product.name}
              </h2>

              <p className="font-mono text-xl font-semibold text-[#A37E3B] mt-2.5 tabular-nums">
                {formatUGX(product.price)}
              </p>

              <p className="text-xs sm:text-sm text-[#6A5243] leading-relaxed mt-3">
                {product.description}
              </p>

              {/* Available Colors Selector */}
              <div className="mt-5">
                <div className="flex items-center justify-between text-xs text-[#6A5243] mb-2">
                  <span className="font-semibold text-[#2C1E16]">
                    Available Colors
                  </span>
                  <span className="text-[#A37E3B] font-medium">
                    {activeColor}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {availableColors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setSelectedColor(color)}
                      className={`px-3.5 py-2 min-h-[38px] text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        activeColor === color
                          ? 'bg-[#2C1E16] text-[#FFFFFF] border-[#C5A059]'
                          : 'bg-[#F6F1E9] text-[#2C1E16] border-[#E2D5C3] hover:border-[#C5A059]'
                      }`}
                    >
                      {color}
                    </button>
                  ))}
                </div>
              </div>

              {/* Available Sizes Selector */}
              <div className="mt-4">
                <div className="flex items-center justify-between text-xs text-[#6A5243] mb-2">
                  <span className="font-semibold text-[#2C1E16]">
                    Available Sizes / Pack Options
                  </span>
                  <span>{activeSize}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {availableSizes.map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setSelectedSize(size)}
                      className={`px-3.5 py-2 min-h-[38px] text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        activeSize === size
                          ? 'bg-[#2C1E16] text-[#FFFFFF] border-[#C5A059]'
                          : 'bg-[#F6F1E9] text-[#2C1E16] border-[#E2D5C3] hover:border-[#C5A059]'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quantity Stepper */}
              <div className="mt-4">
                <label className="block text-xs font-semibold text-[#2C1E16] mb-1.5">
                  Quantity
                </label>
                <div className="inline-flex items-center border border-[#E2D5C3] rounded-lg bg-[#F6F1E9]">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="px-4 py-2 min-h-[38px] text-sm font-semibold text-[#2C1E16] hover:bg-[#EDE4D5] transition-colors cursor-pointer"
                  >
                    −
                  </button>
                  <span className="px-4 py-2 text-sm font-mono tabular-nums text-[#2C1E16]">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setQuantity((q) => Math.min(product.stock || 1, q + 1))
                    }
                    className="px-4 py-2 min-h-[38px] text-sm font-semibold text-[#2C1E16] hover:bg-[#EDE4D5] transition-colors cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Primary Buy Actions & WhatsApp Order */}
            <div className="mt-6 pt-4 border-t border-[#E2D5C3] space-y-2.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  disabled={product.stock <= 0}
                  onClick={handleAdd}
                  className={`py-3 px-4 min-h-[44px] rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    product.stock <= 0
                      ? 'bg-[#EDE4D5] text-[#6A5243] cursor-not-allowed'
                      : addedToast
                      ? 'bg-emerald-800 text-white border-emerald-800'
                      : 'bg-[#F6F1E9] text-[#2C1E16] border-[#C5A059] hover:bg-[#EDE4D5]'
                  }`}
                >
                  {addedToast ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Added to Cart</span>
                    </>
                  ) : (
                    <>
                      <ShoppingBag className="w-4 h-4 text-[#A37E3B]" />
                      <span>
                        Add to Cart · {formatUGX(product.price * quantity)}
                      </span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  disabled={product.stock <= 0}
                  onClick={handleImmediateBuyNow}
                  className="py-3 px-4 min-h-[44px] rounded-xl text-xs font-semibold flex items-center justify-center gap-2 bg-[#2C1E16] text-[#FFFFFF] border border-[#C5A059] hover:bg-[#3F2C21] disabled:bg-[#EDE4D5] disabled:text-[#6A5243] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Zap className="w-4 h-4 text-[#C5A059]" />
                  <span>Buy Now</span>
                </button>
              </div>

              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 px-4 min-h-[42px] rounded-xl text-xs font-semibold flex items-center justify-center gap-2 bg-emerald-700 text-white hover:bg-emerald-800 transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Order on WhatsApp ({WHATSAPP_NUMBER_DISPLAY})</span>
              </a>

              <div className="pt-2 flex flex-col gap-1 text-[11px] text-[#6A5243]">
                <div className="flex items-center gap-2">
                  <Truck className="w-3.5 h-3.5 text-[#A37E3B] shrink-0" />
                  <span>
                    Fast delivery across Kampala, Uganda &amp; East Africa
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#A37E3B] shrink-0" />
                  <span>
                    Authentic DORAH FASHIONS craftsmanship guarantee
                  </span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
