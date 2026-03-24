import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Users, Store } from 'lucide-react';
import Explore from './Explore';
import MapScreen from './MapScreen';
import NotificationBell from '../components/NotificationBell';

const TABS = [
    { key: 'people', label: 'Personas', icon: Users },
    { key: 'business', label: 'Negocios', icon: Store },
];

const Discover = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('people');

    return (
        <div style={styles.container} className="fade-in">
            {/* Header */}
            <div style={styles.header}>
                <h2 style={styles.title}>Descubrir</h2>
                <div style={styles.headerRight}>
                    <NotificationBell />
                    {activeTab === 'people' && (
                        <button style={styles.cameraBtn} onClick={() => navigate('/posts/new')}>
                            <Camera size={22} color="var(--color-text-dark)" />
                        </button>
                    )}
                </div>
            </div>

            {/* Toggle bar */}
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
            <p style={styles.subtitle}>
                {activeTab === 'people'
                    ? 'Descubre lo que comparte la comunidad pet lover'
                    : 'Encuentra negocios y servicios para tu mascota'
                }
            </p>

            {/* Content */}
            <div style={styles.content}>
                {activeTab === 'people' && <Explore embedded />}
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
    header: {
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '1rem 1.25rem 0.5rem',
    },
    title: {
        fontSize: '1.5rem',
        fontWeight: 'bold',
        margin: 0,
        color: 'var(--color-text-dark)',
    },
    headerRight: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
    },
    cameraBtn: {
        background: '#f0f2f5',
        border: 'none',
        width: 40,
        height: 40,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        padding: 0,
        minHeight: 'auto',
    },
    toggleBar: {
        flexShrink: 0,
        display: 'flex',
        gap: '0.5rem',
        padding: '0.5rem 1.25rem 0.25rem',
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
    subtitle: {
        flexShrink: 0,
        fontSize: '0.8rem',
        color: 'var(--color-text-light)',
        padding: '0.25rem 1.25rem 0.5rem',
        margin: 0,
    },
    content: {
        flex: 1,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
    },
};

export default Discover;
