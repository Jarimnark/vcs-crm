// Better Auth — email + password, Argon2id via @node-rs/argon2 (ADR-0042).
import 'server-only'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { nextCookies } from 'better-auth/next-js'
import { hash, verify } from '@node-rs/argon2'
import { db } from '@/lib/db'
import * as schema from '@/db/schema'

// OWASP-recommended Argon2id parameters.
const ARGON2_OPTS = { memoryCost: 19456, timeCost: 2, parallelism: 1 }

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: schema.users,
      session: schema.sessions,
      account: schema.authAccounts,
      verification: schema.verifications,
    },
  }),
  emailAndPassword: {
    enabled: true,
    // Five named users created by an admin — no self-service sign-up.
    disableSignUp: process.env.ALLOW_SIGNUP !== 'true',
    password: {
      hash: (password) => hash(password, ARGON2_OPTS),
      verify: ({ hash: h, password }) => verify(h, password),
    },
  },
  user: {
    additionalFields: {
      role: { type: 'string', defaultValue: 'sales', input: false },
      phoneMobile: { type: 'string', required: false },
      active: { type: 'boolean', defaultValue: true, input: false },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 14, // 14 days
    updateAge: 60 * 60 * 24,
  },
  plugins: [nextCookies()],
})

export type Session = typeof auth.$Infer.Session
