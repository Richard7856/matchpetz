-- Migration 013: Pet Match system (swipes + matches)
-- Enables Tinder-style dog matching (Amigos / Pareja modes)

-- pet_swipes: records every swipe action (like or pass)
CREATE TABLE IF NOT EXISTS public.pet_swipes (
    id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    swiper_pet_id uuid NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
    target_pet_id uuid NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
    mode        text NOT NULL CHECK (mode IN ('amigos', 'pareja')),
    liked       boolean NOT NULL,
    created_at  timestamptz DEFAULT now(),
    -- Prevent duplicate swipes for the same pair/mode
    UNIQUE (swiper_pet_id, target_pet_id, mode)
);

-- pet_matches: created when two pets mutually like each other in the same mode
CREATE TABLE IF NOT EXISTS public.pet_matches (
    id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    pet1_id     uuid NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
    pet2_id     uuid NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
    mode        text NOT NULL CHECK (mode IN ('amigos', 'pareja')),
    created_at  timestamptz DEFAULT now(),
    -- Order-independent uniqueness: always store smaller id as pet1
    UNIQUE (pet1_id, pet2_id, mode)
);

-- Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_pet_swipes_swiper ON public.pet_swipes(swiper_pet_id, mode);
CREATE INDEX IF NOT EXISTS idx_pet_swipes_target ON public.pet_swipes(target_pet_id, mode);
CREATE INDEX IF NOT EXISTS idx_pet_matches_pet1  ON public.pet_matches(pet1_id);
CREATE INDEX IF NOT EXISTS idx_pet_matches_pet2  ON public.pet_matches(pet2_id);

-- RLS: enable row-level security
ALTER TABLE public.pet_swipes  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pet_matches ENABLE ROW LEVEL SECURITY;

-- pet_swipes policies
CREATE POLICY "Users can insert swipes for their own pets"
    ON public.pet_swipes FOR INSERT
    WITH CHECK (
        swiper_pet_id IN (SELECT id FROM public.pets WHERE owner_id = auth.uid())
    );

CREATE POLICY "Users can read swipes involving their own pets"
    ON public.pet_swipes FOR SELECT
    USING (
        swiper_pet_id IN (SELECT id FROM public.pets WHERE owner_id = auth.uid())
        OR
        target_pet_id IN (SELECT id FROM public.pets WHERE owner_id = auth.uid())
    );

-- pet_matches policies
CREATE POLICY "Users can insert matches involving their own pets"
    ON public.pet_matches FOR INSERT
    WITH CHECK (
        pet1_id IN (SELECT id FROM public.pets WHERE owner_id = auth.uid())
        OR
        pet2_id IN (SELECT id FROM public.pets WHERE owner_id = auth.uid())
    );

CREATE POLICY "Users can read matches involving their own pets"
    ON public.pet_matches FOR SELECT
    USING (
        pet1_id IN (SELECT id FROM public.pets WHERE owner_id = auth.uid())
        OR
        pet2_id IN (SELECT id FROM public.pets WHERE owner_id = auth.uid())
    );
