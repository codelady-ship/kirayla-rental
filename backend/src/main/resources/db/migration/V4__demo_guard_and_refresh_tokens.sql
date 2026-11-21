-- Demo protection and revocable refresh tokens. Portable between H2 (MODE=PostgreSQL) and PostgreSQL.

-- The public demo renter and demo host: visitors may create their own data with these accounts, but the
-- seeded catalogue and the accounts' profiles are guarded server-side (see DemoGuard) and tidied by DemoCleanup.
ALTER TABLE users ADD COLUMN demo_protected BOOLEAN NOT NULL DEFAULT FALSE;
UPDATE users SET demo_protected = TRUE WHERE email IN ('aysel@kirayla.az', 'rashad@kirayla.az');

-- Every booking that exists now is seed data: remember its status so the nightly cleanup can restore it
-- after visitors accept / decline / cancel it through the demo accounts.
ALTER TABLE bookings ADD COLUMN seed_status VARCHAR(16);
UPDATE bookings SET seed_status = status;

-- One row per issued refresh token (the JWT's jti). A token is usable once: refreshing deletes the row and
-- issues a new one; logging out deletes it.
CREATE TABLE refresh_tokens (
    id          VARCHAR(64) PRIMARY KEY,
    user_id     BIGINT      NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    expires_at  TIMESTAMP   NOT NULL,
    created_at  TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX ix_refresh_tokens_user ON refresh_tokens (user_id);
