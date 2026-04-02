import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { Bindings } from '../utils'

const app = new Hono<{ Bindings: Bindings }>()

const analyzeSchema = z.object({
  imageBase64: z.string().optional(),
  imageUrl: z.string().optional(),
  levelId: z.string()
})

app.post('/analyze-blueprint', zValidator('json', analyzeSchema), async (c) => {
  const { imageBase64, imageUrl, levelId } = c.req.valid('json')
  const ai = c.env.AI

  let image: Uint8Array | string
  if (imageUrl) {
    const res = await fetch(imageUrl)
    if (!res.ok) return c.json({ error: 'Failed to fetch image from URL' }, 400)
    image = new Uint8Array(await res.arrayBuffer())
  } else if (imageBase64) {
    // Handle "data:image/png;base64,..."
    const base64Data = imageBase64.split(',').pop() || imageBase64
    const binaryString = atob(base64Data)
    const len = binaryString.length
    image = new Uint8Array(len)
    for (let i = 0; i < len; i++) {
      image[i] = binaryString.charCodeAt(i)
    }
  } else {
    return c.json({ error: 'No image source provided' }, 400)
  }

  const systemPrompt = `You are an AI Vision system designed to analyze architectural floor plans for libraries.
Your task is to identify library zones, book stacks, and functional areas.

For every labeled zone (e.g. "DEWEY 000s", "READING NOOK", "TECHNOLOGY LAB", "MAKERSPACE"), return a JSON object with:
1. "label": The text seen in the zone.
2. "minDDC": If it's a Dewey section (e.g. "DEWEY 100s"), use the number as the start (e.g. 100). Otherwise use 0.
3. "maxDDC": If it's a Dewey section, use the number plus 99 as the end (e.g. 199). Otherwise use 999.
4. "x", "y": The normalized coordinates of the center (0 to 1000).
5. "width", "height": The estimated dimensions (0 to 1000).

RETURN ONLY A VALID JSON ARRAY OF OBJECTS. DO NOT EXPLAIN.
Example Format:
[
  {"label": "DEWEY 100s", "minDDC": 100, "maxDDC": 199, "x": 250, "y": 400, "width": 80, "height": 120},
  {"label": "REFERENCE", "minDDC": 0, "maxDDC": 999, "x": 600, "y": 100, "width": 150, "height": 80}
]

Note labels in the image like "DEWEY 000s", "GENERAL COLLECTION", "STUDY ZONE". Be as accurate as possible with locations.`

  try {
    const response: any = await ai.run('@cf/meta/llama-3.2-11b-vision-instruct', {
      image: [...image], // Convert Uint8Array to number array for the API
      prompt: systemPrompt,
      max_tokens: 1024
    })

    // Extract JSON from response (Llama vision sometimes wraps in code blocks)
    let jsonStr = response?.description || response?.response || ""
    const jsonMatch = jsonStr.match(/\[[\s\S]*\]/)
    if (jsonMatch) {
      jsonStr = jsonMatch[0]
    }

    const detected = JSON.parse(jsonStr)
    
    // Map to ShelfDefinition
    const shelves = detected.map((d: any) => ({
      id: `ai_${crypto.randomUUID()}`,
      label: d.label || 'Unknown',
      description: 'AI Detected Zone',
      minDDC: d.minDDC ?? 0,
      maxDDC: d.maxDDC ?? 999,
      x: d.x ?? 500,
      y: d.y ?? 500,
      width: d.width ?? 100,
      height: d.height ?? 100,
      levelId: levelId
    }))

    return c.json(shelves)
  } catch (err: any) {
    console.error('Vision Error:', err)
    return c.json({ error: 'VISION_ERROR', message: err.message }, 500)
  }
})

export default app
