---
description: Build MatchPetz for iOS and open in Xcode ready to Archive
---

You are helping Richard prepare a new iOS build for MatchPetz to submit to the Apple App Store.

Follow these steps in order:

## Step 1 — Pre-flight checks

Before building, verify:
1. Read `android/app/build.gradle` — note the current `versionName` (e.g. "1.0.3")
2. Read `ios/App/App/Info.plist` — confirm it exists and has `ITSAppUsesNonExemptEncryption = false`
3. Check `supabase/migrations/` — list any migration files that may not have been applied yet (especially `018_delete_own_account.sql`). Warn Richard if any are pending.

## Step 2 — Build

Run the following commands sequentially using Bash:

```bash
cd /Users/richardfigueroa/Downloads/matchpet
npm run build
```

If the build fails, stop and report the error. Do not proceed.

## Step 3 — Sync to iOS

```bash
cd /Users/richardfigueroa/Downloads/matchpet
npx cap sync ios
```

## Step 4 — Open Xcode

```bash
open /Users/richardfigueroa/Downloads/matchpet/ios/App/App.xcodeproj
```

## Step 5 — Report to Richard

Tell Richard:
- ✅ Build successful
- ✅ Synced to iOS
- ✅ Xcode is opening
- The current `versionName` so he knows what version he's submitting
- Any pending migrations that need to be run in Supabase Dashboard first
- Reminder: In Xcode → select "Any iOS Device (arm64)" → Product → Archive → Distribute App → App Store Connect → Upload

## If `ios/App/App.xcodeproj` is missing

The iOS project needs to be regenerated:
```bash
cd /Users/richardfigueroa/Downloads/matchpet
rm -rf ios
npx cap add ios
npx cap sync ios
```
Then warn Richard to manually restore `Info.plist` permission strings and the app icon before archiving.
