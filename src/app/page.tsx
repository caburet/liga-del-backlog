'use client';

import { useState } from 'react';
import SearchGames from '@/components/SearchGames';
import { RawgGame } from '@/lib/rawg';
import Image from 'next/image';
import { Zap, Star, Compass, Clock } from 'lucide-react';

export default function Home() {
  const [selectedGame, setSelectedGame] = useState<RawgGame | null>(null);

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
        <div className="w-full mb-12">
          <SearchGames onSelect={(game) => setSelectedGame(game)} />
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
                    <span key={g.name} className="bg-indigo-500/20 text-indigo-300 text-xs font-semibold px-2.5 py-1 rounded-md">
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
              disabled
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl transition-colors text-lg shadow-lg shadow-indigo-600/20"
            >
              Guardar Partida
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
    <div className={`bg-gray-800 rounded-2xl p-5 border-l-4 ${borderClass} border border-l-4 border-gray-700 hover:bg-gray-750 transition-colors`}>
      <div className={`inline-flex p-2 rounded-lg mb-3 ${bgClass}`}>
        <span className={textClass}>{icon}</span>
      </div>
      <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1">{title}</h3>
      <p className="text-3xl font-extrabold text-white">
        {value} <span className="text-sm font-semibold text-gray-500">PTS</span>
      </p>
      <p className="text-gray-500 text-xs mt-1">{desc}</p>
    </div>
  );
}
