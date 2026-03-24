import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ShoppingBag, DollarSign, Package, Send } from 'lucide-react';
import { supabase } from '../supabase';
import { useAuth } from '../contexts/AuthContext';
import MultiImageUpload from '../components/MultiImageUpload';

const CATEGORIES = [
    { value: 'alimentos', label: 'Alimentos' },
    { value: 'juguetes', label: 'Juguetes' },
    { value: 'ropa', label: 'Ropa' },
    { value: 'accesorios', label: 'Accesorios' },
    { value: 'otros', label: 'Otros' },
];

const AddProduct = () => {
    const navigate = useNavigate();
    const { user, profile } = useAuth();
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [images, setImages] = useState([]);
    const [form, setForm] = useState({
        name: '', description: '', price: '', category: 'alimentos', stock: '1',
    });

    const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.name.trim() || !form.price) return setError('Nombre y precio son requeridos.');
        setSaving(true);
        setError('');
        const sellerName = profile?.display_name || user?.email?.split('@')[0] || 'Vendedor';
        const { error: err } = await supabase.from('marketplace_products').insert({
            name: form.name.trim(),
            description: form.description.trim() || null,
            price: parseFloat(form.price),
            category: form.category,
            image_url: images[0] || null,
            images: images,
            seller_name: sellerName,
            seller_id: user?.id || null,
            stock: parseInt(form.stock) || 1,
            status: 'active',
        });
        setSaving(false);
        if (err) return setError('Error al publicar: ' + err.message);
        navigate('/marketplace');
    };

    return (
        <div style={{ minHeight: '100%', backgroundColor: 'var(--color-bg-soft)', display: 'flex', flexDirection: 'column' }} className="fade-in">
            <div className="form-header">
                <button className="form-back-btn" onClick={() => navigate(-1)}>
                    <ArrowLeft size={22} color="var(--color-text-dark)" />
                </button>
                <h2>Nuevo producto</h2>
            </div>

            <form onSubmit={handleSubmit} style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem', paddingBottom: '2rem', flex: 1 }}>
                {error && <div className="form-error">{error}</div>}

                {/* Photos */}
                <div className="form-card">
                    <span className="form-section-title">Fotos del producto</span>
                    <MultiImageUpload
                        images={images}
                        onImagesChange={setImages}
                        folder="products"
                        maxImages={5}
                        shape="banner"
                        mainSize={180}
                    />
                </div>

                {/* Product info */}
                <div className="form-card">
                    <span className="form-section-title">Informacion</span>

                    <div className="form-group">
                        <label className="form-label"><ShoppingBag size={15} /> Nombre del producto *</label>
                        <input className="form-input" value={form.name} onChange={set('name')} placeholder="Ej. Croquetas Premium" required />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Descripcion <span className="optional">opcional</span></label>
                        <textarea className="form-textarea" value={form.description} onChange={set('description')} rows={3} placeholder="Describe el producto, ingredientes, beneficios..." />
                    </div>

                    <div className="form-group">
                        <label className="form-label"><Package size={15} /> Categoria</label>
                        <select className="form-select" value={form.category} onChange={set('category')}>
                            {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                        </select>
                    </div>
                </div>

                {/* Pricing */}
                <div className="form-card">
                    <span className="form-section-title">Precio y stock</span>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label"><DollarSign size={15} /> Precio (MXN) *</label>
                            <input className="form-input" type="number" min="0" step="0.01" value={form.price} onChange={set('price')} placeholder="0.00" required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Stock</label>
                            <input className="form-input" type="number" min="1" value={form.stock} onChange={set('stock')} placeholder="1" />
                        </div>
                    </div>
                </div>

                <button type="submit" className="form-submit-btn" disabled={saving}>
                    <Send size={18} />
                    {saving ? 'Publicando...' : 'Publicar producto'}
                </button>
            </form>
        </div>
    );
};

export default AddProduct;
