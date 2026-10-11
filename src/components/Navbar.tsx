import React, { useState } from 'react';
import { ShoppingBag, Menu, X } from 'lucide-react';

export type ActiveView =
  | 'storefront'
  | 'orders'
  | 'admin'
  | 'order-confirmation';

interface NavbarProps {
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
  cartCount: number;
  onOpenCart: () => void;
  onScrollToSection: (sectionId: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeView,
  setActiveView,
  cartCount,
  onOpenCart,
  onScrollToSection,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavClick = (view: ActiveView, sectionId?: string) => {
    setActiveView(view);
    setMobileMenuOpen(false);
    if (view === 'storefront' && sectionId) {
      setTimeout(() => onScrollToSection(sectionId), 60);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 flex items-center justify-between gap-8 px-4 sm:px-6 lg:px-12 py-3.5 bg-[#F6F1E9]/95 backdrop-blur-md border-b border-[#E2D5C3]">
        {/* Zone 1: Single text element wordmark */}
        <button
          type="button"
          onClick={() => handleNavClick('storefront', 'hero')}
          className="font-display text-2xl sm:text-[26px] font-semibold tracking-tight text-[#2C1E16] whitespace-nowrap shrink-0 cursor-pointer text-left"
        >
          DORAH FASHIONS
        </button>

        {/* Zone 2: Concise single-line text navigation links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-[#6A5243]">
          <button
            type="button"
            onClick={() => handleNavClick('storefront', 'collection')}
            className={`hover:text-[#2C1E16] transition-colors whitespace-nowrap shrink-0 cursor-pointer pb-0.5 ${
              activeView === 'storefront'
                ? 'text-[#2C1E16] border-b-2 border-[#C5A059] font-semibold'
                : ''
            }`}
          >
            Product Shop
          </button>
          <button
            type="button"
            onClick={() => handleNavClick('storefront', 'atelier')}
            className="hover:text-[#2C1E16] transition-colors whitespace-nowrap shrink-0 cursor-pointer pb-0.5"
          >
            Atelier
          </button>
          <button
            type="button"
            onClick={() => handleNavClick('storefront', 'contact')}
            className="hover:text-[#2C1E16] transition-colors whitespace-nowrap shrink-0 cursor-pointer pb-0.5"
          >
            Contact Us
          </button>
          <button
            type="button"
            onClick={() => handleNavClick('orders')}
            className={`hover:text-[#2C1E16] transition-colors whitespace-nowrap shrink-0 cursor-pointer pb-0.5 ${
              activeView === 'orders'
                ? 'text-[#2C1E16] border-b-2 border-[#C5A059] font-semibold'
                : ''
            }`}
          >
            My Orders
          </button>
          <button
            type="button"
            onClick={() => handleNavClick('admin')}
            className={`hover:text-[#2C1E16] transition-colors whitespace-nowrap shrink-0 cursor-pointer pb-0.5 ${
              activeView === 'admin'
                ? 'text-[#2C1E16] border-b-2 border-[#C5A059] font-semibold'
                : ''
            }`}
          >
            Admin Portal
          </button>
        </nav>

        {/* Zone 3: Primary action + Mobile Menu Toggle for Android/iPhone */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onOpenCart}
            className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[42px] text-xs font-semibold text-[#FFFFFF] bg-[#2C1E16] border border-[#C5A059]/60 rounded-lg hover:bg-[#3F2C21] transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-xs"
          >
            <ShoppingBag className="w-3.5 h-3.5 text-[#C5A059]" />
            <span>Cart ({cartCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label="Toggle navigation menu"
            className="md:hidden inline-flex items-center justify-center w-11 h-11 rounded-lg bg-white border border-[#E2D5C3] text-[#2C1E16] hover:bg-[#EDE4D5]/50 transition-colors cursor-pointer"
          >
            {mobileMenuOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
        </div>
      </header>

      {/* Mobile Navigation Drawer for Android & iPhone */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-x-0 top-[69px] z-30 bg-[#FFFFFF] border-b border-[#E2D5C3] shadow-xl px-5 py-4 space-y-1">
          <button
            type="button"
            onClick={() => handleNavClick('storefront', 'collection')}
            className="w-full text-left px-3 py-3 rounded-lg text-sm font-semibold text-[#2C1E16] hover:bg-[#F6F1E9] transition-colors flex items-center justify-between"
          >
            <span>Product Shop &amp; Bead Catalogue</span>
            <span className="text-xs text-[#C5A059]">Explore</span>
          </button>
          <button
            type="button"
            onClick={() => handleNavClick('storefront', 'atelier')}
            className="w-full text-left px-3 py-3 rounded-lg text-sm font-medium text-[#6A5243] hover:bg-[#F6F1E9] transition-colors"
          >
            The Atelier &amp; Craftsmanship
          </button>
          <button
            type="button"
            onClick={() => handleNavClick('storefront', 'contact')}
            className="w-full text-left px-3 py-3 rounded-lg text-sm font-medium text-[#6A5243] hover:bg-[#F6F1E9] transition-colors"
          >
            Contact Us &amp; WhatsApp Desk
          </button>
          <button
            type="button"
            onClick={() => handleNavClick('orders')}
            className="w-full text-left px-3 py-3 rounded-lg text-sm font-medium text-[#6A5243] hover:bg-[#F6F1E9] transition-colors"
          >
            My Orders &amp; Tracking
          </button>
          <button
            type="button"
            onClick={() => handleNavClick('admin')}
            className="w-full text-left px-3 py-3 rounded-lg text-sm font-medium text-[#6A5243] hover:bg-[#F6F1E9] transition-colors"
          >
            Administrator Portal
          </button>
        </div>
      )}
    </>
  );
};
