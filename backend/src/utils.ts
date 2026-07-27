import { Context } from 'hono'
import { drizzle } from 'drizzle-orm/d1'
import { sql, eq } from 'drizzle-orm'
import * as schema from './db/schema'

export type Bindings = {
  JWT_SECRET: string
  DB: any // D1Database
  KV: any // KVNamespace
  R2: any // R2Bucket
  AI: any // Workers AI
}

export type Role = 'ADMINISTRATOR' | 'LIBRARIAN' | 'TEACHER' | 'STUDENT'

export type Variables = {
  user: {
    id: string
    username: string
    role: Role
  }
}

// Helper for hashing (simple SHA-256 for demo, replace with PBKDF2 for production)
export async function hashPassword(password: string) {
  const msgUint8 = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export function getDB(c: Context<{ Bindings: Bindings, Variables: Variables }>) {
  return drizzle(c.env.DB, { schema });
}

export function getKV(c: Context<{ Bindings: Bindings }>) {
  return c.env.KV;
}

// PBAC is handled via policies.ts — use `enforcePolicy(Policy.X)` instead of `requireRole`

/** Group-to-prefix mapping for numeric patron ID generation */
const PATRON_PREFIX: Record<string, string> = {
  ADMINISTRATOR: '1',
  LIBRARIAN:     '2',
  TEACHER:       '3',
  STUDENT:       '4',
}

/** Generates a sequential patron ID: PYYYYNNNN (9 digits, all-numeric) */
export async function generatePatronId(
  db: ReturnType<typeof getDB>,
  patronGroup: string,
): Promise<string> {
  const prefix = PATRON_PREFIX[patronGroup] || '9'
  const year = new Date().getFullYear()
  const pattern = `${prefix}${year}`
  const rows = await db.select({ pid: schema.patrons.patron_id })
    .from(schema.patrons)
    .where(sql`${schema.patrons.patron_id} LIKE ${pattern + '%'}`)
  const maxNum = rows.reduce((max, row) => {
    const num = parseInt(row.pid!.slice(5), 10) || 0
    return Math.max(max, num)
  }, 0)
  return `${pattern}${String(maxNum + 1).padStart(4, '0')}`
}
