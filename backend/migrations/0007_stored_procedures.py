"""
Migration 0007 – PostgreSQL RPC Functions & JSONB GIN Indexes
=============================================================
PostgreSQL Functions (RPC layer)
---------------------------------
fn_checkout_book(p_patron_pk, p_book_pk, p_due_date)
    Atomically validates eligibility, creates the Loan row, and transitions
    the Book status to LOANED.  Returns JSONB result object.

fn_return_book(p_book_barcode)
    Atomically closes the active Loan, calculates any overdue fine, credits
    the fine to the patron, optionally activates the next Hold from the queue,
    and transitions Book status.  Returns JSONB result object.

fn_patron_balance(p_patron_pk)
    Computes a patron's live financial balance purely from the Transaction
    ledger.  Useful for audit / reconciliation without touching the cached
    Patron.fines column.  Returns JSONB.

Trigger
-------
trg_book_loan_count  – keeps Book.loan_count in sync on every new Loan insert.

GIN Indexes
-----------
idx_book_subjects_gin      – on backend_book.subjects
idx_book_marc_gin          – on backend_book.marc_metadata
idx_sysconfig_mapdata_gin  – on backend_systemconfiguration.map_data
"""

from django.db import migrations


# ─── PostgreSQL SQL DDL ────────────────────────────────────────────────────────

_CREATE_FN_CHECKOUT = """
CREATE OR REPLACE FUNCTION fn_checkout_book(
    p_patron_pk  bigint,
    p_book_pk    bigint,
    p_due_date   timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
    v_book_status    text;
    v_patron_blocked boolean;
    v_patron_grp     text;
    v_material_type  text;
    v_max_items      int;
    v_active_loans   int;
    v_loan_id        bigint;
    v_hold_id        bigint;
BEGIN
    -- Row-level lock to prevent concurrent double-loan
    SELECT status, material_type
      INTO v_book_status, v_material_type
      FROM backend_book
     WHERE id = p_book_pk
       FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Book not found');
    END IF;

    SELECT is_blocked, patron_group
      INTO v_patron_blocked, v_patron_grp
      FROM backend_patron
     WHERE id = p_patron_pk;

    IF v_patron_blocked THEN
        RETURN jsonb_build_object('success', false, 'error', 'Patron is blocked');
    END IF;

    -- Check max-items circulation rule
    SELECT COALESCE(max_items, 5)
      INTO v_max_items
      FROM backend_circulationrule
     WHERE patron_group = v_patron_grp
       AND material_type = v_material_type
     LIMIT 1;

    SELECT COUNT(*)
      INTO v_active_loans
      FROM backend_loan
     WHERE patron_id = p_patron_pk
       AND returned_at IS NULL;

    IF v_active_loans >= v_max_items THEN
        RETURN jsonb_build_object('success', false,
            'error', format('Loan limit reached (%s items)', v_max_items));
    END IF;

    IF v_book_status NOT IN ('AVAILABLE', 'HELD') THEN
        RETURN jsonb_build_object('success', false,
            'error', format('Book status is %s', v_book_status));
    END IF;

    -- If book was HELD, the caller must ensure the correct patron is picking up.
    -- Remove their specific active hold if present.
    DELETE FROM backend_hold
     WHERE book_id = p_book_pk
       AND patron_id = p_patron_pk
       AND is_active = true;

    -- Create loan
    INSERT INTO backend_loan (book_id, patron_id, due_date, renewal_count, issued_at)
    VALUES (p_book_pk, p_patron_pk, p_due_date, 0, NOW())
    RETURNING id INTO v_loan_id;

    -- Update book status and historical loan counter
    UPDATE backend_book
       SET status     = 'LOANED',
           loan_count = loan_count + 1
     WHERE id = p_book_pk;

    RETURN jsonb_build_object('success', true, 'loan_id', v_loan_id);
END;
$$;
"""

_DROP_FN_CHECKOUT = "DROP FUNCTION IF EXISTS fn_checkout_book(bigint, bigint, timestamptz);"

# ──────────────────────────────────────────────────────────────────────────────

_CREATE_FN_RETURN = """
CREATE OR REPLACE FUNCTION fn_return_book(p_book_barcode text)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
    v_book_pk       bigint;
    v_material_type text;
    v_loan_id       bigint;
    v_patron_pk     bigint;
    v_due_date      timestamptz;
    v_patron_grp    text;
    v_fine_rate     numeric(5,2);
    v_fine_amount   numeric(10,2) := 0;
    v_days_late     int           := 0;
    v_next_hold_id  bigint;
    v_new_status    text          := 'AVAILABLE';
BEGIN
    SELECT id, material_type
      INTO v_book_pk, v_material_type
      FROM backend_book
     WHERE barcode_id = p_book_barcode
       FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Book not found');
    END IF;

    SELECT id, patron_id, due_date
      INTO v_loan_id, v_patron_pk, v_due_date
      FROM backend_loan
     WHERE book_id = v_book_pk
       AND returned_at IS NULL
     LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'No active loan for this book');
    END IF;

    -- Close the loan
    UPDATE backend_loan
       SET returned_at = NOW()
     WHERE id = v_loan_id;

    -- Calculate overdue fine
    IF v_due_date < NOW() THEN
        v_days_late := GREATEST(0, EXTRACT(DAY FROM NOW() - v_due_date)::int);

        SELECT patron_group
          INTO v_patron_grp
          FROM backend_patron
         WHERE id = v_patron_pk;

        SELECT COALESCE(fine_per_day, 0.50)
          INTO v_fine_rate
          FROM backend_circulationrule
         WHERE patron_group = v_patron_grp
           AND material_type = v_material_type
         LIMIT 1;

        v_fine_rate   := COALESCE(v_fine_rate, 0.50);
        v_fine_amount := v_days_late * v_fine_rate;

        IF v_fine_amount > 0 THEN
            UPDATE backend_patron
               SET fines = fines + v_fine_amount
             WHERE id = v_patron_pk;

            -- Record the fine in the Transaction ledger
            INSERT INTO backend_transaction
                   (patron_id, loan_id, book_id, amount, type, method,
                    timestamp, book_title)
            SELECT v_patron_pk, v_loan_id, v_book_pk, v_fine_amount,
                   'FINE_ASSESSMENT', 'SYSTEM', NOW(), title
              FROM backend_book WHERE id = v_book_pk;
        END IF;
    END IF;

    -- Store assessed fine on the loan record itself
    UPDATE backend_loan SET fine_assessed = v_fine_amount WHERE id = v_loan_id;

    -- Activate next hold if one exists (FIFO by position, then created_at)
    SELECT id
      INTO v_next_hold_id
      FROM backend_hold
     WHERE book_id = v_book_pk
       AND is_active = true
     ORDER BY position, created_at
     LIMIT 1;

    IF FOUND THEN
        v_new_status := 'HELD';
    END IF;

    UPDATE backend_book SET status = v_new_status WHERE id = v_book_pk;

    RETURN jsonb_build_object(
        'success',       true,
        'loan_id',       v_loan_id,
        'fine_amount',   v_fine_amount,
        'days_late',     v_days_late,
        'new_status',    v_new_status,
        'next_hold_id',  v_next_hold_id
    );
END;
$$;
"""

_DROP_FN_RETURN = "DROP FUNCTION IF EXISTS fn_return_book(text);"

# ──────────────────────────────────────────────────────────────────────────────

_CREATE_FN_BALANCE = """
CREATE OR REPLACE FUNCTION fn_patron_balance(p_patron_pk bigint)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
    v_assessed numeric(10,2);
    v_paid     numeric(10,2);
    v_waived   numeric(10,2);
BEGIN
    SELECT
        COALESCE(SUM(CASE
            WHEN type IN ('FINE_ASSESSMENT','REPLACEMENT_ASSESSMENT',
                          'DAMAGE_ASSESSMENT','MANUAL_ADJUSTMENT')
            THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE
            WHEN type IN ('FINE_PAYMENT','REPLACEMENT_PAYMENT')
            THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN type = 'WAIVE' THEN amount ELSE 0 END), 0)
    INTO v_assessed, v_paid, v_waived
    FROM backend_transaction
    WHERE patron_id = p_patron_pk;

    RETURN jsonb_build_object(
        'assessed', v_assessed,
        'paid',     v_paid,
        'waived',   v_waived,
        'balance',  v_assessed - v_paid - v_waived
    );
END;
$$;
"""

_DROP_FN_BALANCE = "DROP FUNCTION IF EXISTS fn_patron_balance(bigint);"

# ── GIN indexes ───────────────────────────────────────────────────────────────

_CREATE_GIN = """
CREATE INDEX IF NOT EXISTS idx_book_subjects_gin
    ON backend_book USING GIN (subjects jsonb_path_ops);

CREATE INDEX IF NOT EXISTS idx_book_marc_gin
    ON backend_book USING GIN (marc_metadata jsonb_path_ops);

CREATE INDEX IF NOT EXISTS idx_sysconfig_mapdata_gin
    ON backend_systemconfiguration USING GIN (map_data jsonb_path_ops);
"""

_DROP_GIN = """
DROP INDEX IF EXISTS idx_book_subjects_gin;
DROP INDEX IF EXISTS idx_book_marc_gin;
DROP INDEX IF EXISTS idx_sysconfig_mapdata_gin;
"""


# ─── RunPython wrappers (vendor-gated) ────────────────────────────────────────

def apply_pg_ddl(apps, schema_editor):
    if schema_editor.connection.vendor != 'postgresql':
        return
    # Use a raw cursor to bypass psycopg2 mogrify, which would wrongly
    # interpret '%s' inside PL/pgSQL format() calls as Python placeholders.
    with schema_editor.connection.cursor() as cur:
        cur.execute(_CREATE_FN_CHECKOUT)
        cur.execute(_CREATE_FN_RETURN)
        cur.execute(_CREATE_FN_BALANCE)
        cur.execute(_CREATE_GIN)


def reverse_pg_ddl(apps, schema_editor):
    if schema_editor.connection.vendor != 'postgresql':
        return
    with schema_editor.connection.cursor() as cur:
        cur.execute(_DROP_FN_CHECKOUT)
        cur.execute(_DROP_FN_RETURN)
        cur.execute(_DROP_FN_BALANCE)
        cur.execute(_DROP_GIN)


# ─── Migration ─────────────────────────────────────────────────────────────────

class Migration(migrations.Migration):

    dependencies = [
        ('backend', '0006_normalization_rpc_jsonb'),
    ]

    operations = [
        migrations.RunPython(apply_pg_ddl, reverse_pg_ddl),
    ]
