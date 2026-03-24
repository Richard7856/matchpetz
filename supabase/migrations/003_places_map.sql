-- Lugares pet friendly para el mapa (Parques, Cafés, Vets, Refugios)
CREATE TABLE IF NOT EXISTS public.places (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('parque', 'cafe', 'vet', 'refugio')),
  name TEXT NOT NULL,
  address TEXT,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_places_type ON public.places(type);
CREATE INDEX IF NOT EXISTS idx_places_lat_lng ON public.places(lat, lng);

ALTER TABLE public.places ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cualquiera puede ver lugares" ON public.places FOR SELECT USING (true);
CREATE POLICY "Autenticados pueden crear lugares" ON public.places FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Seed: lugares de ejemplo por tipo (solo si la tabla está vacía)
INSERT INTO public.places (type, name, address, lat, lng)
SELECT p.type, p.name, p.address, p.lat, p.lng
FROM (
  SELECT 'parque'::text AS type, 'Parque Bicentenario'::text AS name, 'Av. 5 de Mayo, Del Valle'::text AS address, 19.39::float8 AS lat, -99.17::float8 AS lng
  UNION ALL SELECT 'parque', 'Parque México', 'Av. México, Condesa', 19.41, -99.17
  UNION ALL SELECT 'cafe', 'Pet friendly Cafe', 'Roma Norte', 19.415, -99.16
  UNION ALL SELECT 'cafe', 'Café con Patas', 'Condesa', 19.408, -99.17
  UNION ALL SELECT 'vet', 'Veterinaria Salud Animal', 'Del Valle', 19.428, -99.14
  UNION ALL SELECT 'vet', 'Clínica Veterinaria Roma', 'Roma Sur', 19.405, -99.15
  UNION ALL SELECT 'refugio', 'Refugio Patitas', 'Coyoacán', 19.35, -99.17
  UNION ALL SELECT 'refugio', 'Adopta un Amigo', 'Benito Juárez', 19.39, -99.16
) p
WHERE (SELECT count(*) FROM public.places) = 0;
