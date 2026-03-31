import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { getDB, Bindings } from '../utils'
import { transactionSchema } from '../schema'
import { z } from 'zod'
import { transactions, patrons, books } from '../db/schema'
import { eq, desc, sql } from 'drizzle-orm'

const app = new Hono<{ Bindings: Bindings }>()

app.get('/summary', async (c) => {
  const db = getDB(c)
  const results = await db.select({ amount: transactions.amount }).from(transactions).limit(100)
  const total = results.reduce((sum, t) => sum + (Number(t.amount) || 0), 0) || 0
  return c.json({
    total_revenue: total,
    outstanding_fines: 0,
    transaction_count: results.length
  })
})

app.get('/', zValidator('query', z.object({ patron_id: z.string().optional() })), async (c) => {
  const db = getDB(c)
  const { patron_id } = c.req.valid('query')
  
  let baseQuery = db.select({
    id: transactions.id,
    type: transactions.type,
    amount: transactions.amount,
    status: transactions.status,
    notes: transactions.notes,
    timestamp: transactions.timestamp,
    patron_name: patrons.full_name,
    book_title: books.title
  })
  .from(transactions)
  .leftJoin(patrons, eq(transactions.patron_id, patrons.id))
  .leftJoin(books, eq(transactions.book_id, books.id))

  if (patron_id) {
    baseQuery = baseQuery.where(eq(transactions.patron_id, patron_id)) as any
  }
  
  const data = await (baseQuery as any).orderBy(desc(transactions.timestamp))
  return c.json(data || [])
})

app.post('/', zValidator('json', transactionSchema), async (c) => {
  const db = getDB(c)
  const payload = c.req.valid('json') as any
  const id = crypto.randomUUID()
  await db.insert(transactions).values({ ...payload, id })
  const [newTransaction] = await db.select().from(transactions).where(eq(transactions.id, id)).limit(1)
  return c.json(newTransaction)
})

export default app;
