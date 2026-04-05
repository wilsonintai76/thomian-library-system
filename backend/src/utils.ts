import { Context } from 'hono'
import { drizzle } from 'drizzle-orm/d1'
import * as schema from './db/schema'

export type Bindings = {
  JWT_SECRET: string
  DB: any // D1Database
  KV: any // KVNamespace
  R2: any // R2Bucket
  AI: any // Workers AI
}

export type Role = 'ADMINISTRATOR' | 'LIBRARIAN' | 'PATRON'

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

// RBAC Middleware Factory
export const requireRole = (allowedRoles: Role[]) => {
  return async (c: any, next: any) => {
    const userRole = c.get('user')?.role
    if (!userRole || !allowedRoles.includes(userRole)) {
      return c.json({ 
        success: false, 
        error: 'Forbidden', 
        message: 'You do not have the required permissions for this action.' 
      }, 403)
    }
    return await next()
  }
}
