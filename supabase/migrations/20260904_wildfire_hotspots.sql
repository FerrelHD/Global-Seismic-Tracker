-- Migration: Create wildfire_hotspots table for NASA FIRMS VIIRS/MODIS integration
-- Date: 2026-09-04
-- Target: Supabase PostgreSQL

CREATE TABLE IF NOT EXISTS public.wildfire_hotspots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    frp DOUBLE PRECISION NOT NULL DEFAULT 10.0, -- Fire Radiative Power (MW)
    confidence VARCHAR(20) NOT NULL DEFAULT 'nominal', -- 'low', 'nominal', 'high'
    island VARCHAR(50) NOT NULL, -- 'Sumatra', 'Kalimantan', 'Sulawesi', 'Papua', 'Jawa'
    satellite VARCHAR(20) NOT NULL DEFAULT 'VIIRS', -- 'VIIRS_SNPP', 'NOAA20', 'MODIS'
    detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Spatial and temporal indices for bounding box queries across Indonesian archipelago
CREATE INDEX IF NOT EXISTS idx_wildfire_lat_lon ON public.wildfire_hotspots (latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_wildfire_detected_at ON public.wildfire_hotspots (detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_wildfire_island ON public.wildfire_hotspots (island);
CREATE INDEX IF NOT EXISTS idx_wildfire_frp ON public.wildfire_hotspots (frp DESC);

-- Enable Row Level Security (RLS) and allow public read access
ALTER TABLE public.wildfire_hotspots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to wildfire_hotspots"
    ON public.wildfire_hotspots
    FOR SELECT
    USING (true);
