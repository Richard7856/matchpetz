-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor)
-- Creates 2 new events: 1 past (finished) + 1 upcoming
-- Also cleans up orphaned sample conversations

-- Delete orphaned sample conversations (no real user IDs)
DELETE FROM conversations WHERE user1_id IS NULL AND user2_id IS NULL;

-- Event 1: PAST / FINISHED (March 10, 2026)
INSERT INTO events (creator_id, creator_name, creator_avatar_url, title, description, event_date, event_time, location, image_url, activity_type, lat, lng, max_attendees)
VALUES (
  '9816476e-de5a-4088-8f20-71f5d4cc6ebb',
  'Dra. Ana Martínez',
  'https://i.pravatar.cc/150?u=ana-martinez',
  'Jornada de Vacunación Gratuita',
  'Jornada de vacunación gratuita para perros y gatos. Incluye vacuna antirrábica y desparasitación. Cupo limitado, llega temprano. Traer cartilla de vacunación si tienes.',
  '2026-03-10',
  '09:00:00',
  'Clínica Veterinaria San Ángel, Av. Revolución 1235',
  'https://images.unsplash.com/photo-1628009368231-7bb7cfcb0def?w=400&q=80',
  'evento',
  19.3467,
  -99.1879,
  50
);

-- Event 2: UPCOMING (April 5, 2026)
INSERT INTO events (creator_id, creator_name, creator_avatar_url, title, description, event_date, event_time, location, image_url, activity_type, lat, lng, max_attendees)
VALUES (
  '6ec2c456-7086-4c5e-99f5-b4d6e09a444b',
  'Carlos Hotel',
  'https://i.pravatar.cc/150?u=carlos-hotel',
  'Caminata Canina por Chapultepec',
  'Únete a nuestra caminata grupal con nuestras mascotas por el Bosque de Chapultepec. Recorrido de 3 km apto para todas las razas. Habrá premios para los mejores disfraces. Punto de encuentro: fuente principal.',
  '2026-04-05',
  '08:30:00',
  'Bosque de Chapultepec, entrada principal',
  'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=400&q=80',
  'evento',
  19.4204,
  -99.1892,
  30
);
