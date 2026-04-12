---
description: Check and guide execution of pending Supabase migrations for MatchPetz
---

You are helping Richard manage database migrations for the MatchPetz Supabase project (ID: `yilqentsmibgnzphztxc`).

## Step 1 — List all migrations

Read all files in `supabase/migrations/` and list them in order with their name and a one-line description of what they do.

## Step 2 — Identify critical pending migrations

Check for these migrations that require **manual execution** in Supabase Dashboard (they cannot be auto-applied via CLI because the CLI is not installed):

| Migration | Critical? | Why |
|-----------|-----------|-----|
| `018_delete_own_account.sql` | ✅ YES | Required by Apple App Store — without this, account deletion is broken |
| `017_sponsored_ads.sql` | Only if ads are being launched | Sponsored posts system |

## Step 3 — Guide Richard

For each pending migration, provide:

1. **The SQL to run** — display the full contents of the migration file
2. **Where to run it:**
   - Go to [Supabase Dashboard](https://supabase.com/dashboard/project/yilqentsmibgnzphztxc/sql/new)
   - Paste the SQL → click **Run**
3. **How to verify it worked** — a quick SELECT query to confirm

Example verification for `018_delete_own_account.sql`:
```sql
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_name = 'delete_own_account';
-- Should return 1 row
```

## Step 4 — Summary

After walking through all migrations, give Richard a clear checklist:
- ✅ Migrations applied
- ⏳ Migrations pending (with the SQL ready to copy-paste)
- Any migrations that affect the currently live app (warn before applying to production)

## Notes

- The Supabase project is at: `https://supabase.com/dashboard/project/yilqentsmibgnzphztxc`
- Storage bucket name is `matchpet-images` — do NOT rename it
- Always apply migrations to production carefully — this is a live app with real users
