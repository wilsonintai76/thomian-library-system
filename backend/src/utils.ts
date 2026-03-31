import { Context } from 'hono'
import { drizzle } from 'drizzle-orm/d1'
import * as schema from './db/schema'

export type Bindings = {
  JWT_SECRET: string
  DB: any // D1Database
  KV: any // KVNamespace
  R2: any // R2Bucket
}

// Helper for hashing (simple SHA-256 for demo, replace with PBKDF2 for production)
export async function hashPassword(password: string) {
  const msgUint8 = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export function getDB(c: Context<{ Bindings: Bindings }>) {
  return drizzle(c.env.DB, { schema });
}

export function getKV(c: Context<{ Bindings: Bindings }>) {
  return c.env.KV;
}
