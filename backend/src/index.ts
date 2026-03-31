import { Context, Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { createClient } from '@supabase/supabase-js'
import { jsPDF } from 'jspdf'

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
  allowMethods: ['POST', 'GET', 'OPTIONS', 'PATCH', 'DELETE'],
  exposeHeaders: ['Content-Length', 'X-Kuma-Revision'],
  maxAge: 600,
}))

// ── Helpers ────────────────────────────────────────────────────────────────

function getSupabase(c: Context<{ Bindings: Bindings }>) {
  return createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY)
}

// ── Dewey Resolver Helpers ──────────────────────────────────────────────────

const DDC_MAP: Record<string, string> = {
  'Fiction': '823',
  'Juvenile Fiction': '823',
  'Science': '500',
  'History': '900',
  'Religion': '200',
  'Philosophy': '100',
  'Psychology': '150',
  'Social Sciences': '300',
  'Language': '400',
  'Mathematics': '510',
  'Technology': '600',
  'Arts': '700',
  'Literature': '800',
  'Geography': '910',
  'Biography': '920'
};

function inferDDC(categories: string[] | undefined): string {
  if (!categories || categories.length === 0) return '000';
  for (const cat of categories) {
    if (DDC_MAP[cat]) return DDC_MAP[cat];
    // Check for substring matches (e.g., "History / Ancient")
    for (const key in DDC_MAP) {
      if (cat.includes(key)) return DDC_MAP[key];
    }
  }
  return '000';
}

// ── Routes ────────────────────────────────────────────────────────────────

app.get('/health', (c) => c.json({ status: 'OK', timestamp: new Date().toISOString(), version: '3.2.11' }))

// ── System Configuration ──────────────────────────────────────────────────

app.get('/system-config', async (c) => {
  const supabase = getSupabase(c)
  const { data, error } = await supabase.from('system_configuration').select('*').eq('id', 1).single()
  if (error || !data) return c.json({ map_data: { levels: [], shelves: [] }, logo: null, theme: 'EMERALD' })
  return c.json(data)
})

app.get('/system-config/', (c) => c.redirect('/system-config'))

app.post('/system-config/update_config/', async (c) => {
  const supabase = getSupabase(c)
  const body = await c.req.json()
  const { data, error } = await supabase.from('system_configuration')
    .upsert({ id: 1, map_data: body.map_data, logo: body.logo, last_updated: new Date().toISOString() })
    .select().single()
  if (error) return c.json({ error: error.message }, 500)
  return c.json(data)
})

// ── Catalog Enrichment (HEAVY) ──────────────────────────────────────────────

app.get('/catalog/recent_activity/', async (c) => {
  const supabase = getSupabase(c)
  const { data, error } = await supabase.from('transactions').select('*, patrons(full_name), books(title)').order('timestamp', { ascending: false }).limit(20)
  if (error) return c.json({ error: error.message }, 500)
  return c.json(data)
})

app.get('/catalog/stats/', async (c) => {
  const supabase = getSupabase(c)
  try {
    const { count: totalItems } = await supabase.from('books').select('*', { count: 'exact', head: true })
    const { count: activeLoans } = await supabase.from('loans').select('*', { count: 'exact', head: true }).is('returned_at', null)
    const { count: lostItems } = await supabase.from('books').select('*', { count: 'exact', head: true }).eq('status', 'LOST')
    const { count: activePatrons } = await supabase.from('patrons').select('*', { count: 'exact', head: true }).eq('is_blocked', false)

    return c.json({
      totalItems: totalItems || 0,
      totalValue: 0,
      activeLoans: activeLoans || 0,
      overdueLoans: 0,
      lostItems: lostItems || 0,
      activePatrons: activePatrons || 0,
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

app.get('/catalog/waterfall_search/', async (c: Context<{ Bindings: Bindings }>) => {
  const isbn = c.req.query('isbn')
  if (!isbn) return c.json({ error: 'ISBN required' }, 400)
  
  // High-Level DDC Resolver waterfall
  const ol = await fetchOpenLibrary(isbn)
  if (ol && ol.status === 'FOUND') {
      // If OL doesn't have Dewey, try Google Books for inference
      if (!ol.data.ddc_code || ol.data.ddc_code === '000') {
          const gbMatch = await fetchGoogleBooks(isbn);
          if (gbMatch && gbMatch.data.ddc_code !== '000') {
              ol.data.ddc_code = gbMatch.data.ddc_code;
          }
      }
      return c.json(ol)
  }
  
  const gb = await fetchGoogleBooks(isbn)
  if (gb) return c.json(gb)
  
  return c.json({ status: 'NOT_FOUND', data: { isbn, title: '', author: '', ddc_code: '000', status: 'STUB' } })
})

// ── Management Routes (Sync Fallback) ───────────────────────────────────────

app.get('/classes/', async (c) => {
  const supabase = getSupabase(c)
  const { data, error } = await supabase.from('library_classes').select('*').order('name', { ascending: true })
  if (error) return c.json({ error: error.message }, 500)
  return c.json(data || [])
})

app.post('/classes/', async (c) => {
  const supabase = getSupabase(c)
  const body = await c.req.json()
  const { data, error } = await supabase.from('library_classes').insert(body).select().single()
  if (error) return c.json({ error: error.message }, 500)
  return c.json(data)
})

app.get('/transactions/summary/', async (c) => {
  const supabase = getSupabase(c)
  const { data: recent } = await supabase.from('transactions').select('amount').limit(100)
  const total = recent?.reduce((sum, t) => sum + (Number(t.amount) || 0), 0) || 0
  return c.json({
    total_revenue: total,
    outstanding_fines: 0,
    transaction_count: recent?.length || 0
  })
})

app.get('/transactions/', async (c) => {
  const supabase = getSupabase(c)
  const patronId = c.req.query('patron_id')
  let query = supabase.from('transactions').select('*, patrons(full_name), books(title)')
  if (patronId) query = query.eq('patron_id', patronId)
  const { data, error } = await query.order('timestamp', { ascending: false })
  return c.json(data || [])
})

app.get('/rules/', async (c) => {
  const supabase = getSupabase(c)
  const { data, error } = await supabase.from('circulation_rules').select('*')
  return c.json(data || [])
})

app.get('/circulation/overdue/', async (c) => {
  const supabase = getSupabase(c)
  const { data, error } = await supabase.from('loans').select('*, books(*), patrons(*)').is('returned_at', null).lt('due_date', new Date().toISOString())
  if (error) return c.json([], 500)
  return c.json(data)
})

app.get('/circulation/active_loans/', async (c) => {
  const supabase = getSupabase(c)
  const { data, error } = await supabase.from('loans').select('*, books(*), patrons(*)').is('returned_at', null)
  if (error) return c.json([], 500)
  return c.json(data)
})

// ── Alerts & Events ─────────────────────────────────────────────────────────

app.get('/alerts/', async (c) => {
  const supabase = getSupabase(c)
  const { data, error } = await supabase.from('system_alerts').select('*').eq('is_resolved', false).order('timestamp', { ascending: false })
  return c.json(data || [])
})

app.post('/alerts/:id/resolve/', async (c) => {
  const supabase = getSupabase(c)
  await supabase.from('system_alerts').update({ is_resolved: true }).eq('id', c.req.param('id'))
  return c.json({ success: true })
})

app.get('/events/', async (c) => {
  const supabase = getSupabase(c)
  const { data, error } = await supabase.from('library_events').select('*').order('date', { ascending: true })
  return c.json(data || [])
})

// ── Printing & Labels (HEAVY) ────────────────────────────────────────────────

app.post('/print/label', async (c: Context<{ Bindings: Bindings }>) => {
  const body = await c.req.json()
  const books = Array.isArray(body) ? body : [body]
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: [108, 72] })
  books.forEach((book, index) => {
    if (index > 0) doc.addPage([108, 72], 'landscape')
    doc.setFontSize(8).setFont('helvetica', 'bold').text(String(book.ddc_code || '000'), 5, 15)
    doc.setFontSize(6).text(String(book.author || '').slice(0, 3).toUpperCase(), 5, 25)
    doc.setFontSize(5).text(String(book.title || '').slice(0, 25), 5, 35)
    doc.rect(5, 45, 98, 20) 
    doc.setFontSize(4).text(String(book.barcode_id || 'NO_BARCODE'), 54, 63, { align: 'center' })
  })
  return new Response(doc.output('arraybuffer'), { headers: { 'Content-Type': 'application/pdf' } })
})

// ── External Data Fetchers ──────────────────────────────────────────────────

async function fetchOpenLibrary(isbn: string) {
  const url = `https://openlibrary.org/search.json?isbn=${isbn}&limit=1&fields=title,author_name,dewey_number,cover_i,publisher,first_publish_year`
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
            pub_year: doc.first_publish_year?.toString() || '' 
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
    
    // Attempt DDC inference from categories
    const categories = info.categories;
    const inferred = inferDDC(categories);

    return { 
        source: 'Google Books', 
        status: 'FOUND', 
        data: { 
            isbn, 
            title: info.title, 
            author: info.authors?.[0] || 'Unknown', 
            cover_url: info.imageLinks?.thumbnail?.replace('http://', 'https://'), 
            ddc_code: inferred, 
            publisher: info.publisher || '', 
            pub_year: info.publishedDate?.substring(0, 4) || '' 
        } 
    }
  } catch { return null }
}

export default app
