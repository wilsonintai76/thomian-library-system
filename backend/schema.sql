
-- Updated backend_book table with Professional ILS fields
ALTER TABLE backend_book ADD COLUMN value DECIMAL(10, 2) DEFAULT 25.00;
ALTER TABLE backend_book ADD COLUMN series VARCHAR(255);
ALTER TABLE backend_book ADD COLUMN edition VARCHAR(100);
ALTER TABLE backend_book ADD COLUMN language VARCHAR(50) DEFAULT 'English';
ALTER TABLE backend_book ADD COLUMN pages INTEGER;
ALTER TABLE backend_book ADD COLUMN vendor VARCHAR(255);
ALTER TABLE backend_book ADD COLUMN acquisition_date DATE;
ALTER TABLE backend_book ADD COLUMN summary TEXT;

-- Updated backend_patron table
ALTER TABLE backend_patron ADD COLUMN class_name VARCHAR(100);
ALTER TABLE backend_patron ADD COLUMN email VARCHAR(255);
ALTER TABLE backend_patron ADD COLUMN phone VARCHAR(20);
ALTER TABLE backend_patron ALTER COLUMN fines TYPE DECIMAL(8, 2);
ALTER TABLE backend_patron ALTER COLUMN total_paid TYPE DECIMAL(10, 2);

-- Ensure transaction precision matches
ALTER TABLE backend_transaction ALTER COLUMN amount TYPE DECIMAL(10, 2);
