CREATE TABLE IF NOT EXISTS public.games (
  id BIGINT PRIMARY KEY,
  name TEXT NOT NULL,
  year INTEGER,
  rating NUMERIC,
  genres TEXT[],
  cover_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.plays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id TEXT NOT NULL,
  game_id BIGINT REFERENCES public.games(id) ON DELETE RESTRICT,
  hours_played NUMERIC DEFAULT 0,
  completed BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(profile_id, game_id)
);

ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plays ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public games read" ON public.games;
DROP POLICY IF EXISTS "Public games insert" ON public.games;
DROP POLICY IF EXISTS "Public plays all" ON public.plays;

CREATE POLICY "Public games read" ON public.games FOR SELECT USING (true);
CREATE POLICY "Public games insert" ON public.games FOR INSERT WITH CHECK (true);
CREATE POLICY "Public plays all" ON public.plays FOR ALL USING (true) WITH CHECK (true);
