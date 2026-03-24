# Mejoras sugeridas para MatchPet

## 1. Mapas (OpenStreetMap) — implementado

Se integró **Leaflet + OpenStreetMap** (sin API key):

| Lugar | Implementación |
|-------|----------------|
| **MapScreen** (`/map`) | Mapa real OSM, centrado en CDMX; geolocalización opcional; marcadores de ejemplo (parques, cafés, vet) con popups. |
| **CreateAlert** | Mapa clickeable: al tocar se guarda `zone_lat` / `zone_lng` y se muestra un marcador. |
| **AlertDetail** | Si la alerta tiene `zone_lat` y `zone_lng`, se muestra un mapa OSM con un marcador en esa posición. |

**Posibles mejoras futuras:** búsqueda de lugares (Nominatim), enlace "Abrir en OpenStreetMap" o "Cómo llegar", filtros en MapScreen por tipo de lugar.

---

## 2. Otras mejoras útiles

- **Notificaciones push**: avisar cuando haya una alerta nueva cerca o cuando alguien comente; requiere Service Worker y (por ejemplo) Firebase Cloud Messaging o OneSignal, o soporte de Supabase si lo añaden.
- **Subida real de fotos**: en CreateAlert y perfil usas URLs. Añadir upload a Supabase Storage (o a un bucket S3) y guardar la URL pública en la BD.
- **PWA**: `workbox`/Vite PWA para instalar la app en el móvil y algo de uso offline (lista de alertas/eventos en caché).
- **Filtros y búsqueda**: en Alerts filtrar por tipo de mascota, radio, recompensa; en Eventos por fecha o ubicación.
- **Detalle de evento con mapa**: campo opcional `event_lat` / `event_lng` en `events` y en EventDetail mostrar mini mapa o enlace "Abrir en Maps".
- **Geolocalización al crear alerta**: botón "Usar mi ubicación actual" que rellene `zone_lat` / `zone_lng` (y opcionalmente la dirección vía geocodificación inversa).
- **Refresh y estados**: en listados (Alertas, Home eventos) pull-to-refresh o botón de actualizar; estados vacíos ("No hay alertas") y manejo de errores con reintento.
- **Accesibilidad**: labels en formularios, contraste, navegación por teclado en modales y listas.

Si quieres, el siguiente paso puede ser implementar solo la API de mapas: por ejemplo MapScreen con mapa real y, después, CreateAlert y AlertDetail usando el mismo proveedor (Google o Mapbox).
