import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { isbn, q } = await req.json()
    const query = isbn || q
    if (!query) {
      throw new Error('isbn or q parameter required')
    }

    const cleanIsbn = query.replace(/[^a-zA-Z0-9]/g, '')

    // Step 1: Open Library
    const olResult = await fetchOpenLibrary(cleanIsbn)
    if (olResult) return new Response(JSON.stringify(olResult), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    // Step 2: Google Books
    const gbResult = await fetchGoogleBooks(cleanIsbn)
    if (gbResult) return new Response(JSON.stringify(gbResult), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    // Step 3: OCLC Classify for DDC Only (fallback)
    const ddc = await fetchOCLCClassify(cleanIsbn)
    
    // Step 4: Manual Stub
    const stub = {
      isbn: query,
      source: 'MANUAL',
      status: 'STUB',
      title: '',
      author: '',
      cover_url: null,
      ddc_code: ddc || '000',
      publisher: '',
      pub_year: '',
      pages: null,
    }

    return new Response(JSON.stringify({ source: 'ALL', status: 'NOT_FOUND', data: stub }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

async function fetchOpenLibrary(isbn: string) {
  const url = `https://openlibrary.org/search.json?isbn=${isbn}&limit=1&fields=title,author_name,dewey_number,cover_i,publisher,first_publish_year,number_of_pages_median,subject`
  const resp = await fetch(url)
  if (resp.status !== 200) return null
  const data = await resp.json()
  const doc = data.docs?.[0]
  if (!doc) return null

  const ddc = doc.dewey_number?.[0] || '000'
  return {
    source: 'Open Library',
    status: 'FOUND',
    data: {
      isbn,
      title: doc.title,
      author: doc.author_name?.[0] || 'Unknown',
      cover_url: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : null,
      ddc_code: ddc,
      publisher: doc.publisher?.[0] || '',
      pub_year: doc.first_publish_year?.toString() || '',
      pages: doc.number_of_pages_median,
    }
  }
}

async function fetchGoogleBooks(isbn: string) {
  const url = `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}&maxResults=1`
  const resp = await fetch(url)
  if (resp.status !== 200) return null
  const data = await resp.json()
  const item = data.items?.[0]
  if (!item) return null

  const info = item.volumeInfo
  const cover_url = info.imageLinks?.thumbnail?.replace('http://', 'https://').replace('&zoom=1', '&zoom=2')
  
  return {
    source: 'Google Books',
    status: 'FOUND',
    data: {
      isbn,
      title: info.title,
      author: info.authors?.[0] || 'Unknown',
      cover_url,
      ddc_code: '000', // Google Books doesn't provide DDC
      publisher: info.publisher || '',
      pub_year: info.publishedDate?.substring(0, 4) || '',
      pages: info.pageCount,
      language: info.language,
      summary: info.description,
    }
  }
}

async function fetchOCLCClassify(isbn: string) {
  const url = `https://classify.oclc.org/classify2/Classify?isbn=${isbn}&summary=true`
  try {
    const resp = await fetch(url)
    if (resp.status !== 200) return null
    const text = await resp.text()

    // Simple regex for DDC extraction from XML
    const match = text.match(/mostPopular nsfa="DDC" sfa="([^"]+)"/) || text.match(/work ddc="([^"]+)"/)
    return match ? match[1] : null
  } catch {
    return null
  }
}
