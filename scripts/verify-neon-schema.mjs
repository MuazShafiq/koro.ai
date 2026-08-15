import pg from "pg";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to verify the Neon schema.");
}

const client = new pg.Client({ connectionString: databaseUrl });

try {
  await client.connect();
  const { rows } = await client.query(`
    select tablename, rowsecurity
    from pg_tables
    where schemaname = 'public'
    order by tablename
  `);

  if (rows.length === 0 || rows.some((row) => !row.rowsecurity)) {
    throw new Error("Expected every public table to exist with RLS enabled.");
  }

  console.log(
    rows.map((row) => `${row.tablename}:rls`).join("\n"),
  );
} finally {
  await client.end();
}
