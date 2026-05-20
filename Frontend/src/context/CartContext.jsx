/**
 * #25: CartContext — Manages cart state (cartItems, add/remove, total)
 * Isolated from auth so cart updates don't re-render auth-only components.
 */
import { createContext, useContext, useState, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

const URl = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export const CartContext = createContext(null);

export const CartProvider = ({ children, token, food_list }) => {
  const [cartItem, setCartItems] = useState({});

  const addToCart = useCallback(async (itemId) => {
    if (!token) {
      toast.error('Please sign in to add items to your cart! 🍕');
      return;
    }
    setCartItems(prev => ({ ...prev, [itemId]: (prev[itemId] || 0) + 1 }));
    await axios.post(URl + '/api/cart/add', { itemId }, { headers: { token } });
  }, [token]);

  const removeFromCart = useCallback(async (itemId) => {
    if (!token) return;
    setCartItems(prev => ({ ...prev, [itemId]: Math.max(0, (prev[itemId] || 1) - 1) }));
    await axios.post(URl + '/api/cart/remove', { itemId }, { headers: { token } });
  }, [token]);

  const getTotalCartAmount = useCallback(() => {
    let total = 0;
    for (const id in cartItem) {
      if (cartItem[id] > 0) {
        const info = food_list?.find(p => p._id === id);
        if (info) total += info.price * cartItem[id];
      }
    }
    return total;
  }, [cartItem, food_list]);

  const clearCart = useCallback(async () => {
    setCartItems({});
    if (token) {
      try {
        await axios.post(URl + '/api/cart/clear', {}, { headers: { token } });
      } catch (e) { console.error('Cart clear failed', e); }
    }
  }, [token]);

  const loadCartData = useCallback(async (tok) => {
    try {
      const res = await axios.post(URl + '/api/cart/get', {}, { headers: { token: tok } });
      if (res.data.success) setCartItems(res.data.cartData);
    } catch {
      setCartItems({});
    }
  }, []);

  return (
    <CartContext.Provider value={{ cartItem, setCartItems, addToCart, removeFromCart, getTotalCartAmount, clearCart, loadCartData }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
