import { supabase } from '../supabase';

/**
 * Send a push notification to a user via the send-push Edge Function.
 * Fire-and-forget — errors are silently caught.
 *
 * @param {string} userId - Target user ID
 * @param {string} title - Notification title
 * @param {string} body - Notification body text
 * @param {object} data - Extra data for navigation (type, entity_id)
 */
export async function sendPush(userId, title, body = '', data = {}) {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) return;

        await supabase.functions.invoke('send-push', {
            body: { user_id: userId, title, body, data },
        });
    } catch (err) {
        // Silent fail — push is best-effort
        console.log('Push send skipped:', err.message);
    }
}
