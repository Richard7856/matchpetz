# Configuración de Supabase para MatchPet

La app usa **Supabase** para autenticación, perfiles y alertas de mascotas perdidas.

## 1. Crear proyecto en Supabase

1. Entra en [supabase.com](https://supabase.com) y crea un proyecto.
2. En **Settings → API** copia:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public** (clave pública) → `VITE_SUPABASE_ANON_KEY`

## 2. Variables de entorno

Crea o edita `.env.local` en la raíz del proyecto:

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu_anon_public_key_aqui
```

**Importante:** En el frontend (Vite) usa siempre la clave **anon public**, nunca la **service_role**. La service_role omite la seguridad (RLS) y no debe exponerse en el navegador. En Dashboard → Settings → API verás ambas; copia solo **anon public**.

Para verificar que la URL y la clave anon son correctas: `node scripts/check-supabase.js`

## 3. Ejecutar la migración SQL (crear tablas)

En el **Dashboard de Supabase → SQL Editor**, crea una nueva query y pega el contenido de:

**`supabase/migrations/001_initial_schema.sql`**

Luego ejecuta el script. Se crearán las tablas `profiles` y `alerts` con sus políticas RLS.

## 4. Iniciar sesión con Google (OAuth)

Si el botón "Continuar con Google" te devuelve a la misma pantalla, suele ser por la **URL de redirección**. Sigue estos pasos:

### 4.1 Crear credenciales en Google Cloud Console

1. Entra en [Google Cloud Console](https://console.cloud.google.com/).
2. Crea un proyecto o elige uno existente.
3. Ve a **APIs y servicios → Credenciales**.
4. **Crear credenciales → ID de cliente de OAuth**.
5. Tipo de aplicación: **Aplicación web**.
6. Nombre: por ejemplo "MatchPet".
7. En **Orígenes JavaScript autorizados** añade:
   - `http://localhost:5173`
   - Tu dominio de producción cuando lo tengas.
8. En **URI de redirección autorizados** añade **exactamente** esta URL de Supabase (sustituye `TU_PROYECTO` por el ref de tu proyecto):
   - `https://TU_PROYECTO.supabase.co/auth/v1/callback`
   - Ejemplo: `https://yilqentsmibgnzphztxc.supabase.co/auth/v1/callback`
9. Crea y copia el **Client ID** y el **Client secret**.

### 4.2 Configurar Google en Supabase

1. En Supabase: **Authentication → Providers → Google**.
2. Activa el proveedor.
3. Pega el **Client ID** y el **Client secret** de Google.
4. Guarda.

### 4.3 Redirect URLs en Supabase (importante)

1. En Supabase: **Authentication → URL Configuration**.
2. En **Redirect URLs** añade la URL de tu app (donde debe volver el usuario tras login):
   - `http://localhost:5173/` (desarrollo; la barra final es opcional pero debe coincidir)
   - En producción: `https://tudominio.com/`
3. Guarda.

Con esto, al hacer clic en "Continuar con Google" te llevará a Google, y al volver la sesión se restaurará y te redirigirá a inicio o a completar perfil.

## 5. Inicio de sesión con correo (opcional)

1. En Supabase: **Authentication → Providers → Email**.
2. Activa **Enable Email provider**.
3. (Opcional) Configura **Confirm email** si quieres que los usuarios confirmen el correo al registrarse.

La app ya incluye formulario para **Registrarse** e **Iniciar sesión** con correo y contraseña.

## 6. Probar la app

- `npm run dev`
- Abre `http://localhost:5173`
- Inicia sesión con **Google** o con **correo y contraseña** (registro o login).
- Completa tu perfil la primera vez.
- Las alertas se guardan en Supabase; si no hay proyecto configurado, se usa `localStorage` como respaldo.
