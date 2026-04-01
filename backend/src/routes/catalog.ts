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

// Dewey Resolvers — keyword list searched case-insensitively against all category strings combined
// Ordered from most-specific to most-general so "juvenile fiction" beats plain "fiction"
const DDC_ENTRIES: [string, string][] = [
  // 000 – General Works / Computer Science
  ['data science', '006'], ['machine learning', '006'], ['artificial intelligence', '006'],
  ['computer science', '004'], ['programming', '005'], ['software', '005'],
  ['computing', '004'], ['internet', '004'], ['database', '005'],
  // 100 – Philosophy & Psychology
  ['self-help', '158'], ['self help', '158'], ['motivation', '158'],
  ['psychology', '150'], ['philosophy', '100'], ['ethics', '170'], ['logic', '160'],
  // 200 – Religion
  ['christianity', '230'], ['islam', '297'], ['buddhism', '294'],
  ['spirituality', '248'], ['theology', '230'], ['bible', '220'], ['religion', '200'],
  // 300 – Social Sciences
  ['current events', '300'], ['world affairs', '300'],
  ['economics', '330'], ['economy', '330'], ['political science', '320'], ['politics', '320'],
  ['law', '340'], ['education', '370'], ['business', '650'], ['management', '658'],
  ['sociology', '301'], ['anthropology', '306'], ['statistics', '310'], ['social science', '300'],
  // 400 – Language
  ['linguistics', '410'], ['grammar', '415'], ['dictionary', '423'],
  ['english language', '420'], ['language', '400'],
  // 500 – Science
  ['astronomy', '520'], ['chemistry', '540'], ['physics', '530'],
  ['ecology', '577'], ['botany', '580'], ['zoology', '590'],
  ['geology', '551'], ['mathematics', '510'], ['math', '510'],
  ['biology', '570'], ['scientific', '500'], ['nature', '508'], ['science', '500'],
  // 600 – Technology / Applied
  ['medicine', '610'], ['medical', '610'], ['health', '613'],
  ['cooking', '641'], ['culinary', '641'], ['food', '641'],
  ['engineering', '620'], ['architecture', '720'], ['agriculture', '630'], ['technology', '600'],
  // 700 – Arts & Recreation
  ['photography', '770'], ['graphic novel', '741'], ['comics', '741'], ['comic', '741'],
  ['drawing', '741'], ['music', '780'], ['dance', '792'], ['theater', '792'],
  ['cinema', '791'], ['film', '791'], ['sports', '796'], ['games', '794'],
  ['crafts', '745'], ['design', '745'], ['art', '700'],
  // 800 – Literature
  ['juvenile fiction', '823'], ['juvenile nonfiction', '500'],
  ['young adult fiction', '823'], ['young adult', '823'],
  ['short stor', '823'], ['poetry', '811'], ['drama', '812'],
  ['literature', '800'], ['fiction', '823'], ['novel', '823'],
  // 900 – History & Geography
  ['world war', '940'], ['biography', '920'],
  ['travel', '910'], ['geography', '910'], ['historical', '900'], ['history', '900'],
]
function inferDDC(categories: string[] | undefined): string {
  if (!categories || categories.length === 0) return '000'
  const combined = categories.join(' ').toLowerCase()
  for (const [keyword, code] of DDC_ENTRIES) {
    if (combined.includes(keyword)) return code
  }
  return '000'
}
// OL Books API — richer Dewey data than the search endpoint, used as DDC fallback
async function fetchDDCFromOLBooks(isbn: string): Promise<string> {
  try {
    const resp = await fetch(`https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`)
    if (!resp.ok) return '000'
    const data: any = await resp.json()
    return data[`ISBN:${isbn}`]?.dewey_decimal_class?.[0]?.trim() || '000'
  } catch { return '000' }
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
          // Try GB categories first, then OL Books API
          const gbMatch = await fetchGoogleBooks(isbn);
          if (gbMatch && gbMatch.data.ddc_code !== '000') {
              ol.data.ddc_code = gbMatch.data.ddc_code;
          } else {
              const olBooksDDC = await fetchDDCFromOLBooks(isbn);
              if (olBooksDDC !== '000') ol.data.ddc_code = olBooksDDC;
          }
      }
      return c.json(ol)
  }
  const gb = await fetchGoogleBooks(isbn)
  if (gb) {
      // If GB categories didn't resolve DDC, try the OL Books API specifically for Dewey
      if (!gb.data.ddc_code || gb.data.ddc_code === '000') {
          const olBooksDDC = await fetchDDCFromOLBooks(isbn);
          if (olBooksDDC !== '000') gb.data.ddc_code = olBooksDDC;
      }
      return c.json(gb)
  }
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
