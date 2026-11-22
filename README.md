# Share

Share is a peer-to-peer rental marketplace for Azerbaijan. Anyone can list one of their own things (a camera, a drill, a tent, a bike, a console, a dress) and rent it out by the day. Renters search, pick dates and send a booking request; the owner accepts or declines.

**Stack:** Next.js 16 (App Router, TypeScript, Tailwind CSS v4, next-intl az/en) on the front, Java 21 + Spring Boot 3.5 (Spring Security JWT, Data JPA, Flyway, PostgreSQL / H2) on the back.

Azerbaijani is the default language; every page has an English switch.

![Home — discovery](docs/screenshots/home-1440.webp)

## Portfolio notes

| | |
|---|---|
| **What it shows** | A real two-sided marketplace: auth with refresh tokens, search with filters, availability calendar, a booking state machine guarded by a transactional overlap check, reviews, wishlist, messaging, host earnings and an admin panel. |
| **Design** | Three deliberate zones. Discovery (home): floating rounded cards over a centred wordmark, one violet accent. Market (category → listing → checkout): a white, photo-first gallery where coral is reserved for actions. Dashboards (host + admin): a dark graphite UI with one cobalt action. The wordmark dot takes the accent of the zone you are in, and pages cross-fade between zones. Inspired by public style references; no third-party brand names, logos or assets are used. |
| **Quality** | Responsive 320–1920 px, WCAG AA contrast, keyboard-operable calendar and dialogs, 44 px tap targets, JSON-LD (Organization, WebSite, Product/Offer), sitemap with hreflang, `robots.txt`, `llms.txt`. |
| **Resilience** | The free API sleeps. If it does not answer within 8 s, the site shows a bundled snapshot of the seed with a "server is waking up" banner, then swaps in live data when the API is back. With no API configured at all (`NEXT_PUBLIC_API_URL` unset) it makes no API calls and runs browse-only on the snapshot. |

### Architecture

```mermaid
flowchart LR
  subgraph Browser
    UI["Next.js pages<br/>(discovery · market · dashboards)"]
    Snap[("Demo snapshot<br/>cold-start fallback")]
  end
  subgraph Vercel
    SSR["Next.js server<br/>ISR · metadata · JSON-LD · sitemap"]
  end
  subgraph Render["Render (Docker, Frankfurt)"]
    API["Spring Boot API<br/>JWT · validation · OpenAPI"]
    Store["StorageService<br/>(local disk → S3/Cloudinary)"]
  end
  DB[("Neon PostgreSQL<br/>Flyway V1 schema · V2 seed")]

  UI -- "REST + Bearer JWT" --> API
  SSR -- "public reads (8 s timeout)" --> API
  UI -. "API asleep > 8 s" .-> Snap
  API --> DB
  API --> Store
```

### Booking rules

- Rental days are inclusive: pick up on the 3rd, return on the 5th = 3 days. **Price = days × daily price**; the deposit is shown separately and refunded on return.
- `REQUESTED → ACCEPTED | DECLINED`, `ACCEPTED → COMPLETED | CANCELLED`, `REQUESTED → CANCELLED`. Reviews unlock after `COMPLETED`.
- **No double bookings.** Creating or accepting a booking runs in one transaction that first locks the listing row (`SELECT … FOR UPDATE`), then checks for overlapping `REQUESTED`/`ACCEPTED` bookings and host blocks. Accepting a request auto-declines overlapping requests. `BookingOverlapTest` races 4 threads for the same dates; exactly one wins.

## Demo accounts

The three demo accounts below share the password **`Demo1234!`**; no other seed user can sign in. The login page has one-click buttons for the three below.

| Role | Email | What to try |
|---|---|---|
| Renter | `aysel@share.az` | Book something, see *My rentals*, review the completed studio-lights rental, message a host |
| Host | `rashad@share.az` | Host dashboard: earnings chart, two pending requests to accept/decline, create a listing of your own with photos and edit it, block days |
| Admin (read-only) | `demo-admin@share.az` | Every admin screen is visible, but **every write is blocked**: the API answers `403 DEMO_READ_ONLY` and the UI shows a friendly toast |

### How the public demo protects itself

Three accounts are public logins, so everything they can do or read is public. Nobody else in the seed can sign in: the other seed users have a placeholder instead of a password hash.

| Account | What is locked down (server-side) |
|---|---|
| **Demo admin** | Read-only: every write is refused with `403 DEMO_READ_ONLY`. It also never sees visitors' personal data: one response filter (`DemoAdminRedaction`) rewrites **every** JSON response for this account. E-mails are masked (`a***@domain`), private text (booking notes, messages, report reasons) is shown only for seed rows, and any text field that is not on an explicit allow-list is nulled, so a field added later is hidden by default. User search does not match on e-mail for this account. |
| **Demo renter, demo host** | `DemoGuard`: through these accounts the seeded listings (and their photos and calendar blocks) cannot be edited, archived or deleted, and the accounts' own profiles cannot be edited (`403 DEMO_PROTECTED`, shown as a friendly toast). Visitors can still create their own listings and bookings with them and edit those freely, and can accept / decline / cancel the seeded requests. |

**Cleanup instead of a full reset.** A scheduled job (`DemoCleanup`, hourly) removes what visitors left on the shared demo data once it is older than 24 hours: listings created with the demo accounts, bookings / reviews / conversations / calendar blocks that anyone put on seeded listings (most seed hosts cannot log in, so such requests would otherwise hold dates for ever), bookings and reports made with the demo accounts, and new messages in seeded conversations. Seeded bookings return to their original status, and the rating and review count of every listing that lost reviews are recalculated. Each run is a single transaction. Listings that registered visitors create on their own accounts are never touched. Wishlist hearts are not reset.

Sign-in is rate-limited (8 failed attempts per address and e-mail, 40 per address, in 10 minutes → `429`; the three public demo accounts are exempt from the per-e-mail lock, since their password is public, but not from the per-address one), refresh tokens rotate on every use and `POST /api/auth/logout` revokes them.

A real admin is created at startup from `ADMIN_EMAIL` / `ADMIN_PASSWORD` (dev default: `admin@share.local` / `admin-dev-only`; never used in production).

## Run locally

Requirements: JDK 21 and Node 20+. No database or Docker is needed; the dev profile uses in-memory H2 with the seed.

```bash
# 1) API on http://localhost:8080 (Swagger UI: /swagger-ui.html)
cd backend
./mvnw spring-boot:run

# 2) Web on http://localhost:3000
cd frontend
cp .env.example .env.local     # NEXT_PUBLIC_API_URL=http://localhost:8080
npm install
npm run dev
```

### Tests

```bash
cd backend && ./mvnw -B verify          # JUnit 5 · MockMvc · @DataJpaTest (38 tests)
cd frontend && npm run lint && npm run typecheck && npm test   # ESLint · tsc · Vitest (12 tests)

# end-to-end flows: API on :8080, then a production build of the web app on :3000
cd frontend && NEXT_PUBLIC_API_URL=http://localhost:8080 npm run build && npm start &
cd frontend && npx playwright test          # 14 flows; restart the API first for a fresh database
# a build made WITHOUT NEXT_PUBLIC_API_URL must send no API request (start it, then:)
cd frontend && node scripts/no-api-check.mjs
# screenshots + layout audit (overflow, console errors, tap targets under 44 px)
cd frontend && node scripts/screenshots.mjs ../docs/screenshots
```

GitHub Actions runs both pipelines (`.github/workflows/backend.yml`, `frontend.yml`). The backend workflow also builds the Docker image and boots it with the `prod` profile against a real PostgreSQL 17 (migrations, seed, logins, sandbox, CORS). The frontend workflow also runs the Playwright flows against a real API.

## API

Base URL `/api`. JSON, ISO dates (`YYYY-MM-DD`). Errors look like `{"status":409,"code":"BOOKING_CONFLICT","message":"…"}`. Full schema: `/swagger-ui.html` and `/v3/api-docs`.

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/auth/register` · `/auth/login` · `/auth/refresh` · `/auth/logout` | – | Access token (15 min) + single-use refresh token (14 days); logout revokes it; login is rate-limited |
| GET | `/auth/me` · PUT `/users/me` | user | Current profile |
| GET | `/users/{id}` | – | Public profile |
| GET | `/categories` | – | Active categories with listing counts |
| GET | `/listings?q&category&city&minPrice&maxPrice&from&to&sort&page&size` | – | Search: text, category, city, price range, free dates; sort `newest·price_asc·price_desc·rating`; paged |
| GET | `/listings/{id}` | – | Detail with photos, host, reviews, unavailable ranges |
| POST · PUT · DELETE | `/listings` · `/listings/{id}` | owner | Create, edit, archive |
| POST · DELETE | `/listings/{id}/photos` · `/listings/{id}/photos/{photoId}` | owner | Multipart upload (JPEG/PNG/WebP, ≤ 5 MB, ≤ 8 photos) |
| GET · POST · DELETE | `/listings/{id}/blocks[/{blockId}]` | owner | Calendar blocks |
| POST | `/listings/{id}/reports` | user | Report a listing |
| POST | `/bookings` | user | Request dates (409 on overlap) |
| GET | `/bookings/mine` · `/bookings/incoming?status` · `/bookings/{id}` | user | Renter / host views |
| POST | `/bookings/{id}/accept · decline · cancel · complete` | host / renter | Lifecycle |
| POST | `/bookings/{id}/review` | renter | 1–5 stars after completion |
| GET · PUT · DELETE | `/wishlist` · `/wishlist/ids` · `/wishlist/{listingId}` | user | Favourites |
| GET · POST | `/conversations` · `/conversations/{id}/messages` · `/conversations/unread-count` | user | Renter ↔ host threads |
| GET | `/host/listings` · `/host/earnings` | user | Host dashboard |
| GET | `/admin/stats` | admin | KPIs, bookings by status, sign-ups |
| GET · PATCH | `/admin/users` · `/admin/listings` · `/admin/bookings` · `/admin/reports` | admin | Moderation (block users, hide listings, resolve reports) |
| GET · POST · PUT · DELETE | `/admin/categories` | admin | Category CRUD |
| GET | `/uploads/**` · `/actuator/health` | – | Uploaded photos · health |

## Deploy

Do the steps in this order: the web app needs the API's URL, and the API needs the web app's origin for CORS. Until `NEXT_PUBLIC_API_URL` is set, the web app makes **no API calls at all** and shows the bundled demo snapshot (browse-only), so the Vercel project can safely go first.

**1. Web → Vercel (browse-only at first)**

1. Import `codelady-ship/kirayla-rental` and set **Root Directory = `frontend`** (framework preset: Next.js, default build and install commands).
2. Set one variable for now: `NEXT_PUBLIC_SITE_URL=https://<the domain Vercel gives the project>` (no trailing slash). Do **not** set `NEXT_PUBLIC_API_URL` yet.
3. Deploy and note the production domain; it is the CORS origin in step 3.

**2. Database → Neon**

1. Create a project in region **AWS eu-central-1 (Frankfurt)**, PostgreSQL 17.
2. Copy the **direct** connection string (connection pooling switched off): `postgresql://USER:PASSWORD@ep-xxx.eu-central-1.aws.neon.tech/neondb?sslmode=require`. It is a secret: paste it only into Render.

**3. API → Render (free web service, Frankfurt)**

1. **New → Blueprint**, pick this repo. `render.yaml` defines one Docker web service (`kirayla-api`, `rootDir: backend`, health check `/actuator/health`) and no Render database.
2. Fill in the variables Render asks for (`sync: false`):
   - `DATABASE_URL` = the Neon string from step 2
   - `CORS_ALLOWED_ORIGINS` = `https://<vercel-domain>` from step 1 (comma-separated origin patterns if there are several; add `https://antiqa-portfolio.vercel.app,https://antiqacode.vercel.app` only if those pages call the API themselves — embedding the site in an iframe does not need it)
   - `PUBLIC_BASE_URL` = the service's own URL, shown by Render after creation (`https://<service>.onrender.com`); set it, then redeploy once
   - `ADMIN_EMAIL` / `ADMIN_PASSWORD` = optional real (writable) admin; leave empty to have only the read-only demo admin
   - `JWT_SECRET` is generated by Render; `SPRING_PROFILES_ACTIVE=prod` comes from the blueprint.
3. First boot: Flyway creates the schema and loads the seed. Check `https://<service>.onrender.com/actuator/health` → `{"status":"UP"}` and `/api/listings?size=1` → `"totalElements":40`.

**4. Connect the two**

1. In Vercel add `NEXT_PUBLIC_API_URL=https://<service>.onrender.com` (no trailing slash) and **redeploy** (the value is baked in at build time).
2. Open the site, sign in with a demo account, and check the response headers: `Content-Security-Policy: frame-ancestors 'self' https://antiqa-portfolio.vercel.app https://antiqacode.vercel.app` and no `X-Frame-Options`, so the portfolio modal can embed the demo, admin panel included.

Notes: the free Render service sleeps after 15 minutes; the first request then takes 30–60 s, during which the site shows the snapshot and swaps in live data by itself. Uploaded photos live on the container disk, which the free plan wipes on every redeploy or restart — plug an S3/Cloudinary implementation into `StorageService` for durable storage.

## Screenshots

| | |
|---|---|
| ![Category](docs/screenshots/category-1440.webp) | ![Listing](docs/screenshots/listing-1440.webp) |
| ![Checkout](docs/screenshots/booking-1440.webp) | ![Host dashboard](docs/screenshots/host-1440.webp) |
| ![Admin](docs/screenshots/admin-1440.webp) | ![Phone](docs/screenshots/home-390.webp) |

WebP, at most 1280 px wide (`scripts/screenshots.mjs` converts with ffmpeg). More sizes (1920 / 1440 / 768 / 390) are in [`docs/screenshots`](docs/screenshots); the English versions are in [`docs/screenshots/en`](docs/screenshots/en).

## Data & credits

The seed (`backend/src/main/resources/db/migration/V2__seed_demo_data.sql`) and the frontend cold-start snapshot are both generated by `node scripts/seed/gen-seed.mjs`. It holds 22 users in Baku, Ganja and Sumgait, 10 categories, 40 listings, 104 photos, 114 bookings and 86 reviews.

All photos come from **Wikimedia Commons** under CC0, public domain, CC BY or CC BY-SA. Each photo is hot-linked and credited to its author, with licence and source link, on the listing page (*Photo credits*).

Share is a portfolio project. Payments are not real.
