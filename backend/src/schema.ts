import { z } from 'zod'

export const bookSchema = z.object({
  id: z.string().optional(),
  isbn: z.string().optional().nullable(),
  title: z.string().min(1),
  author: z.string().optional().nullable(),
  ddc_code: z.string().optional().nullable(),
  classification: z.string().optional().nullable(),
  call_number: z.string().optional().nullable(),
  barcode_id: z.string().optional().nullable(),
  shelf_location: z.string().optional().nullable(),
  cover_url: z.string().optional().nullable(),
  value: z.number().optional().nullable().or(z.string().nullable().transform(v => v ? parseFloat(v) : 0)),
  vendor: z.string().optional().nullable(),
  acquisition_date: z.string().optional().nullable(),
  series: z.string().optional().nullable(),
  edition: z.string().optional().nullable(),
  publisher: z.string().optional().nullable(),
  publisher_id: z.string().optional().nullable(),
  pub_year: z.string().optional().nullable(),
  format: z.string().optional().nullable(),
  language: z.string().optional().nullable(),
  pages: z.number().optional().nullable().or(z.string().nullable().transform(v => v ? parseInt(v) : 0)),
  summary: z.string().optional().nullable(),
  subjects: z.any().optional(), // Could be more strictly typed if needed
  marc_metadata: z.any().optional(),
  status: z.string().optional(),
  material_type: z.string().optional(),
  loan_count: z.number().optional()
})

export const patronSchema = z.object({
  id: z.string().optional(),
  student_id: z.string().min(1),
  full_name: z.string().min(1),
  card_name: z.string().optional(),
  patron_group: z.string(),
  library_class_id: z.string().optional().nullable(),
  email: z.string().optional(),
  phone: z.string().optional(),
  photo_url: z.string().optional(),
  is_blocked: z.boolean().optional(),
  is_archived: z.boolean().optional(),
  fines: z.number().optional().or(z.string().transform(v => parseFloat(v))),
  total_paid: z.number().optional().or(z.string().transform(v => parseFloat(v))),
  pin: z.string().optional(),
  // Staff Unified Login Fields
  is_staff_active: z.boolean().optional(),
  role: z.enum(['LIBRARIAN', 'ADMINISTRATOR']).optional(),
  password: z.string().optional()
})

export const libraryClassSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  teacher_name: z.string().optional(),
  academic_year: z.string().optional(),
  grade_level: z.string().optional(),
  room_number: z.string().optional(),
  status: z.string().optional(),
  department: z.string().optional(),
  student_count: z.number().optional().or(z.string().transform(v => parseInt(v)))
})

export const circulationRuleSchema = z.object({
  id: z.string().optional(),
  patron_group: z.string().min(1),
  item_type: z.string().min(1),
  max_items: z.number(),
  loan_period_days: z.number(),
  max_renewals: z.number(),
  fine_per_day: z.number(),
  grace_period_days: z.number()
})

export const transactionSchema = z.object({
  id: z.string().optional(),
  patron_id: z.string().optional(), 
  book_id: z.string().optional().nullable(),
  type: z.string(),
  amount: z.number().or(z.string().transform(v => parseFloat(v))),
  status: z.string().optional(),
  notes: z.string().optional(),
  issued_by: z.string().optional().nullable()
})

// Specific operation schemas
export const checkoutSchema = z.object({
  patron_id: z.string(),
  book_ids: z.array(z.string())
})

export const returnBookSchema = z.object({
  barcode: z.string()
})

export const renewBookSchema = z.object({
  barcode: z.string(),
  patron_id: z.string()
})

export const placeHoldSchema = z.object({
  book_id: z.string(),
  patron_id: z.string()
})

export const updateConfigSchema = z.object({
  map_data: z.any(),
  logo: z.string().nullable().optional()
})

export const printLabelSchema = z.object({
  book_ids: z.array(z.string()),
  layout: z.string().optional()
})

export const libraryEventSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1),
  description: z.string().optional(),
  date: z.string().optional(),
  type: z.string().optional(),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  location: z.string().optional(),
  status: z.string().optional()
})
