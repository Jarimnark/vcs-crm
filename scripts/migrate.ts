// Migration runner — replaces `drizzle-kit migrate`, whose CLI can exit
// silently without saying whether anything was applied. This one says what
// it connected to, what it applied, and fails loudly.
import { Pool } from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      'DATABASE_URL is not set. Create local.env (or .env) in the repo root with e.g.\n' +
        '  DATABASE_URL=postgres://vcs:vcs@localhost:8888/vcs_crm\n' +
        '(8888 is the port docker-compose.yml publishes Postgres on.)',
    )
  }
  const target = new URL(process.env.DATABASE_URL)
  console.log(`Migrating ${target.hostname}:${target.port || 5432}/${target.pathname.slice(1)} …`)

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 1,
    connectionTimeoutMillis: 10_000,
  })
  const db = drizzle(pool)

  await migrate(db, { migrationsFolder: './src/db/migrations' })

  const applied = await pool.query(
    'SELECT count(*)::int AS n, max(created_at) AS last FROM drizzle.__drizzle_migrations',
  )
  console.log(
    `✓ Migrations up to date — ${applied.rows[0].n} applied in total.`,
  )
  await pool.end()
}

main().catch((err) => {
  console.error('✗ Migration failed:')
  console.error(err)
  process.exit(1)
})
