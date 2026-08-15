// Postgres pool + Drizzle instance. Pool stays small (max 5): Postgres on the
// droplet is capped at 20 connections and one Node process needs no more
// (docs/03-tech-stack.md §8).
import 'server-only'
import { Pool } from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import * as schema from '@/db/schema'

const globalForDb = globalThis as unknown as { pgPool?: Pool }

const pool =
  globalForDb.pgPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
  })

// Reuse the pool across HMR reloads in development.
if (process.env.NODE_ENV !== 'production') globalForDb.pgPool = pool

export const db = drizzle(pool, { schema })
export type Db = typeof db
export { schema }
