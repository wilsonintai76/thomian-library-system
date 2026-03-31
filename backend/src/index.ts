import { Context, Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { createClient } from '@supabase/supabase-js'
import { jsPDF } from 'jspdf'
// @ts-ignore
import Marc from 'marcjs'

type Bindings = {
  SUPABASE_URL: string
  SUPABASE_SERVICE_ROLE_KEY: string
}

const app = new Hono<{ Bindings: Bindings }>()

// ── Middleware ─────────────────────────────────────────────────────────────
app.use('*', logger())
app.use('*', cors({
  origin: '*',
  allowHeaders: ['Content-Type', 'Authorization', 'X-Client-Info', 'apikey'],
  allowMethods: ['POST', 'GET', 'OPTIONS'],
  exposeHeaders: ['Content-Length', 'X-Kuma-Revision'],
  maxAge: 600,
}))

// ── Helpers ────────────────────────────────────────────────────────────────

function getSupabase(c: Context<{ Bindings: Bindings }>) {
  return createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY)
}

// ── Routes ────────────────────────────────────────────────────────────────

app.get('/health', (c) => c.json({ status: 'OK', timestamp: new Date().toISOString() }))

/**
 * MARC Waterfall Search
 * Ported from Supabase Edge Function with Hono optimization
 */
app.post('/catalog/waterfall', async (c: Context<{ Bindings: Bindings }>) => {
  const { isbn, q } = await c.req.json()
  const query = (isbn || q || '').replace(/[^a-zA-Z0-9]/g, '')
  
  if (!query) return c.json({ error: 'ISBN or query required' }, 400)

  // 1. Open Library
  const ol = await fetchOpenLibrary(query)
  if (ol) return c.json(ol)

  // 2. Google Books
  const gb = await fetchGoogleBooks(query)
  if (gb) return c.json(gb)

  // 3. OCLC Classify (DDC Fallback)
  const ddc = await fetchOCLCClassify(query)
  
  // 4. Return Stub
  return c.json({
    source: 'ALL',
    status: 'NOT_FOUND',
    data: {
      isbn: query,
      title: '',
      author: '',
      ddc_code: ddc || '000',
      status: 'STUB'
    }
  })
})

/**
 * Hybrid Printing Route
 * Generates high-fidelity PDF labels (1.5" x 1")
 */
app.post('/print/label', async (c: Context<{ Bindings: Bindings }>) => {
  const body = await c.req.json()
  const books = Array.isArray(body) ? body : [body]

  // standard label size in points (72 points per inch)
  // 1.5in x 1in => 108pt x 72pt
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'pt',
    format: [108, 72]
  })

  books.forEach((book, index) => {
    if (index > 0) doc.addPage([108, 72], 'landscape')

    // Simple label layout
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.text(String(book.ddc_code || '000'), 5, 15)
    
    doc.setFontSize(6)
    doc.text(String(book.author || '').slice(0, 3).toUpperCase(), 5, 25)
    
    doc.setFontSize(5)
    doc.text(String(book.title || '').slice(0, 25), 5, 35)

    // Barcode placeholder (could use a font or draw rectangles)
    doc.rect(5, 45, 98, 20) 
    doc.setFontSize(4)
    doc.text(String(book.barcode_id || 'NO_BARCODE'), 54, 63, { align: 'center' })
  })

  const pdfOutput = doc.output('arraybuffer')
  return new Response(pdfOutput, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline; filename="labels.pdf"'
    }
  })
})

// ── External Data Fetchers ──────────────────────────────────────────────────

async function fetchOpenLibrary(isbn: string) {
  const url = `https://openlibrary.org/search.json?isbn=${isbn}&limit=1&fields=title,author_name,dewey_number,cover_i,publisher,first_publish_year,number_of_pages_median`
  try {
    const resp = await fetch(url)
    if (!resp.ok) return null
    const data: any = await resp.json()
    const doc = data.docs?.[0]
    if (!doc) return null

    return {
      source: 'Open Library',
      status: 'FOUND',
      data: {
        isbn,
        title: doc.title,
        author: doc.author_name?.[0] || 'Unknown',
        cover_url: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : null,
        ddc_code: doc.dewey_number?.[0] || '000',
        publisher: doc.publisher?.[0] || '',
        pub_year: doc.first_publish_year?.toString() || '',
        pages: doc.number_of_pages_median,
      }
    }
  } catch { return null }
}

async function fetchGoogleBooks(isbn: string) {
  const url = `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}&maxResults=1`
  try {
    const resp = await fetch(url)
    if (!resp.ok) return null
    const data: any = await resp.json()
    const item = data.items?.[0]
    if (!item) return null

    const info = item.volumeInfo
    return {
      source: 'Google Books',
      status: 'FOUND',
      data: {
        isbn,
        title: info.title,
        author: info.authors?.[0] || 'Unknown',
        cover_url: info.imageLinks?.thumbnail?.replace('http://', 'https://'),
        ddc_code: '000',
        publisher: info.publisher || '',
        pub_year: info.publishedDate?.substring(0, 4) || '',
        pages: info.pageCount,
      }
    }
  } catch { return null }
}

async function fetchOCLCClassify(isbn: string) {
  const url = `https://classify.oclc.org/classify2/Classify?isbn=${isbn}&summary=true`
  try {
    const resp = await fetch(url)
    if (!resp.ok) return null
    const text = await resp.text()
    const match = text.match(/mostPopular nsfa="DDC" sfa="([^"]+)"/) || text.match(/work ddc="([^"]+)"/)
    return match ? match[1] : null
  } catch { return null }
}

export default app
