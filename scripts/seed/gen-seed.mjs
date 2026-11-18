// Generates backend/src/main/resources/db/migration/V2__seed_demo_data.sql and the frontend
// cold-start snapshot (frontend/src/lib/demo/demo-data.json) from one catalogue, so both match.
//   node scripts/seed/gen-seed.mjs
// Photos: Wikimedia Commons, CC0 / public domain / CC BY / CC BY-SA, credited per photo (photos.json).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { categories, items, users, reviewTexts } from "./items-data.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const photos = JSON.parse(fs.readFileSync(path.join(here, "photos.json"), "utf8"));
// BCrypt(10) of the documented demo password "Demo1234!" — demo only, never a real secret.
const DEMO_HASH = "$2a$10$wCZhoj5cAMKybbSiwllduehv5fm3jkhhrilI0qlEbNyDOJ5F1vSUG";

// deterministic PRNG so the seed is stable between runs
let s = 20261118;
const rnd = () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648);
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];

const q = (v) => (v === null || v === undefined ? "NULL" : `'${String(v).replace(/'/g, "''")}'`);
const day = (n) => (n >= 0 ? `CAST(CURRENT_DATE + INTERVAL '${n}' DAY AS DATE)` : `CAST(CURRENT_DATE - INTERVAL '${-n}' DAY AS DATE)`);
const ts = (daysAgo, hours = 0) => `CURRENT_TIMESTAMP - INTERVAL '${daysAgo * 24 + hours}' HOUR`;

const listingId = Object.fromEntries(items.map((it, i) => [it[0], i + 1]));
const listings = items.map((it, i) => ({
  id: i + 1, key: it[0], categoryId: it[1], ownerId: it[2], title: it[3], description: it[4], city: it[5],
  district: it[6], dailyPrice: it[7], deposit: it[8], condition: it[9], minDays: it[10], maxDays: it[11],
  createdDaysAgo: 20 + Math.floor(rnd() * 300),
}));

// ---- bookings ---------------------------------------------------------------------------
const bookings = [];
const taken = {}; // listingId -> [[from,to]] (day offsets)
const free = (lid, a, b) => !(taken[lid] ?? []).some(([x, y]) => a <= y && x <= b);
function addBooking(key, renterId, start, days, status, extra = {}) {
  const l = listings[listingId[key] - 1];
  const end = start + days - 1;
  if (!free(l.id, start, end)) return null;
  (taken[l.id] ??= []).push([start, end]);
  const b = {
    id: bookings.length + 1, listingId: l.id, renterId, start, end, days, dailyPrice: l.dailyPrice,
    rentalTotal: l.dailyPrice * days, deposit: l.deposit, status, createdDaysAgo: Math.max(1, -start + 6), ...extra,
  };
  bookings.push(b);
  return b;
}
const renters = [1, 10, 11, 12, 4, 5, 9];

// Story bookings used by the demo walkthrough
addBooking("softbox", 1, -6, 3, "COMPLETED", { noReview: true, message: "Məhsul çəkilişi üçün lazımdır." });
addBooking("gopro", 1, 10, 3, "ACCEPTED", { message: "Şahdağ səfərinə götürürəm, su qutusu da lazımdır." });
addBooking("snowboard", 1, 20, 3, "REQUESTED", { message: "Çəkmə ölçüm 41-dir." });
addBooking("canon-r6", 11, 5, 3, "REQUESTED", { message: "Salam! Bacımın nişanı üçün lazımdır, 3 günlük." });
addBooking("tent", 12, 14, 4, "REQUESTED", { message: "Qusara 4 nəfər gedirik, çadır vaxtında hazır olarmı?" });
addBooking("projector", 10, 3, 2, "ACCEPTED", { message: "Həyətdə kino gecəsi edirik." });
addBooking("drone", 11, -40, 2, "DECLINED");
addBooking("ps5", 1, -25, 2, "CANCELLED");

// History: completed rentals spread over the last ~11 months (host earnings + reviews)
for (const l of listings) {
  const n = l.ownerId === 2 ? 5 : 1 + Math.floor(rnd() * 3);
  for (let k = 0; k < n; k++) {
    const start = -(12 + Math.floor(rnd() * 320));
    const days = Math.max(l.minDays, 1 + Math.floor(rnd() * Math.min(4, l.maxDays)));
    const renter = pick(renters.filter((r) => r !== l.ownerId));
    addBooking(l.key, renter, start, days, "COMPLETED");
  }
}
bookings.sort((a, b) => a.start - b.start).forEach((b, i) => (b.id = i + 1));

// ---- reviews -----------------------------------------------------------------------------
const reviews = [];
for (const b of bookings) {
  if (b.status !== "COMPLETED" || b.noReview || rnd() < 0.2) continue;
  const [rating, comment] = pick(reviewTexts);
  reviews.push({ id: reviews.length + 1, bookingId: b.id, listingId: b.listingId, authorId: b.renterId, rating, comment, daysAgo: Math.max(1, -b.end - 1) });
}
for (const l of listings) {
  const rs = reviews.filter((r) => r.listingId === l.id);
  l.reviewCount = rs.length;
  l.ratingAvg = rs.length ? Math.round((rs.reduce((a, r) => a + r.rating, 0) / rs.length) * 100) / 100 : 0;
}

// ---- conversations & messages --------------------------------------------------------------
const conversations = [
  { id: 1, key: "canon-r6", renterId: 1, hostId: 2, msgs: [[1, "Salam, Rəşad! Fotoaparatla birlikdə ştativ də verirsiniz?", 3, 2], [2, "Salam, Aysel! Bəli, yüngül ştativ və əlavə batareya da verirəm.", 3, 1], [1, "Əla, gələn ay üçün bron edəcəyəm. Təşəkkürlər!", 2, 20]] },
  { id: 2, key: "tent", renterId: 12, hostId: 2, msgs: [[12, "Qusara 4 nəfər gedirik, çadır vaxtında hazır olarmı?", 1, 5]] },
  { id: 3, key: "canon-r6", renterId: 11, hostId: 2, msgs: [[11, "Salam! Bacımın nişanı üçün lazımdır, 3 günlük.", 1, 3], [2, "Salam, Orxan! Tarixləri yoxlayıb təsdiqləyəcəyəm.", 0, 22]] },
  { id: 4, key: "gopro", renterId: 1, hostId: 2, msgs: [[1, "Şahdağ səfərinə götürürəm, su qutusu da lazımdır.", 4, 1], [2, "Əlbəttə, qutunu da əlavə edirəm. Gözəl səfər!", 4, 0]] },
];
let msgId = 0;
const messages = conversations.flatMap((c) => c.msgs.map(([sender, body, d, h]) => ({ id: ++msgId, cid: c.id, sender, body, d, h })));

// ---- SQL -------------------------------------------------------------------------------------
const L = [];
L.push("-- Demo data for the Kirayla portfolio. GENERATED by scripts/seed/gen-seed.mjs — do not edit by hand.");
L.push("-- All demo users share the password Demo1234! (documented in README). Dates are relative to CURRENT_DATE.");
L.push("-- Photos: Wikimedia Commons (CC0 / public domain / CC BY / CC BY-SA), credited in listing_photos.credit.\n");
for (const [id, email, name, city, bio, role, ro] of users)
  L.push(`INSERT INTO users (id, email, password_hash, full_name, city, bio, avatar_url, role, enabled, demo_read_only, created_at) VALUES (${id}, ${q(email)}, ${q(DEMO_HASH)}, ${q(name)}, ${q(city)}, ${q(bio)}, NULL, ${q(role)}, TRUE, ${ro ? "TRUE" : "FALSE"}, ${ts(400 - id * 17)});`);
L.push("");
for (const [id, slug, az, en, icon] of categories)
  L.push(`INSERT INTO categories (id, slug, name_az, name_en, icon, sort_order, active) VALUES (${id}, ${q(slug)}, ${q(az)}, ${q(en)}, ${q(icon)}, ${id}, TRUE);`);
L.push("");
for (const l of listings)
  L.push(`INSERT INTO listings (id, owner_id, category_id, title, description, city, district, daily_price, deposit, item_condition, min_days, max_days, status, rating_avg, review_count, created_at, updated_at) VALUES (${l.id}, ${l.ownerId}, ${l.categoryId}, ${q(l.title)}, ${q(l.description)}, ${q(l.city)}, ${q(l.district)}, ${l.dailyPrice}, ${l.deposit}, ${q(l.condition)}, ${l.minDays}, ${l.maxDays}, 'ACTIVE', ${l.ratingAvg}, ${l.reviewCount}, ${ts(l.createdDaysAgo)}, ${ts(Math.max(1, l.createdDaysAgo - 5))});`);
L.push("");
let photoId = 0;
for (const l of listings)
  (photos[l.key] ?? []).forEach((p, i) =>
    L.push(`INSERT INTO listing_photos (id, listing_id, url, storage_key, credit, credit_url, sort_order) VALUES (${++photoId}, ${l.id}, ${q(p.url)}, NULL, ${q(p.credit)}, ${q(p.creditUrl)}, ${i});`));
L.push("");
L.push(`INSERT INTO availability_blocks (id, listing_id, start_date, end_date, note) VALUES (1, ${listingId.drone}, ${day(8)}, ${day(9)}, 'Şəxsi istifadə');`);
L.push(`INSERT INTO availability_blocks (id, listing_id, start_date, end_date, note) VALUES (2, ${listingId.sup}, ${day(25)}, ${day(30)}, 'Göygöl səfəri');`);
L.push("");
for (const b of bookings)
  L.push(`INSERT INTO bookings (id, listing_id, renter_id, start_date, end_date, days, daily_price, rental_total, deposit, status, message, created_at, updated_at) VALUES (${b.id}, ${b.listingId}, ${b.renterId}, ${day(b.start)}, ${day(b.end)}, ${b.days}, ${b.dailyPrice}, ${b.rentalTotal}, ${b.deposit}, ${q(b.status)}, ${q(b.message ?? null)}, ${ts(b.createdDaysAgo)}, ${ts(Math.max(0, -b.end))});`);
L.push("");
for (const r of reviews)
  L.push(`INSERT INTO reviews (id, booking_id, listing_id, author_id, rating, comment, created_at) VALUES (${r.id}, ${r.bookingId}, ${r.listingId}, ${r.authorId}, ${r.rating}, ${q(r.comment)}, ${ts(r.daysAgo)});`);
L.push("");
for (const lid of ["drone", "ps5", "sup", "national"].map((k) => listingId[k]))
  L.push(`INSERT INTO wishlist_items (user_id, listing_id, created_at) VALUES (1, ${lid}, ${ts(5)});`);
L.push("");
for (const c of conversations) {
  const last = c.msgs[c.msgs.length - 1];
  L.push(`INSERT INTO conversations (id, listing_id, renter_id, host_id, created_at, last_message_at) VALUES (${c.id}, ${listingId[c.key]}, ${c.renterId}, ${c.hostId}, ${ts(c.msgs[0][2], c.msgs[0][3])}, ${ts(last[2], last[3])});`);
}
for (const m of messages)
  L.push(`INSERT INTO messages (id, conversation_id, sender_id, body, created_at, read_at) VALUES (${m.id}, ${m.cid}, ${m.sender}, ${q(m.body)}, ${ts(m.d, m.h)}, ${m.d > 1 ? ts(m.d, Math.max(0, m.h - 1)) : "NULL"});`);
L.push("");
const reports = [
  [1, "vr", 11, "Şəkillər başqa məhsula aid görünür.", "OPEN", 2],
  [2, "gown", 12, "Ölçü təsvirdə yazılandan fərqlidir.", "OPEN", 4],
  [3, "washer", 1, "Bu elan dublikat kimi görünür.", "OPEN", 1],
  [4, "lights", 11, "Telefon nömrəsi təsvirdə yazılmışdı.", "RESOLVED", 20],
];
for (const [id, key, rep, reason, st, d] of reports)
  L.push(`INSERT INTO reports (id, listing_id, reporter_id, reason, status, created_at) VALUES (${id}, ${listingId[key]}, ${rep}, ${q(reason)}, ${q(st)}, ${ts(d)});`);

const sqlPath = path.join(root, "backend/src/main/resources/db/migration/V2__seed_demo_data.sql");
fs.writeFileSync(sqlPath, L.join("\n") + "\n");

// ---- frontend snapshot (cold-start fallback) -------------------------------------------------
const now = Date.now();
const iso = (daysAgo) => new Date(now - daysAgo * 864e5).toISOString();
const userById = Object.fromEntries(users.map(([id, , name, city, bio]) => [id, { id, name, city, bio }]));
const catDto = (id) => {
  const [cid, slug, nameAz, nameEn, icon] = categories.find((c) => c[0] === id);
  return { id: cid, slug, nameAz, nameEn, icon };
};
const publicUser = (id) => {
  const own = listings.filter((l) => l.ownerId === id);
  const rs = reviews.filter((r) => own.some((l) => l.id === r.listingId));
  return {
    ...userById[id], avatarUrl: null, joinedAt: iso(400 - id * 17), listingCount: own.length,
    ratingAvg: rs.length ? Math.round((rs.reduce((a, r) => a + r.rating, 0) / rs.length) * 100) / 100 : 0, reviewCount: rs.length,
  };
};
const card = (l) => ({
  id: l.id, title: l.title, city: l.city, district: l.district, dailyPrice: l.dailyPrice, deposit: l.deposit,
  coverUrl: photos[l.key]?.[0]?.url ?? null, category: catDto(l.categoryId), ratingAvg: l.ratingAvg, reviewCount: l.reviewCount,
  hostId: l.ownerId, hostName: userById[l.ownerId].name, status: "ACTIVE", createdAt: iso(l.createdDaysAgo),
});
const snapshot = {
  generatedFrom: "scripts/seed/gen-seed.mjs",
  categories: categories.map(([id]) => ({ ...catDto(id), listingCount: listings.filter((l) => l.categoryId === id).length, sortOrder: id, active: true })),
  listings: listings.map((l) => ({
    ...card(l), description: l.description, condition: l.condition, minDays: l.minDays, maxDays: l.maxDays,
    photos: (photos[l.key] ?? []).map((p, i) => ({ id: l.id * 100 + i, url: p.url, credit: p.credit, creditUrl: p.creditUrl })),
    host: publicUser(l.ownerId), unavailable: [],
    reviews: reviews.filter((r) => r.listingId === l.id).slice(-20).reverse().map((r) => ({
      id: r.id, rating: r.rating, comment: r.comment, createdAt: iso(r.daysAgo), author: { id: r.authorId, name: userById[r.authorId].name, avatarUrl: null },
    })),
  })),
};
const snapDir = path.join(root, "frontend/src/lib/demo");
fs.mkdirSync(snapDir, { recursive: true });
fs.writeFileSync(path.join(snapDir, "demo-data.json"), JSON.stringify(snapshot));
console.log(`users=${users.length} categories=${categories.length} listings=${listings.length} photos=${photoId} bookings=${bookings.length} reviews=${reviews.length} messages=${messages.length}`);
