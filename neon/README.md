# Neon setup

Koro.ai uses Neon Auth, Neon Postgres through the Data API, and Vercel Blob for
generated audio. These services scale to zero without pausing the project after
a week of inactivity.

1. Create or connect a Neon project and enable Neon Auth and the Data API on the
   production branch.
2. Run `migrations/0001_koro_schema.sql` in the Neon SQL Editor.
3. Add the Auth and Data API URLs to the local and Vercel environments.
4. Create a Vercel Blob store linked to the project so Vercel supplies
   `BLOB_READ_WRITE_TOKEN`.
5. Generate a cookie secret with at least 32 characters and set
   `NEON_AUTH_COOKIE_SECRET`.

The database migration is safe for a fresh Neon database. It enables row-level
security on every application table and grants access only to Neon's
`authenticated` Data API role. `initialize_user_profile` creates the user's
profile, preferences, default subjects, and topics after signup.

For a portfolio deployment, leave email/password signup enabled. If email
verification is enabled, the app sends the new user to login until verification
is complete.
