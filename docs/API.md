# Kirayla API contract (v1)

This is the contract between `backend/` (Express + Mongoose + zod) and `frontend/` (both the HTTP client and the in-browser DEMO implementation). Both sides follow it exactly. If either side needs a change, it is made here first.

## Conventions

- Base path: `/api`. JSON in and out, except listing create/edit, which is `multipart/form-data`.
- **Auth:** an httpOnly cookie `kirayla_token` holding a JWT (7 days).
  - In production it is `SameSite=None; Secure`. In development and tests it is `SameSite=Lax`.
  - The frontend always sends `credentials: "include"`.
- **CSRF guard:** every non-GET request must carry the header `X-Requested-With: kirayla`; otherwise the API returns `403 csrf`. CORS allows only the origins in `CORS_ORIGINS`, with credentials.
- **Errors** always have this shape: `{ "error": { "code": "string", "message": "human readable (az)", "details"?: any } }`.
  - Codes: `validation` 400, `invalid_dates` 400, `unauthorized` 401, `forbidden` 403, `csrf` 403, `not_found` 404, `conflict` 409, `dates_taken` 409, `too_large` 413, `unsupported_type` 415, `rate_limited` 429.
- **Ids** are strings (`id`, never `_id`). Dates are `YYYY-MM-DD` strings in the Asia/Baku calendar, and timestamps are ISO strings.
- **Money** is whole AZN integers.

## Rental days

- A booking covers the days `from`..`to` **inclusive**, so `days = to - from + 1`.
- `total = days * pricePerDay`. The `deposit` is shown separately and is refundable; it is not part of `total`.
- **Valid dates:** both are real calendar dates, `from >= today (Baku)`, `to >= from`, at most 60 days, and `from` at most 365 days ahead. Anything else returns `400 invalid_dates`.
- **Overlap prevention:** there is a `BookingSlot { listing, day, booking }` collection with a **unique index `{ listing: 1, day: 1 }`**.
  - Creating a booking inserts one slot per day; on E11000 it deletes the slots it already inserted and returns `409 dates_taken`.
  - This must hold under parallel requests.
  - Declined or cancelled bookings delete their slots. Pending, accepted and completed bookings keep them.
- Owners cannot book their own listing (`403 forbidden`). Hidden listings cannot be booked (`404`).

## Enums

- `category`: `texnika` | `kamera` | `aletler` | `kamp` | `idman` | `geyim` | `avto` | `tedbir`
  - Labels (az / en): Texnika / Electronics, Kamera / Cameras, Alətlər / Tools, Kamp / Camping, İdman / Sports, Geyim / Clothing, Avtomobil aksesuarları / Car accessories, Tədbir / Events.
- `city`: `Bakı` | `Gəncə` | `Sumqayıt` | `Şəki` | `Lənkəran`
- Listing `status`: `active` | `hidden`. Only `active` listings appear publicly; the admin sets `hidden`.
- Booking `status`: `pending` | `accepted` | `declined` | `cancelled` | `completed`
- User `role`: `user` | `admin`

## Shapes

```ts
User      { id, name, email, role, city?: string, blocked: boolean, createdAt }
PublicUser{ id, name, createdAt, listingsCount: number }
Listing   { id, slug, title, description, category, city, pricePerDay, deposit, rules: string[],
            images: string[], location: { lat, lng } | null, status,
            owner: PublicUser, rating: number | null /* 1 decimal */, reviewCount, createdAt }
Booking   { id, listing: { id, slug, title, image, city, pricePerDay, deposit },
            renter: { id, name }, owner: { id, name }, from, to, days, pricePerDay, total, deposit,
            status, note, reviewed: boolean, createdAt }
Message   { id, booking: string, sender: { id, name }, text, createdAt }
Review    { id, listing: string, booking: string, author: { id, name }, rating /*1-5*/, comment, createdAt }
Page<T>   { items: T[], total, page, pages }
```

**Image strings:**
- A string starting with `/uploads/` is served by the API, so the frontend prefixes it with the API origin.
- Anything else, for example `img/listings/sony-a7-iii-kamera-1.webp`, is bundled in the frontend, so the frontend prefixes it with `import.meta.env.BASE_URL`.

## Endpoints

### Health and catalogue

| Method | Path | Notes |
|---|---|---|
| GET | `/api/health` | `{ ok: true }` |
| GET | `/api/categories` | `[{ slug, az, en }]` |
| GET | `/api/listings` | Query: `q, category, city, minPrice, maxPrice, from, to, sort (new\|price_asc\|price_desc\|rating), page (1), limit (24, max 48)`. With `from`+`to`, it excludes listings that have any slot in that range (invalid range: 400 invalid_dates). Returns `Page<Listing>`. |
| GET | `/api/listings/:idOrSlug` | `Listing`. Hidden listings return 404 unless the caller is the owner or an admin. |
| GET | `/api/listings/:id/availability` | Query `from, to` (default: today..+90). Returns `{ busy: string[] }`. |
| GET | `/api/listings/:id/reviews` | `Review[]`, newest first. |

### Auth

Auth routes are rate-limited (`AUTH_RATE_LIMIT`, default 20 per 15 min per IP).

| Method | Path | Notes |
|---|---|---|
| POST | `/api/auth/register` | `{ name (2-60), email, password (8-100) }` returns `{ user }` and sets the cookie. A duplicate email returns 409 conflict. |
| POST | `/api/auth/login` | `{ email, password }` returns `{ user }`. Wrong credentials return 401; blocked users get 403. |
| POST | `/api/auth/logout` | Clears the cookie. Returns `{ ok: true }`. |
| GET | `/api/auth/me` | `{ user }`, or 401. |

### My listings (auth)

| Method | Path | Notes |
|---|---|---|
| GET | `/api/me/listings` | `Listing[]` (any status). |
| POST | `/api/listings` | Multipart fields: `title (3-80), description (20-2000), category, city, pricePerDay (1-10000), deposit (0-100000), rules` (JSON string array, at most 10 rules of up to 200 chars), optional `lat`, `lng`; files `images` (1-6 files). Returns 201 `Listing`. |
| PATCH | `/api/listings/:id` | Owner only. Same fields, all optional, plus `keepImages` (a JSON array of existing image strings to keep) and new `images` files. The total must be 1-6. |
| DELETE | `/api/listings/:id` | Owner or admin. Returns 409 conflict if the listing has pending or accepted bookings with `to >= today`. Returns `{ ok: true }`. |

**Image upload rules:**
- JPEG, PNG or WebP, checked by **magic bytes**. Anything else returns 415.
- At most 3 MB per file (413).
- Files are stored on local disk in `UPLOAD_DIR` (default `./uploads`) under random names and served at `/uploads/<name>`.

### Bookings (auth)

| Method | Path | Notes |
|---|---|---|
| POST | `/api/bookings` | `{ listingId, from, to, note? (<=500) }` returns 201 `Booking` (pending). |
| GET | `/api/bookings/mine` | Bookings where I am the renter. |
| GET | `/api/bookings/incoming` | Bookings on my listings. |
| GET | `/api/bookings/:id` | Renter, owner or admin only. |
| PATCH | `/api/bookings/:id` | `{ action }`; see the rules below. Returns `Booking`. Any other transition returns 409 conflict. |
| GET | `/api/bookings/:id/messages` | Renter or owner. Returns `Message[]`, oldest first. |
| POST | `/api/bookings/:id/messages` | `{ text (1-1000) }` returns 201 `Message`. Not allowed when the booking is declined or cancelled (409). |
| POST | `/api/bookings/:id/review` | Renter only, when `completed`. `{ rating 1-5, comment (0-1000) }` returns 201 `Review`. A second review returns 409 (unique index on `booking`). |

`PATCH /api/bookings/:id` actions:
- `accept` and `decline`: the owner, while the booking is pending.
- `cancel`: the renter, while it is pending or accepted.
- `complete`: the owner, while it is accepted and `from <= today`.

### Wishlist (auth)

| Method | Path | Notes |
|---|---|---|
| GET | `/api/wishlist` | `Listing[]` |
| PUT | `/api/wishlist/:listingId` | `{ ok: true }` (idempotent) |
| DELETE | `/api/wishlist/:listingId` | `{ ok: true }` |

### Admin (role admin)

| Method | Path | Notes |
|---|---|---|
| GET | `/api/admin/stats` | `{ users, listings, activeListings, bookings, pendingBookings }` |
| GET | `/api/admin/listings` | Query `status, q, page`. Returns `Page<Listing>`. |
| PATCH | `/api/admin/listings/:id` | `{ status: "active" \| "hidden" }` |
| GET | `/api/admin/users` | Query `q, page`. Returns `Page<User>`. |
| PATCH | `/api/admin/users/:id` | `{ blocked: boolean }`. An admin cannot block themselves or another admin (403). Blocking a user also hides their listings. |

## Seeding

- `shared/seed.json` is the single source of demo data. The backend keeps a copy at `backend/src/data/seed.json` and the frontend at `frontend/src/data/seed.json`; a test checks the copies are identical.
- Seed owners get random, unusable passwords.
- The admin is created **only** from the env vars `ADMIN_EMAIL` and `ADMIN_PASSWORD` (skipped if they are unset).
- Seed reviews have no booking.

## Payments

There are none. The frontend shows a "Ödəniş demo — real ödəniş yoxdur" step before sending the booking request, and the API never handles money.
