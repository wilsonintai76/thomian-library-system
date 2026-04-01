import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { verify } from 'hono/jwt'
import { Bindings } from './utils'

import catalogRouter from './routes/catalog'
import patronsRouter from './routes/patrons'
import transactionsRouter from './routes/transactions'
import circulationRouter from './routes/circulation'
import systemRouter from './routes/system'
import authRouter from './routes/auth'

const app = new Hono<{ Bindings: Bindings }>()

// Middleware
app.use('*', logger())
app.use('*', cors({
  origin: '*',
  allowHeaders: ['Content-Type', 'Authorization', 'X-Client-Info', 'apikey'],
  allowMethods: ['POST', 'GET', 'OPTIONS', 'PATCH', 'DELETE'],
  exposeHeaders: ['Content-Length', 'X-Kuma-Revision'],
  maxAge: 600,
}))

// Health Check
app.get('/health', (c) => c.json({ status: 'OK', timestamp: new Date().toISOString(), version: '4.0.0-D1' }))

// Auth Middleware
app.use('*', async (c, next) => {
  const path = c.req.path
  const method = c.req.method

  // Skip auth for OPTIONS (CORS preflight) and public routes
  const PUBLIC_ROUTES = [
    '/auth/login',
    '/auth/setup-admin',
    '/health',
    // Kiosk home loads these before patron login
    '/catalog/new_arrivals',
    '/catalog/trending',
    '/system/events',
    '/system/system-config',
    '/patrons/verify_pin',
    '/circulation/patron_loans',
  ]

  if (method === 'OPTIONS' || PUBLIC_ROUTES.some(r => path.startsWith(r))) {
    return next()
  }

  const authHeader = c.req.header('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized', message: 'Missing or malformed Authorization header' }, 401)
  }

  try {
    const token = authHeader.split(' ')[1]
    const payload = await verify(token, c.env.JWT_SECRET, 'HS256')
    c.set('jwtPayload' as any, payload)
    return next()
  } catch (err) {
    return c.json({ 
      error: 'Unauthorized', 
      message: 'Token verification failed. Your session may have expired.',
      details: err instanceof Error ? err.message : 'Invalid signature'
    }, 401)
  }
})

// Mount Routers and Export AppType
const routes = app
  .route('/catalog', catalogRouter)
  .route('/patrons', patronsRouter)
  .route('/transactions', transactionsRouter)
  .route('/circulation', circulationRouter)
  .route('/system', systemRouter)
  .route('/auth', authRouter)

export type AppType = typeof routes
export default app
