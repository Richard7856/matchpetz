# MatchPetz

> La red social para mascotas y sus dueños — conecta, adopta, y encuentra la pareja perfecta para tu peludo.

---

## El problema que resuelve

Encontrar compañeros de juego, parejas reproductoras o un hogar adoptivo para una mascota sigue siendo un proceso desorganizado: grupos de WhatsApp sin estructura, publicaciones perdidas en Facebook, y sin forma de filtrar por especie, género o personalidad.

MatchPetz centraliza todo en una sola app:

- **Dueños que buscan socializar a sus mascotas** no tienen dónde hacerlo de forma segura y organizada.
- **Rescatistas y refugios** no tienen una plataforma dedicada para publicar adopciones con perfil detallado.
- **La comunidad de dueños** está fragmentada entre redes genéricas que no entienden sus necesidades.

---

## Qué es MatchPetz

Una app móvil (iOS + Android) para la comunidad de dueños de mascotas. Combina una red social, un sistema de matching tipo Tinder para mascotas, y un directorio de servicios y adopciones, todo en un solo lugar.

### Funcionalidades principales

| Módulo | Descripción |
|--------|-------------|
| **Pet Match** | Desliza tarjetas para conectar tu mascota con otras. Modo Amigos o Pareja. Filtro por especie, género y lo que busca. Match mutuo abre chat directo con el dueño. |
| **Adopción** | Publica o encuentra mascotas en adopción. Fotos múltiples, filtros por tipo y género, chat directo con el rescatista. |
| **Feed / Comunidad** | Publica fotos y videos de tus mascotas. Reacciones, comentarios, historias y seguimiento entre usuarios. |
| **Mapa de negocios** | Encuentra veterinarias, peluquerías, parques y tiendas cerca de ti en un mapa interactivo. |
| **Marketplace** | Compra y vende productos para mascotas dentro de la comunidad. |
| **Perfil de mascota** | Crea perfiles con fotos múltiples, raza, edad, personalidad, género y lo que busca. Editable en cualquier momento. |
| **Chat** | Mensajería directa entre usuarios, activada por matches o interés en adopciones. |

---

## Stack técnico

### Frontend / App
- **React 18** + **Vite** — SPA con lazy loading por ruta
- **Capacitor 8** — wrapper nativo para iOS y Android
- **React Router v6** — navegación
- **Lucide React** — iconografía
- **PWA** — service worker con Workbox para soporte offline

### Backend / Infraestructura
- **Supabase** — base de datos PostgreSQL, autenticación, storage y Row Level Security
- **Supabase Realtime** — chat en tiempo real via WebSockets
- **Supabase Storage** — imágenes y videos de mascotas, posts y marketplace

### Autenticación
- Email + contraseña
- **Google Sign-In** via `@codetrix-studio/capacitor-google-auth`
- **Sign In with Apple** via `@capacitor-community/apple-sign-in`

### Notificaciones
- **Firebase Cloud Messaging (FCM)** — push notifications en Android
- **APNs** — push notifications en iOS via Capacitor Push Notifications

### Build y distribución
- **iOS**: Xcode Archive → App Store Connect → App Store
- **Android**: Gradle `bundleRelease` → Google Play Console → AAB firmado

---

## Estructura del proyecto

```
matchpet/
├── src/
│   ├── pages/          # Pantallas principales (Home, PetMatch, Adoption, etc.)
│   ├── components/     # Componentes reutilizables (BottomNav, AppBar, etc.)
│   ├── contexts/       # AuthContext — sesión global del usuario
│   ├── utils/          # Helpers (compressImage, pushNotify, mediaUtils)
│   └── constants/      # Tipos de mascotas, opciones de filtro
├── supabase/
│   └── migrations/     # 15 migraciones SQL incrementales
├── ios/                # Proyecto Xcode (Capacitor)
├── android/            # Proyecto Gradle (Capacitor)
└── public/             # Assets estáticos, PWA manifest, páginas legales
```

---

## Base de datos — tablas principales

| Tabla | Descripción |
|-------|-------------|
| `profiles` | Perfil extendido del usuario (display_name, avatar, location) |
| `pets` | Mascotas registradas con tags, género, looking_for, imágenes |
| `pet_swipes` | Registro de likes/passes en Pet Match |
| `pet_matches` | Matches mutuos entre mascotas |
| `posts` | Publicaciones del feed con soporte multimedia |
| `conversations` + `messages` | Chat directo entre usuarios |
| `adoption_pets` | Mascotas en adopción con imágenes múltiples |
| `marketplace_products` | Productos en venta |
| `places` | Negocios y servicios en el mapa |
| `notifications` | Sistema de notificaciones in-app |

---

## Variables de entorno

```env
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
VITE_GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
```

---

## Desarrollo local

```bash
# Instalar dependencias
npm install

# Levantar servidor de desarrollo
npm run dev

# Build de producción
npm run build

# Sincronizar con iOS/Android
npx cap sync

# Abrir en Xcode
npx cap open ios

# Abrir en Android Studio
npx cap open android
```

---

## Distribución

### Android
```bash
cd android
./gradlew bundleRelease
# Output: android/app/build/outputs/bundle/release/app-release.aab
```

### iOS
```
Xcode → Product → Archive → Distribute App → App Store Connect
```

---

## Páginas legales

Incluidas en `/public` para cumplimiento de tiendas:

- `/public/privacidad.html` — Política de privacidad
- `/public/terminos.html` — Términos de uso
- `/public/eliminar-cuenta.html` — Solicitud de eliminación de cuenta (requerido por Apple)

---

## Roadmap

- [ ] Pagos con Stripe — suscripciones premium y boost de perfil
- [ ] Anuncios nativos dentro del feed
- [ ] Google Maps integration para negocios
- [ ] Videollamadas entre dueños (matches de pareja)
- [ ] Panel de administración para refugios y rescatistas verificados

---

## Disponibilidad

| Plataforma | Estado |
|------------|--------|
| 🤖 **Google Play Store** | ✅ Disponible — [Descargar para Android](https://play.google.com/store/apps/details?id=com.matchpetz.app) |
| 🍎 **App Store (iOS)** | 🔄 En revisión por Apple |

---

*Desarrollado con ❤️ para la comunidad de dueños de mascotas.*
