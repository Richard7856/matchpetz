-- Migration 015: Add gender and is_neutered to pets table
-- gender: 'macho' | 'hembra' | NULL (not specified)
-- is_neutered: boolean, relevant for match/pareja mode

ALTER TABLE pets
  ADD COLUMN IF NOT EXISTS gender text,
  ADD COLUMN IF NOT EXISTS is_neutered boolean DEFAULT false;

-- Fix: set looking_for = 'ambos' for any existing pets with NULL
-- (covers pets created before migration 014 added the column default)
UPDATE pets SET looking_for = 'ambos' WHERE looking_for IS NULL;
