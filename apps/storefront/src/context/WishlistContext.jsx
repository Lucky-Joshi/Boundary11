import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const WishlistContext = createContext(null);
const STORAGE_KEY = 'b11_wishlist';

function read() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/** Wishlist stores only non-sensitive product summaries in localStorage. */
export function WishlistProvider({ children }) {
  const [items, setItems] = useState(read);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const has = useCallback((slug) => items.some((item) => item.slug === slug), [items]);

  const toggle = useCallback((product) => {
    setItems((current) => {
      if (current.some((item) => item.slug === product.slug)) {
        return current.filter((item) => item.slug !== product.slug);
      }
      return [
        ...current,
        {
          slug: product.slug,
          name: product.name,
          minPricePaise: product.minPricePaise,
          minCompareAtPaise: product.minCompareAtPaise ?? null,
          accent: product.accent || '#1d2b53',
          categoryName: product.categoryName || '',
        },
      ];
    });
  }, []);

  const remove = useCallback((slug) => {
    setItems((current) => current.filter((item) => item.slug !== slug));
  }, []);

  const value = useMemo(
    () => ({ items, count: items.length, has, toggle, remove }),
    [items, has, toggle, remove],
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) throw new Error('useWishlist must be used within a WishlistProvider');
  return context;
}
