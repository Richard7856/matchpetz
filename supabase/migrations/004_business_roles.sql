-- =============================================
-- Sistema de Roles de Negocio, Calificaciones y Cursos
-- =============================================

-- 1. Tabla de roles de negocio
CREATE TABLE IF NOT EXISTS public.business_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_type TEXT NOT NULL CHECK (role_type IN (
    'veterinaria', 'entrenador', 'clinica', 'hotel',
    'cafeteria', 'refugio', 'guarderia', 'grooming', 'paseador'
  )),
  business_name TEXT NOT NULL,
  description TEXT,
  document_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, role_type)
);

CREATE INDEX IF NOT EXISTS idx_business_roles_user ON public.business_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_business_roles_type ON public.business_roles(role_type);

ALTER TABLE public.business_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cualquiera puede ver roles de negocio"
  ON public.business_roles FOR SELECT USING (true);

CREATE POLICY "Usuarios pueden crear sus propios roles"
  ON public.business_roles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuarios pueden actualizar sus propios roles"
  ON public.business_roles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Usuarios pueden eliminar sus propios roles"
  ON public.business_roles FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER business_roles_updated_at
  BEFORE UPDATE ON public.business_roles
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- 2. Tabla de calificaciones por rol
CREATE TABLE IF NOT EXISTS public.business_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_role_id UUID NOT NULL REFERENCES public.business_roles(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating SMALLINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(business_role_id, reviewer_id)
);

CREATE INDEX IF NOT EXISTS idx_business_ratings_role ON public.business_ratings(business_role_id);
CREATE INDEX IF NOT EXISTS idx_business_ratings_reviewer ON public.business_ratings(reviewer_id);

ALTER TABLE public.business_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cualquiera puede ver calificaciones"
  ON public.business_ratings FOR SELECT USING (true);

CREATE POLICY "Autenticados pueden calificar"
  ON public.business_ratings FOR INSERT
  WITH CHECK (auth.uid() = reviewer_id);

CREATE POLICY "Usuarios pueden actualizar su propia calificación"
  ON public.business_ratings FOR UPDATE
  USING (auth.uid() = reviewer_id);

CREATE POLICY "Usuarios pueden eliminar su propia calificación"
  ON public.business_ratings FOR DELETE
  USING (auth.uid() = reviewer_id);

-- 3. Tabla de cursos
CREATE TABLE IF NOT EXISTS public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_role_id UUID REFERENCES public.business_roles(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  price NUMERIC(10, 2),
  duration TEXT,
  modality TEXT CHECK (modality IN ('presencial', 'online', 'hibrido')),
  location TEXT,
  start_date DATE,
  max_participants INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_courses_creator ON public.courses(creator_id);
CREATE INDEX IF NOT EXISTS idx_courses_role ON public.courses(business_role_id);
CREATE INDEX IF NOT EXISTS idx_courses_created_at ON public.courses(created_at DESC);

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cualquiera puede ver cursos"
  ON public.courses FOR SELECT USING (true);

CREATE POLICY "Autenticados pueden crear cursos"
  ON public.courses FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Creadores pueden actualizar sus cursos"
  ON public.courses FOR UPDATE
  USING (auth.uid() = creator_id);

CREATE POLICY "Creadores pueden eliminar sus cursos"
  ON public.courses FOR DELETE
  USING (auth.uid() = creator_id);

-- 4. Expandir CHECK constraint de places.type
ALTER TABLE public.places DROP CONSTRAINT IF EXISTS places_type_check;
ALTER TABLE public.places ADD CONSTRAINT places_type_check
  CHECK (type IN (
    'parque', 'cafe', 'vet', 'refugio',
    'veterinaria', 'entrenador', 'clinica', 'hotel',
    'cafeteria', 'guarderia', 'grooming', 'paseador'
  ));
