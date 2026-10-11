import React, { useState } from 'react';
import {
  ShoppingBag,
  Zap,
  Check,
  Eye,
  MessageCircle,
} from 'lucide-react';
import { motion } from 'motion/react';
import { Product, formatUGX } from '../types';
import { buildWhatsAppOrderUrl } from '../utils/whatsapp';

interface ProductCardProps {
  product: Product;
  index: number;
  onSelectProduct: (product: Product) => void;
  onAddToCart: (
    product: Product,
    selectedColor: string,
    selectedSize: string,
    quantity: number
  ) => void;
  onBuyNow: (
    product: Product,
    selectedColor: string,
    selectedSize: string,
    quantity: number
  ) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  index,
  onSelectProduct,
  onAddToCart,
  onBuyNow,
}) => {
  const availableColors =
    product.colors && product.colors.length > 0
      ? product.colors
      : ['Champagne Gold', 'Ivory Pearl'];
  const availableSizes =
    product.sizes && product.sizes.length > 0
      ? product.sizes
      : ['Standard'];

  const [selectedColor, setSelectedColor] = useState<string>(availableColors[0]);
  const [selectedSize, setSelectedSize] = useState<string>(availableSizes[0]);
  const [quantity, setQuantity] = useState<number>(1);
  const [addedFeedback, setAddedFeedback] = useState<boolean>(false);

  const activeColor = availableColors.includes(selectedColor)
    ? selectedColor
    : availableColors[0];
  const activeSize = availableSizes.includes(selectedSize)
    ? selectedSize
    : availableSizes[0];

  const handleAdd = () => {
    if (product.stock <= 0) return;
    onAddToCart(product, activeColor, activeSize, quantity);
    setAddedFeedback(true);
    setTimeout(() => setAddedFeedback(false), 1400);
  };

  const handleImmediateBuyNow = () => {
    if (product.stock <= 0) return;
    onBuyNow(product, activeColor, activeSize, quantity);
  };

  const whatsappDirectUrl = buildWhatsAppOrderUrl({
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
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.2,
        delay: Math.min(index * 0.04, 0.2),
        ease: [0.16, 1, 0.3, 1],
      }}
      className="group bg-[#FFFFFF] border border-[#E2D5C3] hover:border-[#C5A059] rounded-2xl overflow-hidden flex flex-col justify-between df-card-transition"
    >
      <div>
        {/* 4:3 High-Resolution Product Image Container */}
        <div
          onClick={() => onSelectProduct(product)}
          className="relative aspect-[4/3] bg-[#F6F1E9] overflow-hidden cursor-pointer"
        >
          <img
            src={product.imageUrl}
            alt={product.name}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-104"
          />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelectProduct(product);
            }}
            className="absolute bottom-3 right-3 inline-flex items-center gap-1 px-2.5 py-1.5 bg-[#FFFFFF]/92 backdrop-blur-xs border border-[#E2D5C3] rounded-lg text-[11px] font-semibold text-[#2C1E16] hover:border-[#C5A059] transition-colors cursor-pointer shadow-xs"
          >
            <Eye className="w-3 h-3 text-[#A37E3B]" />
            <span>Quick View</span>
          </button>
        </div>

        {/* Card Body */}
        <div className="p-5 space-y-3.5">
          {/* Category & Stock Status */}
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="text-[#A37E3B] font-semibold uppercase tracking-wider">
              {product.category}
            </span>
            <span
              className={`font-medium ${
                product.stock > 5
                  ? 'text-emerald-800'
                  : product.stock > 0
                  ? 'text-amber-800'
                  : 'text-red-700 font-semibold'
              }`}
            >
              {product.stock > 0
                ? `In Stock (${product.stock})`
                : 'Out of Stock'}
            </span>
          </div>

          {/* Product Name & Price */}
          <div className="flex items-start justify-between gap-3">
            <h3
              onClick={() => onSelectProduct(product)}
              className="text-base font-semibold text-[#2C1E16] group-hover:text-[#A37E3B] transition-colors cursor-pointer leading-snug"
            >
              {product.name}
            </h3>
            <span className="font-mono text-sm sm:text-base font-semibold text-[#2C1E16] tabular-nums shrink-0">
              {formatUGX(product.price)}
            </span>
          </div>

          <p className="text-xs text-[#6A5243] line-clamp-2 leading-relaxed">
            {product.description}
          </p>

          {/* Available Colors Selector */}
          <div className="pt-1">
            <label className="block text-[11px] font-semibold text-[#6A5243] uppercase tracking-wider mb-1.5">
              Color: <span className="text-[#2C1E16]">{activeColor}</span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {availableColors.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setSelectedColor(color)}
                  className={`px-2.5 py-1 text-[11px] font-medium rounded-md border transition-colors cursor-pointer ${
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
          <div>
            <label className="block text-[11px] font-semibold text-[#6A5243] uppercase tracking-wider mb-1.5">
              Size / Option: <span className="text-[#2C1E16]">{activeSize}</span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {availableSizes.map((sz) => (
                <button
                  key={sz}
                  type="button"
                  onClick={() => setSelectedSize(sz)}
                  className={`px-2.5 py-1 text-[11px] font-medium rounded-md border transition-colors cursor-pointer ${
                    activeSize === sz
                      ? 'bg-[#2C1E16] text-[#FFFFFF] border-[#C5A059]'
                      : 'bg-[#F6F1E9] text-[#2C1E16] border-[#E2D5C3] hover:border-[#C5A059]'
                  }`}
                >
                  {sz}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Card Footer: Quantity Selector + Add to Cart + Buy Now */}
      <div className="px-5 pb-5 pt-3 border-t border-[#F6F1E9] space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold text-[#6A5243]">Quantity:</span>
          <div className="inline-flex items-center border border-[#E2D5C3] rounded-lg bg-[#F6F1E9]">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="px-2.5 py-1 text-xs font-semibold text-[#2C1E16] hover:bg-[#EDE4D5] transition-colors cursor-pointer"
              aria-label="Decrease quantity"
            >
              −
            </button>
            <span className="px-3 py-1 text-xs font-mono font-semibold tabular-nums text-[#2C1E16]">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() =>
                setQuantity((q) => Math.min(product.stock || 1, q + 1))
              }
              className="px-2.5 py-1 text-xs font-semibold text-[#2C1E16] hover:bg-[#EDE4D5] transition-colors cursor-pointer"
              aria-label="Increase quantity"
            >
              +
            </button>
          </div>
        </div>

        {/* Primary Action Buttons: Add to Cart & Buy Now */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={product.stock <= 0}
            onClick={handleAdd}
            className={`inline-flex items-center justify-center gap-1.5 px-3 py-2.5 min-h-[40px] text-xs font-semibold rounded-xl border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              addedFeedback
                ? 'bg-emerald-800 text-white border-emerald-800'
                : 'bg-[#F6F1E9] text-[#2C1E16] border-[#C5A059] hover:bg-[#EDE4D5] disabled:opacity-50'
            }`}
          >
            {addedFeedback ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Added!</span>
              </>
            ) : (
              <>
                <ShoppingBag className="w-3.5 h-3.5 text-[#A37E3B]" />
                <span>Add to Cart</span>
              </>
            )}
          </button>

          <button
            type="button"
            disabled={product.stock <= 0}
            onClick={handleImmediateBuyNow}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 min-h-[40px] text-xs font-semibold text-[#FFFFFF] bg-[#2C1E16] border border-[#C5A059] rounded-xl hover:bg-[#3F2C21] disabled:bg-[#EDE4D5] disabled:text-[#6A5243] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5 text-[#C5A059]" />
            <span>Buy Now</span>
          </button>
        </div>

        {/* Direct WhatsApp Quick Order Link */}
        <a
          href={whatsappDirectUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 text-[11px] font-semibold text-emerald-900 bg-emerald-50/90 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-colors"
        >
          <MessageCircle className="w-3.5 h-3.5 text-emerald-700" />
          <span>Order on WhatsApp (+256775803896)</span>
        </a>
      </div>
    </motion.article>
  );
};
