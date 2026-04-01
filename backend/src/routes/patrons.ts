import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { sign } from 'hono/jwt'
import { getDB, Bindings, hashPassword } from '../utils'
import { patronSchema } from '../schema'
import { patrons, profiles } from '../db/schema'
import { eq, or, like } from 'drizzle-orm'

const app = new Hono<{ Bindings: Bindings }>()

app.get('/', zValidator('query', z.object({ search: z.string().optional() })), async (c) => {
    const db = getDB(c)
    const { search } = c.req.valid('query')
    
    const baseQuery = db.select({
        id: patrons.id,
        student_id: patrons.student_id,
        full_name: patrons.full_name,
        card_name: patrons.card_name,
        patron_group: patrons.patron_group,
        library_class_id: patrons.library_class_id,
        email: patrons.email,
        phone: patrons.phone,
        photo_url: patrons.photo_url,
        is_blocked: patrons.is_blocked,
        is_archived: patrons.is_archived,
        fines: patrons.fines,
        total_paid: patrons.total_paid,
        pin: patrons.pin,
        created_at: patrons.created_at,
        is_staff: profiles.id,
        staff_role: profiles.role,
        staff_email: profiles.email
    }).from(patrons)
    .leftJoin(profiles, eq(patrons.student_id, profiles.staff_id));

    if (search) {
        const pattern = `%${search}%`;
        const data = await baseQuery
            .where(or(
                like(patrons.full_name, pattern),
                like(patrons.student_id, pattern),
                like(patrons.email, pattern)
            ))
            .orderBy(patrons.full_name);
        return c.json(data || []);
    }
    
    const data = await baseQuery.orderBy(patrons.full_name);
    return c.json(data || []);
})

app.get('/:id', async (c) => {
    const db = getDB(c)
    const id = c.req.param('id')
    const [patron] = await db.select().from(patrons).where(eq(patrons.id, id)).limit(1)
    if (!patron) return c.json({ error: 'Patron not found' }, 404)
    return c.json(patron)
})

app.get('/student/:student_id', async (c) => {
    const db = getDB(c)
    const student_id = c.req.param('student_id')
    const [patron] = await db.select().from(patrons).where(eq(patrons.student_id, student_id)).limit(1)
    if (!patron) return c.json({ error: 'Patron not found' }, 404)
    return c.json(patron)
})

app.post('/verify_pin', zValidator('json', z.object({
  student_id: z.string(),
  pin: z.string()
})), async (c) => {
  const db = getDB(c)
  const { student_id, pin } = c.req.valid('json')
  
  const [patron] = await db.select().from(patrons).where(eq(patrons.student_id, student_id)).limit(1)
  
  if (!patron || patron.pin !== pin) {
    return c.json({ success: false, message: 'Invalid Student ID or PIN' }, 200)
  }

  if (patron.is_blocked) {
    return c.json({ success: false, message: 'Account is blocked' }, 403)
  }

  // Issue a short-lived patron JWT (30 min) so the kiosk can call authenticated endpoints
  const token = await sign(
    { sub: patron.id, role: 'PATRON', student_id: patron.student_id, exp: Math.floor(Date.now() / 1000) + 1800 },
    c.env.JWT_SECRET,
    'HS256'
  )

  return c.json({
    success: true,
    token,
    patron: {
      id: patron.id,
      full_name: patron.full_name,
      card_name: patron.card_name,
      student_id: patron.student_id,
      patron_group: patron.patron_group,
      email: patron.email,
      phone: patron.phone,
      photo_url: patron.photo_url,
      fines: patron.fines ?? 0,
      total_paid: patron.total_paid ?? 0,
      library_class_id: patron.library_class_id,
      is_blocked: patron.is_blocked,
    }
  })
})

// Patron self-update — authenticated via JWT (role: PATRON), no admin JWT needed
app.patch('/update_self', zValidator('json', z.object({
  full_name: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  new_pin: z.string().length(4).optional(),
})), async (c) => {
  const db = getDB(c)
  const payload = c.get('jwtPayload' as any) as { sub: string }
  const patronId = payload.sub
  const { full_name, email, phone, new_pin } = c.req.valid('json')

  const updates: Record<string, unknown> = {}
  if (full_name !== undefined) updates.full_name = full_name
  if (email !== undefined) updates.email = email
  if (phone !== undefined) updates.phone = phone
  if (new_pin !== undefined) updates.pin = new_pin

  if (Object.keys(updates).length > 0) {
    await db.update(patrons).set(updates).where(eq(patrons.id, patronId))
  }

  const [updated] = await db.select().from(patrons).where(eq(patrons.id, patronId)).limit(1)
  if (!updated) return c.json({ success: false, message: 'Patron not found' }, 404)
  return c.json({ success: true, patron: {
    id: updated.id,
    full_name: updated.full_name,
    card_name: updated.card_name,
    student_id: updated.student_id,
    patron_group: updated.patron_group,
    email: updated.email,
    phone: updated.phone,
    photo_url: updated.photo_url,
    fines: updated.fines ?? 0,
    total_paid: updated.total_paid ?? 0,
    library_class_id: updated.library_class_id,
    is_blocked: updated.is_blocked,
  }})
})

app.post('/', zValidator('json', patronSchema), async (c) => {
    const db = getDB(c)
    const { is_staff_active, role, password, ...patronData } = c.req.valid('json') as any
    const id = crypto.randomUUID()
    
    // 1. Create Patron
    await db.insert(patrons).values({ ...patronData, id })
    
    // 2. Handle Staff Profile
    if (is_staff_active) {
        const staffId = crypto.randomUUID()
        const hashedPassword = password ? await hashPassword(password) : await hashPassword('admin123')
        await db.insert(profiles).values({
            id: staffId,
            staff_id: patronData.student_id,
            full_name: patronData.full_name,
            email: patronData.email || `${patronData.student_id}@thomian-lib.com`,
            role: role || 'LIBRARIAN',
            password_hash: hashedPassword
        })
    }

    const [newPatron] = await db.select().from(patrons).where(eq(patrons.id, id)).limit(1)
    return c.json(newPatron)
})

app.patch('/:id', zValidator('json', patronSchema), async (c) => {
    const db = getDB(c)
    const id = c.req.param('id')
    const { is_staff_active, role, password, ...patronData } = c.req.valid('json') as any
    
    // 1. Update Patron
    await db.update(patrons).set(patronData).where(eq(patrons.id, id))
    const [current] = await db.select().from(patrons).where(eq(patrons.id, id)).limit(1)
    
    // 2. Handle Staff Profile sync
    if (is_staff_active !== undefined) {
        if (is_staff_active) {
            // Upsert profile
            const [existing] = await db.select().from(profiles).where(eq(profiles.staff_id, current.student_id)).limit(1)
            const hashedPassword = password ? await hashPassword(password) : undefined
            
            if (existing) {
                await db.update(profiles).set({
                    full_name: patronData.full_name || current.full_name,
                    email: patronData.email || current.email || existing.email,
                    role: role || existing.role,
                    ...(hashedPassword ? { password_hash: hashedPassword } : {})
                }).where(eq(profiles.staff_id, current.student_id))
            } else {
                await db.insert(profiles).values({
                    id: crypto.randomUUID(),
                    staff_id: current.student_id,
                    full_name: current.full_name,
                    email: patronData.email || current.email || `${current.student_id}@thomian-lib.com`,
                    role: role || 'LIBRARIAN',
                    password_hash: hashedPassword || await hashPassword('admin123')
                })
            }
        } else {
            // Remove staff login access but keep patron record
            await db.delete(profiles).where(eq(profiles.staff_id, current.student_id))
        }
    } else {
        // Just sync names/emails if they exist
        await db.update(profiles).set({
            full_name: patronData.full_name,
            email: patronData.email,
        }).where(eq(profiles.staff_id, current.student_id))
    }

    const [updatedPatron] = await db.select().from(patrons).where(eq(patrons.id, id)).limit(1)
    return c.json(updatedPatron)
})

app.delete('/:id', async (c) => {
    const db = getDB(c)
    const id = c.req.param('id')
    const [patron] = await db.select().from(patrons).where(eq(patrons.id, id)).limit(1)
    if (patron) {
        // Cascade delete profile if it exists
        await db.delete(profiles).where(eq(profiles.staff_id, patron.student_id))
    }
    await db.delete(patrons).where(eq(patrons.id, id))
    return c.json({ success: true })
})


export default app;
