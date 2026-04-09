'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { Trophy, Timer, Zap, Star, Compass, Clock, ArrowLeft, Gamepad2 } from 'lucide-react';

interface GamePlay {
  game_id: number;
  hours_played: number;
  hours_audited: boolean;
  proofs_audited: boolean;
  created_at: string;
  games: {
    name: string;
    cover_url: string;
    year: number;
    rating: number;
    genres: string[];
  };
}

function calcPoints(play: GamePlay) {
  const g = play.games;
  const currentYear = new Date().getFullYear();
  return {
    viciador: play.hours_played,
    early: g?.year || 0,
    critico: Number(((g?.rating || 0) * 10).toFixed(0)),
    explorador: (g?.genres?.length || 0) * 10,
    retro: g?.year ? (currentYear - g.year) * 5 : 0,
  };
}

export default function ProfilePage() {
  const params = useParams();
  const emailSlug = decodeURIComponent(params.email as string);
  
  const [plays, setPlays] = useState<GamePlay[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('plays')
        .select(`
          game_id,
          hours_played,
          hours_audited,
          proofs_audited,
          created_at,
          games (name, cover_url, year, rating, genres)
        `)
        .eq('user_email', emailSlug)
        .order('created_at', { ascending: false });

      if (!error && data) setPlays(data as any);
      setLoading(false);
    }
    load();
  }, [emailSlug]);

  const totals = plays.reduce(
    (acc, p) => {
      const pts = calcPoints(p);
      acc.viciador += pts.viciador;
      acc.early += pts.early;
      acc.critico += pts.critico;
      acc.explorador += pts.explorador;
      acc.retro += pts.retro;
      return acc;
    },
    { viciador: 0, early: 0, critico: 0, explorador: 0, retro: 0 }
  );

  const username = emailSlug.split('@')[0];

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] pt-28 px-5 pb-20">
      <div className="max-w-4xl mx-auto">

        {/* Back */}
        <Link href="/leaderboards" className="inline-flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-white mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Volver al Ranking
        </Link>

        {/* Profile Header */}
        <div className="flex items-center gap-6 bg-gray-800 rounded-3xl border border-gray-700 p-6 mb-6 shadow-xl">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-3xl font-black text-white shadow-lg shrink-0">
            {username[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-black text-white truncate">{username}</h1>
            <p className="text-gray-400 text-sm truncate">{emailSlug}</p>
            <p className="text-gray-500 text-xs mt-1">{plays.length} juego{plays.length !== 1 ? 's' : ''} completado{plays.length !== 1 ? 's' : ''}</p>
          </div>
        </div>

        {/* Stats tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-8">
          {[
            { label: 'Viciador', value: totals.viciador, unit: 'hrs', color: 'purple', icon: <Timer className="w-4 h-4" /> },
            { label: 'Early', value: totals.early, unit: 'pts', color: 'indigo', icon: <Zap className="w-4 h-4" /> },
            { label: 'Crítico', value: totals.critico, unit: 'pts', color: 'amber', icon: <Star className="w-4 h-4" /> },
            { label: 'Explorador', value: totals.explorador, unit: 'pts', color: 'pink', icon: <Compass className="w-4 h-4" /> },
            { label: 'Retro', value: totals.retro, unit: 'pts', color: 'emerald', icon: <Clock className="w-4 h-4" /> },
          ].map(s => (
            <div key={s.label} className={`bg-gray-800 border border-gray-700 rounded-2xl p-4 flex flex-col gap-1 text-${s.color}-400`}>
              <div className="flex items-center gap-1.5 text-xs font-bold text-gray-400 uppercase tracking-wider">
                {s.icon} {s.label}
              </div>
              <div className="text-2xl font-black text-white">{s.value}</div>
              <div className="text-[10px] text-gray-500 font-bold uppercase">{s.unit}</div>
            </div>
          ))}
        </div>

        {/* Games list */}
        <h2 className="text-xl font-black text-white mb-4 flex items-center gap-2">
          <Gamepad2 className="w-5 h-5 text-indigo-400" /> Juegos Completados
        </h2>

        {loading ? (
          <div className="text-gray-500 text-center py-20">Cargando...</div>
        ) : plays.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center text-gray-500">
            Este jugador aún no tiene juegos registrados.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {plays.map((play, i) => {
              const pts = calcPoints(play);
              const g = play.games;
              return (
                <div key={`${play.game_id}-${i}`} className="flex items-center gap-4 bg-gray-800/80 border border-gray-700 rounded-2xl p-4 hover:bg-gray-800 transition-colors">
                  
                  {/* Cover */}
                  {g?.cover_url ? (
                    <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 relative border border-gray-700">
                      <Image src={g.cover_url} alt={g.name} fill className="object-cover" sizes="56px" />
                    </div>
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-gray-900 shrink-0 border border-gray-800 flex items-center justify-center text-gray-600">
                      <Gamepad2 className="w-5 h-5" />
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="font-black text-white truncate">{g?.name || 'Juego Desconocido'}</div>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      {g?.genres?.slice(0, 3).map((genre: string) => (
                        <span key={genre} className="text-[10px] font-bold bg-gray-700 text-gray-300 px-2 py-0.5 rounded">{genre}</span>
                      ))}
                    </div>
                  </div>

                  {/* Points per league */}
                  <div className="hidden sm:flex items-center gap-3 shrink-0">
                    <Pill color="purple" label={`${pts.viciador}h`} title="Viciador" />
                    <Pill color="indigo" label={`${pts.early}`} title="Early" />
                    <Pill color="amber" label={`${pts.critico}`} title="Crítico" />
                    <Pill color="pink" label={`${pts.explorador}`} title="Explo" />
                    <Pill color="emerald" label={`${pts.retro}`} title="Retro" />
                  </div>

                  {/* Badges */}
                  <div className="flex flex-col gap-1 items-end shrink-0 ml-2">
                    {play.hours_audited && (
                      <span className="text-[9px] font-black uppercase bg-purple-500/20 text-purple-300 border border-purple-500/30 px-1.5 py-0.5 rounded">✓ Hrs</span>
                    )}
                    {play.proofs_audited && (
                      <span className="text-[9px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.5 rounded">✓ Fotos</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}

function Pill({ color, label, title }: { color: string; label: string; title: string }) {
  const colors: Record<string, string> = {
    purple: 'bg-purple-500/10 text-purple-300 border-purple-500/20',
    indigo: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20',
    amber: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
    pink: 'bg-pink-500/10 text-pink-300 border-pink-500/20',
    emerald: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
  };
  return (
    <div className={`flex flex-col items-center border rounded-lg px-2 py-1 ${colors[color]}`} title={title}>
      <span className="text-[10px] font-bold text-gray-500 uppercase">{title}</span>
      <span className="text-sm font-black">{label}</span>
    </div>
  );
}
