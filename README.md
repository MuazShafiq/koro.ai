# Koro.ai

Koro.ai is a voice-first tutoring application built with Next.js. It uses
Cloudflare Workers AI for lesson generation and speech, Neon for authentication
and Postgres data, and Vercel Blob for generated audio.

**Live app:** [koro-ai-lime.vercel.app](https://koro-ai-lime.vercel.app)

## Local development

Requirements: Node.js 20.9+, npm, a Neon project with Auth and the Data API
enabled, a Vercel Blob store, and Cloudflare Workers AI credentials.

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

Open <http://localhost:3000>. Sign up or log in, choose a subject and topic,
then start a tutor session.

Required `.env.local` values:

```dotenv
DATABASE_URL=
NEON_AUTH_BASE_URL=
NEXT_PUBLIC_NEON_AUTH_URL=
NEON_DATA_API_URL=
NEXT_PUBLIC_NEON_DATA_API_URL=
NEON_AUTH_COOKIE_SECRET=
BLOB_READ_WRITE_TOKEN=

CLOUDFLARE_ACCOUNT_ID=
CLOUDFLARE_AI_TOKEN=
```

`NEON_AUTH_COOKIE_SECRET` must be at least 32 characters. Never expose the
database URL, cookie secret, Blob token, or Cloudflare token through a
`NEXT_PUBLIC_` variable.

## Database setup

Enable Neon Auth and the Neon Data API, then run
[`neon/migrations/0001_koro_schema.sql`](./neon/migrations/0001_koro_schema.sql)
in the Neon SQL Editor. The migration creates the application schema, functions,
grants, and row-level security policies. More detail is in
[`neon/README.md`](./neon/README.md).

## Deployment

Connect the repository to Vercel, add Neon through the Vercel Marketplace, and
create a Vercel Blob store linked to the same project. Add the Cloudflare values
and `NEON_AUTH_COOKIE_SECRET` to the Vercel environment, then deploy normally.

Neon compute scales to zero when idle and wakes on the next request, which makes
this architecture suitable for a portfolio project without a weekly activity
requirement. Provider free-plan allocations can change.

Outstanding engineering and release work is tracked in [ISSUES.md](./ISSUES.md).
