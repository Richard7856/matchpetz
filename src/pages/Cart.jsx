import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, Plus, Minus, CreditCard, ShoppingCart } from 'lucide-react';
import { supabase } from '../supabase';
import { useAuth } from '../contexts/AuthContext';
import AppBar from '../components/AppBar';
import { getCart, saveCart, clearCart } from '../utils/cart';

const Cart = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [cartItems, setCartItems] = useState([]);
    const [products, setProducts] = useState({});
    const [loading, setLoading] = useState(true);
    const [checkingOut, setCheckingOut] = useState(false);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        const load = async () => {
            const cart = getCart();
            if (cart.length === 0) {
                setLoading(false);
                return;
            }
            const productIds = cart.map(i => i.productId);
            const { data, error } = await supabase
                .from('marketplace_products')
                .select('*')
                .in('id', productIds);
            if (!error && data) {
                const productMap = {};
                data.forEach(p => { productMap[p.id] = p; });
                setProducts(productMap);
            }
            setCartItems(cart);
            setLoading(false);
        };
        load();
    }, []);

    const updateQuantity = (productId, delta) => {
        const updated = cartItems.map(item => {
            if (item.productId === productId) {
                const product = products[productId];
                const maxStock = product?.stock || 99;
                const newQty = Math.max(1, Math.min(maxStock, item.quantity + delta));
                return { ...item, quantity: newQty };
            }
            return item;
        });
        setCartItems(updated);
        saveCart(updated);
    };

    const removeItem = (productId) => {
        const updated = cartItems.filter(item => item.productId !== productId);
        setCartItems(updated);
        saveCart(updated);
    };

    const subtotal = cartItems.reduce((sum, item) => {
        const product = products[item.productId];
        if (!product) return sum;
        return sum + (Number(product.price) * item.quantity);
    }, 0);
    const shipping = subtotal > 0 ? 50 : 0;
    const total = subtotal + shipping;

    const handleCheckout = async () => {
        setCheckingOut(true);
        try {
            if (!user) {
                alert('Debes iniciar sesion para comprar.');
                setCheckingOut(false);
                return;
            }

            const orders = cartItems
                .filter(item => products[item.productId])
                .map(item => {
                    const product = products[item.productId];
                    return {
                        buyer_id: user.id,
                        product_id: item.productId,
                        quantity: item.quantity,
                        total: Number(product.price) * item.quantity,
                        status: 'pending',
                    };
                });

            const { error } = await supabase.from('orders').insert(orders);
            if (error) {
                alert('Error al procesar tu pedido. Intenta de nuevo.');
                setCheckingOut(false);
                return;
            }

            // Clear cart
            clearCart();
            setCartItems([]);
            setSuccess(true);
            setTimeout(() => {
                navigate('/marketplace');
            }, 2000);
        } catch {
            alert('Error inesperado. Intenta de nuevo.');
        }
        setCheckingOut(false);
    };

    if (loading) {
        return (
            <div style={styles.container}>
                <AppBar title="Carrito" />
                <div style={styles.loadingState}>Cargando...</div>
            </div>
        );
    }

    if (success) {
        return (
            <div style={styles.container}>
                <AppBar title="Carrito" />
                <div style={styles.emptyState}>
                    <div style={styles.emptyIconBg}>
                        <CreditCard size={40} color="var(--color-primary)" />
                    </div>
                    <h3 style={styles.successTitle}>Compra realizada</h3>
                    <p style={styles.successText}>Tu pedido ha sido registrado exitosamente.</p>
                </div>
            </div>
        );
    }

    // Filter out items whose products were not found
    const validItems = cartItems.filter(item => products[item.productId]);

    return (
        <div style={styles.container} className="fade-in">
            <AppBar title={`Carrito (${validItems.length})`} />

            <div style={styles.itemsContainer}>
                {validItems.length > 0 ? (
                    validItems.map(item => {
                        const product = products[item.productId];
                        return (
                            <div key={item.productId} style={styles.cartItem}>
                                <img
                                    src={product.image_url}
                                    alt={product.name}
                                    style={styles.itemImage}
                                />
                                <div style={styles.itemDetails}>
                                    <h4 style={styles.itemName}>{product.name}</h4>
                                    <span style={styles.itemPrice}>
                                        ${Number(product.price).toLocaleString('es-MX')}
                                    </span>
                                    <div style={styles.itemActions}>
                                        <div style={styles.quantityControls}>
                                            <button
                                                style={styles.qtyBtn}
                                                onClick={() => updateQuantity(item.productId, -1)}
                                            >
                                                <Minus size={14} />
                                            </button>
                                            <span style={styles.qtyText}>{item.quantity}</span>
                                            <button
                                                style={styles.qtyBtn}
                                                onClick={() => updateQuantity(item.productId, 1)}
                                            >
                                                <Plus size={14} />
                                            </button>
                                        </div>
                                        <button
                                            style={styles.removeBtn}
                                            onClick={() => removeItem(item.productId)}
                                        >
                                            <Trash2 size={16} color="#ff4b4b" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div style={styles.emptyState}>
                        <div style={styles.emptyIconBg}>
                            <ShoppingCart size={40} color="var(--color-text-light)" />
                        </div>
                        <h3>Tu carrito esta vacio</h3>
                        <p>Explora el Marketplace para encontrar lo que tu mascota necesita.</p>
                        <button style={styles.returnBtn} onClick={() => navigate('/marketplace')}>
                            Volver a la Tienda
                        </button>
                    </div>
                )}
            </div>

            {validItems.length > 0 && (
                <div style={styles.checkoutFooter}>
                    <div style={styles.summaryRow}>
                        <span style={styles.summaryLabel}>Subtotal</span>
                        <span style={styles.summaryValue}>
                            ${subtotal.toLocaleString('es-MX')}
                        </span>
                    </div>
                    <div style={styles.summaryRow}>
                        <span style={styles.summaryLabel}>Envio</span>
                        <span style={styles.summaryValue}>
                            ${shipping.toLocaleString('es-MX')}
                        </span>
                    </div>
                    <div style={styles.divider}></div>
                    <div style={styles.summaryRow}>
                        <span style={styles.totalLabel}>Total</span>
                        <span style={styles.totalValue}>
                            ${total.toLocaleString('es-MX')}
                        </span>
                    </div>
                    <button
                        style={{
                            ...styles.checkoutBtn,
                            ...(checkingOut ? styles.checkoutBtnDisabled : {}),
                        }}
                        onClick={handleCheckout}
                        disabled={checkingOut}
                    >
                        <CreditCard size={20} />
                        {checkingOut ? 'Procesando...' : 'Proceder al Pago'}
                    </button>
                </div>
            )}
        </div>
    );
};

const styles = {
    container: {
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#f9f9f9',
    },
    loadingState: {
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--color-text-light)',
    },
    itemsContainer: {
        flex: 1,
        padding: '1.5rem 1rem',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
    },
    cartItem: {
        backgroundColor: '#fff',
        borderRadius: '16px',
        padding: '1rem',
        display: 'flex',
        gap: '1rem',
        boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
    },
    itemImage: {
        width: '80px',
        height: '80px',
        borderRadius: '12px',
        objectFit: 'cover',
    },
    itemDetails: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
    },
    itemName: {
        fontSize: '0.95rem',
        fontWeight: 'bold',
        margin: 0,
        lineHeight: 1.3,
    },
    itemPrice: {
        color: 'var(--color-primary)',
        fontWeight: 'bold',
        fontSize: '1.1rem',
        marginTop: '0.2rem',
    },
    itemActions: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: '0.5rem',
    },
    quantityControls: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.8rem',
        backgroundColor: '#f5f5f5',
        borderRadius: '8px',
        padding: '0.3rem',
    },
    qtyBtn: {
        background: '#fff',
        border: 'none',
        width: '24px',
        height: '24px',
        borderRadius: '6px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        padding: 0,
    },
    qtyText: {
        fontWeight: 'bold',
        fontSize: '0.9rem',
        minWidth: '20px',
        textAlign: 'center',
    },
    removeBtn: {
        background: '#ffebee',
        border: 'none',
        padding: '0.4rem',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
    },
    checkoutFooter: {
        backgroundColor: '#fff',
        padding: '1.5rem',
        borderTopLeftRadius: '24px',
        borderTopRightRadius: '24px',
        boxShadow: '0 -5px 20px rgba(0,0,0,0.05)',
    },
    summaryRow: {
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: '0.8rem',
    },
    summaryLabel: {
        color: 'var(--color-text-light)',
        fontSize: '0.95rem',
    },
    summaryValue: {
        fontWeight: '600',
        fontSize: '0.95rem',
    },
    divider: {
        height: '1px',
        backgroundColor: '#eee',
        margin: '1rem 0',
    },
    totalLabel: {
        fontWeight: 'bold',
        fontSize: '1.2rem',
    },
    totalValue: {
        fontWeight: 'bold',
        fontSize: '1.4rem',
        color: 'var(--color-primary)',
    },
    checkoutBtn: {
        width: '100%',
        backgroundColor: 'var(--color-primary)',
        color: '#fff',
        border: 'none',
        padding: '1.2rem',
        borderRadius: '50px',
        fontSize: '1.1rem',
        fontWeight: 'bold',
        marginTop: '1.5rem',
        gap: '0.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        fontFamily: 'inherit',
    },
    checkoutBtnDisabled: {
        opacity: 0.6,
        cursor: 'not-allowed',
    },
    emptyState: {
        textAlign: 'center',
        padding: '3rem 1rem',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
    },
    emptyIconBg: {
        width: '80px',
        height: '80px',
        borderRadius: '50%',
        backgroundColor: '#f5f5f5',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '1rem',
    },
    successTitle: {
        color: 'var(--color-text-dark)',
        marginBottom: '0.5rem',
    },
    successText: {
        color: 'var(--color-text-light)',
        fontSize: '0.95rem',
    },
    returnBtn: {
        marginTop: '2rem',
        backgroundColor: 'var(--color-primary)',
        color: '#fff',
        border: 'none',
        padding: '1rem 2rem',
        borderRadius: '50px',
        fontWeight: 'bold',
        cursor: 'pointer',
        fontFamily: 'inherit',
    },
};

export default Cart;
