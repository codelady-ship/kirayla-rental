-- Rebrand to "Share": the seeded accounts' e-mail domain and the bootstrapped admin's display name.
-- V1–V4 stay byte-for-byte unchanged (Flyway checksums); V2 still inserts the old @kirayla.az addresses and this
-- migration renames them. Portable between H2 (MODE=PostgreSQL) and PostgreSQL. Only UPDATEs, no deletes.

-- Seed accounts only (id < 10000, see SeedData.FIRST_VISITOR_ID): accounts visitors registered are never touched.
-- A row is skipped if its new address is already taken, so the unique e-mail constraint can never fail the deploy.
UPDATE users
SET email = REPLACE(email, '@kirayla.az', '@share.az')
WHERE id < 10000
  AND email LIKE '%@kirayla.az'
  AND NOT EXISTS (SELECT 1 FROM users other WHERE LOWER(other.email) = LOWER(REPLACE(users.email, '@kirayla.az', '@share.az')));

-- The admin AdminBootstrap creates from ADMIN_EMAIL was named "Kirayla Admin"; it is listed on the admin screens.
UPDATE users SET full_name = 'Share Admin' WHERE full_name = 'Kirayla Admin' AND role = 'ADMIN';
