import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ShoppingCart, Plus, LayoutDashboard } from 'lucide-react';
import useIsMobile from '../hooks/useIsMobile';
import { supabase } from '../supabase';
import { getCart, addToCart } from '../utils/cart';

const CATEGORY_DISPLAY = {
    alimentos: 'Alimentos',
    ropa: 'Ropa',
    juguetes: 'Juguetes',
    accesorios: 'Accesorios',
    otros: 'Otros',
};
const categories = ['Alimentos', 'Ropa', 'Juguetes', 'Accesorios', 'Otros'];

const Marketplace = () => {
    const navigate = useNavigate();
    const isMobile = useIsMobile();
    const [activeCategory, setActiveCategory] = useState('Alimentos');
    const [products, setProducts] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(null);
    const [cartCount, setCartCount] = useState(0);
    const [addedProductId, setAddedProductId] = useState(null);

    useEffect(() => {
        const load = async () => {
            const { data, error } = await supabase
                .from('marketplace_products')
                .select('id, name, price, category, image_url, seller_name, description, created_at')
                .order('created_at', { ascending: false })
                .limit(40);
            if (error) {
                setLoadError('No se pudieron cargar los productos.');
            } else if (data) {
                setProducts(data);
            }
            setLoading(false);
        };
        load();
        // Load cart count
        const cart = getCart();
        setCartCount(cart.reduce((sum, i) => sum + i.quantity, 0));
    }, []);

    const handleAddToCart = (e, productId) => {
        e.stopPropagation();
        const updatedCart = addToCart(productId);
        setCartCount(updatedCart.reduce((sum, i) => sum + i.quantity, 0));
        setAddedProductId(productId);
        setTimeout(() => setAddedProductId(null), 1200);
    };

    const filtered = products.filter(p => {
        const categoryMatch = CATEGORY_DISPLAY[p.category] === activeCategory;
        const searchMatch = !searchQuery ||
            p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (p.description || '').toLowerCase().includes(searchQuery.toLowerCase());
        return categoryMatch && searchMatch;
    });

    return (
        <div style={styles.container} className="fade-in">
            <div style={styles.header}>
                <h2 style={styles.title}>Marketplace</h2>
                <button style={styles.iconBtn} onClick={() => navigate('/marketplace/new')}>
                    <Plus size={22} color="var(--color-text-dark)" />
                </button>
                <button style={styles.iconBtn} onClick={() => navigate('/marketplace/dashboard')}>
                    <LayoutDashboard size={22} color="var(--color-text-dark)" />
                </button>
                <button style={styles.iconBtn} onClick={() => navigate('/cart')}>
                    <div style={styles.cartIconWrapper}>
                        <ShoppingCart size={24} color="var(--color-text-dark)" />
                        {cartCount > 0 && (
                            <span style={styles.cartBadge}>{cartCount > 99 ? '99+' : cartCount}</span>
                        )}
                    </div>
                </button>
            </div>

            <div style={styles.searchContainer}>
                <div style={styles.searchBar}>
                    <Search size={20} color="var(--color-text-light)" />
                    <input
                        type="text"
                        placeholder="Buscar productos..."
                        style={styles.searchInput}
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            <div style={styles.categoriesWrapper}>
                <div style={styles.categoriesContainer}>
                    {categories.map(cat => (
                        <button
                            key={cat}
                            style={{ ...styles.categoryBtn, ...(activeCategory === cat ? styles.activeCategory : {}) }}
                            onClick={() => setActiveCategory(cat)}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            <div style={{ ...styles.productsGrid, gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)' }}>
                {loading ? (
                    <div style={styles.emptyState}>
                        <p>Cargando productos...</p>
                    </div>
                ) : loadError ? (
                    <div style={styles.emptyState}>
                        <p style={{ color: '#e53935' }}>{loadError}</p>
                    </div>
                ) : filtered.length > 0 ? (
                    filtered.map(product => (
                        <div
                            key={product.id}
                            style={styles.productCard}
                            onClick={() => navigate('/products/' + product.id)}
                        >
                            <img src={product.image_url} alt={product.name} style={styles.productImg} loading="lazy" />
                            <div style={styles.productInfo}>
                                <h4 style={styles.productName}>{product.name}</h4>
                                <div style={styles.productMeta}>
                                    <span style={styles.productPrice}>${Number(product.price).toLocaleString('es-MX')}</span>
                                    <div style={styles.sellerBox}>
                                        <span style={styles.sellerText}>{product.seller_name}</span>
                                    </div>
                                </div>
                                <button
                                    style={{
                                        ...styles.addBtn,
                                        ...(addedProductId === product.id ? styles.addBtnAdded : {}),
                                    }}
                                    onClick={(e) => handleAddToCart(e, product.id)}
                                >
                                    {addedProductId === product.id ? '\u2713 Agregado' : 'Agregar'}
                                </button>
                            </div>
                        </div>
                    ))
                ) : (
                    <div style={styles.emptyState}>
                        <p>No hay productos {searchQuery ? `para "${searchQuery}"` : 'en esta categor\u00eda'} por ahora.</p>
                    </div>
                )}
            </div>

        </div>
    );
};

const styles = {
    container: {
        minHeight: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--color-background)',
    },
    header: {
        padding: '2rem 1.5rem 1rem 1.5rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    title: {
        fontSize: 'var(--font-size-page-title)',
        fontWeight: 'bold',
        margin: 0
    },
    iconBtn: {
        background: '#f5f5f5',
        border: 'none',
        width: '40px',
        height: '40px',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        padding: 0
    },
    cartIconWrapper: {
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    cartBadge: {
        position: 'absolute',
        top: '-8px',
        right: '-10px',
        backgroundColor: 'var(--color-primary)',
        color: '#fff',
        fontSize: '0.65rem',
        fontWeight: 'bold',
        minWidth: '18px',
        height: '18px',
        borderRadius: '9px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 4px',
        lineHeight: 1,
    },
    searchContainer: {
        padding: '0 1.5rem 1rem 1.5rem',
    },
    searchBar: {
        display: 'flex',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: '12px',
        padding: '0.8rem 1rem',
        gap: '0.8rem',
        boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
        border: '1px solid #eee'
    },
    searchInput: {
        border: 'none',
        outline: 'none',
        fontSize: '1rem',
        width: '100%',
        color: 'var(--color-text-dark)'
    },
    categoriesWrapper: {
        marginBottom: '1rem',
    },
    categoriesContainer: {
        display: 'flex',
        gap: '0.8rem',
        padding: '0 1.5rem 0.5rem 1.5rem',
        overflowX: 'auto',
        scrollbarWidth: 'none',
    },
    categoryBtn: {
        background: '#f0f2f5',
        border: 'none',
        padding: '0.6rem 1.2rem',
        borderRadius: '20px',
        fontSize: '0.9rem',
        fontWeight: '600',
        color: 'var(--color-text-light)',
        whiteSpace: 'nowrap',
        cursor: 'pointer'
    },
    activeCategory: {
        background: 'var(--color-primary)',
        color: '#fff'
    },
    productsGrid: {
        padding: '0 1.5rem 1.5rem 1.5rem',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '1rem',
    },
    productCard: {
        backgroundColor: '#fff',
        borderRadius: '16px',
        overflow: 'hidden',
        boxShadow: '0 4px 10px rgba(0,0,0,0.03)',
        border: '1px solid #f0f0f0',
        display: 'flex',
        flexDirection: 'column',
        cursor: 'pointer',
    },
    productImg: {
        width: '100%',
        height: '140px',
        objectFit: 'cover'
    },
    productInfo: {
        padding: '0.8rem',
        display: 'flex',
        flexDirection: 'column',
        flex: 1
    },
    productName: {
        fontSize: '0.9rem',
        fontWeight: 'bold',
        marginBottom: '0.5rem',
        lineHeight: 1.2,
        flex: 1
    },
    productMeta: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '0.8rem'
    },
    productPrice: {
        fontSize: '1.1rem',
        fontWeight: 'bold',
        color: 'var(--color-primary)'
    },
    sellerBox: {
        display: 'flex',
        alignItems: 'center',
    },
    sellerText: {
        fontSize: '0.75rem',
        color: 'var(--color-text-light)',
        fontWeight: '600',
    },
    addBtn: {
        backgroundColor: '#f8f8f8',
        color: 'var(--color-text-dark)',
        border: '1px solid #ddd',
        padding: '0.5rem',
        borderRadius: '8px',
        fontSize: '0.8rem',
        fontWeight: 'bold',
        width: '100%',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        fontFamily: 'inherit',
    },
    addBtnAdded: {
        backgroundColor: 'var(--color-primary)',
        color: '#fff',
        borderColor: 'var(--color-primary)',
    },
    emptyState: {
        gridColumn: '1 / -1',
        textAlign: 'center',
        padding: '2rem',
        color: 'var(--color-text-light)'
    }
};

export default Marketplace;
