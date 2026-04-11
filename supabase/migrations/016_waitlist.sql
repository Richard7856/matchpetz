-- Tabla para capturar leads del landing page / campañas de marketing
-- Permite inserts públicos (sin auth) para que el formulario del landing funcione
-- Solo service_role puede leer los registros (desde el Supabase Dashboard)

CREATE TABLE waitlist (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  created_at timestamptz DEFAULT now()
);

-- Índice único en email para evitar duplicados silenciosos
CREATE UNIQUE INDEX waitlist_email_unique ON waitlist (lower(email));

ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

-- Cualquier visitante puede registrarse (anon key es suficiente)
CREATE POLICY "Public can insert waitlist" ON waitlist
  FOR INSERT WITH CHECK (true);
