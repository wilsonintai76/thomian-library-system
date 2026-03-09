-- =============================================================================
-- Thomian Library System — Reference Schema (PostgreSQL 16)
-- =============================================================================
-- Last updated : 2026-03-09
-- Migrations   : 0001 → 0007
--
-- PURPOSE: Human-readable DDL reference and disaster-recovery baseline.
--          Django `manage.py migrate` is the AUTHORITATIVE schema source.
--          Do NOT run this file directly against a Django-managed database.
--
-- DEPLOYMENT NOTE:
--   Phase 1 (default) — SQLite via Django ORM, no extra setup.
--   Phase 2 (production) — point DB_ENGINE=postgresql at a Postgres 16 server;
--   run `manage.py migrate`; all tables, indexes, and stored functions are
--   created automatically.  GIN indexes and RPC functions (Section 7) are
--   applied only on PostgreSQL — they are skipped on SQLite.
-- =============================================================================


-- ── 1. Lookup / reference tables ─────────────────────────────────────────────

CREATE TABLE backend_libraryclass (
    id           bigserial    PRIMARY KEY,
    name         varchar(100) NOT NULL UNIQUE,
    grade_level  varchar(20),
    room_number  varchar(20)
);

CREATE TABLE backend_author (
    id   bigserial    PRIMARY KEY,
    name varchar(255) NOT NULL UNIQUE,   -- 3NF: normalised from Book.author
    bio  text
);
CREATE INDEX idx_author_name ON backend_author (name);

CREATE TABLE backend_publisher (
    id      bigserial    PRIMARY KEY,
    name    varchar(255) NOT NULL UNIQUE,   -- 3NF: normalised from Book.publisher
    city    varchar(100),
    country varchar(100)
);
CREATE INDEX idx_publisher_name ON backend_publisher (name);


-- ── 2. Book ───────────────────────────────────────────────────────────────────

CREATE TABLE backend_book (
    id               bigserial      PRIMARY KEY,
    isbn             varchar(13)    NOT NULL UNIQUE,
    title            varchar(255)   NOT NULL,
    -- authors resolved via backend_book_authors M2M join table
    publisher_id     bigint         REFERENCES backend_publisher(id) ON DELETE SET NULL,
    ddc_code         varchar(20)    NOT NULL,
    classification   varchar(100)   NOT NULL DEFAULT 'General',
    call_number      varchar(50),
    barcode_id       varchar(50)    UNIQUE,
    shelf_location   varchar(50),
    cover_url        text,
    -- Financial
    value            numeric(10,2)  NOT NULL DEFAULT 25.00,
    vendor           varchar(255),
    acquisition_date date,
    -- Bibliographic metadata
    series           varchar(255),
    edition          varchar(100),
    pub_year         varchar(4),
    format           varchar(50)    NOT NULL DEFAULT 'PAPERBACK',
    language         varchar(50)    NOT NULL DEFAULT 'English',
    pages            integer,
    summary          text,
    subjects         jsonb          NOT NULL DEFAULT '[]',  -- GIN indexed (PG)
    marc_metadata    jsonb          NOT NULL DEFAULT '{}',  -- GIN indexed (PG)
    -- Circulation
    status           varchar(20)    NOT NULL DEFAULT 'AVAILABLE'
                                   CHECK (status IN ('AVAILABLE','LOANED','LOST','PROCESSING','HELD')),
    material_type    varchar(50)    NOT NULL DEFAULT 'REGULAR',
    last_inventoried date,
    created_at       timestamptz    NOT NULL DEFAULT now(),
    loan_count       integer        NOT NULL DEFAULT 0
    -- queue_length: derived @property → COUNT of active holds, never stored
    -- hold_expires_at: removed (lives on backend_hold.expires_at)
);

CREATE UNIQUE INDEX idx_book_isbn          ON backend_book (isbn);
CREATE UNIQUE INDEX idx_book_barcode       ON backend_book (barcode_id);
CREATE        INDEX idx_book_ddc           ON backend_book (ddc_code);
CREATE        INDEX idx_book_classification ON backend_book (classification);
CREATE        INDEX idx_book_call_number   ON backend_book (call_number);
CREATE        INDEX idx_book_shelf         ON backend_book (shelf_location);
CREATE        INDEX idx_book_status        ON backend_book (status);
CREATE        INDEX idx_book_material      ON backend_book (material_type);
-- JSONB GIN indexes (PostgreSQL only — created by migration 0007)
CREATE INDEX idx_book_subjects_gin ON backend_book USING GIN (subjects      jsonb_path_ops);
CREATE INDEX idx_book_marc_gin     ON backend_book USING GIN (marc_metadata jsonb_path_ops);


-- ── 3. Book ↔ Author  (M2M) ──────────────────────────────────────────────────

CREATE TABLE backend_book_authors (
    id        bigserial PRIMARY KEY,
    book_id   bigint NOT NULL REFERENCES backend_book(id)   ON DELETE CASCADE,
    author_id bigint NOT NULL REFERENCES backend_author(id) ON DELETE CASCADE,
    UNIQUE (book_id, author_id)
);


-- ── 4. Patron ─────────────────────────────────────────────────────────────────

CREATE TABLE backend_patron (
    id               bigserial     PRIMARY KEY,
    student_id       varchar(20)   NOT NULL UNIQUE,
    full_name        varchar(255)  NOT NULL,
    card_name        varchar(60),                          -- preferred display name
    patron_group     varchar(20)   NOT NULL
                                  CHECK (patron_group IN ('STUDENT','TEACHER','LIBRARIAN','ADMINISTRATOR')),
    library_class_id bigint        REFERENCES backend_libraryclass(id) ON DELETE SET_NULL,
    -- 3NF: FK replaces the old class_name CharField
    email            varchar(254),
    phone            varchar(20),
    photo_url        text,                                 -- base64 or URL
    is_blocked       boolean       NOT NULL DEFAULT false,
    is_archived      boolean       NOT NULL DEFAULT false,
    fines            numeric(8,2)  NOT NULL DEFAULT 0.00,  -- cached; source of truth = transactions
    total_paid       numeric(10,2) NOT NULL DEFAULT 0.00,
    pin              varchar(128)  NOT NULL DEFAULT ''     -- PBKDF2-hashed, never plain-text
);

CREATE INDEX idx_patron_student_id ON backend_patron (student_id);
CREATE INDEX idx_patron_group      ON backend_patron (patron_group);
CREATE INDEX idx_patron_blocked    ON backend_patron (is_blocked);
CREATE INDEX idx_patron_archived   ON backend_patron (is_archived);


-- ── 5. Loan ───────────────────────────────────────────────────────────────────

CREATE TABLE backend_loan (
    id             bigserial    PRIMARY KEY,
    book_id        bigint       NOT NULL REFERENCES backend_book(id)   ON DELETE CASCADE,
    patron_id      bigint       NOT NULL REFERENCES backend_patron(id) ON DELETE CASCADE,
    issued_at      timestamptz  NOT NULL DEFAULT now(),
    due_date       timestamptz  NOT NULL,
    returned_at    timestamptz,
    renewal_count  integer      NOT NULL DEFAULT 0,
    fine_assessed  numeric(8,2)          -- populated by fn_return_book / app code at return
);

CREATE INDEX idx_loan_issued   ON backend_loan (issued_at);
CREATE INDEX idx_loan_due      ON backend_loan (due_date);
CREATE INDEX idx_loan_returned ON backend_loan (returned_at);


-- ── 6. Hold ───────────────────────────────────────────────────────────────────

CREATE TABLE backend_hold (
    id         bigserial   PRIMARY KEY,
    book_id    bigint      NOT NULL REFERENCES backend_book(id)   ON DELETE CASCADE,
    patron_id  bigint      NOT NULL REFERENCES backend_patron(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    expires_at timestamptz,
    is_active  boolean     NOT NULL DEFAULT false,
    position   integer     NOT NULL DEFAULT 0   -- FIFO queue order
);

CREATE INDEX idx_hold_active   ON backend_hold (is_active);
CREATE INDEX idx_hold_position ON backend_hold (position);


-- ── 7. Transaction (financial ledger) ────────────────────────────────────────

CREATE TABLE backend_transaction (
    id             bigserial     PRIMARY KEY,
    patron_id      bigint        NOT NULL REFERENCES backend_patron(id) ON DELETE CASCADE,
    loan_id        bigint                 REFERENCES backend_loan(id)   ON DELETE SET NULL,
    book_id        bigint                 REFERENCES backend_book(id)   ON DELETE SET NULL,
    librarian_id   bigint                 REFERENCES auth_user(id)      ON DELETE SET NULL,
    -- NULL librarian_id = automated SYSTEM action
    amount         numeric(10,2) NOT NULL,
    type           varchar(30)   NOT NULL
                                 CHECK (type IN ('FINE_PAYMENT','REPLACEMENT_PAYMENT',
                                                 'FINE_ASSESSMENT','REPLACEMENT_ASSESSMENT',
                                                 'DAMAGE_ASSESSMENT','MANUAL_ADJUSTMENT','WAIVE')),
    method         varchar(10)   NOT NULL CHECK (method IN ('CASH','SYSTEM')),
    timestamp      timestamptz   NOT NULL DEFAULT now(),
    note           text,
    book_title     varchar(255)  -- historical snapshot (readable after book deletion)
);

CREATE INDEX idx_txn_type      ON backend_transaction (type);
CREATE INDEX idx_txn_timestamp ON backend_transaction (timestamp);


-- ── 8. CirculationRule ────────────────────────────────────────────────────────

CREATE TABLE backend_circulationrule (
    id            bigserial    PRIMARY KEY,
    patron_group  varchar(20)  NOT NULL,
    material_type varchar(50)  NOT NULL DEFAULT 'REGULAR',
    loan_days     integer      NOT NULL DEFAULT 14,
    max_items     integer      NOT NULL DEFAULT 5,
    fine_per_day  numeric(5,2) NOT NULL DEFAULT 0.50,
    UNIQUE (patron_group, material_type)
);


-- ── 9. LibraryEvent ───────────────────────────────────────────────────────────

CREATE TABLE backend_libraryevent (
    id          bigserial    PRIMARY KEY,
    title       varchar(255) NOT NULL,
    date        date         NOT NULL,
    type        varchar(20)  NOT NULL DEFAULT 'GENERAL'
                             CHECK (type IN ('HOLIDAY','WORKSHOP','CLUB','EXAM','GENERAL')),
    description text
);

CREATE INDEX idx_event_date ON backend_libraryevent (date);


-- ── 10. SystemAlert ───────────────────────────────────────────────────────────

CREATE TABLE backend_systemalert (
    id          bigserial    PRIMARY KEY,
    message     varchar(255) NOT NULL,
    location    varchar(100) NOT NULL,
    timestamp   timestamptz  NOT NULL DEFAULT now(),
    is_resolved boolean      NOT NULL DEFAULT false
);

CREATE INDEX idx_alert_timestamp   ON backend_systemalert (timestamp);
CREATE INDEX idx_alert_is_resolved ON backend_systemalert (is_resolved);


-- ── 11. SystemConfiguration ───────────────────────────────────────────────────

CREATE TABLE backend_systemconfiguration (
    id           bigserial   PRIMARY KEY,
    logo         text,        -- base64 string
    map_data     jsonb        NOT NULL DEFAULT '{}',   -- GIN indexed (PG)
    last_updated timestamptz  NOT NULL DEFAULT now()
);

-- JSONB GIN index (PostgreSQL only — created by migration 0007)
CREATE INDEX idx_sysconfig_mapdata_gin ON backend_systemconfiguration
    USING GIN (map_data jsonb_path_ops);


-- =============================================================================
-- PostgreSQL RPC Stored Functions  (migration 0007, PostgreSQL only)
-- =============================================================================
-- Created automatically by Django migration 0007_stored_procedures.
-- Shown here for documentation purposes.
--
--  fn_checkout_book(patron_pk bigint, book_pk bigint, due_date timestamptz)
--    → jsonb  { success, loan_id }  |  { success: false, error }
--    Atomically validates eligibility, respects max-items rule, creates Loan,
--    transitions Book.status → LOANED, increments Book.loan_count.
--
--  fn_return_book(book_barcode text)
--    → jsonb  { success, loan_id, fine_amount, days_late, new_status, next_hold_id }
--    Closes active Loan, calculates overdue fine from CirculationRule,
--    credits Patron.fines, activates next Hold (FIFO), sets Book.status.
--
--  fn_patron_balance(patron_pk bigint)
--    → jsonb  { assessed, paid, waived, balance }
--    Computes live financial balance purely from the Transaction ledger;
--    useful for audit without relying on the cached Patron.fines column.
-- =============================================================================
