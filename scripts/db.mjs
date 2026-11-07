// Tooling only (never bundled into the app). Usage:
//   npm run db:migrate   apply pending db/migrations/*.sql in order
//   npm run db:seed      run db/seed.sql (idempotent)
// Reads DATABASE_URL from the environment (npm scripts load .env.local via --env-file).
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import pg from "pg";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set (put it in .env.local).");
  process.exit(1);
}

const root = path.resolve(import.meta.dirname, "..", "db");
const cmd = process.argv[2];
const client = new pg.Client({ connectionString: url });
await client.connect();

try {
  if (cmd === "migrate") {
    await client.query(
      `create table if not exists public.schema_migrations (
         name text primary key, applied_at timestamptz not null default now())`,
    );
    const done = new Set(
      (await client.query("select name from public.schema_migrations")).rows.map((r) => r.name),
    );
    const files = (await readdir(path.join(root, "migrations"))).filter((f) => f.endsWith(".sql")).sort();
    let applied = 0;
    for (const file of files) {
      if (done.has(file)) continue;
      const sql = await readFile(path.join(root, "migrations", file), "utf8");
      await client.query("begin");
      try {
        await client.query(sql);
        await client.query("insert into public.schema_migrations (name) values ($1)", [file]);
        await client.query("commit");
      } catch (err) {
        await client.query("rollback");
        throw new Error(`Migration ${file} failed: ${err.message}`);
      }
      console.log(`applied ${file}`);
      applied++;
    }
    console.log(applied ? `Done (${applied} applied).` : "Up to date.");
  } else if (cmd === "seed") {
    await client.query(await readFile(path.join(root, "seed.sql"), "utf8"));
    console.log("Seed applied.");
  } else {
    console.error("Usage: node scripts/db.mjs <migrate|seed>");
    process.exit(1);
  }
} finally {
  await client.end();
}
