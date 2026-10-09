import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as cartService from '../services/cart.js';
import { resetCartId } from '../services/api.js';
import { useToast } from './ToastContext.jsx';

const CartContext = createContext(null);

const EMPTY_TOTALS = {
  itemCount: 0,
  subtotalPaise: 0,
  discountPaise: 0,
  shippingPaise: 0,
  totalPaise: 0,
};

export function CartProvider({ children }) {
  const queryClient = useQueryClient();
  const { push } = useToast();
  const [coupon, setCoupon] = useState('');

  const cartQuery = useQuery({
    queryKey: ['cart', coupon],
    queryFn: () => cartService.fetchCart(coupon || undefined),
    staleTime: 15_000,
  });

  const invalidate = useCallback(
    (data) => {
      if (data) queryClient.setQueryData(['cart', coupon], data);
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
    [queryClient, coupon],
  );

  const onError = useCallback(
    (error) => push(error.message || 'Something went wrong.', 'error'),
    [push],
  );

  const addItem = useMutation({
    mutationFn: ({ variantId, quantity }) => cartService.addCartItem(variantId, quantity),
    onSuccess: (data) => {
      invalidate(data);
      push('Added to bag', 'success');
    },
    onError,
  });

  const updateItem = useMutation({
    mutationFn: ({ itemId, quantity }) => cartService.updateCartItem(itemId, quantity),
    onSuccess: (data) => invalidate(data),
    onError,
  });

  const removeItem = useMutation({
    mutationFn: (itemId) => cartService.removeCartItem(itemId),
    onSuccess: (data) => {
      invalidate(data);
      push('Removed from bag');
    },
    onError,
  });

  const clear = useCallback(async () => {
    try {
      await cartService.clearCart();
      resetCartId();
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    } catch (error) {
      onError(error);
    }
  }, [queryClient, onError]);

  const value = useMemo(() => {
    const cart = cartQuery.data || { items: [], totals: EMPTY_TOTALS };
    return {
      items: cart.items || [],
      totals: cart.totals || EMPTY_TOTALS,
      appliedCoupon: cart.coupon || null,
      isLoading: cartQuery.isLoading,
      isError: cartQuery.isError,
      refetch: cartQuery.refetch,
      addItem: addItem.mutateAsync,
      updateItem: updateItem.mutateAsync,
      removeItem: removeItem.mutateAsync,
      clear,
      isMutating: addItem.isPending || updateItem.isPending || removeItem.isPending,
      coupon,
      setCoupon,
    };
  }, [
    cartQuery.data,
    cartQuery.isLoading,
    cartQuery.isError,
    cartQuery.refetch,
    addItem.mutateAsync,
    addItem.isPending,
    updateItem.mutateAsync,
    updateItem.isPending,
    removeItem.mutateAsync,
    removeItem.isPending,
    clear,
    coupon,
  ]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within a CartProvider');
  return context;
}
