# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev             # Start Vite dev server with HMR
npm run build           # Production build to dist/
npm run lint            # ESLint (React + Hooks rules)
npm run preview         # Preview production build locally
npm run check:supabase  # Validate Supabase credentials (scripts/check-supabase.js)
npm run cap:build       # Build + sync Android (vite build && cap sync android)
npm run cap:open        # Open Android project in Android Studio
```

There is no test framework configured in this project.

## Environment Setup

Copy `.env.example` to `.env.local` and fill in your Supabase credentials:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_public_key
```

Use only the **anon/public** key — never the service_role key in frontend code.

## Architecture

**MatchPetz** is a mobile-first React 18 SPA (Vite) using Supabase for auth and database, Leaflet + OpenStreetMap for maps (no API keys needed), and Capacitor for Android APK builds.

### Code Splitting

All 41 page components are lazy-loaded via `React.lazy()` in `src/App.jsx`, wrapped in `<Suspense>`. This keeps the initial bundle small. When adding new pages, follow the same pattern:
```jsx
const NewPage = lazy(() => import('./pages/NewPage'));
```

### Auth & Routing

`src/App.jsx` defines all routes. The auth flow works as follows:

1. `AuthRedirect` (`src/components/AuthRedirect.jsx`) checks Supabase session and profile completion, then redirects to `/login`, `/complete-profile`, or `/home`.
2. `ProtectedRoute` (`src/components/ProtectedRoute.jsx`) wraps all authenticated pages and redirects unauthenticated users to `/login`. Shows a spinner during the initial auth check.
3. Alert pages (`/alerts`, `/alerts/:id`) are public — no auth required.

**Auth race condition fix:** `AuthContext` sets `user` and `loading=false` immediately on `SIGNED_IN` event, then loads the profile in the background. `Login.jsx` navigates directly after `signInWithPassword` without waiting for auth state events. This prevents ProtectedRoute from blocking indefinitely.

### Data Layer

`src/supabase.js` exports the single Supabase client used everywhere. All DB calls go through this client directly inside page components — there is no separate service/API layer.

**Query best practices:**
- Always use `.select('col1, col2, ...')` with specific columns instead of `select('*')`
- Use `.limit(N)` on list queries to avoid fetching unbounded data
- Use `.maybeSingle()` instead of `.single()` when 0 rows is a valid case (prevents PostgREST errors)

**Offline fallback:** `CreateAlert.jsx` falls back to localStorage when the user is not authenticated.

### Shared Utilities (`src/utils/`)

| Module | Exports | Purpose |
|--------|---------|---------|
| `formatters.js` | `formatDate`, `formatTime`, `timeAgo`, `formatEventDate` | Date/time formatting — replaces duplicated formatters across 8+ pages |
| `avatar.js` | `getAvatarUrl(url, userId)` | Avatar URL with pravatar fallback |
| `cart.js` | `getCart`, `saveCart`, `addToCart`, `clearCart` | localStorage cart operations for marketplace |

### Constants (`src/constants/`)

| Module | Exports | Purpose |
|--------|---------|---------|
| `roles.js` | `ROLE_CONFIG` | Business role definitions (veterinaria, entrenador, clinica, hotel, cafeteria, refugio, guarderia, grooming, paseador) with labels, icons, descriptions |
| `storage.js` | `ALERTS_STORAGE_KEY` | localStorage key for offline alert drafts |

Always import from shared utils/constants instead of re-implementing. Example:
```jsx
import { formatDate, timeAgo } from '../utils/formatters';
import { getAvatarUrl } from '../utils/avatar';
import { ROLE_CONFIG } from '../constants/roles';
```

### Reusable Components (`src/components/`)

| Component | Purpose |
|-----------|---------|
| `AppBar.jsx` | Top navigation bar with back button and title |
| `BottomNav.jsx` | Persistent bottom tab bar (mobile) / sidebar (desktop) |
| `AuthRedirect.jsx` | Root route — session check + redirect |
| `ProtectedRoute.jsx` | Auth guard wrapper with spinner |
| `MultiImageUpload.jsx` | Multiple image upload with reordering, main image badge, Supabase Storage integration |
| `ImageUpload.jsx` | Single image upload (legacy, used by CompleteProfile/EditProfile) |
| `ReviewSection.jsx` | Star rating + review list, used by EventDetail/ServiceDetail/CourseDetail |
| `NotificationBell.jsx` | Bell icon with unread count badge |
| `SocialLinks.jsx` | Social media links display |
| `AttendeePreview.jsx` | Avatar row showing event attendees |
| `EmptyState.jsx` | Centered empty state with icon and message |
| `ErrorBox.jsx` | Error message display box |

### Database Schema

Migrations live in `supabase/migrations/`. Tables:

| Table | Purpose |
|-------|---------|
| `profiles` | User metadata: display_name, avatar_url, location, stats (JSONB) |
| `alerts` | Lost pet reports with geolocation (zone_lat/zone_lng) |
| `events` | Pet meetups with optional lat/lng; attendees tracked via `event_attendees` |
| `event_attendees` | Join table linking users to events |
| `places` | Map locations (parks, vets, cafes) for MapScreen |
| `conversations` | Chat conversations (direct + group). `participant_name` is nullable (only for direct chats) |
| `messages` | Chat messages linked to conversations |
| `marketplace_products` | Products for sale: title, price, stock, images, seller_id |
| `reviews` | User reviews with rating (1-5) linked to events/places |
| `business_roles` | Business role activations per user (role_type, business_name, etc.) |
| `appointments` | Booking system linking clients to businesses with date/time/status |

All tables use Row-Level Security: public read, authenticated write, users can only modify their own rows.

**Supabase Storage:** Images are uploaded to the `matchpet-images` bucket (name kept for backward compatibility). Do NOT rename this bucket.

### Pages & Routes

Key route groups:

| Route | Page | Auth Required |
|-------|------|:---:|
| `/` | `AuthRedirect` | No |
| `/login` | `Login` | No |
| `/complete-profile` | `CompleteProfile` | Yes |
| `/home` | `Home` | Yes |
| `/discover` | `Discover` (tabs: Personas/Negocios) | Yes |
| `/social` | `Social` (feed) | Yes |
| `/profile` | `Profile` | Yes |
| `/users/:id` | `UserProfile` | Yes |
| `/alerts`, `/alerts/:id` | `Alerts`, `AlertDetail` | **No** |
| `/alerts/new` | `CreateAlert` | Yes |
| `/events/:id` | `EventDetail` | Yes |
| `/events/new` | `CreateEvent` | Yes |
| `/adoption`, `/adoption/:id` | `Adoption`, `AdoptionDetail` | Yes |
| `/adoption/new` | `AddAdoptionPet` | Yes |
| `/marketplace`, `/marketplace/:id` | `Marketplace`, `ProductDetail` | Yes |
| `/marketplace/new` | `AddProduct` | Yes |
| `/marketplace/dashboard` | `MarketplaceDashboard` | Yes |
| `/services/new`, `/services/:id` | `AddService`, `ServiceDetail` | Yes |
| `/courses/new`, `/courses/:id` | `CreateCourse`, `CourseDetail` | Yes |
| `/pets/new`, `/pets/:id` | `AddPet`, `PetProfile` | Yes |
| `/map` | `MapScreen` | Yes |
| `/inbox`, `/chat/:id` | `Inbox`, `ChatRoom` | Yes |
| `/cart` | `Cart` | Yes |
| `/notifications` | `Notifications` | Yes |
| `/activate-role` | `ActivateRole` | Yes |
| `/dashboard` | `BusinessDashboard` | Yes |
| `/appointments` | `MyAppointments` | Yes |

### Discover Page Structure

The Discover page has two tabs:
- **Personas** (Users icon): Renders `Explore.jsx` — Instagram-style feed of user posts/content
- **Negocios** (Store icon): Renders `MapScreen.jsx` — Map/directory of pet businesses

### Map Integration

Leaflet's default marker icons break with Vite's asset bundling. The fix is applied in `src/main.jsx` and must not be removed.

Maps are used in `AlertDetail.jsx`, `EventDetail.jsx`, and `MapScreen.jsx`. The map in EventDetail is **optional** — only renders if the event has `lat` and `lng` coordinates.

### Event Detail UX (`src/pages/EventDetail.jsx`)

Key behaviors:
- **Group chat:** Button always visible for attendees. Conversation is created lazily on first click (lazy creation pattern).
- **Reviews:** Gated behind event date — users can only submit reviews after the event has passed. Before that, a message is shown: "Podras dejar tu resenia despues del evento."
- **Status badges:** "Proximo evento" (green), "Hoy" (orange), "Evento pasado" (gray).
- **RSVP:** Disabled for past events and full events (`max_attendees` reached).
- **Layout:** Structured in card sections (info, description, map, actions, attendees, reviews).

### Alert Detail Contact Flow (`src/pages/AlertDetail.jsx`)

When a logged-in user clicks "Contactar" on someone else's alert:
1. Checks for an existing conversation between the two users
2. If found, navigates to `/chat/{id}`
3. If not, creates a new conversation with `user1_id`, `user2_id`, `participant_name`, then navigates to the chat
4. Shows "Esta es tu alerta" for own alerts, "Inicia sesion para contactar" for anonymous users

### Chat Room Design (`src/pages/ChatRoom.jsx`)

- **Header:** Gradient orange background with avatar, participant name, and status text
- **Messages:** Date separators ("Hoy", "Ayer", formatted date), bubble styles differentiated by sender
- **Empty state:** Centered icon with "Envia el primer mensaje"
- **Input:** Rounded field with gradient send button, safe-area-inset-bottom padding
- **Bubbles:** Own messages = orange (rounded 4px bottom-right), others = white (rounded 4px bottom-left)

### Styling

`src/index.css` defines all CSS custom properties (design tokens):
- Primary color: `#ee9d2b`, Secondary: `#ffb703`
- Font: Plus Jakarta Sans
- Border radius: 24px throughout
- Mobile-first layout (100dvh, flex-column)

**Form classes** (global CSS in `index.css`):
- `.form-card` — White card container with rounded corners
- `.form-input`, `.form-select`, `.form-textarea` — Consistent input styling with focus states (`border-color: var(--color-primary); box-shadow: 0 0 0 3px rgba(238,157,43,0.1)`)
- `.form-label`, `.form-group`, `.form-row` — Layout helpers
- `.form-section-title` — Section headers within forms
- `.form-submit-btn` — Primary action button
- `.form-error`, `.form-header`, `.form-back-btn` — Supporting elements

Component styles are co-located in the same `.jsx` files using inline styles. `BottomNav` is a persistent tab bar on mobile, sidebar on desktop.

### Multi-Image Upload Pattern

`MultiImageUpload.jsx` supports configurable `maxImages` (default 5). Features:
- Main image with "Principal" badge
- Thumbnail row with tap-to-reorder (tap a thumbnail to set it as main)
- Add button with counter (e.g., "2/5")
- Uploads to Supabase Storage in the specified `folder`
- Props: `images`, `onImagesChange`, `folder`, `maxImages`, `shape`, `mainSize`

Used by: `AddAdoptionPet`, `AddProduct`, `AddService`, `AddPet`, `CreateEvent`

Forms store `images` array and set `image_url: images[0]` for backward compatibility with single-image views.

### Common Patterns

- **Double-submit prevention:** Buttons use `loading` state to disable during async operations.
- **Optimistic UI with rollback:** State is updated immediately, then reverted if the API call fails.
- **Lazy image loading:** Use `loading="lazy"` on `<img>` tags for lists/grids.
- **Lazy conversation creation:** Chat conversations (direct and group) are created on first click, not upfront.
- **Timezone-safe date comparison:** Parse dates with `new Date(dateStr + 'T12:00:00')` to avoid off-by-one errors from UTC conversion (see `formatters.js`).

## Android / Capacitor

The app is wrapped with Capacitor for Android APK generation.

### Configuration

- **App ID:** `com.matchpetz.app`
- **App Name:** `MatchPetz`
- **Web dir:** `dist` (Vite build output)
- **Android scheme:** `https` (required for Supabase auth to work correctly)
- **Config file:** `capacitor.config.json`

### Plugins

- `@capacitor/splash-screen` — Splash screen with primary color (`#ee9d2b`)
- `@capacitor/status-bar` — Light style status bar with primary color background

### Building the APK

```bash
npm run cap:build          # Build web + sync to Android
npm run cap:open           # Open in Android Studio
```

Or manually:
```bash
npm run build              # Vite production build
npx cap sync android       # Copy dist/ to Android project + sync plugins
npx cap open android       # Open in Android Studio → Build → Build APK
```

Command-line APK build (requires Android SDK):
```bash
cd android && ./gradlew assembleDebug
```

APK output: `android/app/build/outputs/apk/debug/app-debug.apk`

### Android Icons

Custom icons generated from `public/favicon.svg` using `sharp`:
- `ic_launcher.png` — Orange rounded rect background + paw icon (5 densities: 48-192px)
- `ic_launcher_round.png` — Circular orange background + paw icon (5 densities)
- `ic_launcher_foreground.png` — Transparent background + paw for adaptive icons (5 densities: 108-432px)
- Icon background color: `#ee9d2b` (set in `android/app/src/main/res/values/ic_launcher_background.xml`)

### Android Project Notes

- The `android/` directory is generated by Capacitor and can be regenerated with `npx cap add android`
- `android/app/src/main/res/values/strings.xml` contains `app_name` = "MatchPetz"
- Always run `npx cap sync android` after `npm run build` to update the Android assets

## Landing Page

`landing.html` is a standalone growth-hacking landing page (not part of the Vite build). It includes:
- Hero section with value proposition
- Feature comparison table (MatchPetz vs alternatives)
- 8 feature cards, 3-step onboarding flow, testimonials
- Waitlist email capture form
- All references use the "MatchPetz" brand

## Supabase Project

- **Project ID:** `yilqentsmibgnzphztxc`
- **Storage bucket:** `matchpet-images` (do NOT rename — would break existing uploaded image URLs)
- **Seed data:** `supabase/seed-events.sql` can be run in the SQL Editor to create sample events and clean up orphaned conversations
