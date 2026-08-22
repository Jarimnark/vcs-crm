import { defineConfig } from 'drizzle-kit'

// drizzle-kit does not load env files on its own. Pick up local.env (the
// local-dev convention) or .env when present — like node's --env-file,
// loadEnvFile never overrides variables already set in the shell.
for (const file of ['local.env', '.env']) {
  try {
    process.loadEnvFile(file)
  } catch {
    // file absent — fine
  }
}

// No silent fallback to a guessed port — that has already sent migrations at
// the wrong Postgres twice. `generate` needs no database, so warn rather
// than throw; `migrate` against the placeholder fails with a hostname that
// says exactly what to fix.
if (!process.env.DATABASE_URL) {
  console.warn(
    '⚠ DATABASE_URL is not set. Create local.env (or .env) in the repo root with e.g.\n' +
      '  DATABASE_URL=postgres://vcs:vcs@localhost:8888/vcs_crm\n' +
      '(8888 is the port docker-compose.yml publishes Postgres on.)',
  )
}

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgres://SET-DATABASE_URL-IN-local.env:1/invalid',
  },
})
