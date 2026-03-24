const CART_KEY = 'matchpetz_cart';

export const getCart = () => {
    try { return JSON.parse(localStorage.getItem(CART_KEY) || '[]'); }
    catch { return []; }
};

export const saveCart = (cart) => localStorage.setItem(CART_KEY, JSON.stringify(cart));

export const addToCart = (productId, qty = 1) => {
    const cart = getCart();
    const existing = cart.find(i => i.productId === productId);
    if (existing) existing.quantity += qty;
    else cart.push({ productId, quantity: qty });
    saveCart(cart);
    return cart;
};

export const clearCart = () => localStorage.removeItem(CART_KEY);
