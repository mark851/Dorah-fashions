import React, { useState } from 'react';
import {
  CheckCircle2,
  MessageCircle,
  Package,
  ArrowLeft,
  Copy,
  Check,
  MapPin,
  CreditCard,
  User as UserIcon,
} from 'lucide-react';
import {
  ConfirmedOrderDetails,
  formatUGX,
  WHATSAPP_NUMBER_DISPLAY,
} from '../types';
import {
  buildWhatsAppOrderMessage,
  buildWhatsAppOrderUrl,
} from '../utils/whatsapp';

interface OrderConfirmationViewProps {
  order: ConfirmedOrderDetails;
  onContinueShopping: () => void;
  onViewMyOrders: () => void;
}

export const OrderConfirmationView: React.FC<OrderConfirmationViewProps> = ({
  order,
  onContinueShopping,
  onViewMyOrders,
}) => {
  const [copiedMessage, setCopiedMessage] = useState(false);

  const whatsappUrl = buildWhatsAppOrderUrl({
    customerName: order.customerName,
    items: order.items,
    totalPrice: order.totalAmount,
    deliveryLocation: order.deliveryLocation,
    shippingAddress: order.shippingAddress,
    orderNumber: order.orderNumber,
  });

  const whatsappMessageText = buildWhatsAppOrderMessage({
    customerName: order.customerName,
    items: order.items,
    totalPrice: order.totalAmount,
    deliveryLocation: order.deliveryLocation,
    shippingAddress: order.shippingAddress,
    orderNumber: order.orderNumber,
  });

  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(whatsappMessageText);
      setCopiedMessage(true);
      setTimeout(() => setCopiedMessage(false), 2000);
    } catch {
      // Fallback ignored
    }
  };

  return (
    <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-12 py-10 sm:py-14">
      <div className="bg-[#FFFFFF] border border-[#C5A059] rounded-2xl p-6 sm:p-10 shadow-md space-y-8">
        {/* Top Confirmation Banner */}
        <div className="text-center space-y-3 border-b border-[#E2D5C3] pb-8">
          <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center">
            <CheckCircle2 className="w-9 h-9" />
          </div>
          <p className="text-xs uppercase tracking-widest text-[#A37E3B] font-semibold">
            DORAH FASHIONS · Official Order Confirmation
          </p>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold text-[#2C1E16]">
            Thank You! Your Order is Confirmed
          </h1>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#F6F1E9] border border-[#C5A059] rounded-xl">
            <span className="text-xs text-[#6A5243]">Order Number:</span>
            <span className="font-mono text-base font-bold text-[#2C1E16]">
              #{order.orderNumber}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#6A5243] max-w-lg mx-auto leading-relaxed">
            We have saved your order in the DORAH FASHIONS database for{' '}
            <strong className="text-[#2C1E16]">{order.customerName}</strong>. You
            can also send your order summary directly to our WhatsApp desk below
            for instant dispatch coordination.
          </p>
        </div>

        {/* Customer & Delivery Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-[#F6F1E9] border border-[#E2D5C3] rounded-xl space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#A37E3B] uppercase tracking-wider">
              <UserIcon className="w-3.5 h-3.5" />
              <span>Customer Info</span>
            </div>
            <p className="text-sm font-semibold text-[#2C1E16]">
              {order.customerName}
            </p>
            <p className="text-xs text-[#6A5243]">{order.customerPhone}</p>
            <p className="text-xs text-[#6A5243]">{order.customerEmail}</p>
          </div>

          <div className="p-4 bg-[#F6F1E9] border border-[#E2D5C3] rounded-xl space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#A37E3B] uppercase tracking-wider">
              <MapPin className="w-3.5 h-3.5" />
              <span>Delivery Location</span>
            </div>
            <p className="text-sm font-semibold text-[#2C1E16]">
              {order.deliveryLocation}
            </p>
            <p className="text-xs text-[#6A5243]">
              {order.shippingAddress} ({order.postalCode})
            </p>
          </div>

          <div className="p-4 bg-[#F6F1E9] border border-[#E2D5C3] rounded-xl space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#A37E3B] uppercase tracking-wider">
              <CreditCard className="w-3.5 h-3.5" />
              <span>Payment Method</span>
            </div>
            <p className="text-sm font-semibold text-[#2C1E16]">
              {order.paymentMethod}
            </p>
            <p className="text-xs text-emerald-800 font-medium">
              Status: Pending Dispatch
            </p>
          </div>
        </div>

        {/* Ordered Items Breakdown */}
        <div className="border border-[#E2D5C3] rounded-xl overflow-hidden">
          <div className="px-5 py-3 bg-[#F6F1E9] border-b border-[#E2D5C3] flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#2C1E16]">
              Ordered Products ({order.items.reduce((s, i) => s + i.quantity, 0)}{' '}
              items)
            </span>
            <span className="text-xs font-mono text-[#6A5243]">
              Ref #{order.orderNumber}
            </span>
          </div>
          <div className="divide-y divide-[#E2D5C3]">
            {order.items.map((item) => (
              <div
                key={`${item.product.id}_${item.selectedColor}_${item.selectedSize}`}
                className="p-4 flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3.5">
                  <img
                    src={item.product.imageUrl}
                    alt={item.product.name}
                    referrerPolicy="no-referrer"
                    className="w-14 h-14 object-cover rounded-lg bg-[#F6F1E9] border border-[#E2D5C3] shrink-0"
                  />
                  <div>
                    <p className="text-sm font-semibold text-[#2C1E16]">
                      {item.product.name}
                    </p>
                    <p className="text-xs text-[#6A5243] mt-0.5">
                      Color: <strong>{item.selectedColor}</strong> · Size:{' '}
                      <strong>{item.selectedSize}</strong> · Qty:{' '}
                      <strong>{item.quantity}</strong>
                    </p>
                  </div>
                </div>
                <span className="font-mono text-sm font-semibold text-[#2C1E16] tabular-nums">
                  {formatUGX(item.product.price * item.quantity)}
                </span>
              </div>
            ))}
          </div>
          <div className="p-5 bg-[#F6F1E9]/70 border-t border-[#E2D5C3] space-y-2 text-xs">
            <div className="flex justify-between text-[#6A5243]">
              <span>Subtotal</span>
              <span className="font-mono">{formatUGX(order.subtotal)}</span>
            </div>
            <div className="flex justify-between text-[#6A5243]">
              <span>Delivery Fee ({order.deliveryLocation})</span>
              <span className="font-mono">
                {order.shippingFee === 0
                  ? 'Complimentary'
                  : formatUGX(order.shippingFee)}
              </span>
            </div>
            <div className="pt-2 border-t border-[#E2D5C3] flex justify-between text-base font-semibold text-[#2C1E16]">
              <span>Total Amount</span>
              <span className="font-mono text-[#A37E3B]">
                {formatUGX(order.totalAmount)}
              </span>
            </div>
          </div>
        </div>

        {/* Prominent WhatsApp Order Confirmation Box */}
        <div className="p-5 bg-emerald-50/90 border border-emerald-300 rounded-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold text-emerald-950 flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-emerald-700" />
                <span>Fast-Track Your Order on WhatsApp ({WHATSAPP_NUMBER_DISPLAY})</span>
              </h3>
              <p className="text-xs text-emerald-800 mt-1">
                Click below to send your complete order details, selected bead
                colors/sizes, quantities, total price, and delivery location to
                our WhatsApp team.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-3 bg-emerald-700 text-white text-xs font-semibold rounded-xl hover:bg-emerald-800 transition-colors shadow-xs"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Order on WhatsApp</span>
              </a>
              <button
                type="button"
                onClick={handleCopyMessage}
                className="inline-flex items-center gap-1.5 px-3.5 py-3 bg-white text-emerald-900 border border-emerald-300 text-xs font-semibold rounded-xl hover:bg-emerald-100 transition-colors cursor-pointer"
              >
                {copiedMessage ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Message</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Navigation Actions */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
          <button
            type="button"
            onClick={onContinueShopping}
            className="inline-flex items-center gap-2 px-5 py-3 bg-[#F6F1E9] text-[#2C1E16] border border-[#C5A059] text-xs font-semibold rounded-xl hover:bg-[#EDE4D5] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-[#A37E3B]" />
            <span>Continue Shopping</span>
          </button>

          <button
            type="button"
            onClick={onViewMyOrders}
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#2C1E16] text-[#FFFFFF] border border-[#C5A059] text-xs font-semibold rounded-xl hover:bg-[#3F2C21] transition-colors cursor-pointer"
          >
            <Package className="w-4 h-4 text-[#C5A059]" />
            <span>Track in My Orders</span>
          </button>
        </div>
      </div>
    </section>
  );
};
