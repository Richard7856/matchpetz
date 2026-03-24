-- Add push_token column to profiles for FCM push notifications
-- Run this in Supabase SQL Editor

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS push_token TEXT;
