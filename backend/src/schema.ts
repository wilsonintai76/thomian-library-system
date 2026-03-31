import { z } from 'zod'

export const bookSchema = z.object({
  id: z.string().optional(),
  isbn: z.string().optional(),
  title: z.string().min(1),
  author: z.string().optional(),
  ddc_code: z.string().optional(),
  classification: z.string().optional(),
  call_number: z.string().optional(),
  barcode_id: z.string().optional(),
  shelf_location: z.string().optional(),
  cover_url: z.string().optional(),
  value: z.number().optional().or(z.string().transform(v => parseFloat(v))),
  vendor: z.string().optional(),
  acquisition_date: z.string().optional(),
  series: z.string().optional(),
  edition: z.string().optional(),
  publisher_id: z.string().optional().nullable(),
  pub_year: z.string().optional(),
  format: z.string().optional(),
  language: z.string().optional(),
  pages: z.number().optional().or(z.string().transform(v => parseInt(v))),
  summary: z.string().optional(),
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
