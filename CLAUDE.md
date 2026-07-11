@AGENTS.md

# BlueRockEquipment — Claude.md

Master configuration file for all Claude sessions. Contains architectural review notes, system structures, refactoring steps, and operational decisions.

---

## PROJECT CONTEXT

**Platform:** BlueRockEquipment — Premium Direct-Sale Heavy Machinery Acquisition Platform
**Model:** Single-seller, closed-group (max 10 users), $0 infrastructure
**Target Markets:** West Africa, Middle East, Southeast Asia, Americas, Europe
**Stack:** Next.js 16.2.9 · Supabase · Render · Resend · Puppeteer · Calendly
**Status:** All 8 Sprints Complete — Ready for Launch

---

## GOVERNING DOCUMENTS

All decisions are made in these documents. Read them first before any session:

- `BlueRockEquipment_Proposal_v3_MVP.docx` — Feature authority (Phase 1 MVP, Phase 2 deferred, removed)
- `BlueRockEquipment_BuildPlan_v1.docx` — Execution authority (8-sprint sequence, task tables, exit criteria, risks)
- `BlueRockEquipment_Handbook_v1.docx` — Implementation authority (exact code patterns, SQL, Windows setup)
- `BlueRockEquipment_ProjectInstructions.txt` — System prompt for Claude Projects

---

## ARCHITECTURE SUMMARY

### Database Schema (7 Tables, All RLS Enabled)

```
machines          → id, name, brand, model, year, category, use_case, engine_hours, price_usd,
                    yard_country, yard_city, status, wear_analysis (JSONB), specs (JSONB),
                    description, engine_configuration, hours_since_service, media_urls (JSONB),
                    video_url, inspection_report_url, operating_weight_kg, serial_number,
                    created_at, updated_at

buyers            → id (FK auth.users), email, company_name, corporate_address,
                    import_export_license, preferred_port_of_discharge, tier (observer|silver|gold),
                    kyc_verified (boolean), walkthrough_notes, created_at

quotes            → id, buyer_id (FK), machine_id (FK), status, freight_estimate, final_freight_cost,
                    customs_fee, total_amount, lock_expires_at, proforma_invoice_url,
                    payment_reference, port_of_discharge, milestone_phase (0–6), created_at, updated_at

documents         → id, quote_id (FK), buyer_id (FK), document_type (proforma|bill_of_lading|
                    export_cert|customs_manifest|packing_list), file_path, version, superseded_at,
                    created_at

watchlist         → id, buyer_id (FK), machine_id (FK), in_comparison (boolean),
                    arrival_alert_params (JSONB), created_at

notifications     → id, buyer_id (FK), type, message, sent_via (email|platform),
                    sent_at, read_at

freight_rates     → id, port_name, country, base_cost_usd, updated_at
```

### Storage Buckets (3 Total)

- `machine-media` — PUBLIC (photos, YouTube links)
- `inspection-reports` — PUBLIC (PDF reports accessible pre-login)
- `documents` — PRIVATE (trade docs, signed URLs only)

---

## SUPABASE CLIENTS (CRITICAL)

**Three separate clients, each with a specific purpose:**

1. **Browser Client** (`src/lib/supabase/client.ts`)
   - Used in: `'use client'` components only
   - Creates: Browser-side auth, watches realtime, reads public data
   - Respects: RLS policies (cannot bypass)

2. **Server Client** (`src/lib/supabase/server.ts`)
   - Used in: Server Components, Server Actions, middleware
   - Creates: Server-side queries with SSR
   - Respects: RLS policies (uses session cookies)

3. **Admin Client** (`src/lib/supabase/admin.ts`)
   - Used in: API routes (`/api/**`) only, never in app components
   - Creates: Bypasses all RLS (service_role key)
   - Purpose: Admin mutations, PDF generation, backend-only logic

**Rule:** If you use the wrong client, you get an auth error or RLS block. Double-check before writing any query.

---

## TECH STACK SPECIFICS

### Next.js 16.2.9 (not 14)

- Middleware renamed to **Proxy** in Next.js 16
- Export function: `async function proxy()` not `middleware()`
- File location: `src/proxy.ts` (not `src/middleware.ts`)
- Excluded routes: `/auth/onboarding` (new signups must reach KYC form)

### Render Backend (Node.js ES Modules)

- Entry point: `server.js`
- `package.json` has `"type": "module"` — uses `import`/`export`, not `require`
- Cold start: 15 min idle → 30–60s first response. Document this to users.
- Puppeteer must run here, never on Vercel

### Puppeteer (PDF Generation)

- **Always use:** `puppeteer-core` + `@sparticuz/chromium-min`
- **Never use:** Full `puppeteer` package (too large for Render free tier)
- Runs on: **Render** (`server.js`), not Vercel — see Hard Constraint #5
- Local Chrome path: `C:\Program Files\Google\Chrome\Application\chrome.exe` (Windows)
- Production: Render's native (non-Docker) build environment cannot run `apt-get` (read-only `/var/lib/apt/lists` — a platform constraint, confirmed 2026-07-11, not fixable from the build command). No system Chromium is installed, so `CHROMIUM_PATH` must be **unset** on Render — the code downloads via `CHROMIUM_DOWNLOAD_URL` (or the now architecture-aware default) instead
- HTML templates: Inline CSS only, no external stylesheets or Google Fonts

### Resend (Email)

- Free tier: 100 emails/day (sufficient for 10 users)
- Domain verification: Required before launch, takes 48 hours
- Send pattern: Fire-and-forget async (don't await in request handler)
- SMTP setup: Not needed, use Resend API directly

### Calendly (Free Tier)

- 1 event type allowed (sufficient for MVP)
- Embed: Use popup widget, not inline embed
- No API: Integration is manual notes storage only

---

## PHASE CLASSIFICATION (CRITICAL)

### Phase 1 MVP (Build Now)

✅ Machine inventory with 3D filters
✅ Buyer accounts (Observer/Silver/Gold)
✅ Quote request with 48-hour lock
✅ Proforma Invoice PDF generation
✅ Document Vault (single-user)
✅ 6-phase Milestone Tracker
✅ Watchlist & Comparison Workbench
✅ Email notifications
✅ Admin inventory + Quote Builder + Milestone switchboard
✅ **Public Trust & Verification Hub** ← Phase 1 override
✅ **Live Video Walkthrough Scheduler (Calendly)** ← Phase 1 override

### Phase 2 (Deferred Until Revenue)

⏸ WhatsApp notifications (Twilio, ~$20–100/month)
⏸ Escrow.com payment integration (~1–2% per transaction)
⏸ Interactive 360° viewer (Matterport, ~$100–500/month)
⏸ Third-party inspection API (SGS/Bureau Veritas, per-inspection fee)
⏸ Multi-contact Document Vault access
⏸ IP-logged audit trail
⏸ PWA home-screen installation
⏸ Shipping Container Optimization Calculator
⏸ Fleet completion prompts
⏸ 12-month anniversary check-in emails
⏸ Buyer Brief intake flow
⏸ Render Starter always-on backend ($7/month)
⏸ Supabase Pro upgraded storage ($25/month)

### Removed (Not in MVP)

❌ Multi-seller marketplace
❌ Dynamic pricing
❌ Auction mechanics

---

## RLS POLICY RULES (ENFORCE EVERY TIME)

**Every table with `buyer_id` column must have RLS:**

```sql
-- Pattern for buyer-owned data
CREATE POLICY "buyers_own_read" ON table_name
  FOR SELECT USING (auth.uid() = buyer_id);

CREATE POLICY "buyers_own_insert" ON table_name
  FOR INSERT WITH CHECK (auth.uid() = buyer_id);
```

**Machines table is readable by all (public), writable by admin only:**

```sql
CREATE POLICY "machines_public_read" ON machines
  FOR SELECT USING (true);

-- No insert/update/delete for non-admins
```

**Service Role Key Bypasses RLS:**

- If you use `adminSupabase`, you bypass all RLS automatically
- This is intentional for admin API routes
- Never expose `SUPABASE_SERVICE_ROLE_KEY` to the browser
- If you find it in `/app/components/`, that's a security bug

---

## HARD CONSTRAINTS (Never Violate)

1. **$0 Infrastructure for Phase 1**
   - Every paid service deferred to Phase 2
   - Free tiers are hard limits (not guidelines)
   - Monitor Supabase storage weekly (free tier: 500MB)

2. **No Escrow Until Phase 2**
   - Phase 1 payments: Bank wire + Letter of Credit only
   - Escrow.com integration deferred

3. **KYC at Onboarding, Never at Quote**
   - Corporate verification collected after signup
   - Quote request button never gates on KYC form
   - This is a conversion-killing pattern that was explicitly rejected

4. **No Hard Deletes**
   - `machines`, `quotes`, `documents` use soft deletes only
   - Use `status` flags, `superseded_at` timestamps
   - Never `DELETE FROM` these tables

5. **Puppeteer runs on the Render backend (not Vercel)**
   - Reverted 2026-07-10 after a Vercel move (2026-06-19) turned out to be an unverified regression — see Decision #12
   - Inspection Report and Proforma Invoice generation live in `server.js` (`/api/pdf/inspection-report`, `/api/pdf/proforma-invoice`), using `puppeteer-core` + `@sparticuz/chromium-min`
   - `server.js` holds its own `adminSupabase` client (service_role) to fetch machine/quote/buyer data and write PDFs to storage — it does not receive pre-fetched data from Vercel
   - Auth: the admin UI sends the caller's Supabase `access_token` as `Authorization: Bearer <token>`; `server.js` verifies it via `adminSupabase.auth.getUser(token)` and checks `user.email === process.env.ADMIN_EMAIL` (proforma also allows `quote.buyer_id === user.id`). Render has no access to the Vercel session cookie, so cookie-based auth doesn't work across the two origins — bearer token is the mechanism, not cookies
   - Local dev: uses `C:\Program Files\Google\Chrome\Application\chrome.exe` (or `LOCAL_CHROME_PATH` env var)
   - Production (Render): **`CHROMIUM_PATH` must be unset** — Render's native build environment cannot `apt-get install` a system Chromium (read-only filesystem, confirmed 2026-07-11; only possible via a Docker-based Render deploy, out of scope). Production relies entirely on `@sparticuz/chromium-min` downloading via `CHROMIUM_DOWNLOAD_URL` (or its now architecture-aware default — see Decision #13). Render has no serverless execution ceiling, so a slow chromium-min cold-start download is a latency annoyance, not a hard failure, unlike on Vercel
   - **`CHROMIUM_PATH` is a plain truthiness check with no filesystem validation** — `if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH` returns whatever string is set immediately, unconditionally, even if nothing exists at that path. It does NOT fall through to the download fallback in that case — Puppeteer just fails to launch at a nonexistent executable. So a stale/wrong `CHROMIUM_PATH` is worse than no `CHROMIUM_PATH` at all: unset correctly falls through to the (working) download path; set-but-invalid hard-fails instead. Never leave `CHROMIUM_PATH` set on an environment where the path wasn't actually verified to exist
   - `src/lib/pdf.ts` (Vercel-side `generatePDF`/`escHtml`/`generateScreenshot`) still exists and is still used by `watchlist/export` and `comparison/export` — those were never part of this move and stay on Vercel
   - The old Vercel routes `src/app/api/pdf/inspection-report/route.ts` and `src/app/api/pdf/proforma-invoice/route.ts` were deleted, not just deprecated

6. **RLS Before Data**
   - Enable RLS on every table immediately after creation
   - Never disable it to "fix" a query issue
   - Fix the RLS policy instead

7. **Phase 2 Boundary Enforcement**
   - If feature is marked Phase 2, don't build it
   - Ask user explicitly before proceeding with deferred features

---

## SPRINT STRUCTURE (8 Total)

| Sprint | Focus | Status |
|--------|-------|--------|
| 1 | Foundation & Infrastructure | ✅ Complete |
| 2 | Authentication & Buyer Accounts | ✅ Complete |
| 3 | Machine Inventory | ✅ Complete |
| 4 | PDF Generation (Puppeteer) | ✅ Complete |
| 5 | Quote Flow & Transaction Pipeline | ✅ Complete |
| 6 | Document Vault & Milestone Tracker | ✅ Complete |
| 7 | Watchlist, Comparison & Buyer Dashboard | ✅ Complete |
| 8 | Trust Hub, Walkthrough & Launch Prep | ✅ Complete |

**Rule:** Do not start Sprint N+1 until Sprint N exit criteria are met.

---

## LAUNCH CHECKLIST (Pre-Go-Live)

### Vercel (Frontend)
- [ ] Set `RESEND_API_KEY` env var in Vercel dashboard
- [ ] Verify `ADMIN_EMAIL` matches the admin Supabase auth account
- [ ] Verify `NEXT_PUBLIC_CALENDLY_URL` is set and points to the live Calendly event
- [ ] Verify `NEXT_PUBLIC_BACKEND_URL` points to `https://bluerock-equipment.onrender.com` (required at build time — it's inlined into the client bundle for `GenerateReportButton`/`GenerateProformaButton`)

### Render (Backend)
- [ ] Build command must be plain `npm install` — **do not** use `apt-get install -y chromium-browser && npm install`. Confirmed 2026-07-11: Render's native build environment cannot run `apt-get` at all (`/var/lib/apt/lists` is read-only — a platform constraint, not a syntax problem). No sudo/permission workaround exists short of switching to a Docker-based Render deploy, which is out of scope
- [ ] **`CHROMIUM_PATH` must be deleted from Render's environment variables entirely**, not just left unset in theory — if it's still set to `/usr/bin/chromium-browser` from the reverted apt-get attempt, that path doesn't exist and the code will use it directly and fail (no filesystem check, no graceful fallback — see Hard Constraint #5). Removing it lets the code fall through to `CHROMIUM_DOWNLOAD_URL`
- [ ] Set `NODE_ENV=production` env var on Render
- [ ] Set `ALLOWED_ORIGIN=https://bluerock-equipment.vercel.app` on Render
- [ ] **New as of the 2026-07-10 Render revert:** set `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `ADMIN_EMAIL` on Render — `server.js` now fetches machine/quote data and verifies admin identity itself, so it needs these the same way the Vercel API routes always did. Without them, `/api/pdf/*` will fail on every request. Not yet confirmed set as of this entry — check before relying on the endpoints in production.
- [ ] Verify `/health` endpoint returns `{ "status": "ok" }`
- [ ] Smoke-test both `/api/pdf/inspection-report` and `/api/pdf/proforma-invoice` against the **live** Render URL (not localhost) — local testing only exercises the local-Chrome code path, not the `chromium-min` cold-start path that actually runs in production

### Resend (Email)
- [ ] Verify domain `bluerockequipment.com` in Resend dashboard (takes 48 hours DNS propagation)
- [ ] Test a notification send from `/admin/buyers` → Notify button
- [ ] Confirm "from" address matches verified domain

### Supabase
- [ ] Confirm RLS is enabled on all 7 tables
- [ ] Confirm `inspection-reports` bucket is PUBLIC
- [ ] Confirm `documents` bucket is PRIVATE
- [ ] Confirm `machine-media` bucket is PUBLIC
- [ ] Seed at least 3 machines with complete wear_analysis data

### Security Audit (Passed)
- ✅ `SUPABASE_SERVICE_ROLE_KEY` only used in `src/lib/supabase/admin.ts` — never in client components
- ✅ All admin API routes check `user.email === process.env.ADMIN_EMAIL`
- ✅ Buyer API routes verify `quote.buyer_id === user.id` before returning data
- ✅ Document downloads verify ownership before generating signed URLs
- ✅ PDF generation (`server.js` on Render) runs server-side only — no client-side Puppeteer
- ✅ Render backend CORS restricted to Vercel frontend origin
- ✅ Render's `/api/pdf/*` endpoints independently verify the caller's bearer token and admin status — they are a separate trust boundary from the Next.js admin pages and are not protected by `proxy.ts`

---

## COMMON MISTAKES (Learn These)

### Supabase

- ❌ Forgetting RLS on a table → any user reads all rows
- ❌ Using service_role key in frontend code → security breach
- ❌ Using legacy `@supabase/auth-helpers-nextjs` instead of `@supabase/ssr` → subtle auth bugs
- ❌ Hard-deleting machine/quote rows → audit trail lost

### Next.js / Frontend

- ❌ Auth guard in `useEffect` client component → page flashes before redirect
- ❌ Fetching data in `useEffect` on client → slow, loading flash, loses SEO
- ❌ Not using `next/image` for machine photos → slow loads on mobile
- ❌ Hardcoding API keys in component files → secrets exposed
- ❌ Building complex UI before testing database query → double debugging

### PDF / Email

- ❌ External CSS or Google Fonts in Puppeteer templates → fonts don't load
- ❌ Running Puppeteer on Vercel without setting `maxDuration` and a fast `CHROMIUM_PATH`/`CHROMIUM_DOWNLOAD_URL` → cold-start chromium download blows the default 10s (Hobby) function timeout. (Bundle size itself was checked and was fine at ~3.4MB — the actual failure mode was timing/config, not the 50MB limit. See Decision #12.)
- ❌ Unverified Resend domain before launch → emails in spam
- ❌ Synchronous email sends in request handler → request hangs

### Architecture

- ❌ Building features out of sprint order → dependencies missing
- ❌ No SQL migrations (Supabase UI changes only) → schema not reproducible
- ❌ Not monitoring free-tier limits → surprise overages
- ❌ Not warning users about Render cold start → user frustration

---

## KEY DECISIONS MADE (SESSION HISTORY)

1. **Next.js 16 instead of 14** — Fully compatible, no breaking changes
2. **Proxy instead of Middleware** — Next.js 16 convention, function named `proxy()`
3. **ES Modules on Render** — `"type": "module"` in package.json
4. **Extra machine fields added** — `description`, `engine_configuration`, `hours_since_service`, `specs JSONB`
5. **Category specs in JSONB** — Separate from `wear_analysis`, enables flexible schema per category
6. **Public Trust Hub is Phase 1** — Override from v3.0 proposal
7. **Calendly walkthrough is Phase 1** — Override from v3.0 proposal
8. **Admin API route for machine inserts** — RLS blocks direct browser inserts as expected
9. **Render Chromium setup** — ~~Set `CHROMIUM_PATH` on Render for fastest cold start~~ **superseded by Decision #13** — Render's native build environment can't install a system Chromium at all, so this is never an option there. `@sparticuz/chromium-min` relies on `CHROMIUM_DOWNLOAD_URL` (or its architecture-aware default) exclusively in production. The admin buttons (`GenerateReportButton`, `GenerateProformaButton`) call the Render backend directly using `NEXT_PUBLIC_BACKEND_URL` (already in .env.local).
10. **Proforma PDF storage** — `quotes.proforma_invoice_url` stores the file path (not a signed URL). Generate signed URLs on demand from Sprint 6 Document Vault. File path format: `proforma/{quote_id}/v{n}.pdf` in the private `documents` bucket.
11. **PDF versioning** — Each new generation for a quote supersedes the previous (`documents.superseded_at` is set). Only the latest active version has `superseded_at = NULL`.
12. **PDF generation moved from Vercel back to Render (2026-07-10)** — The 2026-06-19 move to Vercel API routes (see the now-superseded prior version of Hard Constraint #5) was never actually verified against Vercel's real serverless limits. Investigation found: the deployed bundle size was fine (~3.4MB, nowhere near Vercel's 50MB/250MB ceiling — `puppeteer-core` + `chromium-min` genuinely solves the Handbook's original size concern), but neither PDF route set `maxDuration` (defaulting to Vercel Hobby's 10s ceiling), and `CHROMIUM_PATH`/`CHROMIUM_DOWNLOAD_URL` were never confirmed set on Vercel, so `chromium-min` fell back to a slow direct GitHub Releases download on cold start — a combination that was failing Proforma Invoice generation in production. The two prior "working" PDFs in the database were traced to local `npm run dev` testing against prod Supabase during the original build session, not genuine Vercel invocations. Moving back to Render removes the hard timeout entirely (Render's only constraint is the 15-min-idle cold start, mitigated by an external uptime ping every 10–14 min, set up outside this codebase). `server.js` now does its own Supabase admin-client data fetching (previously it only rendered pre-built HTML received in the request body) and its own bearer-token auth check, since it no longer receives pre-authenticated, pre-fetched data from a Vercel route.
13. **Render Chromium: `CHROMIUM_DOWNLOAD_URL` is the only viable production path, not `CHROMIUM_PATH` (2026-07-11)** — First live test after Decision #12 failed both PDF endpoints with `{"error":"PDF generation failed","detail":"Unexpected status code: 404."}`. Root cause, confirmed directly against GitHub's API: the hardcoded fallback URL in both `server.js` and `src/lib/pdf.ts` pointed at `chromium-v149.0.0-pack.tar`, but Sparticuz's actual release assets for that exact tag (matching the installed `@sparticuz/chromium-min@149.0.0`) are architecture-suffixed — `chromium-v149.0.0-pack.x64.tar` / `-pack.arm64.tar` — the bare filename never existed. Fixed by deriving the suffix from `process.arch` at runtime (Render is confirmed x86_64/amd64-only, but this stays correct if that ever changes) rather than hardcoding one architecture. A follow-up attempt to fix cold-start latency by installing a system Chromium via `apt-get install -y chromium-browser` in Render's Build Command failed with a read-only-filesystem error on `/var/lib/apt/lists` — Render's native (non-Docker) build environment does not permit `apt-get` at all; this is a platform constraint with no command-line workaround. Build Command reverted to plain `npm install`; `CHROMIUM_PATH` must stay **unset** on Render going forward. This matters beyond convenience: `CHROMIUM_PATH` is a bare truthiness check with no filesystem validation (`if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH`) — if it's set to a path that doesn't exist, the code uses it directly and Puppeteer hard-fails at launch instead of falling through to the download fallback. So the safe state is `CHROMIUM_PATH` fully absent from Render's env vars, not merely "not actively relied upon."

---

## INFRASTRUCTURE LIVE

| Service | URL | Status |
|---------|-----|--------|
| Vercel Frontend | https://bluerock-equipment.vercel.app | ✅ |
| Render Backend | https://bluerock-equipment.onrender.com | ✅ |
| GitHub Repo | https://github.com/MikkyPrestige/bluerock-equipment | ✅ |
| Supabase | bluerock-prod | ✅ |