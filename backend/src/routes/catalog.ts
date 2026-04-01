import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { getDB, Bindings } from '../utils'
import { bookSchema, printLabelSchema } from '../schema'
import { jsPDF } from 'jspdf'
import { books, transactions, patrons, loans } from '../db/schema'
import { eq, or, like, desc, sql, inArray } from 'drizzle-orm'

const app = new Hono<{ Bindings: Bindings }>()

app.get('/recent_activity', async (c) => {
  const db = getDB(c)
  const data = await db.select({
    id: transactions.id,
    type: transactions.type,
    amount: transactions.amount,
    timestamp: transactions.timestamp,
    patron_name: patrons.full_name,
    book_title: books.title
  })
  .from(transactions)
  .leftJoin(patrons, eq(transactions.patron_id, patrons.id))
  .leftJoin(books, eq(transactions.book_id, books.id))
  .orderBy(desc(transactions.timestamp))
  .limit(20)

  return c.json(data)
})

app.get('/stats', async (c) => {
  const db = getDB(c)
  try {
    const [totalItems] = await db.select({ count: sql<number>`count(*)` }).from(books)
    const [activeLoans] = await db.select({ count: sql<number>`count(*)` }).from(loans).where(eq(loans.status, 'ACTIVE'))
    const [lostItems] = await db.select({ count: sql<number>`count(*)` }).from(books).where(eq(books.status, 'LOST'))
    const [activePatrons] = await db.select({ count: sql<number>`count(*)` }).from(patrons).where(eq(patrons.is_blocked, false))

    return c.json({
      totalItems: totalItems?.count || 0,
      totalValue: 0,
      activeLoans: activeLoans?.count || 0,
      overdueLoans: 0,
      lostItems: lostItems?.count || 0,
      activePatrons: activePatrons?.count || 0,
      itemsByStatus: { AVAILABLE: 0, LOANED: 0, LOST: 0 },
      itemsByClassification: {},
      topReaders: [],
      topClasses: [],
      acquisitionHistory: []
    })
  } catch (err: any) {
    return c.json({ error: err.message }, 500)
  }
})

// Dewey Resolvers
const DDC_MAP: Record<string, string> = {
    'Fiction': '823', 'Juvenile Fiction': '823', 'Science': '500', 'History': '900', 'Religion': '200', 'Philosophy': '100', 'Psychology': '150', 'Social Sciences': '300', 'Language': '400', 'Mathematics': '510', 'Technology': '600', 'Arts': '700', 'Literature': '800', 'Geography': '910', 'Biography': '920'
}
function inferDDC(categories: string[] | undefined): string {
    if (!categories || categories.length === 0) return '000';
    for (const cat of categories) {
      if (DDC_MAP[cat]) return DDC_MAP[cat];
      for (const key in DDC_MAP) { if (cat.includes(key)) return DDC_MAP[key]; }
    }
    return '000';
}
async function fetchOpenLibrary(isbn: string) {
    try {
      const resp = await fetch(`https://openlibrary.org/search.json?isbn=${isbn}&limit=1&fields=title,author_name,dewey_number,cover_i,publisher,first_publish_year`)
      if (!resp.ok) return null
      const data: any = await resp.json(); const doc = data.docs?.[0]
      if (!doc) return null
      return { source: 'Open Library', status: 'FOUND', data: { isbn, title: doc.title, author: doc.author_name?.[0] || 'Unknown', cover_url: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : null, ddc_code: doc.dewey_number?.[0] || '000', publisher: doc.publisher?.[0] || '', pub_year: doc.first_publish_year?.toString() || '' } }
    } catch { return null }
}
async function fetchGoogleBooks(isbn: string) {
    try {
      const resp = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}&maxResults=1`)
      if (!resp.ok) return null
      const data: any = await resp.json(); const item = data.items?.[0]
      if (!item) return null
      const info = item.volumeInfo; const inferred = inferDDC(info.categories);
      return { source: 'Google Books', status: 'FOUND', data: { isbn, title: info.title, author: info.authors?.[0] || 'Unknown', cover_url: info.imageLinks?.thumbnail?.replace('http://', 'https://'), ddc_code: inferred, publisher: info.publisher || '', pub_year: info.publishedDate?.substring(0, 4) || '' } }
    } catch { return null }
}

app.get('/waterfall_search', zValidator('query', z.object({ isbn: z.string() })), async (c) => {
  const db = getDB(c)
  const { isbn } = c.req.valid('query')

  // Step 0: Check local catalog first — by barcode_id, then by isbn
  const [byBarcode] = await db.select().from(books).where(eq(books.barcode_id, isbn)).limit(1)
  if (byBarcode) return c.json({ source: 'LOCAL', status: 'FOUND', data: byBarcode })
  const [byIsbn] = await db.select().from(books).where(eq(books.isbn, isbn)).limit(1)
  if (byIsbn) return c.json({ source: 'LOCAL', status: 'FOUND', data: byIsbn })

  const ol = await fetchOpenLibrary(isbn)
  if (ol && ol.status === 'FOUND') {
      if (!ol.data.ddc_code || ol.data.ddc_code === '000') {
          const gbMatch = await fetchGoogleBooks(isbn);
          if (gbMatch && gbMatch.data.ddc_code !== '000') ol.data.ddc_code = gbMatch.data.ddc_code;
      }
      return c.json(ol)
  }
  const gb = await fetchGoogleBooks(isbn)
  if (gb) return c.json(gb)
  return c.json({ status: 'NOT_FOUND', data: { isbn, title: '', author: '', ddc_code: '000', status: 'STUB' } })
})

// Standard CRUD
app.get('/new_arrivals', async (c) => {
    const db = getDB(c)
    const data = await db.select().from(books).orderBy(desc(books.created_at)).limit(4)
    return c.json(data || [])
})

app.get('/trending', async (c) => {
    const db = getDB(c)
    const data = await db.select().from(books).orderBy(desc(books.loan_count)).limit(4)
    return c.json(data || [])
})

app.get('/by_shelf/:shelf', async (c) => {
    const db = getDB(c)
    const shelf = c.req.param('shelf')
    const data = await db.select().from(books).where(eq(books.shelf_location, shelf))
    return c.json(data || [])
})

app.get('/', zValidator('query', z.object({ search: z.string().optional() })), async (c) => {
    const db = getDB(c)
    const { search } = c.req.valid('query')
    
    let baseQuery = db.select().from(books)
    if (search) {
        const pattern = `%${search}%`
        baseQuery = baseQuery.where(or(
            like(books.title, pattern),
            like(books.author, pattern),
            like(books.isbn, pattern),
            like(books.barcode_id, pattern)
        )) as any
    }
    
    const data = await (baseQuery as any).orderBy(books.title)
    return c.json(data || [])
})

app.get('/barcode/:barcode', async (c) => {
    const db = getDB(c)
    const barcode = c.req.param('barcode')
    const [book] = await db.select().from(books).where(eq(books.barcode_id, barcode.trim())).limit(1)
    if (!book) return c.json({ error: 'Book not found' }, 404)
    return c.json(book)
})

app.post('/', zValidator('json', bookSchema), async (c) => {
    const db = getDB(c)
    const bookData = c.req.valid('json') as any
    const id = crypto.randomUUID()
    // Convert empty barcode_id to null so SQLite UNIQUE allows multiple unassigned copies
    const sanitized = { ...bookData, barcode_id: bookData.barcode_id || null }
    try {
        await db.insert(books).values({ ...sanitized, id })
    } catch (err: any) {
        if (err?.message?.includes('UNIQUE constraint failed: books.barcode_id')) {
            return c.json({ error: 'Barcode ID already exists. Please assign a unique barcode sticker.' }, 409)
        }
        return c.json({ error: err?.message || 'Database error' }, 500)
    }
    const [newBook] = await db.select().from(books).where(eq(books.id, id)).limit(1)
    return c.json(newBook)
})

app.patch('/:id', zValidator('json', bookSchema), async (c) => {
    const db = getDB(c)
    const id = c.req.param('id')
    const bookData = c.req.valid('json') as any
    const sanitized = { ...bookData, barcode_id: bookData.barcode_id || null }
    try {
        await db.update(books).set(sanitized).where(eq(books.id, id))
    } catch (err: any) {
        if (err?.message?.includes('UNIQUE constraint failed: books.barcode_id')) {
            return c.json({ error: 'Barcode ID already exists. Please assign a unique barcode sticker.' }, 409)
        }
        return c.json({ error: err?.message || 'Database error' }, 500)
    }
    const [updatedBook] = await db.select().from(books).where(eq(books.id, id)).limit(1)
    return c.json(updatedBook)
})

app.delete('/:id', async (c) => {
    const db = getDB(c)
    const id = c.req.param('id')
    await db.delete(books).where(eq(books.id, id))
    return c.json({ success: true })
})

app.post('/print_labels', zValidator('json', printLabelSchema), async (c) => {
    const db = getDB(c)
    const { book_ids } = c.req.valid('json')
    const results = await db.select().from(books).where(inArray(books.id, book_ids))
    
    if (!results || results.length === 0) return c.json({ error: 'Books not found' }, 404)
    
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: [108, 72] })
    results.forEach((book, index) => {
      if (index > 0) doc.addPage([108, 72], 'landscape')
      doc.setFontSize(8).setFont('helvetica', 'bold').text(String(book.ddc_code || '000'), 5, 15)
      doc.setFontSize(6).text(String(book.author || '').slice(0, 3).toUpperCase(), 5, 25)
      doc.setFontSize(5).text(String(book.title || '').slice(0, 25), 5, 35)
      doc.rect(5, 45, 98, 20) 
      doc.setFontSize(4).text(String(book.barcode_id || 'NO_BARCODE'), 54, 63, { align: 'center' })
    })
    return new Response(doc.output('arraybuffer'), { headers: { 'Content-Type': 'application/pdf' } })
})

export default app;
