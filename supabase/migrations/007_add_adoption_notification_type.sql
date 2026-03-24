-- Add 'adoption' to the notifications type check constraint
-- Run this in Supabase SQL Editor

ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('appointment', 'review', 'event', 'message', 'adoption'));
