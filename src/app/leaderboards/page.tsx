'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Trophy, Compass, Clock, Star, Zap, Timer } from 'lucide-react';

interface PlayerScore {
  profile_id: string;
  email: string;
  viciadorPoints: number;
  earlyAdopterPoints: number;
  criticoPoints: number;
  exploradorPoints: number;
  retroPoints: number;
}

interface RankedPlayer extends PlayerScore {
  ranks: {
    viciador: number;
    earlyAdopter: number;
    critico: number;
    explorador: number;
    retro: number;
    general: number; 
  };
  generalPoints: number;
}

type TabMode = 'global' | 'viciador' | 'early' | 'critico' | 'explorador' | 'retro';

export default function Leaderboards() {
  const [loading, setLoading] = useState(true);
  const [players, setPlayers] = useState<RankedPlayer[]>([]);
  const [activeTab, setActiveTab] = useState<TabMode>('global');

  useEffect(() => {
    async function loadData() {
      // Fetch plays with mission data joined
      const { data: plays, error } = await supabase
        .from('plays')
        .select(`
          profile_id,
          user_email,
          hours_played,
          mission_id,
          games (year, rating, genres),
          missions (multiplier, type)
        `);
      
      if (error || !plays) {
        console.error("Error fetching leaderboards", error);
        setLoading(false);
        return;
      }

      // Fetch penalties to apply deductions
      const { data: penaltiesData } = await supabase
        .from('penalties')
        .select('user_email, game_id, missions (multiplier)');
      
      // Map penalties by user: total penalty factor (multiplicative)
      const penaltyByUser: Record<string, number> = {};
      if (penaltiesData) {
        penaltiesData.forEach((pen: any) => {
          const factor = pen.missions?.multiplier ?? 1;
          penaltyByUser[pen.user_email] = (penaltyByUser[pen.user_email] ?? 1) * factor;
        });
      }

      const userMap: Record<string, PlayerScore> = {};

      plays.forEach(p => {
        const userId = p.profile_id;
        if (!userMap[userId]) {
          userMap[userId] = {
            profile_id: userId,
            email: (p as any).user_email || `Gamer-${userId.substring(0, 4)}`,
            viciadorPoints: 0,
            earlyAdopterPoints: 0,
            criticoPoints: 0,
            exploradorPoints: 0,
            retroPoints: 0
          };
        }

        // Mission multiplier: applied regardless of type (Bonus or Penalty/Reto)
        const missionMult = (p as any).missions?.multiplier ?? 1;

        userMap[userId].viciadorPoints += (Number(p.hours_played) || 0) * missionMult;

        const g = p.games as any;
        if (g) {
          const year = g.year || 0;
          userMap[userId].earlyAdopterPoints += year * missionMult;
          userMap[userId].criticoPoints += Number((g.rating * 10).toFixed(0)) * missionMult;
          userMap[userId].exploradorPoints += (g.genres?.length || 0) * 10 * missionMult;
          userMap[userId].retroPoints += (year > 0 ? (new Date().getFullYear() - year) * 5 : 0) * missionMult;
        }
      });

      // Apply global penalty factors per user (from penalties table)
      Object.keys(userMap).forEach(userId => {
        const email = userMap[userId].email;
        const penFactor = penaltyByUser[email] ?? 1;
        if (penFactor !== 1) {
          userMap[userId].viciadorPoints     = Math.round(userMap[userId].viciadorPoints     * penFactor);
          userMap[userId].earlyAdopterPoints = Math.round(userMap[userId].earlyAdopterPoints * penFactor);
          userMap[userId].criticoPoints      = Math.round(userMap[userId].criticoPoints      * penFactor);
          userMap[userId].exploradorPoints   = Math.round(userMap[userId].exploradorPoints   * penFactor);
          userMap[userId].retroPoints        = Math.round(userMap[userId].retroPoints        * penFactor);
        }
      });

      const userScores = Object.values(userMap);

      const rankBy = (scores: PlayerScore[], key: keyof PlayerScore) => {
        const sorted = [...scores].sort((a, b) => (b[key] as number) - (a[key] as number));
        const ranks: Record<string, number> = {};
        
        let currentRank = 1;
        let previousScore = -1;
        
        sorted.forEach((p, index) => {
          if (p[key] !== previousScore) {
            currentRank = index + 1;
            previousScore = p[key] as number;
          }
          ranks[p.profile_id] = currentRank;
        });
        return ranks;
      };

      const vr = rankBy(userScores, 'viciadorPoints');
      const ar = rankBy(userScores, 'earlyAdopterPoints');
      const cr = rankBy(userScores, 'criticoPoints');
      const er = rankBy(userScores, 'exploradorPoints');
      const rr = rankBy(userScores, 'retroPoints');

      const ranked: RankedPlayer[] = userScores.map(p => {
        const generalPts = vr[p.profile_id] + ar[p.profile_id] + cr[p.profile_id] + er[p.profile_id] + rr[p.profile_id];
        return {
          ...p,
          ranks: {
            viciador: vr[p.profile_id],
            earlyAdopter: ar[p.profile_id],
            critico: cr[p.profile_id],
            explorador: er[p.profile_id],
            retro: rr[p.profile_id],
            general: 0 
          },
          generalPoints: generalPts
        };
      });

      ranked.sort((a, b) => a.generalPoints - b.generalPoints);
      
      let currentGenRank = 1;
      let prevGenScore = -1;
      ranked.forEach((p, index) => {
        if (p.generalPoints !== prevGenScore) {
          currentGenRank = index + 1;
          prevGenScore = p.generalPoints;
        }
        p.ranks.general = currentGenRank;
      });

      setPlayers(ranked);
      setLoading(false);
    }
    
    loadData();
  }, []);

  if (loading) {
     return <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center text-white"><Trophy className="animate-pulse w-12 h-12 text-indigo-500" /></div>;
  }

  const displayPlayers = [...players].sort((a, b) => {
    if (activeTab === 'global') return a.generalPoints - b.generalPoints;
    if (activeTab === 'viciador') return b.viciadorPoints - a.viciadorPoints;
    if (activeTab === 'early') return b.earlyAdopterPoints - a.earlyAdopterPoints;
    if (activeTab === 'critico') return b.criticoPoints - a.criticoPoints;
    if (activeTab === 'explorador') return b.exploradorPoints - a.exploradorPoints;
    if (activeTab === 'retro') return b.retroPoints - a.retroPoints;
    return 0;
  });

  const getRankByTab = (p: RankedPlayer, tab: TabMode) => {
    if (tab === 'global') return p.ranks.general;
    if (tab === 'viciador') return p.ranks.viciador;
    if (tab === 'early') return p.ranks.earlyAdopter;
    if (tab === 'critico') return p.ranks.critico;
    if (tab === 'explorador') return p.ranks.explorador;
    if (tab === 'retro') return p.ranks.retro;
    return 1;
  };

  const getTitleData = () => {
    switch (activeTab) {
      case 'global': return { title: 'Liga Global', icon: <Trophy className="w-10 h-10 text-indigo-400" />, desc: 'Sumatoria de posiciones en las otras 5 ligas secundarias (Menor puntaje gana).' };
      case 'viciador': return { title: 'Rey Viciador', icon: <Timer className="w-10 h-10 text-purple-400" />, desc: 'Una hora, un punto. Premia a los que dedican su vida entera a esto.'};
      case 'early': return { title: 'Early Adopter', icon: <Zap className="w-10 h-10 text-indigo-400" />, desc: 'Premiando a quienes juegan los títulos de estreno.' };
      case 'critico': return { title: 'Ranking Crítico', icon: <Star className="w-10 h-10 text-amber-400" />, desc: 'Solo juegazos. Exquisitez y obras maestras.' };
      case 'explorador': return { title: 'Explorador', icon: <Compass className="w-10 h-10 text-pink-400" />, desc: 'Mientras más diversidad de géneros, mejor.' };
      case 'retro': return { title: 'Retro Lover', icon: <Clock className="w-10 h-10 text-emerald-400" />, desc: 'Mientras más veterano sea el juego, mejor.' };
    }
  };

  const hero = getTitleData();

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] pt-32 px-5 pb-20 overflow-hidden">
      <div className="max-w-[1240px] mx-auto">
        
        {/* Header content based on tab */}
        <div className="flex items-center gap-5 mb-10 transition-all">
          <div className="p-5 bg-gray-800 rounded-2xl border border-gray-700 shadow-xl">
            {hero.icon}
          </div>
          <div>
            <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">{hero.title}</h1>
            <p className="text-gray-400 mt-2">{hero.desc}</p>
          </div>
        </div>

        {/* Tab Selection Pill Navbar */}
        <div className="flex flex-nowrap overflow-x-auto gap-2 mb-6 pb-2 scrollbar-hide">
          <TabButton active={activeTab === 'global'} onClick={() => setActiveTab('global')} icon={<Trophy className="w-4 h-4 shrink-0"/>} label="Global" color="indigo" />
          <TabButton active={activeTab === 'viciador'} onClick={() => setActiveTab('viciador')} icon={<Timer className="w-4 h-4 shrink-0"/>} label="Viciador" color="purple" />
          <TabButton active={activeTab === 'early'} onClick={() => setActiveTab('early')} icon={<Zap className="w-4 h-4 shrink-0"/>} label="Adopter" color="indigo" />
          <TabButton active={activeTab === 'critico'} onClick={() => setActiveTab('critico')} icon={<Star className="w-4 h-4 shrink-0"/>} label="Crítico" color="amber" />
          <TabButton active={activeTab === 'explorador'} onClick={() => setActiveTab('explorador')} icon={<Compass className="w-4 h-4 shrink-0"/>} label="Explo" color="pink" />
          <TabButton active={activeTab === 'retro'} onClick={() => setActiveTab('retro')} icon={<Clock className="w-4 h-4 shrink-0"/>} label="Retro" color="emerald" />
        </div>

        {/* Main Table */}
        <div className="w-full bg-gray-900 border border-gray-800 rounded-3xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-gray-800/80 text-gray-400 text-xs font-black uppercase tracking-widest whitespace-nowrap">
                  <th className="p-6">Gamer</th>
                  <th className={`p-4 text-center border-l border-gray-700/50 ${activeTab === 'global' ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300' : ''}`}>
                    <span className="flex items-center justify-center gap-1"><Trophy className="w-3 h-3"/> Global</span>
                  </th>
                  <th className={`p-4 text-center border-l border-gray-700/50 ${activeTab === 'viciador' ? 'bg-purple-500/10 border-purple-500/30 text-purple-300' : ''}`}>
                    <span className="flex flex-col items-center gap-1"><Timer className="w-3 h-3"/> Horas</span>
                  </th>
                  <th className={`p-4 text-center border-l border-gray-700/50 ${activeTab === 'early' ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300' : ''}`}>
                    <span className="flex flex-col items-center gap-1"><Zap className="w-3 h-3"/> Early</span>
                  </th>
                  <th className={`p-4 text-center border-l border-gray-700/50 ${activeTab === 'critico' ? 'bg-amber-500/10 border-amber-500/30 text-amber-300' : ''}`}>
                    <span className="flex flex-col items-center gap-1"><Star className="w-3 h-3"/> Crítico</span>
                  </th>
                  <th className={`p-4 text-center border-l border-gray-700/50 ${activeTab === 'explorador' ? 'bg-pink-500/10 border-pink-500/30 text-pink-300' : ''}`}>
                    <span className="flex flex-col items-center gap-1"><Compass className="w-3 h-3"/> Explo</span>
                  </th>
                  <th className={`p-4 text-center border-l border-gray-700/50 ${activeTab === 'retro' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : ''}`}>
                    <span className="flex flex-col items-center gap-1"><Clock className="w-3 h-3"/> Retro</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {displayPlayers.map((p) => {
                  const rankInView = getRankByTab(p, activeTab);
                  
                  return (
                  <tr key={p.profile_id} className="hover:bg-gray-800/40 transition-colors">
                    <td className="p-6">
                      <div className="flex items-center gap-4">
                        <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 font-black text-sm shadow-lg shrink-0 ${
                          rankInView === 1 ? 'border-yellow-400 text-yellow-300 bg-yellow-400/10' :
                          rankInView === 2 ? 'border-slate-300 text-slate-200 bg-slate-300/10' :
                          rankInView === 3 ? 'border-amber-700 text-amber-600 bg-amber-700/10' :
                          'border-gray-700 text-gray-400 bg-gray-800/50'
                        }`}>
                          #{rankInView}
                        </div>
                        <Link 
                          href={`/perfil/${encodeURIComponent(p.email)}`}
                          className="font-bold text-sm text-white truncate max-w-[150px] hover:text-indigo-300 underline-offset-2 hover:underline transition-colors"
                        >
                          {p.email}
                        </Link>
                      </div>
                    </td>
                    
                    {/* Global Score */}
                    <td className={`p-4 text-center border-l border-gray-700/50 ${activeTab === 'global' ? 'bg-indigo-500/5 border-l-[3px] border-indigo-500/50' : ''}`}>
                      <span className="text-xl font-black text-white">{p.generalPoints}</span> 
                      <span className={`text-[9px] uppercase font-bold block ${activeTab === 'global' ? 'text-indigo-400' : 'text-gray-600'}`}>Sum</span>
                    </td>
                    
                    {/* Viciador Score */}
                    <td className={`p-4 text-center border-l border-gray-700/50 ${activeTab === 'viciador' ? 'bg-purple-500/5 border-l-[3px] border-purple-500/50' : ''}`}>
                      <div className={`text-lg font-black ${activeTab === 'viciador' ? 'text-purple-100' : 'text-gray-400'}`}>#{p.ranks.viciador}</div>
                      <div className={`text-[10px] font-bold mt-1 tracking-wider ${activeTab === 'viciador' ? 'text-purple-400' : 'text-gray-600'}`}>{p.viciadorPoints} pts</div>
                    </td>

                    {/* Early Adopter */}
                    <td className={`p-4 text-center border-l border-gray-700/50 ${activeTab === 'early' ? 'bg-indigo-500/5 border-l-[3px] border-indigo-500/50' : ''}`}>
                      <div className={`text-lg font-black ${activeTab === 'early' ? 'text-indigo-100' : 'text-gray-400'}`}>#{p.ranks.earlyAdopter}</div>
                      <div className={`text-[10px] font-bold mt-1 tracking-wider ${activeTab === 'early' ? 'text-indigo-400' : 'text-gray-600'}`}>{p.earlyAdopterPoints} pts</div>
                    </td>
                    
                    {/* Critico */}
                    <td className={`p-4 text-center border-l border-gray-700/50 ${activeTab === 'critico' ? 'bg-amber-500/5 border-l-[3px] border-amber-500/50' : ''}`}>
                      <div className={`text-lg font-black ${activeTab === 'critico' ? 'text-amber-100' : 'text-gray-400'}`}>#{p.ranks.critico}</div>
                      <div className={`text-[10px] font-bold mt-1 tracking-wider ${activeTab === 'critico' ? 'text-amber-400' : 'text-gray-600'}`}>{p.criticoPoints} pts</div>
                    </td>

                    {/* Explorador */}
                    <td className={`p-4 text-center border-l border-gray-700/50 ${activeTab === 'explorador' ? 'bg-pink-500/5 border-l-[3px] border-pink-500/50' : ''}`}>
                      <div className={`text-lg font-black ${activeTab === 'explorador' ? 'text-pink-100' : 'text-gray-400'}`}>#{p.ranks.explorador}</div>
                      <div className={`text-[10px] font-bold mt-1 tracking-wider ${activeTab === 'explorador' ? 'text-pink-400' : 'text-gray-600'}`}>{p.exploradorPoints} pts</div>
                    </td>

                    {/* Retro */}
                    <td className={`p-4 text-center border-l border-gray-700/50 ${activeTab === 'retro' ? 'bg-emerald-500/5 border-l-[3px] border-emerald-500/50' : ''}`}>
                      <div className={`text-lg font-black ${activeTab === 'retro' ? 'text-emerald-100' : 'text-gray-400'}`}>#{p.ranks.retro}</div>
                      <div className={`text-[10px] font-bold mt-1 tracking-wider ${activeTab === 'retro' ? 'text-emerald-400' : 'text-gray-600'}`}>{p.retroPoints} pts</div>
                    </td>
                  </tr>
                )})}

                {players.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-gray-500 font-medium">Aún no hay jugadas registradas. Entra a un juego y anota cuántas horas jugaste.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon, label, color }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string; color: string }) {
  const getColors = () => {
    if (!active) return "bg-gray-800 text-gray-400 border-gray-700 hover:bg-gray-700 hover:text-gray-200";
    switch(color) {
      case 'amber': return "bg-amber-600 border-amber-500 text-white shadow-lg shadow-amber-600/20";
      case 'pink': return "bg-pink-600 border-pink-500 text-white shadow-lg shadow-pink-600/20";
      case 'emerald': return "bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-600/20";
      case 'purple': return "bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-600/20";
      default: return "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/20";
    }
  };

  return (
    <button 
      onClick={onClick}
      className={`flex items-center gap-2 px-5 py-2.5 rounded-full border text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${getColors()}`}
    >
      {icon} {label}
    </button>
  );
}
