-- Eventos y asistentes
CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  creator_name TEXT NOT NULL DEFAULT 'Usuario',
  creator_avatar_url TEXT,
  title TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  event_time TIME NOT NULL,
  location TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.event_attendees (
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  PRIMARY KEY (event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_events_created_at ON public.events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_event_attendees_user ON public.event_attendees(user_id);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_attendees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cualquiera puede ver eventos" ON public.events FOR SELECT USING (true);
CREATE POLICY "Autenticados pueden crear eventos" ON public.events FOR INSERT WITH CHECK (auth.uid() = creator_id OR creator_id IS NULL);
CREATE POLICY "Creador puede actualizar su evento" ON public.events FOR UPDATE USING (auth.uid() = creator_id);
CREATE POLICY "Creador puede eliminar su evento" ON public.events FOR DELETE USING (auth.uid() = creator_id);

CREATE POLICY "Ver asistentes" ON public.event_attendees FOR SELECT USING (true);
CREATE POLICY "Inscribirse a evento" ON public.event_attendees FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Desinscribirse" ON public.event_attendees FOR DELETE USING (auth.uid() = user_id);

-- Seed: 3 alertas de ejemplo (solo si la tabla está vacía)
INSERT INTO public.alerts (user_name, pet_name, pet_type, description, reward, zone_address, zone_lat, zone_lng, image_url)
SELECT a.user_name, a.pet_name, a.pet_type, a.description, a.reward, a.zone_address, a.zone_lat, a.zone_lng, a.image_url
FROM (
  SELECT 'María G.'::text AS user_name, 'Max'::text AS pet_name, 'Perro'::text AS pet_type, 'Golden retriever, collar azul. Muy amigable. Se perdió cerca del parque.'::text AS description, 1500::numeric AS reward, 'Parque Bicentenario, Col. Del Valle'::text AS zone_address, 19.39::float8 AS zone_lat, -99.17::float8 AS zone_lng, 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80'::text AS image_url
  UNION ALL SELECT 'Roberto L.', 'Luna', 'Gato', 'Gata negra con mancha blanca en el pecho. Asustadiza, no intentar agarrar.', NULL, 'Cerca del Metro Zapata, Coyoacán', 19.35, -99.17, 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80'
  UNION ALL SELECT 'Ana S.', 'Rocky', 'Perro', 'Cachorro labrador, collar rojo con placa. Muy juguetón.', 500, 'Col. Condesa, cerca del Jardín Pushkin', 19.41, -99.17, 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80'
) a
WHERE (SELECT count(*) FROM public.alerts) = 0;

-- Seed: 3 eventos de ejemplo (solo si la tabla está vacía)
INSERT INTO public.events (creator_name, creator_avatar_url, title, description, event_date, event_time, location, image_url)
SELECT e.creator_name, e.creator_avatar_url, e.title, e.description, e.event_date, e.event_time, e.location, e.image_url
FROM (
  SELECT 'Ana García'::text AS creator_name, 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&q=80'::text AS creator_avatar_url, 'Tarde de Corgis en el Parque'::text AS title, 'Encuentro para dueños de Corgis. Trae snacks y agua para tu perro.'::text AS description, (CURRENT_DATE + 10)::date AS event_date, '16:00'::time AS event_time, 'Parque de los Venados'::text AS location, 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=400&q=80'::text AS image_url
  UNION ALL SELECT 'Carlos López', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&q=80', 'Entrenamiento Básico Grupal', 'Sesión de obediencia básica con entrenador. Máx 10 perros.', (CURRENT_DATE + 14)::date, '09:00', 'Parque México', 'https://images.unsplash.com/photo-1576201836106-db1758fd1c97?w=400&q=80'
  UNION ALL SELECT 'Laura M.', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&q=80', 'Adopción responsable - charla', 'Charla sobre adopción y cuidados. Refugio presentará perritos en adopción.', (CURRENT_DATE + 7)::date, '11:00', 'Centro comunitario Condesa', 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400&q=80'
) e
WHERE (SELECT count(*) FROM public.events) = 0;
