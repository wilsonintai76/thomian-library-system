import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { verify } from 'hono/jwt'
import { Bindings, Variables, Role } from './utils'

import catalogRouter from './routes/catalog'
import patronsRouter from './routes/patrons'
import transactionsRouter from './routes/transactions'
import circulationRouter from './routes/circulation'
import systemRouter from './routes/system'
import authRouter from './routes/auth'
import aiRouter from './routes/ai'

const app = new Hono<{ Bindings: Bindings, Variables: Variables }>()

// Middleware
app.use('*', logger())
app.use('*', cors({
  origin: '*',
  allowHeaders: ['Content-Type', 'Authorization', 'X-Client-Info', 'apikey'],
  allowMethods: ['POST', 'GET', 'OPTIONS', 'PATCH', 'DELETE'],
  exposeHeaders: ['Content-Length', 'X-Kuma-Revision'],
  maxAge: 600,
}))

// Standard Global Error Handler
app.onError((err, c) => {
  console.error('[Hono Error]', err)
  // Standardized Error Response
  const status = (err as any).status || 500
  const message = err.message || 'Internal Server Error'
  return c.json({ 
    success: false, 
    error: err.name || 'Error', 
    message,
    code: (err as any).code 
  }, status as any)
})

// Health Check
app.get('/health', (c) => c.json({ status: 'OK', timestamp: new Date().toISOString(), version: '3.7.0' }))

// Auth Middleware — always attempts to decode JWT and set user context.
// Protected routes use enforcePolicy() which rejects if user context is missing.
app.use('*', async (c, next) => {
  const path = c.req.path
  const method = c.req.method

  // Skip auth for OPTIONS (CORS preflight)
  if (method === 'OPTIONS') return next()

  // Exact-match public routes — user context is optional here
  const PUBLIC_ROUTES = new Set([
    '/auth/login',
    '/auth/setup-admin',
    '/health',
    '/catalog/new_arrivals',
    '/catalog/trending',
    '/system/events',
    '/system/system-config',
    '/patrons/verify_pin',
    '/system/alerts/trigger_help',
    '/system/assets/',
  ])

  // Normalize path by removing double slashes and optional /api prefix
  const normalizedPath = path.replace(/\/+/g, '/').replace(/^\/api/, '')

  // Only exact match, no startsWith — prevents routes like /system/system-config/update_config
  // from being falsely treated as public
  const isPublic = PUBLIC_ROUTES.has(normalizedPath) || 
    (normalizedPath.startsWith('/system/assets/'))

  // Always try to decode the token — sets user context for enforcePolicy() to use
  const authHeader = c.req.header('Authorization')
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const token = authHeader.split(' ')[1]
      const payload = await verify(token, c.env.JWT_SECRET, 'HS256') as any
      c.set('user', {
        id: payload.id,
        username: payload.username,
        role: payload.role as Role
      })
    } catch {
      // Token invalid — user context stays undefined
    }
  }

  // Public routes pass through even without user context
  if (isPublic) return next()

  // Protected routes require valid user context
  if (!c.get('user')) {
    return c.json({ 
      success: false,
      error: 'Unauthorized', 
      message: 'Missing or invalid Authorization token',
    }, 401)
  }

  return next()
})

// Mount Routers and Export AppType
const appRouter = app
  .route('/catalog', catalogRouter)
  .route('/patrons', patronsRouter)
  .route('/transactions', transactionsRouter)
  .route('/circulation', circulationRouter)
  .route('/system', systemRouter)
  .route('/auth', authRouter)
  .route('/ai', aiRouter)

export type AppType = typeof appRouter
export default app
