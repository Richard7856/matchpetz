-- Add images array column to tables that support multi-image upload
-- These columns store arrays of image URLs for the MultiImageUpload component
-- The first image (images[0]) is also stored in image_url for backward compatibility

ALTER TABLE adoption_pets ADD COLUMN IF NOT EXISTS images text[] DEFAULT '{}';
ALTER TABLE marketplace_products ADD COLUMN IF NOT EXISTS images text[] DEFAULT '{}';
ALTER TABLE events ADD COLUMN IF NOT EXISTS images text[] DEFAULT '{}';
ALTER TABLE services ADD COLUMN IF NOT EXISTS images text[] DEFAULT '{}';
ALTER TABLE pets ADD COLUMN IF NOT EXISTS images text[] DEFAULT '{}';
