-- Migration: Create volcano_activity and ash_plumes tables for PVMBG / VONA Volcanology Telemetry
-- Date: 2026-09-06
-- Target: Supabase PostgreSQL

CREATE TABLE IF NOT EXISTS public.volcano_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL, -- e.g., 'Anak Krakatau', 'Lewotobi Laki-Laki', 'Merapi'
    island VARCHAR(50) NOT NULL, -- 'Sumatra', 'Jawa', 'Bali & Nusa Tenggara', 'Sulawesi', 'Maluku'
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    elevation_m INTEGER NOT NULL DEFAULT 1000,
    alert_level VARCHAR(10) NOT NULL DEFAULT 'Level I', -- 'Level I', 'Level II', 'Level III', 'Level IV'
    status_description TEXT NOT NULL DEFAULT 'Normal activity',
    crater_status TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ash_plumes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    volcano_id UUID REFERENCES public.volcano_activity(id) ON DELETE CASCADE,
    volcano_code VARCHAR(50) NOT NULL,
    aviation_color_code VARCHAR(10) NOT NULL DEFAULT 'YELLOW', -- 'GREEN', 'YELLOW', 'ORANGE', 'RED'
    cloud_top_fl INTEGER NOT NULL DEFAULT 100, -- Flight level, e.g. FL200 = 20,000 ft
    direction VARCHAR(10) NOT NULL DEFAULT 'W', -- Compass direction, e.g. 'SW', 'W', 'NW'
    speed_knots INTEGER NOT NULL DEFAULT 15,
    dispersion_polygon JSONB, -- GeoJSON polygon coordinates representing the ash cloud plume
    advisory_summary TEXT,
    issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indices for spatial queries and alert filtering
CREATE INDEX IF NOT EXISTS idx_volcano_lat_lon ON public.volcano_activity (latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_volcano_alert_level ON public.volcano_activity (alert_level);
CREATE INDEX IF NOT EXISTS idx_ash_plumes_color_code ON public.ash_plumes (aviation_color_code);
CREATE INDEX IF NOT EXISTS idx_ash_plumes_issued_at ON public.ash_plumes (issued_at DESC);

-- Enable Row Level Security (RLS) & allow public read access
ALTER TABLE public.volcano_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ash_plumes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to volcano_activity"
    ON public.volcano_activity FOR SELECT USING (true);

CREATE POLICY "Allow public read access to ash_plumes"
    ON public.ash_plumes FOR SELECT USING (true);
