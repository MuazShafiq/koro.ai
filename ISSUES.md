# Koro.ai issue inventory

Last reviewed: 2026-08-02

## Release blockers

- [ ] Add per-user and per-IP limits to AI and speech endpoints so public abuse
  cannot exhaust the free Cloudflare allocation.
- [ ] Make lesson audio storage private and return signed URLs. The current
  `lessons` bucket is publicly readable.
- [ ] Add retention cleanup for generated lesson audio; timestamped objects are
  currently retained indefinitely.
- [ ] Review student privacy and deletion behavior before collecting real learner
  data, especially the age, school, location, and free-text profile fields.
- [ ] Resolve the four high-severity dependency findings currently reported by
  npm without accepting its unsafe major-version downgrade suggestion.

## Product work

- [ ] Replace hard-coded hosted settings/profile defaults and connect every
  visible control to persisted Supabase preferences.
- [ ] Replace remaining demo progress defaults in the client store with values
  loaded from Supabase.
- [ ] Decide whether PDF/resource ingestion is an administrator-only workflow
  and build that protected backend workflow; students should not upload sources.
- [ ] Add graceful, consistent responses when a provider free allocation is
  exhausted or temporarily unavailable.
- [ ] Measure cold session startup in deployment and cache reusable lesson plans
  where appropriate. The first uncached plan and speech request will remain
  slower than later requests.

## Maintainability debt

- [ ] Split `AITutorInterface.tsx` into session, speech, sequencing, chat, and
  blackboard hooks/components. It is still the largest and riskiest file.
- [ ] Split the large tutor route handlers into authentication, persistence,
  prompt, and speech helpers.
- [ ] Replace the remaining loose `any` values with database/API boundary types.
- [ ] Apply request schemas consistently at every API boundary; Zod is installed
  but validation is still uneven.
- [ ] Remove the optional offline/local-mode implementation if it is no longer
  useful; it currently duplicates parts of the hosted data and tutor flow.
- [ ] Remove the build-time ESLint bypass after inherited lint debt has been
  cleaned manually.

## Cleanup completed

- [x] Removed the duplicate app backup, obsolete tutor pages, unused lesson and
  voice components, debug scripts, manual credential scripts, historical logs,
  placeholder PDF, and duplicated PostCSS configuration.
- [x] Removed archived/conflicting Supabase migrations and retained one canonical
  migration chain.
- [x] Removed unused frontend dependencies and dead service modules.
- [x] Replaced filesystem logging with serverless-safe structured console output.
- [x] Consolidated hosted speech naming around Cloudflare Workers AI.
