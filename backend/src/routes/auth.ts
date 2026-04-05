import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { sign, verify } from 'hono/jwt'
import { getDB, Bindings, Variables, hashPassword, Role } from '../utils'
import { profiles } from '../db/schema'
import { eq, or } from 'drizzle-orm'

import { getCache } from '../kv'

const app = new Hono<{ Bindings: Bindings, Variables: Variables }>()

app.post('/login', zValidator('json', z.object({
  identifier: z.string(),
  password: z.string()
})), async (c) => {
  const cache = getCache(c.env.KV)
  const { identifier, password } = c.req.valid('json')
  const rateLimitKey = `rate_limit:login:${identifier}`
  
  // Check Rate Limit
  const attempts = await cache.get<number>(rateLimitKey) || 0
  if (attempts >= 5) {
    return c.json({ 
      success: false, 
      message: 'Too many failed login attempts. Please try again in 15 minutes.',
      error: 'RATE_LIMIT_EXCEEDED'
    }, 429)
  }

  const db = getDB(c)
  const hashedPassword = await hashPassword(password)

  // 1. Find user by email or staff_id
  const [user] = await db.select()
    .from(profiles)
    .where(or(eq(profiles.email, identifier), eq(profiles.staff_id, identifier)))
    .limit(1)

  if (!user || user.password_hash !== hashedPassword) {
    // Increment Rate Limit on failure
    await cache.put(rateLimitKey, attempts + 1, 900) // 15 min TTL
    return c.json({ success: false, message: 'Invalid credentials' }, 401)
  }

  // Reset Rate Limit on success
  await cache.delete(rateLimitKey)

  // 2. Issue JWT with full context for RBAC
  const payload = {
    id: user.id,
    username: user.staff_id || user.email,
    role: user.role as Role,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30, // 30 days
  }
  const token = await sign(payload, c.env.JWT_SECRET, 'HS256')

  return c.json({
    success: true,
    token,
    user: {
      id: user.id,
      username: user.staff_id || user.email,
      full_name: user.full_name,
      role: user.role,
      email: user.email
    }
  })
})

app.get('/me', async (c) => {
  const db = getDB(c)
  const authHeader = c.req.header('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return c.json({ success: false }, 401)

  try {
    const token = authHeader.split(' ')[1]
    const payload = await verify(token, c.env.JWT_SECRET, 'HS256') as any
    
    // Use the id from either the new or old payload format if it exists
    const userId = payload.id || (payload as any).sub
    const [user] = await db.select().from(profiles).where(eq(profiles.id, userId)).limit(1)
    if (!user) return c.json({ success: false }, 401)

    return c.json({
      success: true,
      user: {
        id: user.id,
        username: user.staff_id || user.email,
        full_name: user.full_name,
        role: user.role,
        email: user.email
      }
    })
  } catch {
    return c.json({ success: false }, 401)
  }
})

// Initial Setup Endpoint (Works only if no profiles exist)
app.post('/setup-admin', async (c) => {
  const db = getDB(c)
  const existing = await db.select().from(profiles).limit(1)
  if (existing.length > 0) return c.json({ error: 'Setup already completed' }, 403)

  const adminId = crypto.randomUUID()
  const hashedPassword = await hashPassword('admin123')

  await db.insert(profiles).values({
    id: adminId,
    staff_id: 'admin',
    email: 'admin@thomian-lib.com',
    full_name: 'System Administrator',
    role: 'ADMINISTRATOR',
    password_hash: hashedPassword
  })

  return c.json({ success: true, message: 'Admin account created: admin / admin123' })
})

app.post('/logout', async (c) => {
  return c.json({ success: true }) // Stateless JWT, just client-side clear
})

export default app
