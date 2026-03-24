import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    // Prevent navigator.locks deadlocks — the default navigatorLock
    // can permanently hang if a lock is never released (e.g. HMR reload,
    // tab crash, or interrupted token refresh). A no-op lock is safe for
    // single-tab PWAs like MatchPetz.
    lock: async (name, acquireTimeout, fn) => await fn(),
  },
});

export default supabase;
