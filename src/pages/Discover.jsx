import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Store } from 'lucide-react';
import Explore from './Explore';
import MapScreen from './MapScreen';

const TABS = [
    { key: 'people',   label: 'Personas',  icon: Users },
    { key: 'business', label: 'Negocios',  icon: Store },
];

const Discover = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('people');

    return (
        <div style={styles.container} className="fade-in">
            {/* Toggle bar — sin título encima, más limpio */}
            <div style={styles.toggleBar}>
                {TABS.map(tab => {
                    const isActive = activeTab === tab.key;
                    return (
                        <button
                            key={tab.key}
                            style={{
                                ...styles.toggleBtn,
                                ...(isActive ? styles.toggleBtnActive : {}),
                            }}
                            onClick={() => setActiveTab(tab.key)}
                        >
                            <tab.icon size={16} />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Subtitle */}
            {/* Content */}
            <div style={styles.content}>
                {activeTab === 'people'   && <Explore embedded />}
                {activeTab === 'business' && <MapScreen embedded />}
            </div>
        </div>
    );
};

const styles = {
    container: {
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: '100%',
        backgroundColor: '#f5f5f5',
    },
    toggleBar: {
        flexShrink: 0,
        display: 'flex',
        gap: '0.5rem',
        padding: '1rem 1.25rem 0.25rem',
    },
    toggleBtn: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.35rem',
        padding: '0.55rem 1.1rem',
        borderRadius: '20px',
        border: 'none',
        backgroundColor: '#f0f2f5',
        color: 'var(--color-text-light)',
        fontSize: '0.9rem',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s',
        width: 'auto',
        minHeight: 'auto',
    },
    toggleBtnActive: {
        backgroundColor: 'var(--color-primary)',
        color: '#fff',
    },
    content: {
        flex: 1,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
    },
};

export default Discover;
