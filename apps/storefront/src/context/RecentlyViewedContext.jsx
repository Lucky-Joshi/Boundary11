import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const RecentlyViewedContext = createContext(null);
const STORAGE_KEY = 'b11_recently_viewed';
const MAX_ITEMS = 8;

function read() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Tracks the last few products a shopper viewed. Like the wishlist this stores
 * only non-sensitive product summaries in localStorage — never auth tokens.
 */
export function RecentlyViewedProvider({ children }) {
  const [items, setItems] = useState(read);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const add = useCallback((product) => {
    if (!product?.slug) return;
    setItems((current) => {
      const summary = {
        id: product.slug,
        slug: product.slug,
        name: product.name,
        minPricePaise: product.minPricePaise,
        minCompareAtPaise: product.minCompareAtPaise ?? null,
        discountPercent: product.discountPercent || 0,
        rating: product.rating || 0,
        reviewCount: product.reviewCount || 0,
        inStock: product.inStock !== false,
        featured: Boolean(product.featured),
        accent: product.accent || '#1d2b53',
        categoryName: product.categoryName || '',
      };
      return [summary, ...current.filter((item) => item.slug !== product.slug)].slice(0, MAX_ITEMS);
    });
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const value = useMemo(() => ({ items, add, clear }), [items, add, clear]);
  return <RecentlyViewedContext.Provider value={value}>{children}</RecentlyViewedContext.Provider>;
}

export function useRecentlyViewed() {
  const context = useContext(RecentlyViewedContext);
  if (!context) throw new Error('useRecentlyViewed must be used within a RecentlyViewedProvider');
  return context;
}
