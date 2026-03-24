import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';

const AuthContext = createContext({
    user: null,
    profile: null,
    loading: true,
    refreshProfile: () => {},
});

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    const loadProfile = useCallback(async (userId) => {
        if (!userId) {
            setProfile(null);
            return null;
        }
        try {
            const { data } = await supabase
                .from('profiles')
                .select('id, display_name, avatar_url, location, stats')
                .eq('id', userId)
                .maybeSingle();
            setProfile(data || null);
            return data;
        } catch (err) {
            setProfile(null);
            return null;
        }
    }, []);

    const refreshProfile = useCallback(async () => {
        if (user?.id) {
            await loadProfile(user.id);
        }
    }, [user, loadProfile]);

    useEffect(() => {
        let mounted = true;

        // Safety timeout — reduced from 5s to 3s
        const timeout = setTimeout(() => {
            if (mounted && loading) {
                setLoading(false);
            }
        }, 3000);

        // Get session from local storage (no network call)
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!mounted) return;
            const u = session?.user ?? null;
            setUser(u);

            if (u) {
                // Set loading=false IMMEDIATELY so ProtectedRoute unblocks.
                // Profile loads in the background — pages that need profile
                // will see it update reactively.
                loadProfile(u.id).finally(() => {
                    if (mounted) setLoading(false);
                });
            } else {
                setLoading(false);
            }
        }).catch(() => {
            if (mounted) setLoading(false);
        });

        // Listen for auth changes (login, logout, token refresh)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (event, session) => {
                if (!mounted) return;
                const u = session?.user ?? null;

                // Update user state synchronously — this unblocks ProtectedRoute
                setUser(u);

                if (event === 'SIGNED_IN' && u) {
                    // User just signed in: set loading false immediately,
                    // then load profile in background
                    setLoading(false);
                    loadProfile(u.id);
                } else if (event === 'SIGNED_OUT') {
                    setProfile(null);
                    setLoading(false);
                } else if (event === 'TOKEN_REFRESHED') {
                    // No need to reload profile on token refresh
                } else if (event === 'INITIAL_SESSION') {
                    // Handled by getSession above, don't double-process
                }
            }
        );

        return () => {
            mounted = false;
            clearTimeout(timeout);
            subscription?.unsubscribe();
        };
    }, []);

    return (
        <AuthContext.Provider value={{ user, profile, loading, refreshProfile }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}

export default AuthContext;
