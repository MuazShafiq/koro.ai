# Koro.ai

Koro.ai is a voice-first tutoring application built with Next.js. The deployed
product uses Vercel, Supabase, and Cloudflare Workers AI. Localhost runs the
same hosted flow for development; it is not a separate product.

**Live app:** [koro-ai-lime.vercel.app](https://koro-ai-lime.vercel.app)

## Local development

Requirements: Node.js 20+, npm, a Supabase project, and Cloudflare Workers AI
credentials.

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

Open <http://localhost:3000>. Sign up or log in, choose a subject and topic,
then start a tutor session.

Required `.env.local` values:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=

AI_PROVIDER=cloudflare
CLOUDFLARE_ACCOUNT_ID=
CLOUDFLARE_AI_TOKEN=
CLOUDFLARE_AI_MODEL=@cf/meta/llama-3.1-8b-instruct-fast
```

Cloudflare supplies both lesson generation and Aura speech. Supabase stores
accounts, tutor state, progress, resources, and generated audio. The app is
designed to remain within provider free allocations, but those allocations and
limits belong to the providers and can change.

## Database setup

The canonical schema is in `supabase/migrations/`. Link the intended Supabase
project and push it:

```powershell
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

Never expose `SUPABASE_SECRET_KEY` or `CLOUDFLARE_AI_TOKEN` through a
`NEXT_PUBLIC_` variable.

## Deployment

The production app is available at
[koro-ai-lime.vercel.app](https://koro-ai-lime.vercel.app). To deploy your own
instance, create a Vercel project for this repository and add the same hosted
environment variables in Vercel. Use the production Supabase URL and keys. The
application does not require a local model or a long-running local process after
deployment.

An optional offline fallback still exists behind `KORO_LOCAL_MODE=true` and
`NEXT_PUBLIC_KORO_LOCAL_MODE=true`. It is isolated from the normal deployment
path and is not enabled by default.

Outstanding engineering and release work is tracked in [ISSUES.md](./ISSUES.md).
