-- Migration: delete_own_account function
-- Allows a user to permanently delete their own account including the auth record.
-- SECURITY DEFINER runs with postgres-level privileges so it can delete from auth.users.
-- auth.uid() ensures users can only delete themselves — not other accounts.

CREATE OR REPLACE FUNCTION public.delete_own_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  -- Guard: only authenticated users can call this
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Delete child rows first to avoid FK violations
  DELETE FROM public.pet_swipes
    WHERE swiper_pet_id IN (SELECT id FROM public.pets WHERE owner_id = uid)
       OR target_pet_id IN (SELECT id FROM public.pets WHERE owner_id = uid);

  DELETE FROM public.pet_matches
    WHERE pet1_id IN (SELECT id FROM public.pets WHERE owner_id = uid)
       OR pet2_id IN (SELECT id FROM public.pets WHERE owner_id = uid);

  DELETE FROM public.pets                  WHERE owner_id  = uid;
  DELETE FROM public.messages              WHERE sender_id  = uid;
  DELETE FROM public.notifications         WHERE user_id    = uid;
  DELETE FROM public.posts                 WHERE user_id    = uid;
  DELETE FROM public.adoption_pets         WHERE user_id    = uid;
  DELETE FROM public.marketplace_products  WHERE user_id    = uid;
  DELETE FROM public.profiles              WHERE id         = uid;

  -- Delete the auth user record — requires elevated privileges (SECURITY DEFINER)
  DELETE FROM auth.users WHERE id = uid;
END;
$$;

-- Only authenticated users can invoke this function
GRANT EXECUTE ON FUNCTION public.delete_own_account() TO authenticated;
