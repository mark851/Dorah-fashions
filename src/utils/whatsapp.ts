import {
  CartItem,
  formatUGX,
  WHATSAPP_NUMBER_DIGITS,
  WHATSAPP_NUMBER_DISPLAY,
} from '../types';

export interface WhatsAppOrderParams {
  customerName?: string;
  items: CartItem[];
  totalPrice: number;
  deliveryLocation?: string;
  shippingAddress?: string;
  orderNumber?: string;
}

/**
 * Generates a formatted WhatsApp message and wa.me URL for +256775803896
 * in Ugandan Shillings (UGX) containing:
 * - Customer name
 * - Selected products
 * - Quantities
 * - Total price (UGX)
 * - Delivery location
 */
export function buildWhatsAppOrderMessage(params: WhatsAppOrderParams): string {
  const {
    customerName,
    items,
    totalPrice,
    deliveryLocation,
    shippingAddress,
    orderNumber,
  } = params;

  const displayCustomer =
    customerName && customerName.trim().length > 0
      ? customerName.trim()
      : 'Valued Customer (Please type your name)';

  const displayLocation =
    deliveryLocation && deliveryLocation.trim().length > 0
      ? shippingAddress && shippingAddress.trim().length > 0
        ? `${deliveryLocation.trim()} (${shippingAddress.trim()})`
        : deliveryLocation.trim()
      : 'Kampala Central & Metropolitan (Please confirm location)';

  const productLines =
    items.length > 0
      ? items
          .map(
            (item, idx) =>
              `${idx + 1}. ${item.product.name} — Color: ${
                item.selectedColor
              }, Size: ${item.selectedSize} | Qty: ${
                item.quantity
              } | ${formatUGX(item.product.price * item.quantity)}`
          )
          .join('\n')
      : '1. Custom Bead / Bag Inquiry (Please specify item & quantity)';

  const totalUnits = items.reduce((sum, i) => sum + i.quantity, 0);

  const lines = [
    `*DORAH FASHIONS — WhatsApp Order*`,
    orderNumber ? `*Order Ref:* #${orderNumber}` : `*Store:* dorafashions.online`,
    ``,
    `*Customer Name:* ${displayCustomer}`,
    `*Selected Products:*`,
    productLines,
    ``,
    `*Total Quantity:* ${
      totalUnits > 0 ? `${totalUnits} item(s)` : 'To be confirmed'
    }`,
    `*Total Price:* ${formatUGX(totalPrice)}`,
    `*Delivery Location:* ${displayLocation}`,
    ``,
    `Hello DORAH FASHIONS (${WHATSAPP_NUMBER_DISPLAY}), I would like to place this order.`,
  ];

  return lines.join('\n');
}

export function buildWhatsAppOrderUrl(params: WhatsAppOrderParams): string {
  const message = buildWhatsAppOrderMessage(params);
  return `https://wa.me/${WHATSAPP_NUMBER_DIGITS}?text=${encodeURIComponent(
    message
  )}`;
}
