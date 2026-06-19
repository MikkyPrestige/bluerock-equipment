@AGENTS.md

# BlueRockEquipment — Claude.md

Master configuration file for all Claude sessions. Contains architectural review notes, system structures, refactoring steps, and operational decisions.

---

## PROJECT CONTEXT

**Platform:** BlueRockEquipment — Premium Direct-Sale Heavy Machinery Acquisition Platform
**Model:** Single-seller, closed-group (max 10 users), $0 infrastructure
**Target Markets:** West Africa, Middle East, Southeast Asia, Americas, Europe
**Stack:** Next.js 16.2.9 · Supabase · Render · Resend · Puppeteer · Calendly
**Status:** Sprints 1–4 complete, Sprint 5 ready to begin

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
- Local Chrome path: `C:\Program Files\Google\Chrome\Application\chrome.exe` (Windows)
- Production: `@sparticuz/chromium-min` auto-resolves path
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

5. **Puppeteer runs in Next.js API routes (not Render)**
   - PDF generation runs directly inside `/api/pdf/*` routes using `puppeteer-core` + `@sparticuz/chromium-min`
   - Shared utility: `src/lib/pdf.ts` exports `generatePDF(html)` and `escHtml()`
   - Local dev: uses `C:\Program Files\Google\Chrome\Application\chrome.exe` (or `LOCAL_CHROME_PATH` env var)
   - Production (Vercel): `@sparticuz/chromium-min` downloads the binary; set `CHROMIUM_PATH` or `CHROMIUM_DOWNLOAD_URL` env var on Vercel
   - The Render backend (`server.js`) is NOT used for PDF generation

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
| 5 | Quote Flow & Transaction Pipeline | 🔲 Ready |
| 6 | Document Vault & Milestone Tracker | 🔲 Queued |
| 7 | Watchlist, Comparison & Buyer Dashboard | 🔲 Queued |
| 8 | Trust Hub, Walkthrough & Launch Prep | 🔲 Queued |

**Rule:** Do not start Sprint N+1 until Sprint N exit criteria are met.

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
- ❌ Running Puppeteer on Vercel → exceeds 50MB size limit
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
9. **Render Chromium setup** — `@sparticuz/chromium-min` requires either `CHROMIUM_PATH` env var (pointing to installed system Chrome, e.g. `/usr/bin/chromium-browser`) OR `CHROMIUM_DOWNLOAD_URL` env var (pointing to `https://github.com/Sparticuz/chromium/releases/download/v149.0.0/chromium-v149.0.0-pack.tar`). If neither is set, it downloads from that default URL on first call. Set `CHROMIUM_PATH` on Render for fastest cold start. The Next.js API route uses `NEXT_PUBLIC_BACKEND_URL` (already in .env.local) to call the Render backend.
10. **Proforma PDF storage** — `quotes.proforma_invoice_url` stores the file path (not a signed URL). Generate signed URLs on demand from Sprint 6 Document Vault. File path format: `proforma/{quote_id}/v{n}.pdf` in the private `documents` bucket.
11. **PDF versioning** — Each new generation for a quote supersedes the previous (`documents.superseded_at` is set). Only the latest active version has `superseded_at = NULL`.

---

## INFRASTRUCTURE LIVE

| Service | URL | Status |
|---------|-----|--------|
| Vercel Frontend | https://bluerock-equipment.vercel.app | ✅ |
| Render Backend | https://bluerock-equipment.onrender.com | ✅ |
| GitHub Repo | https://github.com/MikkyPrestige/bluerock-equipment | ✅ |
| Supabase | bluerock-prod | ✅ |