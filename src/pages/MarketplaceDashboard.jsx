import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Package } from 'lucide-react';
import { supabase } from '../supabase';
import { useAuth } from '../contexts/AuthContext';

const CATEGORY_DISPLAY = { alimentos: 'Alimentos', ropa: 'Ropa', juguetes: 'Juguetes', accesorios: 'Accesorios', otros: 'Otros' };

const MarketplaceDashboard = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [products, setProducts] = useState([]);
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState('products');
    const [deleting, setDeleting] = useState(null);

    useEffect(() => {
        const load = async () => {
            if (!user) return;
            const [{ data: prods }, { data: ords }] = await Promise.all([
                supabase.from('marketplace_products').select('*').eq('seller_id', user.id).order('created_at', { ascending: false }),
                supabase.from('orders').select('*, marketplace_products(name, image_url)').eq('buyer_id', user.id).order('created_at', { ascending: false }),
            ]);
            setProducts(prods || []);
            setOrders(ords || []);
            setLoading(false);
        };
        load();
    }, [user]);

    const deleteProduct = async (id) => {
        setDeleting(id);
        await supabase.from('marketplace_products').delete().eq('id', id);
        setProducts((prev) => prev.filter((p) => p.id !== id));
        setDeleting(null);
    };

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <button style={styles.backBtn} onClick={() => navigate('/marketplace')}>
                    <ArrowLeft size={22} color="var(--color-text-dark)" />
                </button>
                <h2 style={styles.title}>Mi tienda</h2>
                <button style={styles.addBtn} onClick={() => navigate('/marketplace/new')}>
                    <Plus size={18} />
                </button>
            </div>

            {/* Tabs */}
            <div style={styles.tabs}>
                <button style={{ ...styles.tab, ...(tab === 'products' ? styles.tabActive : {}) }} onClick={() => setTab('products')}>
                    Mis productos
                </button>
                <button style={{ ...styles.tab, ...(tab === 'orders' ? styles.tabActive : {}) }} onClick={() => setTab('orders')}>
                    Mis pedidos
                </button>
            </div>

            <div style={styles.content}>
                {loading ? (
                    <p style={styles.empty}>Cargando...</p>
                ) : tab === 'products' ? (
                    products.length === 0 ? (
                        <div style={styles.emptyState}>
                            <Package size={48} color="#ccc" />
                            <p style={styles.empty}>No tienes productos publicados.</p>
                            <button style={styles.cta} onClick={() => navigate('/marketplace/new')}>Publicar producto</button>
                        </div>
                    ) : (
                        <div style={styles.list}>
                            {products.map((p) => (
                                <div key={p.id} style={styles.productRow}>
                                    <div
                                        style={{
                                            ...styles.productImg,
                                            backgroundImage: p.image_url ? `url(${p.image_url})` : 'none',
                                            backgroundColor: p.image_url ? 'transparent' : '#eee',
                                        }}
                                    />
                                    <div style={styles.productInfo}>
                                        <p style={styles.productName}>{p.name}</p>
                                        <p style={styles.productCat}>{CATEGORY_DISPLAY[p.category] || p.category}</p>
                                        <p style={styles.productPrice}>${Number(p.price).toFixed(2)}</p>
                                        <span style={{ ...styles.statusBadge, backgroundColor: p.status === 'active' ? '#e8f5e9' : '#fff3e0', color: p.status === 'active' ? '#2e7d32' : '#e65100' }}>
                                            {p.status === 'active' ? 'Activo' : p.status === 'sold' ? 'Vendido' : 'Pausado'}
                                        </span>
                                    </div>
                                    <button
                                        style={styles.deleteBtn}
                                        onClick={() => deleteProduct(p.id)}
                                        disabled={deleting === p.id}
                                    >
                                        <Trash2 size={18} color="#e53935" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )
                ) : (
                    orders.length === 0 ? (
                        <p style={styles.empty}>No tienes pedidos aún.</p>
                    ) : (
                        <div style={styles.list}>
                            {orders.map((o) => (
                                <div key={o.id} style={styles.orderRow}>
                                    <div style={styles.orderInfo}>
                                        <p style={styles.productName}>{o.marketplace_products?.name || 'Producto'}</p>
                                        <p style={styles.productCat}>Cantidad: {o.quantity}</p>
                                        <p style={styles.productPrice}>${Number(o.total).toFixed(2)}</p>
                                    </div>
                                    <span style={{ ...styles.statusBadge, backgroundColor: o.status === 'confirmed' ? '#e8f5e9' : '#fff3e0', color: o.status === 'confirmed' ? '#2e7d32' : '#e65100' }}>
                                        {o.status === 'pending' ? 'Pendiente' : o.status === 'confirmed' ? 'Confirmado' : 'Cancelado'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )
                )}
            </div>
        </div>
    );
};

const styles = {
    container: { minHeight: '100%', backgroundColor: 'var(--color-bg-soft)', display: 'flex', flexDirection: 'column' },
    header: { display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', backgroundColor: '#fff', borderBottom: '1px solid #f0f0f0', position: 'sticky', top: 0, zIndex: 10 },
    backBtn: { background: 'none', border: 'none', padding: '0.25rem', cursor: 'pointer', width: 'auto', display: 'flex', alignItems: 'center' },
    title: { fontSize: '1.15rem', fontWeight: '700', margin: 0, color: 'var(--color-text-dark)', flex: 1 },
    addBtn: { background: 'var(--color-primary)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' },
    tabs: { display: 'flex', backgroundColor: '#fff', borderBottom: '1px solid #f0f0f0' },
    tab: { flex: 1, padding: '0.9rem', background: 'none', border: 'none', borderBottom: '2px solid transparent', fontSize: '0.9rem', fontWeight: '600', cursor: 'pointer', color: 'var(--color-text-light)' },
    tabActive: { borderBottomColor: 'var(--color-primary)', color: 'var(--color-primary)' },
    content: { flex: 1, padding: '1rem', overflowY: 'auto' },
    list: { display: 'flex', flexDirection: 'column', gap: '0.75rem' },
    empty: { textAlign: 'center', color: 'var(--color-text-light)', marginTop: '2rem' },
    emptyState: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', marginTop: '3rem' },
    cta: { padding: '0.75rem 1.5rem', borderRadius: '16px', border: 'none', backgroundColor: 'var(--color-primary)', color: '#fff', fontWeight: '700', cursor: 'pointer' },
    productRow: { display: 'flex', gap: '0.75rem', backgroundColor: '#fff', borderRadius: '14px', padding: '0.75rem', boxShadow: 'var(--shadow-soft)', alignItems: 'center' },
    productImg: { width: '60px', height: '60px', borderRadius: '10px', backgroundSize: 'cover', backgroundPosition: 'center', flexShrink: 0 },
    productInfo: { flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' },
    productName: { fontSize: '0.92rem', fontWeight: '700', color: 'var(--color-text-dark)', margin: 0 },
    productCat: { fontSize: '0.78rem', color: 'var(--color-text-light)', margin: 0 },
    productPrice: { fontSize: '0.9rem', fontWeight: '700', color: 'var(--color-primary)', margin: 0 },
    statusBadge: { padding: '2px 8px', borderRadius: '10px', fontSize: '0.72rem', fontWeight: '600', alignSelf: 'flex-start' },
    deleteBtn: { background: 'none', border: 'none', cursor: 'pointer', padding: '0.4rem', width: 'auto', display: 'flex', alignItems: 'center' },
    orderRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', borderRadius: '14px', padding: '0.75rem 1rem', boxShadow: 'var(--shadow-soft)' },
    orderInfo: { display: 'flex', flexDirection: 'column', gap: '2px' },
};

export default MarketplaceDashboard;
