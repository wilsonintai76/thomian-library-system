import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { getDB, Bindings } from '../utils'
import { libraryClassSchema, updateConfigSchema, circulationRuleSchema } from '../schema'
import { z } from 'zod'
import { libraryClasses, circulationRules, systemConfiguration, systemAlerts, libraryEvents } from '../db/schema'
import { eq, asc, desc, sql } from 'drizzle-orm'

const app = new Hono<{ Bindings: Bindings }>()

app.get('/classes', async (c) => {
  const db = getDB(c)
  const data = await db.select().from(libraryClasses).orderBy(asc(libraryClasses.name))
  return c.json(data || [])
})

app.post('/classes', zValidator('json', libraryClassSchema), async (c) => {
  const db = getDB(c)
  const body = c.req.valid('json') as any
  const id = crypto.randomUUID()
  await db.insert(libraryClasses).values({ ...body, id })
  const [newClass] = await db.select().from(libraryClasses).where(eq(libraryClasses.id, id)).limit(1)
  return c.json(newClass)
})

app.delete('/classes/:id', async (c) => {
  const db = getDB(c)
  await db.delete(libraryClasses).where(eq(libraryClasses.id, c.req.param('id')))
  return c.json({ success: true })
})

app.get('/rules', async (c) => {
  const db = getDB(c)
  const data = await db.select().from(circulationRules)
  return c.json(data || [])
})

app.post('/rules', zValidator('json', circulationRuleSchema), async (c) => {
  const db = getDB(c)
  const body = c.req.valid('json') as any
  const id = crypto.randomUUID()
  await db.insert(circulationRules).values({ ...body, id })
  const [newRule] = await db.select().from(circulationRules).where(eq(circulationRules.id, id)).limit(1)
  return c.json(newRule)
})

app.patch('/rules/:id', zValidator('json', circulationRuleSchema), async (c) => {
  const db = getDB(c)
  const body = c.req.valid('json') as any
  const id = c.req.param('id')
  await db.update(circulationRules).set(body).where(eq(circulationRules.id, id))
  const [updatedRule] = await db.select().from(circulationRules).where(eq(circulationRules.id, id)).limit(1)
  return c.json(updatedRule)
})

app.delete('/rules/:id', async (c) => {
  const db = getDB(c)
  await db.delete(circulationRules).where(eq(circulationRules.id, c.req.param('id')))
  return c.json({ success: true })
})

app.get('/system-config', async (c) => {
  const db = getDB(c)
  const [config] = await db.select().from(systemConfiguration).where(eq(systemConfiguration.id, 1)).limit(1)
  if (!config) return c.json({ map_data: { levels: [], shelves: [] }, logo: null, theme: 'EMERALD' })
  return c.json(config)
})

app.post('/system-config/update_config', zValidator('json', updateConfigSchema), async (c) => {
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

app.post('/alerts/:id/resolve', async (c) => {
  const db = getDB(c)
  await db.update(systemAlerts).set({ 
    status: 'RESOLVED',
    resolved_at: new Date().toISOString()
  }).where(eq(systemAlerts.id, c.req.param('id')))
  return c.json({ success: true })
})

app.get('/events', async (c) => {
  const db = getDB(c)
  const data = await db.select().from(libraryEvents).orderBy(asc(libraryEvents.start_time))
  return c.json(data || [])
})

app.post('/events', zValidator('json', z.any()), async (c) => {
  const db = getDB(c)
  const body = c.req.valid('json')
  const id = crypto.randomUUID()
  await db.insert(libraryEvents).values({ ...body, id })
  const [newEvent] = await db.select().from(libraryEvents).where(eq(libraryEvents.id, id)).limit(1)
  return c.json(newEvent)
})

app.patch('/events/:id', zValidator('json', z.any()), async (c) => {
  const db = getDB(c)
  const body = c.req.valid('json')
  const id = c.req.param('id')
  await db.update(libraryEvents).set(body).where(eq(libraryEvents.id, id))
  const [updatedEvent] = await db.select().from(libraryEvents).where(eq(libraryEvents.id, id)).limit(1)
  return c.json(updatedEvent)
})

app.delete('/events/:id', async (c) => {
  const db = getDB(c)
  await db.delete(libraryEvents).where(eq(libraryEvents.id, c.req.param('id')))
  return c.json({ success: true })
})

export default app;
