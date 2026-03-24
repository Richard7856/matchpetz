-- ==============================================
-- Migration 005: Pets, Reviews, Appointments, Notifications
-- ==============================================

-- 1. Pets table (owner's personal pets, separate from adoption_pets)
CREATE TABLE IF NOT EXISTS public.pets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  species TEXT NOT NULL DEFAULT 'perro' CHECK (species IN ('perro', 'gato', 'otro')),
  breed TEXT,
  age TEXT,
  description TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pets_owner ON public.pets(owner_id);
ALTER TABLE public.pets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cualquiera puede ver mascotas" ON public.pets FOR SELECT USING (true);
CREATE POLICY "Usuarios pueden crear sus mascotas" ON public.pets FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Usuarios pueden actualizar sus mascotas" ON public.pets FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Usuarios pueden eliminar sus mascotas" ON public.pets FOR DELETE USING (auth.uid() = owner_id);

CREATE TRIGGER pets_updated_at
  BEFORE UPDATE ON public.pets
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- 2. Universal reviews table (polymorphic)
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('pet', 'profile', 'event', 'place')),
  entity_id UUID NOT NULL,
  reviewer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reviewer_name TEXT,
  reviewer_avatar TEXT,
  rating SMALLINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(entity_type, entity_id, reviewer_id)
);

CREATE INDEX IF NOT EXISTS idx_reviews_entity ON public.reviews(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer ON public.reviews(reviewer_id);
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cualquiera puede ver reseñas" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Autenticados pueden crear reseñas" ON public.reviews FOR INSERT WITH CHECK (auth.uid() = reviewer_id);
CREATE POLICY "Usuarios pueden actualizar su reseña" ON public.reviews FOR UPDATE USING (auth.uid() = reviewer_id);
CREATE POLICY "Usuarios pueden eliminar su reseña" ON public.reviews FOR DELETE USING (auth.uid() = reviewer_id);

-- 3. Social media columns on profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS instagram TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS facebook TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tiktok TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS twitter TEXT;

-- 4. Activity enhancements on events
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS activity_type TEXT DEFAULT 'evento';
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS max_attendees INTEGER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'events_activity_type_check'
  ) THEN
    ALTER TABLE public.events ADD CONSTRAINT events_activity_type_check
      CHECK (activity_type IN ('evento', 'paseo', 'playdate', 'entrenamiento', 'voluntariado', 'otro'));
  END IF;
END $$;

-- 5. Appointments table
CREATE TABLE IF NOT EXISTS public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_role_id UUID NOT NULL REFERENCES public.business_roles(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pet_id UUID REFERENCES public.pets(id) ON DELETE SET NULL,
  appointment_date DATE NOT NULL,
  time_slot TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_appointments_business ON public.appointments(business_role_id);
CREATE INDEX IF NOT EXISTS idx_appointments_client ON public.appointments(client_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON public.appointments(appointment_date);
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participantes ven sus citas" ON public.appointments FOR SELECT
  USING (auth.uid() = client_id OR auth.uid() IN (SELECT user_id FROM public.business_roles WHERE id = business_role_id));
CREATE POLICY "Clientes pueden crear citas" ON public.appointments FOR INSERT WITH CHECK (auth.uid() = client_id);
CREATE POLICY "Participantes pueden actualizar citas" ON public.appointments FOR UPDATE
  USING (auth.uid() = client_id OR auth.uid() IN (SELECT user_id FROM public.business_roles WHERE id = business_role_id));
CREATE POLICY "Clientes pueden cancelar citas" ON public.appointments FOR DELETE USING (auth.uid() = client_id);

CREATE TRIGGER appointments_updated_at
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- 6. Notifications table (in-app)
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('appointment', 'review', 'event', 'message')),
  title TEXT NOT NULL,
  body TEXT,
  entity_id UUID,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id, read);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios ven sus notificaciones" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Sistema puede crear notificaciones" ON public.notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Usuarios actualizan sus notificaciones" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
