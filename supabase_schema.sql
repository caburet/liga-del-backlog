-- SQL Schema for Liga del Backlog (Supabase)

-- 1. Table: games
-- (Caching the games from RAWG to avoid redundant API calls and allow relations)
CREATE TABLE IF NOT EXISTS public.games (
  id BIGINT PRIMARY KEY, -- We use RAWG ID as primary key to prevent duplicates
  name TEXT NOT NULL,
  year INTEGER,
  rating NUMERIC,
  genres TEXT[], -- Array of strings for genres
  cover_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Table: plays
-- (Records a user's gameplay log)
CREATE TABLE IF NOT EXISTS public.plays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- Supabase Auth user
  game_id BIGINT REFERENCES public.games(id) ON DELETE RESTRICT,
  hours_played NUMERIC DEFAULT 0,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, game_id) -- A user can only log a game once (or they just update it)
);

-- Enable RLS (Row Level Security)
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plays ENABLE ROW LEVEL SECURITY;

-- RLS Policies for games (Anyone can read, authenticated can insert)
CREATE POLICY "Enable read access for all users" ON public.games FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users only" ON public.games FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- RLS Policies for plays (Users can only see and manipulate their own plays)
CREATE POLICY "Users can view their own plays" ON public.plays FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own plays" ON public.plays FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own plays" ON public.plays FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own plays" ON public.plays FOR DELETE USING (auth.uid() = user_id);

-- Optional: Create basic Views for the Leagues 
-- These views will make building the Next.js leaderboards extremely easy

-- Classic League: Total hours played
CREATE OR REPLACE VIEW public.league_classic AS
SELECT p.user_id, SUM(p.hours_played) as score
FROM public.plays p
GROUP BY p.user_id
ORDER BY score DESC;

-- Early Adopter: Favor newer games (Sum of years)
CREATE OR REPLACE VIEW public.league_early_adopter AS
SELECT p.user_id, SUM(g.year) as score
FROM public.plays p
JOIN public.games g ON p.game_id = g.id
WHERE p.completed = TRUE -- Example: Only counts if completed
GROUP BY p.user_id
ORDER BY score DESC;

-- Retro Lover: Favor older games (Current Year - Game Year)
CREATE OR REPLACE VIEW public.league_retro_lover AS
SELECT p.user_id, SUM(EXTRACT(YEAR FROM CURRENT_DATE) - g.year) as score
FROM public.plays p
JOIN public.games g ON p.game_id = g.id
WHERE g.year IS NOT NULL AND p.completed = TRUE
GROUP BY p.user_id
ORDER BY score DESC;
