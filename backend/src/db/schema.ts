import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// ── Profiles (Staff) ─────────────────────────────────────────────────────────
export const profiles = sqliteTable('profiles', {
  id: text('id').primaryKey().notNull(), // UUID from Auth
  staff_id: text('staff_id').unique(),
  full_name: text('full_name'),
  email: text('email').unique().notNull(),
  role: text('role', { enum: ['LIBRARIAN', 'ADMINISTRATOR'] }).default('LIBRARIAN'),
  password_hash: text('password_hash'), // For custom auth
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

// ── Books (Catalog) ─────────────────────────────────────────────────────────
export const books = sqliteTable('books', {
  id: text('id').primaryKey().notNull(), // UUID
  isbn: text('isbn'),
  title: text('title').notNull(),
  author: text('author'),
  ddc_code: text('ddc_code'),
  classification: text('classification'),
  call_number: text('call_number'),
  barcode_id: text('barcode_id').unique(),
  shelf_location: text('shelf_location'),
  cover_url: text('cover_url'),
  value: real('value').default(0),
  vendor: text('vendor'),
  acquisition_date: text('acquisition_date'),
  series: text('series'),
  edition: text('edition'),
  publisher: text('publisher'),
  publisher_id: text('publisher_id'),
  pub_year: text('pub_year'),
  format: text('format'),
  language: text('language'),
  pages: integer('pages'),
  summary: text('summary'),
  subjects: text('subjects', { mode: 'json' }), // SQLite JSON support
  marc_metadata: text('marc_metadata', { mode: 'json' }),
  status: text('status', { enum: ['AVAILABLE', 'LOANED', 'LOST', 'RESERVED', 'DAMAGED'] }).default('AVAILABLE'),
  material_type: text('material_type').default('BOOK'),
  loan_count: integer('loan_count').default(0),
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

// ── Patrons (Library Members) ───────────────────────────────────────────────────
export const patrons = sqliteTable('patrons', {
  id: text('id').primaryKey().notNull(),
  student_id: text('student_id').unique().notNull(),
  full_name: text('full_name').notNull(),
  card_name: text('card_name'),
  patron_group: text('patron_group').notNull(),
  library_class_id: text('library_class_id'),
  email: text('email'),
  phone: text('phone'),
  photo_url: text('photo_url'),
  is_blocked: integer('is_blocked', { mode: 'boolean' }).default(false),
  is_archived: integer('is_archived', { mode: 'boolean' }).default(false),
  fines: real('fines').default(0),
  total_paid: real('total_paid').default(0),
  pin: text('pin'), // For Kiosk login
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

// ── Loans (Circulation) ────────────────────────────────────────────────────────
export const loans = sqliteTable('loans', {
  id: text('id').primaryKey().notNull(),
  book_id: text('book_id').notNull(),
  patron_id: text('patron_id').notNull(),
  loaned_at: text('loaned_at').default(sql`CURRENT_TIMESTAMP`),
  due_date: text('due_date').notNull(),
  returned_at: text('returned_at'),
  renewal_count: integer('renewal_count').default(0),
  issued_by: text('issued_by'),
  status: text('status', { enum: ['ACTIVE', 'RETURNED', 'OVERDUE', 'LOST'] }).default('ACTIVE'),
});

// ── Transactions (Financial & Activity) ─────────────────────────────────────────
export const transactions = sqliteTable('transactions', {
  id: text('id').primaryKey().notNull(),
  patron_id: text('patron_id'),
  book_id: text('book_id'),
  type: text('type').notNull(), // LOAN, RETURN, FINE_PAYMENT, RENEWAL
  amount: real('amount').default(0),
  status: text('status').default('COMPLETED'),
  notes: text('notes'),
  issued_by: text('issued_by'),
  timestamp: text('timestamp').default(sql`CURRENT_TIMESTAMP`),
});

// ── Library Classes ──────────────────────────────────────────────────────────
export const libraryClasses = sqliteTable('library_classes', {
  id: text('id').primaryKey().notNull(),
  name: text('name').notNull(),
  teacher_name: text('teacher_name'),
  academic_year: text('academic_year'),
  grade_level: text('grade_level'),
  room_number: text('room_number'),
  status: text('status').default('ACTIVE'),
  department: text('department'),
  student_count: integer('student_count').default(0),
});

// ── Circulation Rules ─────────────────────────────────────────────────────────
export const circulationRules = sqliteTable('circulation_rules', {
  id: text('id').primaryKey().notNull(),
  patron_group: text('patron_group').notNull(),
  item_type: text('item_type').notNull(),
  max_items: integer('max_items').default(5),
  loan_period_days: integer('loan_period_days').default(14),
  max_renewals: integer('max_renewals').default(2),
  fine_per_day: real('fine_per_day').default(0.50),
  grace_period_days: integer('grace_period_days').default(0),
});

// ── System configuration (stored as a single row for settings) ──────────────
export const systemConfiguration = sqliteTable('system_configuration', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  map_data: text('map_data', { mode: 'json' }),
  logo: text('logo'),
  updated_at: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

// ── System Alerts ─────────────────────────────────────────────────────────────
export const systemAlerts = sqliteTable('system_alerts', {
  id: text('id').primaryKey().notNull(),
  type: text('type').notNull(), // ERROR, WARNING, INFO, HELP_TRIGGER
  message: text('message').notNull(),
  status: text('status', { enum: ['ACTIVE', 'RESOLVED'] }).default('ACTIVE'),
  location: text('location'),
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  resolved_at: text('resolved_at'),
});

// ── Library Events ────────────────────────────────────────────────────────────
export const libraryEvents = sqliteTable('library_events', {
  id: text('id').primaryKey().notNull(),
  title: text('title').notNull(),
  description: text('description'),
  date: text('date'), // Added for frontend compatibility
  type: text('type'), // Added for frontend compatibility
  start_time: text('start_time'), // Made optional
  end_time: text('end_time'),
  location: text('location'),
  status: text('status').default('UPCOMING'),
});
