# NEXTUP

A React + Vite + Tailwind CSS pickleball app backed by Supabase. Players discover clubs and sessions, join a live queue, and organizers create clubs and open plays. The starter pricing screen offers Free, Club (₱399/month), and Venue (₱999/month). These are launch recommendations, not recurring charges.

## Run

```bash
npm install
cp .env.example .env
# Fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm run dev
```

Run `supabase/schema.sql` in your Supabase project's SQL Editor. Enable Realtime for `session_players` in Supabase Database > Replication. In Supabase Auth, set your site URL and redirect URLs. Use only the public anon key in `.env`. Never put a service role key in Vite variables.

With no Supabase values, the site shows sample clubs and sessions as a UI preview. Auth, permanent data, and payment submissions need your Supabase project.

## Images

Replace `/public/assets/court-hero.jpg` and `/public/assets/club-1.jpg` through `club-3.jpg` with your own photos. The first version uses styled placeholders. Replace `/public/assets/gcash-qr.png` with your actual merchant QR before offering paid access. No payment is accepted or verified by the QR display alone.

## Payment review

A signed-in club owner selects Club or Venue, scans your real QR, and submits a reference and a receipt. The receipt is stored in a private Supabase Storage bucket. The request stays `pending`. A trusted admin checks the GCash merchant transaction and receipt, then approves the request and grants club access. Never approve based only on a screenshot or reference number. The browser has no right to update `club_plans` or payment status.

To approve from a trusted admin context, verify transaction and amount, then update `payment_requests.status` and upsert `club_plans` with `expires_at = now() + interval '1 month'`. Build a dedicated admin tool or Edge Function before processing real orders at scale. The current app collects requests, but premium feature limits and automated approval are not implemented. Do not advertise paid access until your admin process and real QR are ready.

## Scope

The schema includes matches for future host score management. The current UI covers discovery, club membership, session hosting, session joining, and a live queue. Tournament brackets, automated fair rotation, notifications, Maps API search, and production payment reconciliation are future work. Host session fees are separate from NEXTUP plans.

## Where to edit things

```text
src/
├── main.jsx                 App entry point
├── App.jsx                  Shared state and actions
├── pages/                   Discover, Clubs, My Games, Pricing, Club and Session screens
├── components/              Sidebar and header, cards, forms, dialogs, toast
├── data/                    Sample clubs, sessions and suggested plans
├── lib/supabase.js          Supabase client setup
└── styles/index.css         Site-wide styles, formatted one rule at a time
supabase/schema.sql          Database tables and access rules
public/assets/              Replaceable photos and GCash QR
```

Start in `src/pages/DiscoverPage.jsx` for the home screen. The Explore games button is styled by `.feature-content button` in `src/styles/index.css`. Prices and plan copy live in `src/data/plans.js`. Backend actions stay in `src/App.jsx` until you connect your Supabase project.

## Accounts and player profiles

For sign-up, sign-in, and editable player profiles, first run `supabase/accounts-only.sql` in your Supabase SQL Editor. It creates `public.profiles`, adds a row for every new Auth account, and adds rows for people who signed up earlier. Check Authentication > Users for the login record and Table Editor > profiles for editable player details. Users can edit only their own row.

For club and session features, run `supabase/schema.sql` once. If you already ran an older version of schema.sql, run `accounts-only.sql` to add the new profile fields. After the full schema is in place, run `supabase/profile-results.sql` for match history and ranking. The host can record finished doubles matches from a session page once four players have joined. Results appear on player profiles. Community rank sorts players by wins, then win rate and number of matches. Players with no recorded results are unranked.

The hosted preview has no Supabase credentials. To enable real accounts there, supply your Project URL and publishable key for a new deployment. Never use a secret or service role key in Vite environment variables.

## Profile photo and gender

For an existing Supabase project, run `supabase/profile-photo.sql` and `supabase/add-profile-gender.sql` in the SQL Editor. The first script adds the avatar path and a public photo bucket with an owner-only upload policy. The second adds the gender field. New projects using the included schemas still need `profile-photo.sql` for the Storage bucket.

On the Profile page, click the avatar to select a JPG, PNG, or WebP photo under 2 MB. The image is a local preview until you click Save profile. The navbar reads the saved profile name and photo.
