-- MatchPetz: Cleanup all sample/seed data
-- Run this in the Supabase Dashboard SQL Editor
-- This removes ALL rows with null creator/user IDs (seed data)

-- 1. Delete event attendees linked to sample events
DELETE FROM event_attendees WHERE event_id IN (SELECT id FROM events WHERE creator_id IS NULL);

-- 2. Delete messages in orphaned conversations
DELETE FROM messages WHERE conversation_id IN (SELECT id FROM conversations WHERE user1_id IS NULL);

-- 3. Delete comments on sample adoption pets
DELETE FROM pet_comments WHERE pet_id IN (SELECT id FROM adoption_pets WHERE user_id IS NULL);

-- 4. Delete reviews linked to sample events/places
DELETE FROM reviews WHERE event_id IN (SELECT id FROM events WHERE creator_id IS NULL);

-- 5. Delete sample rows from main tables
DELETE FROM events WHERE creator_id IS NULL;
DELETE FROM alerts WHERE user_id IS NULL;
DELETE FROM places WHERE created_by IS NULL;
DELETE FROM marketplace_products WHERE seller_id IS NULL;
DELETE FROM adoption_pets WHERE user_id IS NULL;
DELETE FROM conversations WHERE user1_id IS NULL;

-- 6. Delete fake business profiles (seed accounts)
DELETE FROM business_roles WHERE user_id IN (
    SELECT id FROM profiles WHERE display_name IN (
        'Dra. Ana Martínez', 'Carlos Hotel', 'María Guard', 'Luis Groom',
        'Sofía Walk', 'Pedro Entrenador', 'Laura Clínica', 'Roberto Café', 'Carmen Refugio'
    )
);
DELETE FROM profiles WHERE display_name IN (
    'Dra. Ana Martínez', 'Carlos Hotel', 'María Guard', 'Luis Groom',
    'Sofía Walk', 'Pedro Entrenador', 'Laura Clínica', 'Roberto Café', 'Carmen Refugio'
);

-- Verify cleanup
SELECT 'events' as tabla, count(*) as total FROM events
UNION ALL SELECT 'alerts', count(*) FROM alerts
UNION ALL SELECT 'places', count(*) FROM places
UNION ALL SELECT 'marketplace_products', count(*) FROM marketplace_products
UNION ALL SELECT 'adoption_pets', count(*) FROM adoption_pets
UNION ALL SELECT 'conversations', count(*) FROM conversations
UNION ALL SELECT 'profiles', count(*) FROM profiles;
