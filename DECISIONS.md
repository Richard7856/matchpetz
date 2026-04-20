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

**Regla:** Antes de cada AAB, verificar el último versionCode en `android/app/build.gradle` e incrementar. Nunca reusar un números aunque el upload haya fallado.

---

## [2026-04-20] BottomNav: reemplazar Chats por Comunidad — chat se mueve al AppBar de Home

**Contexto:** El tab de Chats en BottomNav ocupaba un slot valioso. La página de Comunidad (eventos, feed social) necesitaba visibilidad en la nav. Tener 5 tabs sin el FAB central dejaba poco espacio en móvil.

**Decisión:** Nav order: Inicio | Adopción | ❤️ Match (FAB center) | Comunidad | Perfil. El ícono de chat con badge de no-leídos se movió al AppBar de Home (junto al NotificationBell). Esto libera un slot para Comunidad sin perder acceso a chats.

**Alternativas consideradas:**
- Mantener Chats en nav y quitar Comunidad — Comunidad es una apuesta de retención (eventos, comunidad), más estratégica que Chats
- 6 tabs sin FAB — demasiado apretado en móvil, pierde el tratamiento especial de Match
- Poner Comunidad en un tab secundario dentro de Home — esconde una sección principal

**Riesgos/Limitaciones:**
- Usuarios habituados al tab de chats tendrán que buscarlo en Home. Mitigado por el badge naranja visible en AppBar.
- En desktop sidebar los 5 ítems se muestran todos con buen espacio, sin problema.

**Mejoras futuras:** Considerar mover chat al AppBar general (no solo Home) si el feedback indica que cuesta encontrarlo.

---

## [2026-04-20] Phosphor Icons como biblioteca de iconos principal

**Contexto:** Los iconos de Lucide (outline únicamente) se percibían como demasiado simples para la estética de la app. Se necesitaba más expresividad visual, especialmente para el BottomNav activo/inactivo, los hero cards de Home y los KPIs.

**Decisión:** Adoptar `@phosphor-icons/react` para todos los iconos visuales/decorativos. Lucide se mantiene solo para iconos utilitarios (ChevronRight, X, Plus, RotateCcw, EyeOff) donde ya estaba en uso o donde Phosphor no tiene equivalente claro. Regla de uso:
- `weight="fill"` → estado activo, FAB, botones de acción
- `weight="duotone"` → iconos sobre fondos blancos/cards (KPIs, hero cards)
- `weight="regular"` → estado inactivo en nav

**Alternativas consideradas:**
- `react-icons` — demasiada heterogeneidad de estilos entre familias, difícil mantener consistencia
- Emojis — no escalables, varían entre plataformas (Android/iOS renderiza diferente)
- Mantener Lucide — solo tiene `fill` como prop binario, sin duotone ni pesos intermedios

**Riesgos/Limitaciones:**
- Dos bibliotecas de iconos en el bundle. Aceptable — ambas son tree-shakeable, solo se importa lo que se usa.
- Phosphor tiene iconos de mascotas (PawPrint, Dog, Cat) pero no todos los específicos que podría necesitar la app.

**Mejoras futuras:** Migrar iconos utilitarios restantes de Lucide a Phosphor cuando se toquen esos componentes, para eventual eliminación de Lucide.

---

## [2026-04-20] Adopción: persistir rechazos/likes en localStorage por usuario

**Contexto:** Los usuarios siempre veían los mismos animales aunque ya los hubieran rechazado. Al volver de la pantalla de chat (después de dar like), el componente se remontaba y mostraba el mismo animal al índice 0.

**Decisión:** Estado de swipes (rejected + liked) persistido en `localStorage` con clave `mp_adopt_seen_${userId}`. En cada mount, `applySeenFilter` filtra el feed excluyendo rechazados y ya likeados. El "bug del remount" se corrige marcando como `liked` en localStorage ANTES de llamar `navigate()`, así cuando el componente se remonta el animal ya está excluido.

**Helpers en módulo (fuera del componente para evitar recreación):**
```javascript
const seenKey  = (uid) => `mp_adopt_seen_${uid}`;
const getSeen  = (uid) => JSON.parse(localStorage.getItem(seenKey(uid)) || '{}');
const markSeen = (uid, type, id) => { ... };
const unmarkRejected = (uid, id) => { ... };   // "dar otra oportunidad"
const clearSeen = (uid) => localStorage.removeItem(seenKey(uid));  // "reiniciar todo"
```

**Feature adicional:** Botón "Ver rechazados" (EyeOff con badge de conteo) abre un drawer inferior donde el usuario puede dar "Dar otra oportunidad" a animales rechazados. "Reiniciar todo" en empty state limpia el storage y recarga el feed completo.

**Alternativas consideradas:**
- Tabla `adoption_swipes` en Supabase — requería migración + RLS + query extra. Overkill para v1, y la persistencia entre dispositivos no era un requerimiento.
- Estado en React (`useRef`) — se pierde al desmontar el componente (exactamente el bug original).

**Riesgos/Limitaciones:**
- Device-specific: si el usuario cambia de dispositivo, los rechazos no se sincronizan. Aceptable para v1.
- localStorage tiene límite (~5MB). Con miles de IDs podría ser un problema en usuarios muy activos. Mitigación futura: limpiar automáticamente los más viejos.

---

## [2026-04-20] UserProfile: rediseño Instagram-style, siempre mostrar todos los tabs

**Contexto:** El perfil de usuario era extremadamente básico. No mostraba posts, mascotas, productos ni eventos del usuario. Los tabs eran condicionales (ocultos si no había contenido), lo que confundía al usuario sobre si el perfil tenía esas secciones.

**Decisión:** Rediseño completo:
- Header: card blanca con avatar 68px (anillo degradado) + nombre alineados a la izquierda, stats row en borde inferior. Sin banner de degradado (se veía fuera del estilo limpio de la app).
- Botones: Seguir = naranja fill (contraste claro), Mensaje = `#1f2937` dark fill con texto blanco (el texto naranja sobre blanco era ilegible en la versión anterior).
- Tabs SIEMPRE visibles (Posts | Mascotas | Adopción | Eventos | Tienda) — si no hay contenido, se muestra un mensaje "Sin X registrados" en vez de ocultar el tab.
- Datos cargados en paralelo con `Promise.all` (9 queries: posts, events, products, pets, adoption_pets, follow status, follower count, following count, profile).
- Post grid: 3 columnas con `aspectRatio: 1`, gap 2px (estilo Instagram).
- ReviewSection completamente eliminado — mejor comentar fotos/posts que reseñas genéricas.

**Por qué tabs siempre visibles:** Ocultar tabs cuando no hay contenido crea incertidumbre — el usuario no sabe si la sección existe o está vacía. "Sin mascotas registradas" comunica claramente que la sección existe pero está vacía, y potencialmente invita al usuario a agregar contenido propio.

**Alternativas consideradas:**
- Banner de degradado (naranja→rosa→morado) — el usuario lo rechazó explícitamente ("no le veo el caso")
- Mantener ReviewSection — desconectado del flujo social. Se priorizó ver posts/mascotas/etc.
- Tabs condicionales — confunde al usuario, según feedback directo

**Riesgos/Limitaciones:**
- 9 queries en paralelo en cada visita al perfil. Con Supabase connection pooling es aceptable, pero si se convierte en problema se puede añadir caching o reducir queries con joins.
- `adoption_pets` tabla asumida con columnas `user_id`, `status`, `name`, `breed`, `image_url`. Verificar que el schema coincide.
