'use client';

import { useState } from 'react';
import SearchGames from '@/components/SearchGames';
import { RawgGame } from '@/lib/rawg';
import Image from 'next/image';
import { Zap, Star, Compass, Clock, Loader2, Check, AlertCircle } from 'lucide-react';
import { supabase, getProfileId } from '@/lib/supabase';

export default function Home() {
  const [selectedGame, setSelectedGame] = useState<RawgGame | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

  const handleSaveGame = async () => {
    if (!selectedGame) return;
    setSaveStatus('saving');
    
    // UPSERT Game info
    await supabase.from('games').upsert({
      id: selectedGame.id,
      name: selectedGame.name,
      year: selectedGame.released ? new Date(selectedGame.released).getFullYear() : null,
      rating: selectedGame.rating,
      genres: selectedGame.genres.map(g => g.name),
      cover_url: selectedGame.background_image
    });

    // UPSERT Play log
    const profileId = getProfileId();
    const { error } = await supabase.from('plays').upsert({
      profile_id: profileId,
      game_id: selectedGame.id,
      hours_played: 0,
      completed: true
    }, { onConflict: 'profile_id, game_id' });

    if (error) {
      console.error(error);
      setSaveStatus('error');
    } else {
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <main className="max-w-3xl mx-auto px-5 py-16 md:py-24 flex flex-col items-center">

        {/* ── Title ── */}
        <h1 className="text-5xl md:text-7xl font-extrabold text-white tracking-tight text-center mb-4">
          Liga del Backlog
        </h1>
        <p className="text-gray-400 text-center text-lg mb-12 max-w-lg">
          Busca un juego, selecciónalo y mirá cómo se calculan tus puntos automáticamente.
        </p>

        {/* ── Search ── */}
        <div className="w-full mb-12 relative z-50">
          <SearchGames onSelect={(game) => {
            setSelectedGame(game);
            setSaveStatus('idle');
          }} />
        </div>

        {/* ── Selected Game ── */}
        {selectedGame && (
          <div className="w-full space-y-5 animate-[fadeIn_0.4s_ease-out]">

            {/* Game Header Card */}
            <div className="flex items-center gap-5 bg-gray-800 rounded-2xl p-5 border border-gray-700">
              {selectedGame.background_image ? (
                <div className="relative w-20 h-20 md:w-24 md:h-24 rounded-xl overflow-hidden shrink-0 shadow-lg">
                  <Image
                    src={selectedGame.background_image}
                    alt={selectedGame.name}
                    fill
                    className="object-cover"
                    sizes="96px"
                  />
                </div>
              ) : (
                <div className="w-20 h-20 md:w-24 md:h-24 rounded-xl bg-gray-900 shrink-0 flex items-center justify-center text-gray-600">
                  N/A
                </div>
              )}
              <div className="flex flex-col min-w-0">
                <h2 className="text-2xl md:text-3xl font-bold text-white truncate">{selectedGame.name}</h2>
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedGame.genres.map((g) => (
                    <span key={g.name} className="bg-indigo-500/20 text-indigo-300 text-xs font-semibold px-2.5 py-1 rounded-md border border-indigo-500/30">
                      {g.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Metric Cards 2×2 Grid */}
            <div className="grid grid-cols-2 gap-4">
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
                desc={`${selectedGame.genres.length} géneros`}
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
                w-full font-bold py-4 rounded-xl transition-all text-lg shadow-lg flex items-center justify-center gap-2
                ${saveStatus === 'idle' ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20' : ''}
                ${saveStatus === 'saving' ? 'bg-indigo-600/50 text-white cursor-wait' : ''}
                ${saveStatus === 'success' ? 'bg-emerald-600 text-white shadow-emerald-600/20 cursor-default' : ''}
                ${saveStatus === 'error' ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-600/20' : ''}
              `}
            >
              {saveStatus === 'idle' && 'Guardar Partida en Ranking'}
              {saveStatus === 'saving' && <><Loader2 className="w-5 h-5 animate-spin" /> Guardando...</>}
              {saveStatus === 'success' && <><Check className="w-5 h-5" /> ¡Guardado con Éxito!</>}
              {saveStatus === 'error' && <><AlertCircle className="w-5 h-5" /> Falla en BD (Crea las tablas en Supabase)</>}
            </button>
          </div>
        )}

      </main>
    </div>
  );
}

/* ── Metric Card Component ── */
function MetricCard({
  icon,
  accentColor,
  title,
  value,
  desc,
}: {
  icon: React.ReactNode;
  accentColor: string;
  title: string;
  value: number;
  desc: string;
}) {
  const [borderClass, textClass, bgClass] = accentColor.split(' ');

  return (
    <div className={`bg-gray-800 rounded-2xl p-5 border-l-[3px] ${borderClass} border border-l-4 border-gray-700 hover:bg-gray-750 transition-colors`}>
      <div className={`inline-flex p-2 rounded-lg mb-3 ${bgClass}`}>
        <span className={textClass}>{icon}</span>
      </div>
      <h3 className="text-gray-400 text-xs font-extrabold uppercase tracking-wider mb-1">{title}</h3>
      <p className="text-3xl font-black text-white">
        {value} <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Pts</span>
      </p>
      <p className="text-gray-500 text-[11px] mt-1 font-medium">{desc}</p>
    </div>
  );
}
