# Supabase setup

The ordered migration chain is:

```text
202607260001_canonical_schema.sql
202607260002_storage_bucket_visibility.sql
```

Use the current project keys in `.env.local`:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=
```

Link and push to the intended project:

```powershell
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

The project reference is the subdomain in
`https://YOUR_PROJECT_REF.supabase.co`. Never run `db reset --linked` against a
project whose data must be retained.
