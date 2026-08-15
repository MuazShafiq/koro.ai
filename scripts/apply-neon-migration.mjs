import { readdir, readFile } from "node:fs/promises";

import pg from "pg";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to apply the Neon migration.");
}

const client = new pg.Client({ connectionString: databaseUrl });

try {
  await client.connect();
  await client.query(`
    create schema if not exists app_private;
    create table if not exists app_private.schema_migrations (
      filename text primary key,
      applied_at timestamptz not null default now()
    );
  `);

  const { rows: bootstrapRows } = await client.query(`
    select
      to_regclass('public.profiles') is not null as schema_exists,
      exists (
        select 1
        from app_private.schema_migrations
        where filename = '0001_koro_schema.sql'
      ) as migration_recorded
  `);

  if (bootstrapRows[0].schema_exists && !bootstrapRows[0].migration_recorded) {
    await client.query(`
      insert into app_private.schema_migrations (filename)
      values ('0001_koro_schema.sql')
      on conflict do nothing
    `);
  }

  const migrationsUrl = new URL("../neon/migrations/", import.meta.url);
  const filenames = (await readdir(migrationsUrl))
    .filter((filename) => filename.endsWith(".sql"))
    .sort();

  for (const filename of filenames) {
    const { rowCount } = await client.query(
      "select 1 from app_private.schema_migrations where filename = $1",
      [filename],
    );

    if (rowCount) continue;

    const migration = await readFile(new URL(filename, migrationsUrl), "utf8");

    await client.query("begin");
    try {
      await client.query(migration);
      await client.query(
        "insert into app_private.schema_migrations (filename) values ($1)",
        [filename],
      );
      await client.query("commit");
      console.log(`Applied Neon migration ${filename}.`);
    } catch (error) {
      await client.query("rollback");
      throw error;
    }
  }
} finally {
  await client.end();
}
