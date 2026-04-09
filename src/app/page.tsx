'use client';

import { useState, useEffect } from 'react';
import SearchGames from '@/components/SearchGames';
import AuthDialog from '@/components/AuthDialog';
import { getGamePlaytime } from '@/app/actions';
import { RawgGame } from '@/lib/rawg';
import Image from 'next/image';
import { Zap, Star, Compass, Clock, Loader2, Check, AlertCircle, Timer } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Session } from '@supabase/supabase-js';

export default function Home() {
  const [selectedGame, setSelectedGame] = useState<RawgGame | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [isFetchingHours, setIsFetchingHours] = useState(false);
  
  // Auth state
  const [session, setSession] = useState<Session | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  const handleSaveGame = async () => {
    if (!selectedGame) return;
    
    if (!session) {
      setIsAuthOpen(true);
      return;
    }

    setSaveStatus('saving');
    
    await supabase.from('games').upsert({
      id: selectedGame.id,
      name: selectedGame.name,
      year: selectedGame.released ? new Date(selectedGame.released).getFullYear() : null,
      rating: selectedGame.rating,
      genres: selectedGame.genres.map(g => g.name),
      cover_url: selectedGame.background_image
    });

    const calculatedHours = selectedGame.playtime || 0;

    const { error } = await supabase.from('plays').upsert({
      profile_id: session.user.id,
      user_email: session.user.email,
      game_id: selectedGame.id,
      hours_played: calculatedHours,
      completed: true
    }, { onConflict: 'profile_id, game_id' });

    if (error) {
      console.error(error);
      setErrorMessage(error.message);
      setSaveStatus('error');
    } else {
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <main className="max-w-3xl mx-auto px-5 py-24 md:py-32 flex flex-col items-center">

        {/* ── Title ── */}
        <h1 className="text-5xl md:text-7xl font-extrabold text-white tracking-tight text-center mb-4">
          Liga del Backlog
        </h1>
        <p className="text-gray-400 text-center text-lg mb-12 max-w-lg">
          Solo escribe el nombre del juego. El sistema deducirá su duración, género y métricas automáticamente.
        </p>

        {/* ── Search ── */}
        <div className="w-full mb-12 relative z-40">
          <SearchGames onSelect={async (game) => {
             // Force zero initially to ignore RAWG time
             setSelectedGame({ ...game, playtime: 0 });
             setSaveStatus('idle');
             
             // Fetch HLTB exclusively asynchronously directly from Server Action
             setIsFetchingHours(true);
             const hltbHours = await getGamePlaytime(game.name);
             if (hltbHours) {
                setSelectedGame(prev => prev ? { ...prev, playtime: hltbHours } : prev);
             }
             setIsFetchingHours(false);
          }} />
        </div>

        {/* ── Selected Game ── */}
        {selectedGame && (
          <div className="w-full space-y-5 animate-[fadeIn_0.4s_ease-out]">

            {/* Game Header */}
            <div className="flex items-center gap-5 bg-gray-800 rounded-2xl p-5 border border-gray-700">
              {selectedGame.background_image ? (
                <div className="relative w-20 h-20 md:w-24 md:h-24 rounded-xl overflow-hidden shrink-0 shadow-lg border border-gray-700">
                  <Image src={selectedGame.background_image} alt={selectedGame.name} fill className="object-cover" sizes="96px" />
                </div>
              ) : (
                <div className="w-20 h-20 md:w-24 md:h-24 rounded-xl bg-gray-900 shrink-0 flex items-center justify-center text-gray-600 border border-gray-800">
                  N/A
                </div>
              )}
              <div className="flex flex-col min-w-0">
                <h2 className="text-2xl md:text-3xl font-bold text-white truncate">{selectedGame.name}</h2>
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedGame.genres.map((g) => (
                    <span key={g.name} className="bg-indigo-500/20 text-indigo-300 text-xs font-semibold px-2.5 py-1 rounded-md">
                      {g.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Metric Cards 5-Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <MetricCard
                icon={<Timer className="w-5 h-5" />}
                accentColor="border-purple-500 text-purple-400 bg-purple-500/10"
                title="Viciador"
                value={isFetchingHours ? <Loader2 className="w-6 h-6 animate-spin text-purple-400 my-1.5" /> : (selectedGame.playtime || 0)}
                desc={isFetchingHours ? "Buscando en HLTB..." : (selectedGame.playtime ? "Historia Ppl. (HLTB)" : "Sin datos en HLTB :(")}
              />
              <MetricCard
                icon={<Zap className="w-5 h-5" />}
                accentColor="border-indigo-500 text-indigo-400 bg-indigo-500/10"
                title="Early Adopter"
                value={selectedGame.released ? new Date(selectedGame.released).getFullYear() : 0}
                desc="Año de lanzamiento"
              />
              <MetricCard
                icon={<Star className="w-5 h-5" />}
                accentColor="border-amber-500 text-amber-400 bg-amber-500/10"
                title="Crítico"
                value={Number((selectedGame.rating * 10).toFixed(0))}
                desc={`Rating base: ${selectedGame.rating.toFixed(1)}`}
              />
              <MetricCard
                icon={<Compass className="w-5 h-5" />}
                accentColor="border-pink-500 text-pink-400 bg-pink-500/10"
                title="Explorador"
                value={selectedGame.genres.length * 10}
                desc={`${selectedGame.genres.length} géneros detectados`}
              />
              <MetricCard
                icon={<Clock className="w-5 h-5" />}
                accentColor="border-emerald-500 text-emerald-400 bg-emerald-500/10"
                title="Retro Lover"
                value={selectedGame.released ? (new Date().getFullYear() - new Date(selectedGame.released).getFullYear()) * 5 : 0}
                desc="Antigüedad × 5"
              />
            </div>

            {/* Save Button */}
            <button
              onClick={handleSaveGame}
              disabled={saveStatus === 'saving' || saveStatus === 'success'}
              className={`
                w-full font-bold py-4 mt-4 rounded-xl transition-all text-lg shadow-lg flex justify-center items-center gap-2 border
                ${saveStatus === 'idle' ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20 border-indigo-500' : ''}
                ${saveStatus === 'saving' ? 'bg-indigo-600/50 text-white cursor-wait border-indigo-500/50' : ''}
                ${saveStatus === 'success' ? 'bg-emerald-600 border-emerald-500 text-white shadow-emerald-600/20 cursor-default' : ''}
                ${saveStatus === 'error' ? 'bg-gray-800 border-red-500 text-red-400 shadow-none' : ''}
              `}
            >
              {saveStatus === 'idle' && (!session ? 'Iniciar Sesión para Guardar' : 'Guardar en mi Backlog')}
              {saveStatus === 'saving' && <><Loader2 className="w-5 h-5 animate-spin" /> Guardando...</>}
              {saveStatus === 'success' && <><Check className="w-5 h-5" /> ¡Guardado en tu BD!</>}
              {saveStatus === 'error' && <><AlertCircle className="w-5 h-5" /> Error: {errorMessage || 'Falla en BD'}</>}
            </button>
          </div>
        )}

      </main>

      {/* Auth Modal Modal */}
      <AuthDialog isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </div>
  );
}

/* ── Metric Card Component ── */
function MetricCard({ icon, accentColor, title, value, desc }: any) {
  const [borderClass, textClass, bgClass] = accentColor.split(' ');

  return (
    <div className={`bg-gray-800 rounded-2xl p-5 border-l-4 ${borderClass} border border-l-[4px] border-b border-t border-r border-gray-700 hover:bg-gray-750 transition-colors flex flex-col justify-between`}>
      <div className={`inline-flex p-2 rounded-lg mb-3 self-start ${bgClass}`}>
        <span className={textClass}>{icon}</span>
      </div>
      <div>
        <h3 className="text-gray-400 text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-1">{title}</h3>
        <p className="text-2xl sm:text-3xl font-extrabold text-white">
          {value} <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest hidden sm:inline">Pts</span>
        </p>
        <p className="text-gray-500 text-[10px] sm:text-[11px] mt-2 font-medium">{desc}</p>
      </div>
    </div>
  );
}
