-- Stored Procedures (RPCs) for Circulation & Financials

-- ─── Patron Verification ──────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_verify_kiosk_patron(p_student_id TEXT, p_pin TEXT)
RETURNS JSONB AS $$
DECLARE
    v_patron_id UUID;
    v_patron_data JSONB;
BEGIN
    SELECT id, row_to_json(p)::jsonb INTO v_patron_id, v_patron_data
    FROM patrons p
    WHERE p.student_id = p_student_id AND p.pin = p_pin AND NOT p.is_blocked AND NOT p.is_archived;

    IF v_patron_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Invalid credentials or account restricted');
    END IF;

    RETURN jsonb_build_object('success', true, 'patron', v_patron_data);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── Checkout Book ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_checkout_book(p_barcode TEXT, p_student_id TEXT)
RETURNS JSONB AS $$
DECLARE
    v_book_id UUID;
    v_patron_id UUID;
    v_rule_days INTEGER;
    v_due_date TIMESTAMPTZ;
    v_loan_id UUID;
BEGIN
    -- 1. Resolve entities
    SELECT id INTO v_book_id FROM books WHERE barcode_id = p_barcode;
    SELECT id INTO v_patron_id FROM patrons WHERE student_id = p_student_id;

    IF v_book_id IS NULL OR v_patron_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Book or Patron not found');
    END IF;

    -- 2. Check if book is already ON_LOAN
    IF EXISTS (SELECT 1 FROM books WHERE id = v_book_id AND status = 'LOANED') THEN
        RETURN jsonb_build_object('success', false, 'message', 'Book is already loaned');
    END IF;

    -- 3. Fetch due date rule
    SELECT loan_days INTO v_rule_days FROM circulation_rules 
    WHERE patron_group = (SELECT patron_group FROM patrons WHERE id = v_patron_id)
    AND material_type = (SELECT material_type FROM books WHERE id = v_book_id);

    v_rule_days := COALESCE(v_rule_days, 14);
    v_due_date := NOW() + (v_rule_days || ' days')::INTERVAL;

    -- 4. Execute atomic transaction
    UPDATE books SET status = 'LOANED', loan_count = loan_count + 1 WHERE id = v_book_id;
    INSERT INTO loans (book_id, patron_id, due_date) VALUES (v_book_id, v_patron_id, v_due_date) RETURNING id INTO v_loan_id;

    RETURN jsonb_build_object('success', true, 'loan_id', v_loan_id, 'due_date', v_due_date);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── Return Book ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_return_book(p_barcode TEXT)
RETURNS JSONB AS $$
DECLARE
    v_book_id UUID;
    v_loan_id UUID;
    v_patron_id UUID;
    v_due_date TIMESTAMPTZ;
    v_days_overdue INTEGER;
    v_fine_rate DECIMAL(5,2);
    v_fine_amount DECIMAL(8,2) := 0.00;
BEGIN
    SELECT id INTO v_book_id FROM books WHERE barcode_id = p_barcode;
    IF v_book_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Book not found');
    END IF;

    -- Find active loan
    SELECT id, patron_id, due_date INTO v_loan_id, v_patron_id, v_due_date 
    FROM loans WHERE book_id = v_book_id AND returned_at IS NULL;

    IF v_loan_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'No active loan found for this book');
    END IF;

    -- 1. Update book & loan
    UPDATE books SET status = 'AVAILABLE' WHERE id = v_book_id;
    UPDATE loans SET returned_at = NOW() WHERE id = v_loan_id;

    -- 2. Calculate fine if overdue
    v_days_overdue := EXTRACT(DAY FROM (NOW() - v_due_date))::INTEGER;
    IF v_days_overdue > 0 THEN
        -- Fetch fine rate
        SELECT fine_per_day INTO v_fine_rate FROM circulation_rules
        WHERE patron_group = (SELECT patron_group FROM patrons WHERE id = v_patron_id);
        
        v_fine_amount := v_days_overdue * COALESCE(v_fine_rate, 0.50);
        
        -- Create FINE transaction
        INSERT INTO transactions (patron_id, loan_id, book_id, amount, type, note)
        VALUES (v_patron_id, v_loan_id, v_book_id, v_fine_amount, 'FINE_ASSESSMENT', 
                'Overdue by ' || v_days_overdue || ' days');
                
        -- Update patron cached fine total
        UPDATE patrons SET fines = fines + v_fine_amount WHERE id = v_patron_id;
    END IF;

    RETURN jsonb_build_object('success', true, 'fine_amount', v_fine_amount);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── Patron Financial Balance ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_patron_balance(p_patron_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_total_fines DECIMAL(10,2);
    v_total_paid DECIMAL(10,2);
BEGIN
    SELECT COALESCE(SUM(amount), 0) INTO v_total_fines 
    FROM transactions 
    WHERE patron_id = p_patron_id AND type IN ('FINE_ASSESSMENT', 'REPLACEMENT_ASSESSMENT', 'DAMAGE_ASSESSMENT');

    SELECT COALESCE(SUM(amount), 0) INTO v_total_paid 
    FROM transactions 
    WHERE patron_id = p_patron_id AND type IN ('FINE_PAYMENT', 'REPLACEMENT_PAYMENT');

    RETURN jsonb_build_object(
        'total_assessed', v_total_fines,
        'total_paid', v_total_paid,
        'balance', v_total_fines - v_total_paid
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
