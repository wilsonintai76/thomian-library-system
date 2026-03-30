-- Initial Schema for Thomian Library System

-- Enable Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── System Config ────────────────────────────────────────────────────────────
CREATE TABLE system_configuration (
    id SERIAL PRIMARY KEY,
    logo TEXT, -- Base64
    map_data JSONB DEFAULT '{}',
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT single_row CHECK (id = 1)
);

-- ─── Lookup Tables ────────────────────────────────────────────────────────────
CREATE TABLE library_classes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT UNIQUE NOT NULL,
    grade_level TEXT,
    room_number TEXT
);

CREATE TABLE authors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT UNIQUE NOT NULL,
    bio TEXT
);

CREATE TABLE publishers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT UNIQUE NOT NULL,
    city TEXT,
    country TEXT
);

-- ─── Asset Management ─────────────────────────────────────────────────────────
CREATE TABLE books (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    isbn TEXT,
    title TEXT NOT NULL,
    ddc_code TEXT DEFAULT '000',
    classification TEXT DEFAULT 'General',
    call_number TEXT,
    barcode_id TEXT UNIQUE,
    shelf_location TEXT,
    cover_url TEXT,
    value DECIMAL(10,2) DEFAULT 25.00,
    vendor TEXT,
    acquisition_date DATE,
    series TEXT,
    edition TEXT,
    publisher_id UUID REFERENCES publishers(id) ON DELETE SET NULL,
    pub_year TEXT,
    format TEXT DEFAULT 'PAPERBACK',
    language TEXT DEFAULT 'English',
    pages INTEGER,
    summary TEXT,
    subjects JSONB DEFAULT '[]',
    marc_metadata JSONB DEFAULT '{}',
    status TEXT DEFAULT 'AVAILABLE',
    material_type TEXT DEFAULT 'REGULAR',
    loan_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Many-to-Many: Books ↔ Authors
CREATE TABLE book_authors (
    book_id UUID REFERENCES books(id) ON DELETE CASCADE,
    author_id UUID REFERENCES authors(id) ON DELETE CASCADE,
    PRIMARY KEY (book_id, author_id)
);

-- ─── Patron Management ────────────────────────────────────────────────────────
CREATE TABLE patrons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    card_name TEXT,
    patron_group TEXT NOT NULL, -- STUDENT, TEACHER, LIBRARIAN, ADMINISTRATOR
    library_class_id UUID REFERENCES library_classes(id) ON DELETE SET NULL,
    email TEXT,
    phone TEXT,
    photo_url TEXT,
    is_blocked BOOLEAN DEFAULT FALSE,
    is_archived BOOLEAN DEFAULT FALSE,
    fines DECIMAL(8,2) DEFAULT 0.00,
    total_paid DECIMAL(10,2) DEFAULT 0.00,
    pin TEXT DEFAULT '1234'
);

-- ─── Circulation ──────────────────────────────────────────────────────────────
CREATE TABLE loans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    book_id UUID REFERENCES books(id) ON DELETE CASCADE,
    patron_id UUID REFERENCES patrons(id) ON DELETE CASCADE,
    issued_at TIMESTAMPTZ DEFAULT NOW(),
    due_date TIMESTAMPTZ NOT NULL,
    returned_at TIMESTAMPTZ,
    renewal_count INTEGER DEFAULT 0,
    fine_assessed DECIMAL(8,2) DEFAULT 0.00
);

CREATE TABLE holds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    book_id UUID REFERENCES books(id) ON DELETE CASCADE,
    patron_id UUID REFERENCES patrons(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT FALSE,
    position INTEGER DEFAULT 0
);

-- Ledger for all financial movements
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patron_id UUID REFERENCES patrons(id) ON DELETE CASCADE,
    loan_id UUID REFERENCES loans(id) ON DELETE SET NULL,
    book_id UUID REFERENCES books(id) ON DELETE SET NULL,
    amount DECIMAL(10,2) NOT NULL,
    type TEXT NOT NULL, -- FINE_PAYMENT, REPLACEMENT_PAYMENT, WAIVE, etc.
    method TEXT DEFAULT 'SYSTEM', -- CASH, SYSTEM
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    librarian_id UUID, -- References profiles(id) / auth.uid()
    note TEXT,
    book_title TEXT -- Historical snapshot
);

-- Rules engine
CREATE TABLE circulation_rules (
    id SERIAL PRIMARY KEY,
    patron_group TEXT NOT NULL,
    material_type TEXT DEFAULT 'REGULAR',
    loan_days INTEGER DEFAULT 14,
    max_items INTEGER DEFAULT 5,
    fine_per_day DECIMAL(5,2) DEFAULT 0.50,
    UNIQUE (patron_group, material_type)
);

-- ─── Utility ──────────────────────────────────────────────────────────────────
CREATE TABLE library_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    date DATE NOT NULL,
    type TEXT DEFAULT 'GENERAL',
    description TEXT
);

CREATE TABLE system_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message TEXT NOT NULL,
    location TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    is_resolved BOOLEAN DEFAULT FALSE
);

-- ─── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX idx_books_isbn ON books(isbn);
CREATE INDEX idx_books_barcode ON books(barcode_id);
CREATE INDEX idx_books_subjects ON books USING GIN (subjects);
CREATE INDEX idx_books_status ON books(status);

CREATE INDEX idx_patrons_student_id ON patrons(student_id);
CREATE INDEX idx_patrons_group ON patrons(patron_group);

CREATE INDEX idx_loans_active ON loans(returned_at) WHERE returned_at IS NULL;
CREATE INDEX idx_loans_patron ON loans(patron_id);

CREATE INDEX idx_holds_book ON holds(book_id);
CREATE INDEX idx_holds_active ON holds(is_active) WHERE is_active = TRUE;

CREATE INDEX idx_transactions_patron ON transactions(patron_id);
CREATE INDEX idx_transactions_timestamp ON transactions(timestamp);
