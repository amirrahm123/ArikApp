# Public read-only demo admin — finish setup (2 steps, ~2 min)

Everything in code + the seeded fake data is done. Two things must be done in the
Supabase dashboard because they need owner access (I only had the public anon key).

Project: `dixbhnqkdnwxhsjdyfuu` · Demo email: **demo@arikapp.app** · Password: **demo1234**

## Step 1 — Create the demo auth user (required to log in)

The project has email-confirmation turned on, so the user must be created
pre-confirmed from the dashboard (the public sign-up API can't be used here).

1. Dashboard → **Authentication → Users → Add user → Create new user**
2. Email: `demo@arikapp.app`  ·  Password: `demo1234`
3. **Check “Auto Confirm User”** (important — otherwise login fails)
4. Create.

That's it — the login is gated only by "is a Supabase user logged in", so this
account immediately works as an admin login, exactly like the real one.

> The `.app` domain is fine for login. It's only rejected by the public sign-up
> endpoint (no MX record); dashboard-created users bypass that check.

## Step 2 — Apply the read-only database policies (the real safety net)

1. Dashboard → **SQL Editor → New query**
2. Paste the contents of [`demo-readonly-policies.sql`](./demo-readonly-policies.sql) and **Run**.

This makes `demo@arikapp.app` unable to INSERT/UPDATE/DELETE on any table at the
database level, while keeping read access and keeping public booking working.

If you ever change the demo email, update it in **both** `src/lib/demo.ts`
(`DEMO_EMAIL`) and `demo-readonly-policies.sql`, then re-run the SQL.

## Re-seeding the demo data

`node scripts/seed-demo.js` wipes customers/appointments/receipts and re-creates a
fresh believable dataset (it does not touch services or working hours).
