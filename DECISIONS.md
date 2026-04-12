# DECISIONS.md — MatchPetz Architectural Decisions

Registro de decisiones técnicas no triviales. Cada entrada explica el contexto, la decisión, las alternativas descartadas y los riesgos.

---

## [2026-04-11] Threshold de iPad: bottom nav a 1024px

**Contexto:** Apple rechazó la app porque en iPad (768-1023px) se renderizaba el sidebar de desktop con estilos rotos — todos los ítems con fondo naranja, contenido comprimido.

**Decisión:** `useIsMobile.js` usa `window.innerWidth < 1024` como threshold. iPads (768-1023px) reciben bottom nav igual que móvil. Solo pantallas ≥1024px obtienen el sidebar.

**Alternativas consideradas:**
- Detectar iPad por `navigator.userAgent` — frágil, Apple puede cambiar el UA string
- Usar `768px` (Tailwind default) — fue el bug original; el iPad Pro reporta exactamente 768px

**Riesgos:** Un tablet de 1024px exacto recibe sidebar. Aceptable — es el límite tradicional desktop.

**`src/index.css`:** Breakpoint dividido en dos:
- Tablet (768-1023px): `max-width: 600px`, centrado, bottom nav
- Desktop (1024px+): full-width, sidebar

---

## [2026-04-11] Password Recovery: manejar evento PASSWORD_RECOVERY en AuthRedirect

**Contexto:** El flujo de reset de contraseña estaba completamente roto. El link del email aterrizaba en `/` con token en el hash, `AuthRedirect` mandaba a `/login`, y el token se perdía. No existía `ResetPassword.jsx`.

**Decisión:** `AuthRedirect.jsx` escucha el evento `PASSWORD_RECOVERY` de `onAuthStateChange` y redirige a `/reset-password`. Supabase con `detectSessionInUrl: true` procesa el hash automáticamente y dispara este evento. `ResetPassword.jsx` llama `supabase.auth.updateUser({ password })` — funciona porque Supabase ya estableció la sesión de recovery.

**Alternativas consideradas:**
- Parsear el hash manualmente (`URLSearchParams`, `#type=recovery`) — más frágil, duplica lógica que Supabase ya hace
- Poner el handler en `Login.jsx` — Login no se carga si AuthRedirect redirige primero

**Riesgos:**
- El token de recovery expira en ~1 hora — si el usuario tarda, verá error y tendrá que pedir otro link
- En Capacitor nativo, el link del email abre en el browser del sistema (Safari/Chrome), no en la app. El reset funciona en web, no en-app nativo. Aceptable para v1.

**`redirectTo`:** Se mantiene como `window.location.origin + '/'` para compatibilidad con web y Capacitor.

---

## [2026-04-11] Delete Account: SECURITY DEFINER function en vez de Edge Function

**Contexto:** Apple exige que el borrado de cuenta sea completo — incluyendo el registro en `auth.users`. Esto requiere privilegios elevados (service_role) que no se pueden exponer en el frontend.

**Decisión:** Función PostgreSQL `public.delete_own_account()` con `SECURITY DEFINER` y `SET search_path = public`. Borra todos los datos del usuario Y el registro de `auth.users` en una sola llamada RPC desde el frontend. `auth.uid()` garantiza que solo puedes borrarte a ti mismo.

**Alternativas consideradas:**
- **Edge Function de Supabase** — requiere Supabase CLI instalado, deploy adicional, URL pública. Más complejidad operativa.
- **Borrado tabla por tabla desde frontend** — era la implementación anterior. Problema: no borraba `auth.users`, el usuario podía volver a iniciar sesión.
- **Email a soporte** — Apple lo rechaza explícitamente en sus guidelines (solo permitido para industrias altamente reguladas).

**Riesgos:**
- Si algún DELETE falla a mitad del proceso, el usuario queda parcialmente borrado. Mitigación futura: envolver en una transacción.
- La función usa `SECURITY DEFINER` — un bug en la lógica podría borrar datos de otro usuario. Mitigado por el guard `IF uid IS NULL THEN RAISE EXCEPTION`.

**Pendiente:** Ejecutar manualmente `supabase/migrations/018_delete_own_account.sql` en el SQL Editor de Supabase Dashboard antes de cada resubmisión a Apple.

---

## [2026-04-11] Sistema de anuncios: sponsored_posts + is_sponsored en business_roles

**Contexto:** Primera campaña de marketing. Negocios (vets, groomers, hoteles) pagan para destacarse. Se quiere que sea no intrusivo y manejable sin código por Richard.

**Decisión:** Dos placements:
1. **Explore feed** — `sponsored_posts` table: card "Patrocinado" cada 8 posts orgánicos
2. **Directorio de negocios (MapScreen)** — columna `is_sponsored` en `business_roles`: negocios patrocinados aparecen primero con badge "Destacado"

**Operación sin código:** Richard activa anuncios directamente desde Supabase Dashboard (insert row / toggle boolean). Sin deploys.

**Alternativas consideradas:**
- Google AdMob — banners externos, requiere SDK nativo, revenue compartido con Google, experiencia más intrusiva
- Banners en Home — demasiado intrusivo, afecta la pantalla principal
- Pins especiales en el mapa — complejidad visual alta, valor bajo

**Riesgos:**
- Sin sistema de pagos integrado — Richard maneja cobros manualmente y activa los anuncios a mano
- La tabla `sponsored_posts` y las columnas `is_sponsored`/`sponsored_until` en `business_roles` aún no están implementadas en código (planeadas, pendiente de desarrollo)

**Migración pendiente:** `supabase/migrations/017_sponsored_ads.sql` (NO creada aún — solo planificada)

---

## [2026-04-11] PetMatch: altura fija con calc() en vez de flex: 1

**Contexto:** Al rediseñar el card de PetMatch a full-bleed (imagen de fondo), el card colapsaba a altura 0. Los hijos con `position: absolute` no le dan altura intrínseca al padre flex.

**Decisión:** `cardStack` usa `height: 'calc(100svh - 260px)'` con `minHeight: 380px` y `maxHeight: 620px`. Desacopla la altura del card del flujo flex del contenedor.

**Alternativas consideradas:**
- `flex: 1; minHeight: 0` — el problema original. No funciona cuando los hijos son position:absolute.
- Altura fija en px — no responsive entre tamaños de pantalla.

**Riesgos:** Si se agregan más elementos al header (>260px de espacio ocupado arriba), el card se cortará. Ajustar el offset en ese caso.

---

## [2026-03-XX] iOS: xcodeproj regenerado con npx cap add ios

**Contexto:** El directorio `ios/App/App.xcodeproj` fue eliminado o ignorado por git. Xcode no podía abrir el proyecto.

**Decisión:** Eliminar toda la carpeta `ios/` y regenerar con `npx cap add ios`. Después restaurar manualmente `Info.plist` (permisos, `ITSAppUsesNonExemptEncryption`) y el ícono de la app.

**Riesgo clave:** El directorio `ios/` no está en `.gitignore` pero sí tiene partes generadas. Si se regenera, se pierden configuraciones manuales. Siempre verificar `Info.plist` después de regenerar.

---

## [2026-03-XX] Versión Android: saltar a versionCode 10

**Contexto:** Google Play rechazó versionCode 3 y 4 por haber sido ya usados en uploads previos.

**Decisión:** Saltar a `versionCode 10` para tener margen. Google Play requiere que cada upload tenga un versionCode estrictamente mayor al anterior.

**Regla:** Antes de cada AAB, verificar el último versionCode en `android/app/build.gradle` e incrementar. Nunca reusar un número aunque el upload haya fallado.
