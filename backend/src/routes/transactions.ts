import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { getDB, Bindings, Variables, requireRole } from '../utils'
import { transactionSchema } from '../schema'
import { z } from 'zod'
import { transactions, patrons, books } from '../db/schema'
import { eq, desc, sql } from 'drizzle-orm'

const app = new Hono<{ Bindings: Bindings, Variables: Variables }>()

app.get('/summary', requireRole(['LIBRARIAN', 'ADMINISTRATOR']), async (c) => {
  const db = getDB(c)
  const results = await db.select({ 
    type: transactions.type,
    amount: transactions.amount 
  }).from(transactions)

  const totals = results.reduce((acc, t) => {
    const val = Number(t.amount) || 0
    if (t.type.includes('PAYMENT')) acc.total_collected += val
    if (t.type === 'FINE_ASSESSMENT') acc.total_fines_assessed += val
    if (t.type === 'REPLACEMENT_ASSESSMENT') acc.total_replacements_assessed += val
    if (t.type === 'WAIVE') acc.total_waived += val
    return acc
  }, { total_collected: 0, total_fines_assessed: 0, total_replacements_assessed: 0, total_waived: 0 })

  return c.json({
    totalCollected: totals.total_collected,
    totalFinesAssessed: totals.total_fines_assessed,
    totalReplacementsAssessed: totals.total_replacements_assessed,
    totalWaived: totals.total_waived,
    transaction_count: results.length
  })
})

app.get('/', requireRole(['LIBRARIAN', 'ADMINISTRATOR']), zValidator('query', z.object({ patron_id: z.string().optional() })), async (c) => {
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

app.post('/', requireRole(['LIBRARIAN', 'ADMINISTRATOR']), zValidator('json', transactionSchema), async (c) => {
  const db = getDB(c)
  const payload = c.req.valid('json') as any
  const id = crypto.randomUUID()
  await db.insert(transactions).values({ ...payload, id })
  const [newTransaction] = await db.select().from(transactions).where(eq(transactions.id, id)).limit(1)
  return c.json(newTransaction)
})

export default app;
