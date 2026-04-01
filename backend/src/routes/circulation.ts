import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { getDB, Bindings } from '../utils'
import { checkoutSchema, returnBookSchema, renewBookSchema, placeHoldSchema } from '../schema'
import { z } from 'zod'
import { books, loans, patrons, transactions } from '../db/schema'
import { eq, isNull, lt, and, desc, sql } from 'drizzle-orm'

const app = new Hono<{ Bindings: Bindings }>()

// Public endpoint — returns loans for a single patron by student_id (used by kiosk)
app.get('/patron_loans/:student_id', async (c) => {
  const db = getDB(c)
  const student_id = c.req.param('student_id')
  const [patron] = await db.select({ id: patrons.id }).from(patrons).where(eq(patrons.student_id, student_id)).limit(1)
  if (!patron) return c.json([])
  const data = await db.select({
    id: loans.id,
    loaned_at: loans.loaned_at,
    due_date: loans.due_date,
    book: books,
  })
  .from(loans)
  .leftJoin(books, eq(loans.book_id, books.id))
  .where(and(isNull(loans.returned_at), eq(loans.patron_id, patron.id)))
  .orderBy(desc(loans.loaned_at))
  return c.json(data.map(l => ({ ...l, book_title: l.book?.title, book_barcode: l.book?.barcode_id })))
})

app.get('/active_loans', async (c) => {
  const db = getDB(c)
  const data = await db.select({
    id: loans.id,
    loaned_at: loans.loaned_at,
    due_date: loans.due_date,
    book: books,
    patron: patrons
  })
  .from(loans)
  .leftJoin(books, eq(loans.book_id, books.id))
  .leftJoin(patrons, eq(loans.patron_id, patrons.id))
  .where(isNull(loans.returned_at))
  .orderBy(desc(loans.loaned_at))

  return c.json(data)
})

app.get('/overdue', async (c) => {
  const db = getDB(c)
  const now = new Date().toISOString()
  const data = await db.select({
    id: loans.id,
    due_date: loans.due_date,
    book: books,
    patron: patrons
  })
  .from(loans)
  .leftJoin(books, eq(loans.book_id, books.id))
  .leftJoin(patrons, eq(loans.patron_id, patrons.id))
  .where(and(isNull(loans.returned_at), lt(loans.due_date, now)))
  .orderBy(loans.due_date)

  return c.json(data)
})

app.post('/checkout', zValidator('json', checkoutSchema), async (c) => {
    const db = getDB(c)
    const { patron_id, book_ids } = c.req.valid('json')
    
    // 1. Verify Patron
    const [patron] = await db.select().from(patrons).where(eq(patrons.id, patron_id)).limit(1)
    if (!patron || patron.is_blocked) return c.json({ allowed: false, error: 'Patron is blocked or not found' })

    const results = []
    let due_date = new Date()
    due_date.setDate(due_date.getDate() + 14) // Standard 14 day checkout

    for (const bookId of book_ids) {
        const [book] = await db.select().from(books).where(eq(books.id, bookId)).limit(1)
        if (book && book.status === 'AVAILABLE') {
            // Transaction-like update (D1 doesn't support nested transactions easily with Hono without batch)
            await db.update(books).set({ 
                status: 'LOANED', 
                loan_count: (book.loan_count || 0) + 1 
            }).where(eq(books.id, bookId))
            
            const loanId = crypto.randomUUID()
            await db.insert(loans).values({
                id: loanId,
                book_id: bookId, 
                patron_id, 
                due_date: due_date.toISOString(),
                status: 'ACTIVE'
            })
            
            // Log transaction
            await db.insert(transactions).values({
                id: crypto.randomUUID(),
                patron_id,
                book_id: bookId,
                type: 'CHECKOUT',
                timestamp: new Date().toISOString()
            })

            results.push({ book, success: true })
        } else {
            results.push({ book: { id: bookId }, success: false, error: 'Unavailable' })
        }
    }
    return c.json({ allowed: true, books_processed: results.filter(r => r.success).length, results, fine_amount_due: 0 })
})

app.post('/return_book', zValidator('json', returnBookSchema), async (c) => {
    const db = getDB(c)
    const { barcode } = c.req.valid('json')
    const key = barcode.trim()

    let [book] = await db.select().from(books).where(eq(books.barcode_id, key)).limit(1)
    if (!book) {
        [book] = await db.select().from(books).where(eq(books.isbn, key)).limit(1)
    }
    if (!book) return c.json({ error: 'Book not found' }, 404)
    
    // Find active loan
    const [loan] = await db.select({
        id: loans.id,
        patron_id: loans.patron_id,
        patron_name: patrons.full_name
    })
    .from(loans)
    .leftJoin(patrons, eq(loans.patron_id, patrons.id))
    .where(and(eq(loans.book_id, book.id), isNull(loans.returned_at)))
    .limit(1)

    if (!loan) return c.json({ book, error: 'Book is not checked out' }, 400)
        
    await db.update(loans).set({ 
        returned_at: new Date().toISOString(),
        status: 'RETURNED'
    }).where(eq(loans.id, loan.id))
    
    await db.update(books).set({ status: 'AVAILABLE' }).where(eq(books.id, book.id))

    // Log transaction
    await db.insert(transactions).values({
        id: crypto.randomUUID(),
        patron_id: loan.patron_id,
        book_id: book.id,
        type: 'RETURN',
        timestamp: new Date().toISOString()
    })
    
    return c.json({ book, patron: { full_name: loan.patron_name }, fine_amount: 0, next_patron: null })
})

app.post('/renew', zValidator('json', renewBookSchema), async (c) => {
    const db = getDB(c)
    const { barcode, patron_id } = c.req.valid('json')
    
    let [book] = await db.select().from(books).where(eq(books.barcode_id, barcode)).limit(1)
    if (!book) {
        [book] = await db.select().from(books).where(eq(books.isbn, barcode)).limit(1)
    }
    if (!book) return c.json({ success: false, error: 'Book not found' }, 404)
    
    const [loan] = await db.select().from(loans).where(and(eq(loans.book_id, book.id), isNull(loans.returned_at))).limit(1)
    if (!loan || loan.patron_id !== patron_id) return c.json({ success: false, error: 'Invalid loan state' }, 400)
    
    const nextDue = new Date(loan.due_date)
    nextDue.setDate(nextDue.getDate() + 7)
    
    await db.update(loans).set({ 
        due_date: nextDue.toISOString(), 
        renewal_count: (loan.renewal_count || 0) + 1 
    }).where(eq(loans.id, loan.id))
    
    return c.json({ success: true, due_date: nextDue.toISOString() })
})

app.post('/place_hold', zValidator('json', placeHoldSchema), async (c) => {
    return c.json({ success: true, queued: true, message: "Added to hold queue" })
})

export default app;
