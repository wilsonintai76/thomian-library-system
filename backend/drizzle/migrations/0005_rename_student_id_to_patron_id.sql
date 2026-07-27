-- Migration number: 0005 	 2026-07-27T01:59:00.000Z
ALTER TABLE patrons RENAME COLUMN student_id TO patron_id;
