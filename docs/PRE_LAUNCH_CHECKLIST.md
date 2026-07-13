# BlueRockEquipment — Pre-Launch Checklist

## 1. Email & Notifications (Resend)

- [ ] **Verify sending domain** — Go to resend.com/domains, add bluerockequipment.store, add SPF and DKIM DNS records at your domain registrar. Wait up to 48 hours for propagation.
  - **Trigger:** Must be done before onboarding any real buyers
  - **Why:** Resend sandbox mode only allows sending to meekyberry6@gmail.com. All other recipients (buyers) will get a 403 error until domain is verified
  - **After verification:** Update `RESEND_FROM_EMAIL` in Vercel environment variables to: `BlueRock Equipment <notifications@bluerockequipment.store>`
  - **Affected features:** Notify button in Waitlist & Arrival Alerts, quote confirmation emails, milestone update emails, invoice generated emails, 12-hour lock warning emails

---

## 2. Environment Variables (Vercel Production)

- [ ] **Confirm all env vars are set in Vercel dashboard** — Check every variable in `.env.local` is also present in Vercel → Project Settings → Environment Variables

  | Variable | Value |
  |---|---|
  | `NEXT_PUBLIC_SUPABASE_URL` | From Supabase project settings |
  | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | From Supabase project settings |
  | `SUPABASE_SERVICE_ROLE_KEY` | From Supabase project settings |
  | `RESEND_API_KEY` | From resend.com/api-keys |
  | `RESEND_FROM_EMAIL` | `onboarding@resend.dev` (pre-verification) → `BlueRock Equipment <notifications@bluerockequipment.store>` (post-verification) |
  | `NEXT_PUBLIC_SITE_URL` | `https://www.bluerockequipment.store` — must not be localhost |
  | `NEXT_PUBLIC_CALENDLY_URL` | Full Calendly event URL |
  | `ADMIN_EMAIL` | Email address of the admin Supabase account |
  | `NEXT_PUBLIC_BACKEND_URL` | `https://bluerock-equipment.onrender.com` |

---

## 3. Render Backend

- [ ] **Warn first users about cold start delay** — Render free tier sleeps after 15 minutes of inactivity. First request after sleep takes 30–60 seconds.
  - **Fix:** Mention in the User Guide. Upgrade to Render Starter ($7/month) when first transaction completes.

---

## 4. Supabase

- [ ] **Confirm RLS is enabled on all 8 tables** — machines, buyers, quotes, documents, watchlist, notifications, freight_rates, walkthroughs
- [ ] **Confirm storage bucket access policies:**
  - `machine-media` → PUBLIC
  - `inspection-reports` → PUBLIC
  - `documents` → PRIVATE
- [ ] **Monitor storage usage** — Free tier is 500MB. Set a Supabase alert at 400MB. Videos must stay on YouTube — never upload video files to Supabase Storage.

---

## 5. Security

- [ ] **Confirm `SUPABASE_SERVICE_ROLE_KEY` never appears in `/app` directory** — Run:
  ```
  grep -r "SERVICE_ROLE" ./src/app
  ```
  Expected result: no matches. It must only appear in `src/lib/supabase/admin.ts`.
- [ ] **Confirm `.env.local` is in `.gitignore`** — Never committed to GitHub
- [ ] **Confirm all `/admin` routes redirect non-admin users** — Test by logging in as a non-admin buyer and attempting to navigate to `/admin`

---

## 6. User Onboarding

- [ ] **Write User Guide PDF** — Cover: how to create an account, how to request a quote, how to access the Document Vault, how to book a walkthrough, note about Render cold start delay
- [ ] **Onboard first 2 users manually** — Watch them use the platform. Fix the 3 most confusing UX issues before opening to remaining buyers.
- [ ] **Do not onboard all 10 users on day one** — Onboard 2, observe, fix, then open to the rest.

---

## 7. Domain & Branding

- [x] **Connect custom domain** — Connect bluerockequipment.store to Vercel (`www.bluerockequipment.store` is canonical; apex 308-redirects to it)
  - Go to Vercel → Project → Settings → Domains → Add Domain
  - Update `NEXT_PUBLIC_SITE_URL` env var to the custom domain after connecting

---

## 8. Performance

- [ ] **Run Lighthouse audit** — Target: Performance > 80, Accessibility > 90 on homepage, inventory page, and machine detail page
- [ ] **Mobile audit on real device** — Test full buyer flow on an actual smartphone: browse → filter → machine detail → save → request quote → dashboard → document vault

---

## Notes

- Items marked with a stage note must be completed before that stage begins
- Check off items as they are completed and add the completion date next to the checkbox
- Add new items to this file as new issues are discovered during development or testing
