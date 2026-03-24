import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Minus, Plus, ShoppingCart, Zap } from 'lucide-react';
import { supabase } from '../supabase';
import AppBar from '../components/AppBar';
import { getCart, addToCart } from '../utils/cart';

const ProductDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [quantity, setQuantity] = useState(1);
    const [added, setAdded] = useState(false);

    useEffect(() => {
        const load = async () => {
            const { data, error } = await supabase
                .from('marketplace_products')
                .select('*')
                .eq('id', id)
                .single();
            if (!error && data) setProduct(data);
            setLoading(false);
        };
        load();
    }, [id]);

    const handleAddToCart = () => {
        addToCart(product.id, quantity);
        setAdded(true);
        setTimeout(() => setAdded(false), 1500);
    };

    const handleBuyNow = () => {
        addToCart(product.id, quantity);
        navigate('/cart');
    };

    const maxStock = product?.stock || 1;

    if (loading) return <div style={styles.loading}>Cargando...</div>;
    if (!product) return <div style={styles.loading}>Producto no encontrado.</div>;

    return (
        <div style={styles.container}>
            <AppBar title="Producto" />

            {/* Hero image */}
            <div style={{
                ...styles.hero,
                backgroundImage: product.image_url ? `url(${product.image_url})` : 'none',
                backgroundColor: product.image_url ? 'transparent' : '#ddd',
            }} />

            <div style={styles.content}>
                <h2 style={styles.productName}>{product.name}</h2>

                <span style={styles.productPrice}>
                    ${Number(product.price).toLocaleString('es-MX')}
                </span>

                {product.description && (
                    <p style={styles.desc}>{product.description}</p>
                )}

                <div style={styles.metaRow}>
                    <span style={styles.metaLabel}>Vendedor</span>
                    <span style={styles.metaValue}>{product.seller_name}</span>
                </div>

                <div style={styles.metaRow}>
                    <span style={styles.metaLabel}>Stock disponible</span>
                    <span style={styles.metaValue}>{product.stock ?? 0} unidades</span>
                </div>

                {/* Quantity selector */}
                <div style={styles.quantitySection}>
                    <span style={styles.quantityLabel}>Cantidad</span>
                    <div style={styles.quantityControls}>
                        <button
                            style={styles.qtyBtn}
                            onClick={() => setQuantity(q => Math.max(1, q - 1))}
                            disabled={quantity <= 1}
                        >
                            <Minus size={16} />
                        </button>
                        <span style={styles.qtyText}>{quantity}</span>
                        <button
                            style={styles.qtyBtn}
                            onClick={() => setQuantity(q => Math.min(maxStock, q + 1))}
                            disabled={quantity >= maxStock}
                        >
                            <Plus size={16} />
                        </button>
                    </div>
                </div>

                {/* Actions */}
                <div style={styles.actions}>
                    <button
                        style={{
                            ...styles.addCartBtn,
                            ...(added ? styles.addedBtn : {}),
                        }}
                        onClick={handleAddToCart}
                    >
                        <ShoppingCart size={18} />
                        {added ? 'Agregado' : 'Agregar al carrito'}
                    </button>

                    <button style={styles.buyNowBtn} onClick={handleBuyNow}>
                        <Zap size={18} />
                        Comprar ahora
                    </button>
                </div>
            </div>
        </div>
    );
};

const styles = {
    container: {
        minHeight: '100%',
        backgroundColor: 'var(--color-bg-soft)',
        paddingBottom: '2rem',
    },
    loading: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        color: 'var(--color-text-light)',
    },
    hero: {
        width: '100%',
        height: '280px',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
    },
    content: {
        padding: '1.25rem',
    },
    productName: {
        fontSize: '1.6rem',
        fontWeight: '800',
        color: 'var(--color-text-dark)',
        margin: '0 0 0.5rem 0',
    },
    productPrice: {
        display: 'inline-block',
        fontSize: '1.4rem',
        fontWeight: 'bold',
        color: 'var(--color-primary)',
        marginBottom: '1rem',
    },
    desc: {
        fontSize: '0.95rem',
        color: 'var(--color-text-light)',
        lineHeight: 1.6,
        marginBottom: '1.25rem',
    },
    metaRow: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: '14px',
        padding: '0.9rem 1rem',
        marginBottom: '0.75rem',
        boxShadow: 'var(--shadow-soft)',
    },
    metaLabel: {
        fontSize: '0.9rem',
        color: 'var(--color-text-light)',
        fontWeight: '600',
    },
    metaValue: {
        fontSize: '0.9rem',
        color: 'var(--color-text-dark)',
        fontWeight: '700',
    },
    quantitySection: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: '14px',
        padding: '0.9rem 1rem',
        marginBottom: '1.5rem',
        boxShadow: 'var(--shadow-soft)',
    },
    quantityLabel: {
        fontSize: '0.9rem',
        color: 'var(--color-text-light)',
        fontWeight: '600',
    },
    quantityControls: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.8rem',
        backgroundColor: '#f5f5f5',
        borderRadius: '10px',
        padding: '0.35rem',
    },
    qtyBtn: {
        background: '#fff',
        border: 'none',
        width: '32px',
        height: '32px',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        padding: 0,
    },
    qtyText: {
        fontWeight: 'bold',
        fontSize: '1rem',
        minWidth: '24px',
        textAlign: 'center',
    },
    actions: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
    },
    addCartBtn: {
        width: '100%',
        backgroundColor: '#fff',
        color: 'var(--color-text-dark)',
        border: '2px solid var(--color-primary)',
        padding: '1rem',
        borderRadius: '50px',
        fontSize: '1rem',
        fontWeight: 'bold',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.5rem',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        fontFamily: 'inherit',
    },
    addedBtn: {
        backgroundColor: 'var(--color-primary)',
        color: '#fff',
        borderColor: 'var(--color-primary)',
    },
    buyNowBtn: {
        width: '100%',
        backgroundColor: 'var(--color-primary)',
        color: '#fff',
        border: 'none',
        padding: '1rem',
        borderRadius: '50px',
        fontSize: '1rem',
        fontWeight: 'bold',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.5rem',
        cursor: 'pointer',
        fontFamily: 'inherit',
    },
};

export default ProductDetail;
