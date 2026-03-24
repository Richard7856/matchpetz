import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../supabase';

/**
 * Root route: redirects based on session.
 * Handles OAuth callback (Google) by detecting hash/query params.
 */
export default function AuthRedirect() {
    const [status, setStatus] = useState('loading');

    useEffect(() => {
        let cancelled = false;

        const resolve = (s) => {
            if (!cancelled) setStatus(s);
        };

        const checkSession = async () => {
            try {
                // getSession reads from localStorage first (instant),
                // then Supabase processes any OAuth hash in the URL.
                const { data: { session } } = await supabase.auth.getSession();
                if (cancelled) return;

                if (!session?.user) {
                    resolve('login');
                    return;
                }

                const { data: profile } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('id', session.user.id)
                    .maybeSingle();

                if (cancelled) return;
                resolve(profile ? 'home' : 'complete-profile');
            } catch {
                if (!cancelled) resolve('login');
            }
        };

        // Listen for auth events — handles OAuth redirects where the hash
        // is processed asynchronously after getSession resolves.
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (cancelled) return;
                if (event === 'SIGNED_IN' && session?.user) {
                    try {
                        const { data: profile } = await supabase
                            .from('profiles')
                            .select('id')
                            .eq('id', session.user.id)
                            .maybeSingle();
                        if (!cancelled) resolve(profile ? 'home' : 'complete-profile');
                    } catch {
                        if (!cancelled) resolve('home');
                    }
                }
            }
        );

        checkSession();

        // Safety timeout — never stay loading forever (reduced from 4s)
        const safety = setTimeout(() => resolve('login'), 2500);

        return () => {
            cancelled = true;
            clearTimeout(safety);
            subscription?.unsubscribe();
        };
    }, []);

    if (status === 'loading') {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
                <span style={{ color: 'var(--color-text-light)' }}>Cargando...</span>
            </div>
        );
    }
    if (status === 'home') return <Navigate to="/home" replace />;
    if (status === 'complete-profile') return <Navigate to="/complete-profile" replace />;
    return <Navigate to="/login" replace />;
}
