-- MatchPet: tablas iniciales para migración desde Firebase
-- Ejecuta este SQL en el SQL Editor de tu proyecto Supabase (Dashboard > SQL Editor)

-- Perfiles de usuario (complementa auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  location TEXT,
  avatar_url TEXT,
  email TEXT,
  stats JSONB DEFAULT '{"pets": 0, "friends": 0, "impacts": 0}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Alertas de mascotas perdidas
CREATE TABLE IF NOT EXISTS public.alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_name TEXT NOT NULL DEFAULT 'Usuario',
  pet_name TEXT NOT NULL,
  pet_type TEXT NOT NULL DEFAULT 'Perro',
  description TEXT NOT NULL,
  reward NUMERIC(10, 2),
  zone_address TEXT,
  zone_lat DOUBLE PRECISION,
  zone_lng DOUBLE PRECISION,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON public.alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_user_id ON public.alerts(user_id);

-- RLS (Row Level Security)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

-- Políticas: perfiles
CREATE POLICY "Usuarios pueden ver cualquier perfil"
  ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Usuarios pueden insertar su propio perfil"
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Usuarios pueden actualizar su propio perfil"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Políticas: alertas (públicas para leer, solo autenticados pueden crear)
CREATE POLICY "Cualquiera puede ver alertas"
  ON public.alerts FOR SELECT USING (true);

CREATE POLICY "Usuarios pueden crear alertas con su propio user_id"
  ON public.alerts FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuarios pueden actualizar sus propias alertas"
  ON public.alerts FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Usuarios pueden eliminar sus propias alertas"
  ON public.alerts FOR DELETE USING (auth.uid() = user_id);

-- Trigger para actualizar updated_at en profiles
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
