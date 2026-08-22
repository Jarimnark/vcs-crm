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

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgres://vcs:vcs@localhost:5432/vcs_crm',
  },
})
