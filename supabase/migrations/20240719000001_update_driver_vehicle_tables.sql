-- Add new fields to the drivers table for Driver Mitra and Driver Perusahaan
ALTER TABLE public.drivers
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS last_name TEXT,
ADD COLUMN IF NOT EXISTS full_name TEXT,
ADD COLUMN IF NOT EXISTS nickname TEXT,
ADD COLUMN IF NOT EXISTS ktp_address TEXT,
ADD COLUMN IF NOT EXISTS ktp_number TEXT,
ADD COLUMN IF NOT EXISTS phone_number TEXT,
ADD COLUMN IF NOT EXISTS family_phone TEXT,
ADD COLUMN IF NOT EXISTS relative_phone TEXT,
ADD COLUMN IF NOT EXISTS religion TEXT,
ADD COLUMN IF NOT EXISTS tribe TEXT,
ADD COLUMN IF NOT EXISTS skck_url TEXT,
ADD COLUMN IF NOT EXISTS kk_url TEXT;

-- Add new fields to the vehicles table for Driver Mitra
ALTER TABLE public.vehicles
ADD COLUMN IF NOT EXISTS vehicle_name TEXT,
ADD COLUMN IF NOT EXISTS vehicle_type TEXT,
ADD COLUMN IF NOT EXISTS vehicle_brand TEXT,
ADD COLUMN IF NOT EXISTS plate_number TEXT,
ADD COLUMN IF NOT EXISTS vehicle_year INTEGER,
ADD COLUMN IF NOT EXISTS vehicle_color TEXT,
ADD COLUMN IF NOT EXISTS vehicle_status TEXT,
ADD COLUMN IF NOT EXISTS front_image_url TEXT,
ADD COLUMN IF NOT EXISTS back_image_url TEXT,
ADD COLUMN IF NOT EXISTS side_image_url TEXT,
ADD COLUMN IF NOT EXISTS interior_image_url TEXT,
ADD COLUMN IF NOT EXISTS bpkb_url TEXT;

-- Add the vehicles table to realtime publication if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'vehicles'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.vehicles;
  END IF;
END
$$;

-- Ensure the drivers table is in the realtime publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'drivers'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.drivers;
  END IF;
END
$$;
