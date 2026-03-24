/**
 * Verificación rápida de conexión a Supabase.
 * Ejecutar: node scripts/check-supabase.js
 * Lee .env.local si existe (desde la raíz del proyecto).
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
for (const envPath of [resolve(root, '.env.local'), resolve(process.cwd(), '.env.local')]) {
  if (existsSync(envPath)) {
    const content = readFileSync(envPath, 'utf8').replace(/\r/g, '');
    content.split('\n').forEach((line) => {
      const i = line.indexOf('=');
      if (i > 0 && line.startsWith('VITE_SUPABASE_')) {
        const k = line.slice(0, i).trim();
        const v = line.slice(i + 1).trim();
        if (k === 'VITE_SUPABASE_URL' || k === 'VITE_SUPABASE_ANON_KEY') process.env[k] = v;
      }
    });
    break;
  }
}

const url = process.env.VITE_SUPABASE_URL || '';
const key = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!url || !key) {
  console.error('❌ Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY (usa .env.local o export)');
  process.exit(1);
}

// Detectar si es anon key (seguridad en frontend)
try {
  const payload = JSON.parse(Buffer.from(key.split('.')[1], 'base64').toString());
  if (payload.role === 'service_role') {
    console.warn('⚠️  Estás usando la clave SERVICE_ROLE. En el frontend (Vite) debes usar la clave ANON (anon public).');
    console.warn('   Dashboard Supabase → Settings → API → anon public');
  }
} catch (_) {}

const supabase = createClient(url, key);

async function check() {
  try {
    const { data, error } = await supabase.from('alerts').select('id').limit(1);
    console.log('✅ Conexión OK. Tabla "alerts":', error ? 'no existe o sin acceso' : 'existe');
    if (error) {
      const { error: e2 } = await supabase.from('profiles').select('id').limit(1);
      console.log('   Tabla "profiles":', e2 ? 'no existe o sin acceso' : 'existe');
      if (e2) console.log('\n📌 Ejecuta el SQL en supabase/migrations/001_initial_schema.sql en el SQL Editor del Dashboard.');
    }
  } catch (err) {
    console.error('❌ Error de conexión:', err.message);
    process.exit(1);
  }
}

check();
