-- Migration 014: Add tags and looking_for to pets table
-- tags: array of personality/trait labels shown on pet profile and match cards
-- looking_for: filters which match pool this pet appears in ('amigos' | 'pareja' | 'ambos')

ALTER TABLE pets
  ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS looking_for text DEFAULT 'ambos';

-- Seed data: 3 demo pets for testing PetMatch screen
-- Replace owner_id with a real user ID from your profiles table if desired
-- These use a placeholder UUID — update before using in production

-- Uncomment and replace <YOUR_USER_ID> with a real UUID to insert test pets:
/*
INSERT INTO pets (owner_id, name, species, breed, age, description, tags, looking_for, image_url) VALUES
  ('<YOUR_USER_ID>', 'Rocky', 'perro', 'Golden Retriever', '3 años', 'Me encanta correr y jugar en el parque. Soy muy amigable con todos!', ARRAY['Juguetón','Amigable con perros','Amigable con niños','Vacunado','Entrenado'], 'amigos', 'https://images.unsplash.com/photo-1552053831-71594a27632d?w=600'),
  ('<YOUR_USER_ID>', 'Luna', 'perro', 'Beagle', '2 años', 'Soy curiosa y llena de energía. Busco un compañero especial 🐾', ARRAY['Energética','Curiosa','Vacunada','Esterilizada','Amigable con perros'], 'pareja', 'https://images.unsplash.com/photo-1537151608828-ea2b11777ee8?w=600'),
  ('<YOUR_USER_ID>', 'Max', 'perro', 'Border Collie', '4 años', 'Muy inteligente y activo. Disfruto los paseos largos y aprender trucos nuevos.', ARRAY['Inteligente','Obediente','Amigable con perros','Le gusta los parques','Chip de rastreo'], 'ambos', 'https://images.unsplash.com/photo-1503256207526-0d5523f39fe8?w=600');
*/
