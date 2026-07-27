import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { getDB, Bindings, Variables } from '../utils'
import { enforcePolicy, Policy } from '../policies'
import { libraryClassSchema, updateConfigSchema, circulationRuleSchema, libraryEventSchema } from '../schema'
import { z } from 'zod'
import { books, patrons, loans, transactions, libraryClasses, circulationRules, systemConfiguration, systemAlerts, libraryEvents, libraryLocations } from '../db/schema'
import { eq, asc, desc, sql } from 'drizzle-orm'

import { getCache, CACHE_KEYS } from '../kv'

const app = new Hono<{ Bindings: Bindings, Variables: Variables }>()

// ── R2 File Upload ─────────────────────────────────────────────────────────────
// Accepts multipart/form-data with a 'file' field. Optional 'prefix' for folder.
// Returns a Worker-served public URL for the stored object.
app.post('/upload', enforcePolicy(Policy.SYSTEM_UPLOAD), async (c) => {
  const formData = await c.req.formData()
  const file = formData.get('file') as File | null
  if (!file) return c.json({ error: 'No file provided' }, 400)

  const prefix = (formData.get('prefix') as string || 'covers').replace(/[^a-z0-9_-]/gi, '')
  const ext = (file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '')
  const key = `${prefix}/${crypto.randomUUID()}.${ext}`

  await c.env.R2.put(key, file.stream(), {
    httpMetadata: { contentType: file.type || 'application/octet-stream' }
  })

  const origin = new URL(c.req.url).origin
  return c.json({ success: true, url: `${origin}/system/assets/${key}` })
})

// Serve objects from R2 — key allows slashes via wildcard segment
app.get('/assets/:key{.+}', async (c) => {
  const key = c.req.param('key')
  const obj = await c.env.R2.get(key)
  if (!obj) return c.json({ error: 'Not found' }, 404)

  const headers = new Headers()
  obj.writeHttpMetadata(headers)
  headers.set('etag', obj.httpEtag)
  headers.set('cache-control', 'public, max-age=31536000, immutable')
  return new Response(obj.body, { headers })
})

app.get('/classes', async (c) => {
  const db = getDB(c)
  const data = await db.select().from(libraryClasses).orderBy(asc(libraryClasses.name))
  return c.json(data || [])
})

app.post('/classes', enforcePolicy(Policy.SYSTEM_MANAGE_CLASSES), zValidator('json', libraryClassSchema), async (c) => {
  const db = getDB(c)
  const body = c.req.valid('json') as any
  const id = crypto.randomUUID()
  await db.insert(libraryClasses).values({ ...body, id })
  const [newClass] = await db.select().from(libraryClasses).where(eq(libraryClasses.id, id)).limit(1)
  return c.json(newClass)
})

app.delete('/classes/:id', enforcePolicy(Policy.SYSTEM_MANAGE_CLASSES), async (c) => {
  const db = getDB(c)
  await db.delete(libraryClasses).where(eq(libraryClasses.id, c.req.param('id')))
  return c.json({ success: true })
})

// ── Library Locations ─────────────────────────────────────────────────────────
const locationSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  level_id: z.string().optional().nullable(),
  min_ddc: z.number().optional().nullable(),
  max_ddc: z.number().optional().nullable(),
  description: z.string().optional().nullable(),
})

app.get('/locations', async (c) => {
  const db = getDB(c)
  const data = await db.select().from(libraryLocations).orderBy(asc(libraryLocations.name))
  return c.json(data || [])
})

app.post('/locations', enforcePolicy(Policy.SYSTEM_MANAGE_CLASSES), zValidator('json', locationSchema), async (c) => {
  const db = getDB(c)
  const body = c.req.valid('json')
  const id = body.id || crypto.randomUUID()
  await db.insert(libraryLocations).values({ id, name: body.name, min_ddc: body.min_ddc ?? null, max_ddc: body.max_ddc ?? null, description: body.description ?? null })
  const [loc] = await db.select().from(libraryLocations).where(eq(libraryLocations.id, id)).limit(1)
  return c.json(loc)
})

app.patch('/locations/:id', enforcePolicy(Policy.SYSTEM_MANAGE_CLASSES), zValidator('json', locationSchema.partial()), async (c) => {
  const db = getDB(c)
  const body = c.req.valid('json')
  await db.update(libraryLocations).set(body).where(eq(libraryLocations.id, c.req.param('id')))
  const [loc] = await db.select().from(libraryLocations).where(eq(libraryLocations.id, c.req.param('id'))).limit(1)
  return c.json(loc)
})

app.delete('/locations/:id', enforcePolicy(Policy.SYSTEM_MANAGE_CLASSES), async (c) => {
  const db = getDB(c)
  await db.delete(libraryLocations).where(eq(libraryLocations.id, c.req.param('id')))
  return c.json({ success: true })
})

app.get('/rules', async (c) => {
  const db = getDB(c)
  const data = await db.select().from(circulationRules)
  return c.json(data || [])
})

app.post('/rules', enforcePolicy(Policy.SYSTEM_MANAGE_RULES), zValidator('json', circulationRuleSchema), async (c) => {
  const db = getDB(c)
  const body = c.req.valid('json') as any
  const id = crypto.randomUUID()
  await db.insert(circulationRules).values({ ...body, id })
  const [newRule] = await db.select().from(circulationRules).where(eq(circulationRules.id, id)).limit(1)
  return c.json(newRule)
})

app.patch('/rules/:id', enforcePolicy(Policy.SYSTEM_MANAGE_RULES), zValidator('json', circulationRuleSchema), async (c) => {
  const db = getDB(c)
  const body = c.req.valid('json') as any
  const id = c.req.param('id')
  await db.update(circulationRules).set(body).where(eq(circulationRules.id, id))
  const [updatedRule] = await db.select().from(circulationRules).where(eq(circulationRules.id, id)).limit(1)
  return c.json(updatedRule)
})

app.delete('/rules/:id', enforcePolicy(Policy.SYSTEM_MANAGE_RULES), async (c) => {
  const db = getDB(c)
  await db.delete(circulationRules).where(eq(circulationRules.id, c.req.param('id')))
  return c.json({ success: true })
})

app.get('/system-config', async (c) => {
  const cache = getCache(c.env.KV)
  const cached = await cache.get(CACHE_KEYS.SYSTEM_CONFIG)
  if (cached) return c.json(cached)

  const db = getDB(c)
  const [config] = await db.select().from(systemConfiguration).where(eq(systemConfiguration.id, 1)).limit(1)
  const result = config || { map_data: { levels: [], shelves: [] }, logo: null, theme: 'EMERALD' }
  
  // Cache for 24 hours (manually invalidated on update)
  await cache.put(CACHE_KEYS.SYSTEM_CONFIG, result, 86400)
  return c.json(result)
})

app.post('/system-config/update_config', enforcePolicy(Policy.SYSTEM_UPDATE_CONFIG), zValidator('json', updateConfigSchema), async (c) => {
  const db = getDB(c)
  const body = c.req.valid('json')
  
  await db.insert(systemConfiguration).values({
    id: 1,
    map_data: body.map_data,
    logo: body.logo
  }).onConflictDoUpdate({
    target: systemConfiguration.id,
    set: {
      map_data: body.map_data,
      logo: body.logo,
      updated_at: new Date().toISOString()
    }
  })

  const [updatedConfig] = await db.select().from(systemConfiguration).where(eq(systemConfiguration.id, 1)).limit(1)
  
  // Invalidate KV cache
  const cache = getCache(c.env.KV)
  await cache.delete(CACHE_KEYS.SYSTEM_CONFIG)
  
  return c.json(updatedConfig)
})

app.get('/alerts', async (c) => {
  const db = getDB(c)
  const data = await db.select().from(systemAlerts)
    .where(eq(systemAlerts.status, 'ACTIVE'))
    .orderBy(desc(systemAlerts.created_at))
  return c.json(data || [])
})

app.post('/alerts/trigger_help', zValidator('json', z.object({ location: z.string() })), async (c) => {
  const db = getDB(c)
  const { location } = c.req.valid('json')
  const id = crypto.randomUUID()
  await db.insert(systemAlerts).values({
    id,
    type: 'HELP_REQUESTED',
    message: `Help requested at ${location}`,
    location: location,
    status: 'ACTIVE'
  })
  const [alert] = await db.select().from(systemAlerts).where(eq(systemAlerts.id, id)).limit(1)
  return c.json(alert)
})

app.post('/alerts/:id/resolve', enforcePolicy(Policy.SYSTEM_MANAGE_ALERTS), async (c) => {
  const db = getDB(c)
  await db.update(systemAlerts).set({ 
    status: 'RESOLVED',
    resolved_at: new Date().toISOString()
  }).where(eq(systemAlerts.id, c.req.param('id')))
  return c.json({ success: true })
})

app.get('/events', async (c) => {
  const db = getDB(c)
  const data = await db.select().from(libraryEvents).orderBy(asc(libraryEvents.date), asc(libraryEvents.start_time))
  return c.json(data || [])
})

app.post('/events', enforcePolicy(Policy.SYSTEM_MANAGE_EVENTS), zValidator('json', libraryEventSchema), async (c) => {
  const db = getDB(c)
  const body = c.req.valid('json') as any
  const id = crypto.randomUUID()
  await db.insert(libraryEvents).values({ ...body, id })
  const [newEvent] = await db.select().from(libraryEvents).where(eq(libraryEvents.id, id)).limit(1)
  return c.json(newEvent)
})

app.patch('/events/:id', enforcePolicy(Policy.SYSTEM_MANAGE_EVENTS), zValidator('json', libraryEventSchema), async (c) => {
  const db = getDB(c)
  const body = c.req.valid('json') as any
  const id = c.req.param('id')
  await db.update(libraryEvents).set(body).where(eq(libraryEvents.id, id))
  const [updatedEvent] = await db.select().from(libraryEvents).where(eq(libraryEvents.id, id)).limit(1)
  return c.json(updatedEvent)
})

app.delete('/events/:id', enforcePolicy(Policy.SYSTEM_MANAGE_EVENTS), async (c) => {
  const db = getDB(c)
  await db.delete(libraryEvents).where(eq(libraryEvents.id, c.req.param('id')))
  return c.json({ success: true })
})

// ── Full Data Export ──────────────────────────────────────────────────────────
// Returns a JSON envelope with all table data. Excludes profiles (auth-managed).
app.get('/export', enforcePolicy(Policy.SYSTEM_EXPORT), async (c) => {
  const db = getDB(c)
  const [allBooks, allPatrons, allLoans, allTxns, allClasses, allRules, allConfig, allEvents] = await Promise.all([
    db.select().from(books),
    db.select().from(patrons),
    db.select().from(loans),
    db.select().from(transactions),
    db.select().from(libraryClasses),
    db.select().from(circulationRules),
    db.select().from(systemConfiguration),
    db.select().from(libraryEvents),
  ])
  return c.json({
    version: '3.4.0',
    exported_at: new Date().toISOString(),
    tables: {
      books: allBooks,
      patrons: allPatrons,
      loans: allLoans,
      transactions: allTxns,
      library_classes: allClasses,
      circulation_rules: allRules,
      system_configuration: allConfig,
      library_events: allEvents,
    }
  })
})

// ── Full Data Import (Restore) ────────────────────────────────────────────────
// Wipes and restores all tables from a previously exported backup.
app.post('/import', enforcePolicy(Policy.SYSTEM_IMPORT), async (c) => {
  const body = await c.req.json()
  if (!body?.tables) return c.json({ error: 'Invalid backup format — missing tables key' }, 400)
  const t = body.tables
  const db = getDB(c)

  // Helper: insert in chunks to stay within SQLite bound-variable limits
  const insertChunked = async (table: any, rows: any[], chunkSize = 50) => {
    for (let i = 0; i < rows.length; i += chunkSize) {
      await db.insert(table).values(rows.slice(i, i + chunkSize))
    }
  }

  // Delete in reverse-dependency order
  await db.delete(transactions)
  await db.delete(loans)
  await db.delete(patrons)
  await db.delete(books)
  await db.delete(libraryClasses)
  await db.delete(circulationRules)
  await db.delete(libraryEvents)
  await db.delete(systemConfiguration)

  // Reinsert in dependency order
  if (t.system_configuration?.length) await insertChunked(systemConfiguration, t.system_configuration)
  if (t.circulation_rules?.length)    await insertChunked(circulationRules, t.circulation_rules)
  if (t.library_events?.length)       await insertChunked(libraryEvents, t.library_events)
  if (t.library_classes?.length)      await insertChunked(libraryClasses, t.library_classes)
  if (t.books?.length)                await insertChunked(books, t.books)
  if (t.patrons?.length)              await insertChunked(patrons, t.patrons)
  if (t.loans?.length)                await insertChunked(loans, t.loans)
  if (t.transactions?.length)         await insertChunked(transactions, t.transactions)

  return c.json({ success: true })
})

export default app;
