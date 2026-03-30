-- Auth & Role Management

-- ─── Profiles Table ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    staff_id TEXT UNIQUE,
    email TEXT,
    role TEXT NOT NULL DEFAULT 'LIBRARIAN', -- ADMIN, LIBRARIAN
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE authors ENABLE ROW LEVEL SECURITY;
ALTER TABLE publishers ENABLE ROW LEVEL SECURITY;
ALTER TABLE library_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE books ENABLE ROW LEVEL SECURITY;
ALTER TABLE book_authors ENABLE ROW LEVEL SECURITY;
ALTER TABLE patrons ENABLE ROW LEVEL SECURITY;
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE holds ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE circulation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE library_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_configuration ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ─── Basic Policies ──────────────────────────────────────────────────────────

-- Authors: Read for all, Write for Staff
CREATE POLICY "Public read authors" ON authors FOR SELECT USING (true);
CREATE POLICY "Staff write authors" ON authors FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid())
);

-- Publishers: Read for all, Write for Staff
CREATE POLICY "Public read publishers" ON publishers FOR SELECT USING (true);
CREATE POLICY "Staff write publishers" ON publishers FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid())
);

-- Books: Read for all, Write for Staff
CREATE POLICY "Public read books" ON books FOR SELECT USING (true);
CREATE POLICY "Staff write books" ON books FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid())
);

-- Patrons: Read for all (restricted to id match or staff), Write for Staff
CREATE POLICY "Staff read all patrons" ON patrons FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid())
);
CREATE POLICY "Patron read own" ON patrons FOR SELECT USING (
    student_id = (SELECT student_id FROM patrons WHERE id = auth.uid())
);
CREATE POLICY "Staff write patrons" ON patrons FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid())
);

-- ─── Auth Trigger ─────────────────────────────────────────────────────────────

-- Create a profile when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role, staff_id)
  VALUES (
    new.id, 
    new.raw_user_meta_data->>'full_name', 
    new.email, 
    COALESCE(new.raw_user_meta_data->>'role', 'LIBRARIAN'),
    new.raw_user_meta_data->>'staff_id'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
