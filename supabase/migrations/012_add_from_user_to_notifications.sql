-- Add from_user_id to notifications so adoption alerts can resolve who to chat with
-- even when entity_id (conversation) is missing or stale.
-- Run in Supabase Dashboard → SQL Editor

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS from_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_from_user ON public.notifications(from_user_id);
