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

**MatchPetz** is a mobile-first React 18 SPA (Vite) using Supabase for auth and database, Leaflet + OpenStreetMap for maps (no API keys needed), and Capacitor for Android and iOS builds.

### Code Splitting

All page components are lazy-loaded via `React.lazy()` in `src/App.jsx`, wrapped in `<Suspense>`. This keeps the initial bundle small. When adding new pages, follow the same pattern:
```jsx
const NewPage = lazy(() => import('./pages/NewPage'));
```

### Auth & Routing

`src/App.jsx` defines all routes. The auth flow works as follows:

1. `AuthRedirect` (`src/components/AuthRedirect.jsx`) checks Supabase session and profile completion, then redirects to `/login`, `/complete-profile`, `/home`, or `/reset-password`.
2. `ProtectedRoute` (`src/components/ProtectedRoute.jsx`) wraps all authenticated pages and redirects unauthenticated users to `/login`. Shows a spinner during the initial auth check.
3. Alert pages (`/alerts`, `/alerts/:id`) are public — no auth required.
4. `/reset-password` is public — Supabase recovery token establishes the session automatically.

**Auth race condition fix:** `AuthContext` sets `user` and `loading=false` immediately on `SIGNED_IN` event, then loads the profile in the background. `Login.jsx` navigates directly after `signInWithPassword` without waiting for auth state events. This prevents ProtectedRoute from blocking indefinitely.

**Password recovery flow:** `AuthRedirect` listens for the `PASSWORD_RECOVERY` event from `onAuthStateChange`. When the user clicks the reset link in their email, Supabase fires this event (not `SIGNED_IN`) and AuthRedirect routes to `/reset-password`. See `DECISIONS.md` for details.

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
| `BottomNav.jsx` | Persistent bottom tab bar (mobile/tablet) / sidebar (desktop ≥1024px) |
| `AuthRedirect.jsx` | Root route — session check + redirect (handles PASSWORD_RECOVERY event) |
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

Migrations live in `supabase/migrations/` (currently up to `018`). Tables:

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
| `business_roles` | Business role activations per user (role_type, business_name, is_sponsored, sponsored_until) |
| `appointments` | Booking system linking clients to businesses with date/time/status |
| `pets` | Pet profiles: name, breed, species, gender, photos, tags, owner_id |
| `pet_swipes` | PetMatch swipe history (swiper_pet_id → target_pet_id, direction) |
| `pet_matches` | Confirmed matches between two pets |
| `posts` | Social feed posts (user_id, image_url, caption, visibility) |
| `stories` | Short-lived stories |
| `notifications` | In-app notifications (user_id, type, from_user_id) |
| `user_follows` | Follow relationships between users |
| `saved_posts` | User's bookmarked posts |
| `user_preferences` | Per-user settings (dark_mode, language) |
| `reports` | Content reports |
| `user_blocks` | Blocked user pairs |

All tables use Row-Level Security: public read, authenticated write, users can only modify their own rows.

**Supabase Storage:** Images are uploaded to the `matchpet-images` bucket (name kept for backward compatibility). Do NOT rename this bucket.

**Account deletion:** Uses `public.delete_own_account()` PostgreSQL function (migration `018`). SECURITY DEFINER — runs with elevated privileges to delete from `auth.users`. Must be executed manually in Supabase SQL Editor if not yet applied.

### Pages & Routes

| Route | Page | Auth Required |
|-------|------|:---:|
| `/` | `AuthRedirect` | No |
| `/login` | `Login` | No |
| `/reset-password` | `ResetPassword` | **No** (recovery session from email) |
| `/complete-profile` | `CompleteProfile` | Yes |
| `/home` | `Home` | Yes |
| `/discover` | `Discover` (tabs: Personas/Negocios) | Yes |
| `/social` | `Social` (feed) | Yes |
| `/explore` | `Explore` | Yes |
| `/profile` | `Profile` | Yes |
| `/profile/edit` | `EditProfile` | Yes |
| `/users/:id` | `UserProfile` | Yes |
| `/alerts`, `/alerts/:id` | `Alerts`, `AlertDetail` | **No** |
| `/alerts/new` | `CreateAlert` | Yes |
| `/events/:id` | `EventDetail` | Yes |
| `/create-event` | `CreateEvent` | Yes |
| `/adoption`, `/adoption/:id` | `Adoption`, `AdoptionDetail` | Yes |
| `/adoption/new` | `AddAdoptionPet` | Yes |
| `/marketplace`, `/products/:id` | `Marketplace`, `ProductDetail` | Yes |
| `/marketplace/new` | `AddProduct` | Yes |
| `/marketplace/dashboard` | `MarketplaceDashboard` | Yes |
| `/services/new`, `/services/:id` | `AddService`, `ServiceDetail` | Yes |
| `/courses/new`, `/courses/:id` | `CreateCourse`, `CourseDetail` | Yes |
| `/pets/new`, `/pets/:id` | `AddPet`, `PetProfile` | Yes |
| `/pets/:id/edit` | `EditPet` | Yes |
| `/map` | `MapScreen` | Yes |
| `/inbox`, `/chat/:id` | `Inbox`, `ChatRoom` | Yes |
| `/match` | `PetMatch` | Yes |
| `/cart` | `Cart` | Yes |
| `/notifications` | `Notifications` | Yes |
| `/activate-role` | `ActivateRole` | Yes |
| `/dashboard` | `BusinessDashboard` | Yes |
| `/appointments` | `MyAppointments` | Yes |
| `/appointments/new/:businessRoleId` | `BookAppointment` | Yes |
| `/activities/new` | `CreateActivity` | Yes |
| `/posts/new` | `CreatePost` | Yes |
| `/settings` | `Settings` | Yes |
| `/eliminar-cuenta` | `DeleteAccount` | Yes |

### Responsive / Tablet Layout

`src/hooks/useIsMobile.js` controls which navigation is shown:
- **< 1024px** (phones + tablets/iPad): bottom nav via `BottomNav.jsx`
- **≥ 1024px** (desktop): sidebar layout

`src/index.css` breakpoints:
- `@media (min-width: 768px) and (max-width: 1023px)` — tablet: centered 600px column, box-shadow, bottom nav
- `@media (min-width: 1024px)` — desktop: full-width layout, sidebar

**Why 1024px instead of 768px:** iPads report exactly 768px. Using 768 caused the sidebar to render on iPad with broken styles. See `DECISIONS.md`.

### Discover Page Structure

The Discover page has two tabs:
- **Personas** (Users icon): Renders `Explore.jsx` — Instagram-style masonry feed of user posts
- **Negocios** (Store icon): Renders `MapScreen.jsx` — Map/directory of pet businesses

### PetMatch (`src/pages/PetMatch.jsx`)

Full-bleed card design (like Adoption page). Key details:
- Card height: `calc(100svh - 260px)` with `minHeight: 380px`, `maxHeight: 620px` — fixed height required because absolute-positioned children don't give intrinsic height to flex parent
- Photo navigation: tap left/right zones to switch photos. Drag = swipe card. Distinguished by `dragState.current.moved` flag (set when drag delta > 5px)
- Dots indicator at top of card (active dot is wider pill)
- Gender pill badge in name row
- Opposite gender filter in `pareja` mode: `query.eq('gender', oppositeGender)`
- "Likes received" phase: grid of pets that liked yours, owner can match back

### Map Integration

Leaflet's default marker icons break with Vite's asset bundling. The fix is applied in `src/main.jsx` and must not be removed.

Maps are used in `AlertDetail.jsx`, `EventDetail.jsx`, and `MapScreen.jsx`. The map in EventDetail is **optional** — only renders if the event has `lat` and `lng` coordinates.

### Event Detail UX (`src/pages/EventDetail.jsx`)

Key behaviors:
- **Group chat:** Button always visible for attendees. Conversation is created lazily on first click (lazy creation pattern).
- **Reviews:** Gated behind event date — users can only submit reviews after the event has passed.
- **Status badges:** "Proximo evento" (green), "Hoy" (orange), "Evento pasado" (gray).
- **RSVP:** Disabled for past events and full events (`max_attendees` reached).

### Alert Detail Contact Flow (`src/pages/AlertDetail.jsx`)

When a logged-in user clicks "Contactar" on someone else's alert:
1. Checks for existing conversation → navigates to `/chat/{id}` if found
2. If not, creates new conversation then navigates
3. Shows "Esta es tu alerta" for own alerts, "Inicia sesion para contactar" for anonymous users

### Chat Room Design (`src/pages/ChatRoom.jsx`)

- Gradient orange header, date separators, bubble styles by sender
- Own messages = orange (rounded 4px bottom-right), others = white (rounded 4px bottom-left)
- Input with safe-area-inset-bottom padding for mobile

### Styling

`src/index.css` defines all CSS custom properties (design tokens):
- Primary color: `#ee9d2b`, Secondary: `#ffb703`
- Font: Plus Jakarta Sans
- Border radius: 24px throughout
- Mobile-first layout (100dvh, flex-column)

**Form classes** (global CSS in `index.css`):
- `.form-card` — White card container with rounded corners
- `.form-input`, `.form-select`, `.form-textarea` — Consistent input styling
- `.form-label`, `.form-group`, `.form-row`, `.form-section-title`, `.form-submit-btn`, `.form-error`, `.form-header`, `.form-back-btn`

Component styles are co-located in the same `.jsx` files using inline styles.

### Multi-Image Upload Pattern

`MultiImageUpload.jsx` supports configurable `maxImages` (default 5). Features:
- Main image with "Principal" badge
- Thumbnail row with tap-to-reorder
- Add button with counter (e.g., "2/5")
- Uploads to Supabase Storage in the specified `folder`
- Props: `images`, `onImagesChange`, `folder`, `maxImages`, `shape`, `mainSize`

Used by: `AddAdoptionPet`, `AddProduct`, `AddService`, `AddPet`, `CreateEvent`

Forms store `images` array and set `image_url: images[0]` for backward compatibility with single-image views.

### Common Patterns

- **Double-submit prevention:** Buttons use `loading` state to disable during async operations.
- **Optimistic UI with rollback:** State updated immediately, reverted if API call fails.
- **Lazy image loading:** Use `loading="lazy"` on `<img>` tags for lists/grids.
- **Lazy conversation creation:** Chat conversations created on first click, not upfront.
- **Timezone-safe date comparison:** Parse dates with `new Date(dateStr + 'T12:00:00')` to avoid off-by-one errors from UTC conversion.

### Sponsored Ads System (Planned — not yet implemented in UI)

Model: businesses pay Richard directly → he activates their ad in Supabase Dashboard (no code deploy needed).

- **Explore feed:** `sponsored_posts` table → card "Patrocinado" inserted every 8 organic posts
- **Directorio (MapScreen):** `business_roles.is_sponsored = true` → business pinned to top with "Destacado" badge

Pending migrations: `017_sponsored_ads.sql` (not yet created). See `DECISIONS.md`.

## iOS / Capacitor

### Configuration

- **App ID:** `com.matchpetz.app`
- **App Name:** `MatchPetz`
- **Web dir:** `dist` (Vite build output)
- **Android scheme:** `https` (required for Supabase auth)
- **Config file:** `capacitor.config.json`

### Plugins

- `@capacitor/splash-screen` — Splash screen with primary color (`#ee9d2b`)
- `@capacitor/status-bar` — Light style status bar with primary color background
- `@codetrix-studio/capacitor-google-auth` — Google OAuth
- `@capacitor-community/apple-sign-in` — Apple Sign In

### iOS Build & Submit

```bash
npm run build              # Vite production build
npx cap sync ios           # Copy dist/ to iOS project + sync plugins
open ios/App/App.xcodeproj # Open in Xcode
```

In Xcode: select "Any iOS Device (arm64)" → Product → Archive → Distribute App → App Store Connect → Upload.

**Before every iOS submission:**
1. Run any pending SQL migrations in Supabase Dashboard
2. Increment `versionCode` in `android/app/build.gradle` if also shipping Android
3. Verify `ios/App/App/Info.plist` has all permission strings and `ITSAppUsesNonExemptEncryption = false`

**If `ios/` directory is missing:** `rm -rf ios && npx cap add ios`, then manually restore `Info.plist` permissions and app icon.

### iOS Info.plist — Required keys

```xml
<key>NSCameraUsageDescription</key>
<string>MatchPetz necesita acceso a la cámara para tomar fotos de tus mascotas.</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>MatchPetz necesita acceso a tus fotos para subir imágenes de mascotas.</string>
<key>NSLocationWhenInUseUsageDescription</key>
<string>MatchPetz usa tu ubicación para mostrar mascotas y negocios cercanos.</string>
<key>ITSAppUsesNonExemptEncryption</key>
<false/>
```

### Apple App Store Requirements

- **Delete Account (guideline 5.1.1):** In-app only via `/eliminar-cuenta` → `DeleteAccount.jsx` → `supabase.rpc('delete_own_account')`. Migration `018` must be applied in Supabase.
- **Privacy labels:** Email, Name, Photos/Videos, User ID, Approximate Location — all "linked to user", none as "tracking".
- **Reviewer notes when submitting:** Location of "Eliminar Cuenta" (Settings → scroll to bottom) + demo account credentials.

## Android / Capacitor

### Building the APK / AAB

```bash
npm run cap:build          # Build web + sync to Android
npm run cap:open           # Open in Android Studio → Build → Generate Signed Bundle
```

```bash
cd android && ./gradlew bundleRelease   # CLI AAB build
```

**versionCode rule:** Always increment `versionCode` in `android/app/build.gradle` before every upload to Google Play. Never reuse a versionCode — Google Play rejects it even if the previous upload failed. Current: `versionCode 10`, `versionName "1.0.3"`.

### Android Icons

- `ic_launcher.png`, `ic_launcher_round.png`, `ic_launcher_foreground.png` — 5 densities (48-192px)
- Background color: `#ee9d2b` in `android/app/src/main/res/values/ic_launcher_background.xml`
- Regenerate if needed from `public/favicon.svg` using `sharp`

## Landing Page

`landing.html` is a standalone growth-hacking landing page (not part of the Vite build):
- Hero, feature comparison, 8 feature cards, 3-step onboarding, testimonials
- Waitlist form submits to Supabase `waitlist` table (migration applied)
- UTM tracking stubs ready (GA4 placeholder in place)

## Supabase Project

- **Project ID:** `yilqentsmibgnzphztxc`
- **Region:** (check Dashboard)
- **Storage bucket:** `matchpet-images` (do NOT rename — would break existing image URLs)
- **Migrations:** `supabase/migrations/` — numbered `001` through `018`
- **Pending manual execution:** `018_delete_own_account.sql` (if not yet applied)

## Distribution Status

| Platform | Status |
|----------|--------|
| Google Play Store | ✅ Live |
| Apple App Store | 🔄 In Review (resubmitting after guideline fixes) |

## Related Files

- `DECISIONS.md` — Architectural decisions with context and rationale
- `supabase/migrations/` — All DB schema changes in order
- `supabase/seed-events.sql` — Sample events for development
- `supabase/cleanup-sample-data.sql` — Remove all demo/test accounts by name
