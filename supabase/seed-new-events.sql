-- Run this in Supabase SQL Editor
-- Deletes old sample events and creates 2 new ones

-- Delete old sample events (keep Tarde de Corgis as past event)
DELETE FROM event_attendees WHERE event_id IN (
  '98da5974-45da-44b0-8c9b-b4242c7d5661',
  '34126074-7b75-49e4-a41c-0b8b72df4d9e'
);
DELETE FROM events WHERE id IN (
  '98da5974-45da-44b0-8c9b-b4242c7d5661',
  '34126074-7b75-49e4-a41c-0b8b72df4d9e'
);

-- Event 1: Created by prueba@gmail.com (future)
INSERT INTO events (creator_id, creator_name, creator_avatar_url, title, description, event_date, event_time, location, image_url, activity_type, lat, lng, max_attendees)
VALUES (
  '0ee1429d-ac48-45ae-a8f0-b1d93a74a9ba',
  'prueba',
  NULL,
  'Paseo Grupal Chapultepec',
  'Caminata grupal por el Bosque de Chapultepec con nuestras mascotas. Recorrido de 3 km apto para todas las razas. Punto de encuentro en la fuente principal. Traer agua y bolsas para recoger.',
  '2026-04-12',
  '09:00:00',
  'Bosque de Chapultepec, entrada principal',
  'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=400&q=80',
  'paseo',
  19.4204,
  -99.1892,
  25
);

-- Event 2: Created by Dra. Ana Martinez (future)
INSERT INTO events (creator_id, creator_name, creator_avatar_url, title, description, event_date, event_time, location, image_url, activity_type, lat, lng, max_attendees)
VALUES (
  '9816476e-de5a-4088-8f20-71f5d4cc6ebb',
  'Dra. Ana Martinez',
  'https://i.pravatar.cc/300?u=test-vet@matchpet.test',
  'Jornada de Vacunacion Gratuita',
  'Jornada de vacunacion gratuita para perros y gatos. Incluye vacuna antirrabica y desparasitacion. Cupo limitado. Traer cartilla de vacunacion.',
  '2026-04-05',
  '10:00:00',
  'Clinica Veterinaria San Angel, Av. Revolucion 1235',
  'https://images.unsplash.com/photo-1628009368231-7bb7cfcb0def?w=400&q=80',
  'evento',
  19.3467,
  -99.1879,
  50
);
