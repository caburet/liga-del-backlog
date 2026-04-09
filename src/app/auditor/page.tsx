'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  ShieldCheck, Lock, Image as ImageIcon, Search, CheckCircle2, Check, Timer,
  Swords, Plus, Trash2, Zap, ExternalLink, AlertTriangle
} from 'lucide-react';
import Image from 'next/image';

/* ── Interfaces ── */
interface PlayRecord {
  profile_id: string;
  user_email: string;
  game_id: number;
  hours_played: number;
  hltb_proof_url: string;
  credits_proof_url: string;
  hours_audited: boolean;
  proofs_audited: boolean;
  mission_id: string | null;
  created_at: string;
  games: { name: string; cover_url: string };
}

interface Mission {
  id: string;
  name: string;
  description: string;
  multiplier: number;
  type: 'bonus' | 'penalty';
  active: boolean;
  created_at: string;
}

type AuditTab = 'partidas' | 'misiones';

/* ── Component ── */
export default function AuditorPanel() {
  const [unlocked, setUnlocked] = useState(false);
  const [passKey, setPassKey] = useState('');
  const [activeTab, setActiveTab] = useState<AuditTab>('partidas');

  // Plays
  const [loading, setLoading] = useState(true);
  const [plays, setPlays] = useState<PlayRecord[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [editableHours, setEditableHours] = useState<Record<number, number>>({});
  const [showOnlyPending, setShowOnlyPending] = useState(true);

  // Missions
  const [missions, setMissions] = useState<Mission[]>([]);
  const [missionsLoading, setMissionsLoading] = useState(false);
  const [newMission, setNewMission] = useState({ name: '', description: '', multiplier: 1.5, type: 'bonus' as 'bonus' | 'penalty' });
  const [savingMission, setSavingMission] = useState(false);

  // Apply penalty
  const [penaltyMissionId, setPenaltyMissionId] = useState('');
  const [penaltyTargetEmail, setPenaltyTargetEmail] = useState('');
  const [penaltyGameId, setPenaltyGameId] = useState('');
  const [applyingPenalty, setApplyingPenalty] = useState(false);

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (passKey.toLowerCase() === 'logiadelbacklog' || passKey.toLowerCase() === 'lalogiadelbacklog') {
      setUnlocked(true);
      loadPlays();
      loadMissions();
    } else {
      alert('Contraseña de auditor incorrecta');
    }
  };

  /* ── Plays ── */
  const loadPlays = async () => {
    setLoading(true);
    setFetchError(null);
    const { data, error } = await supabase
      .from('plays')
      .select(`
        profile_id, user_email, game_id, hours_played,
        hltb_proof_url, credits_proof_url,
        hours_audited, proofs_audited, mission_id, created_at,
        games (name, cover_url)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase error:', error.message);
      setFetchError(`Error: ${error.message}. ¿Corriste el SQL de migración?`);
    } else if (data) {
      setPlays(data as any);
      const seed: Record<number, number> = {};
      (data as any[]).forEach((p: any) => { seed[p.game_id] = p.hours_played; });
      setEditableHours(seed);
    }
    setLoading(false);
  };

  const markHoursAudited = async (gameId: number, confirmedHours: number) => {
    setPlays(plays.map(p => p.game_id === gameId ? { ...p, hours_audited: true, hours_played: confirmedHours } : p));
    const { error } = await supabase.from('plays')
      .update({ hours_audited: true, hours_played: confirmedHours })
      .match({ game_id: gameId });
    if (error) alert('Error: ' + error.message);
  };

  const markProofsAudited = async (profileId: string, gameId: number) => {
    setPlays(plays.map(p => (p.profile_id === profileId && p.game_id === gameId) ? { ...p, proofs_audited: true } : p));
    const { error } = await supabase.from('plays')
      .update({ proofs_audited: true })
      .match({ profile_id: profileId, game_id: gameId });
    if (error) alert('Error: ' + error.message);
  };

  /* ── Missions ── */
  const loadMissions = async () => {
    setMissionsLoading(true);
    const { data } = await supabase.from('missions').select('*').order('created_at', { ascending: false });
    if (data) setMissions(data as Mission[]);
    setMissionsLoading(false);
  };

  const createMission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMission.name.trim()) return;
    setSavingMission(true);
    const multiplier = newMission.type === 'penalty'
      ? Math.min(0.99, Math.max(0, newMission.multiplier)) // penalty: 0-0.99
      : Math.max(1.01, newMission.multiplier); // bonus: > 1
    const { error } = await supabase.from('missions').insert({
      name: newMission.name.trim(),
      description: newMission.description.trim(),
      multiplier,
      type: newMission.type,
      active: true,
    });
    if (error) alert('Error creando misión: ' + error.message);
    else {
      setNewMission({ name: '', description: '', multiplier: 1.5, type: 'bonus' });
      await loadMissions();
    }
    setSavingMission(false);
  };

  const toggleMissionActive = async (mission: Mission) => {
    const { error } = await supabase.from('missions').update({ active: !mission.active }).eq('id', mission.id);
    if (!error) setMissions(missions.map(m => m.id === mission.id ? { ...m, active: !m.active } : m));
  };

  const deleteMission = async (id: string) => {
    if (!confirm('¿Eliminar esta misión?')) return;
    const { error } = await supabase.from('missions').delete().eq('id', id);
    if (!error) setMissions(missions.filter(m => m.id !== id));
    else alert('Error: ' + error.message);
  };

  /* ── Apply Penalty ── */
  const applyPenalty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!penaltyMissionId || !penaltyTargetEmail || !penaltyGameId) {
      alert('Completá todos los campos antes de aplicar la penalidad.');
      return;
    }
    setApplyingPenalty(true);
    // Insert into penalties table
    const { error } = await supabase.from('penalties').insert({
      user_email: penaltyTargetEmail,
      game_id: Number(penaltyGameId),
      mission_id: penaltyMissionId,
    });
    if (error) {
      alert('Error aplicando penalidad: ' + error.message);
    } else {
      alert(`✅ Penalidad aplicada a ${penaltyTargetEmail} en el juego seleccionado.`);
      setPenaltyTargetEmail('');
      setPenaltyGameId('');
      setPenaltyMissionId('');
    }
    setApplyingPenalty(false);
  };

  // Unique users from plays for penalty dropdown
  const uniqueUsers = [...new Set(plays.map(p => p.user_email))].sort();
  const userGames = plays.filter(p => p.user_email === penaltyTargetEmail);
  const penaltyMissions = missions.filter(m => m.type === 'penalty' && m.active);

  /* ── Lock Screen ── */
  if (!unlocked) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-5 pt-20">
        <div className="bg-gray-800 p-8 rounded-3xl border border-gray-700 shadow-2xl max-w-sm w-full">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-emerald-500/10 rounded-full border border-emerald-500/20">
              <Lock className="w-10 h-10 text-emerald-400" />
            </div>
          </div>
          <h1 className="text-2xl font-black text-white text-center mb-2">Panel del Auditor</h1>
          <p className="text-gray-400 text-sm text-center mb-8">Ingresa la clave secreta de la Logia.</p>
          <form onSubmit={handleUnlock} className="flex flex-col gap-4">
            <input type="password" value={passKey} onChange={e => setPassKey(e.target.value)}
              placeholder="Contraseña secreta..."
              className="bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors" />
            <button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl transition-colors">
              Desbloquear
            </button>
          </form>
        </div>
      </div>
    );
  }

  /* ── Main Panel ── */
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] pt-32 px-5 pb-20">
      <div className="max-w-[1200px] mx-auto">

        {/* Header */}
        <div className="flex justify-between items-end mb-6">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
              <ShieldCheck className="w-8 h-8 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-4xl font-black text-white">Central de Auditoría</h1>
              <p className="text-gray-400 text-sm mt-1">Valida partidas, gestiona misiones y aplica penalidades.</p>
            </div>
          </div>
          <button onClick={() => { loadPlays(); loadMissions(); }}
            className="text-sm font-bold text-gray-400 hover:text-white bg-gray-800 px-4 py-2 rounded-lg border border-gray-700 transition-colors">
            Recargar
          </button>
        </div>

        {/* Tabs & Filters */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex gap-2">
            <TabBtn active={activeTab === 'partidas'} onClick={() => setActiveTab('partidas')} icon={<ShieldCheck className="w-4 h-4" />} label="Partidas" color="emerald" />
            <TabBtn active={activeTab === 'misiones'} onClick={() => setActiveTab('misiones')} icon={<Swords className="w-4 h-4" />} label="Misiones & Penalidades" color="orange" />
          </div>

          {activeTab === 'partidas' && (
            <div className="flex bg-gray-900 border border-gray-700 rounded-xl p-1 p-1">
              <button 
                onClick={() => setShowOnlyPending(true)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${showOnlyPending ? 'bg-gray-700 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
              >
                Pendientes
              </button>
              <button 
                onClick={() => setShowOnlyPending(false)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${!showOnlyPending ? 'bg-gray-700 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
              >
                Todas
              </button>
            </div>
          )}
        </div>

        {/* ── TAB: Partidas ── */}
        {activeTab === 'partidas' && (
          fetchError ? (
            <div className="bg-red-900/20 border border-red-500/40 rounded-2xl p-6 text-red-300 text-sm">
              <p className="font-black text-red-400 mb-2">⚠️ Error al cargar datos</p>
              <p className="mb-3">{fetchError}</p>
              <div className="p-4 bg-gray-900 rounded-xl text-xs font-mono text-gray-400 whitespace-pre-wrap">
{`ALTER TABLE public.plays ADD COLUMN IF NOT EXISTS hours_audited  BOOLEAN DEFAULT false;
ALTER TABLE public.plays ADD COLUMN IF NOT EXISTS proofs_audited  BOOLEAN DEFAULT false;
ALTER TABLE public.plays ADD COLUMN IF NOT EXISTS mission_id      UUID REFERENCES missions(id);`}
              </div>
            </div>
          ) : loading ? (
            <div className="flex justify-center py-20"><ShieldCheck className="w-12 h-12 text-emerald-500 animate-pulse" /></div>
          ) : plays.length === 0 ? (
            <div className="bg-gray-900 border border-gray-800 p-12 rounded-3xl text-center text-gray-500">No hay partidas registradas.</div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {plays
                .filter(p => !showOnlyPending || (!p.hours_audited || !p.proofs_audited))
                .map((play, i) => {
                const mission = play.mission_id ? missions.find(m => m.id === play.mission_id) : null;
                return (
                  <div key={`${play.profile_id}-${play.game_id}-${i}`} className={`flex flex-col md:flex-row bg-gray-800/80 rounded-2xl border ${((play as any).hours_audited && (play as any).proofs_audited) ? 'border-emerald-500/30 bg-emerald-900/10' : 'border-gray-700'} overflow-hidden shadow-lg`}>
                    {/* Info */}
                    <div className="flex flex-1 items-center p-4">
                      {play.games?.cover_url ? (
                        <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0 relative mr-4 border border-gray-700">
                          <Image src={play.games.cover_url} alt={play.games.name} fill className="object-cover" sizes="64px" />
                        </div>
                      ) : <div className="w-16 h-16 rounded-lg bg-gray-900 shrink-0 mr-4 border border-gray-700" />}
                      <div className="flex-1 min-w-0 pr-4">
                        <h3 className="text-lg font-black text-white truncate">{play.games?.name || 'Desconocido'}</h3>
                        <div className="text-sm text-gray-400 font-semibold mb-1 truncate">{play.user_email}</div>
                        <div className="flex flex-wrap gap-2 items-center">
                          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-gray-900 border border-gray-700 text-xs font-bold text-gray-300">
                            <Timer className="w-3 h-3 text-purple-400" /> {play.hours_played} hrs
                          </span>
                          {mission && (
                            <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded border text-xs font-bold ${mission.type === 'bonus' ? 'bg-orange-500/10 border-orange-500/30 text-orange-300' : 'bg-red-500/10 border-red-500/30 text-red-300'}`}>
                              <Swords className="w-3 h-3" /> {mission.name} {mission.type === 'bonus' ? `×${mission.multiplier}` : `-${Math.round((1 - mission.multiplier) * 100)}%`}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Evidence */}
                    <div className="flex flex-col justify-center gap-2 p-4 md:border-l border-gray-700/50 bg-gray-900/40 md:w-[220px] shrink-0">
                      <a href={`https://howlongtobeat.com/?q=${encodeURIComponent(play.games?.name || '')}`}
                        target="_blank" rel="noreferrer"
                        className="flex justify-between items-center text-xs font-bold text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 p-2.5 rounded-lg border border-indigo-500/20 transition-colors">
                        <span className="flex items-center gap-2"><Search className="w-3.5 h-3.5" /> Buscar en HLTB</span>
                        <ExternalLink className="w-3 h-3 opacity-50" />
                      </a>
                      <div className="flex gap-2">
                        <a className={`flex-1 flex flex-col items-center p-2 rounded-lg border text-center transition-colors ${play.hltb_proof_url ? 'bg-gray-800 hover:bg-gray-700 border-gray-600 text-white' : 'bg-red-900/20 border-red-900 text-red-500 pointer-events-none'}`}
                          href={play.hltb_proof_url} target="_blank" rel="noreferrer">
                          <ImageIcon className="w-4 h-4 mb-1" /><span className="text-[10px] font-bold uppercase">HLTB</span>
                        </a>
                        <a className={`flex-1 flex flex-col items-center p-2 rounded-lg border text-center transition-colors ${play.credits_proof_url ? 'bg-gray-800 hover:bg-gray-700 border-gray-600 text-white' : 'bg-red-900/20 border-red-900 text-red-500 pointer-events-none'}`}
                          href={play.credits_proof_url} target="_blank" rel="noreferrer">
                          <ImageIcon className="w-4 h-4 mb-1" /><span className="text-[10px] font-bold uppercase">Credits</span>
                        </a>
                      </div>
                    </div>

                    {/* Audit Actions */}
                    <div className="flex flex-col gap-2 justify-center p-4 bg-gray-900/80 md:w-[200px] shrink-0 border-t md:border-t-0 border-gray-700 md:border-l">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Horas · Global</p>
                      {(play as any).hours_audited ? (
                        <div className="flex items-center gap-2 text-emerald-400 text-sm font-bold">
                          <CheckCircle2 className="w-4 h-4" /> {play.hours_played} hrs OK
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-1.5">
                            <input type="number" min="0"
                              value={editableHours[play.game_id] ?? play.hours_played}
                              onChange={e => setEditableHours(prev => ({ ...prev, [play.game_id]: Number(e.target.value) || 0 }))}
                              className="w-full bg-gray-900 border border-gray-600 rounded-lg text-white font-black text-lg text-center py-1.5 focus:border-purple-500 outline-none" />
                            <span className="text-gray-500 text-xs shrink-0">hrs</span>
                          </div>
                          <button onClick={() => markHoursAudited(play.game_id, editableHours[play.game_id] ?? play.hours_played)}
                            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg font-bold text-sm bg-purple-700 hover:bg-purple-600 text-white transition-all active:scale-95">
                            <Check className="w-3.5 h-3.5" /> Aprobar Horas
                          </button>
                        </div>
                      )}
                      <div className="border-t border-gray-700 my-1" />
                      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Capturas · Individual</p>
                      {(play as any).proofs_audited ? (
                        <div className="flex items-center gap-2 text-emerald-400 text-sm font-bold">
                          <CheckCircle2 className="w-4 h-4" /> Capturas OK
                        </div>
                      ) : (
                        <button onClick={() => markProofsAudited(play.profile_id, play.game_id)}
                          className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg font-bold text-sm bg-emerald-700 hover:bg-emerald-600 text-white transition-all active:scale-95">
                          <Check className="w-3.5 h-3.5" /> Aprobar Fotos
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}

        {/* ── TAB: Misiones & Penalidades ── */}
        {activeTab === 'misiones' && (
          <div className="space-y-8">

            {/* Create Mission */}
            <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6">
              <h2 className="text-xl font-black text-white mb-4 flex items-center gap-2">
                <Plus className="w-5 h-5 text-orange-400" /> Nueva Misión
              </h2>
              <form onSubmit={createMission} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Type Selector */}
                <div className="sm:col-span-2">
                  <label className="text-xs font-bold uppercase text-gray-400 mb-2 block">Tipo de Misión</label>
                  <div className="flex gap-3">
                    <button type="button" onClick={() => setNewMission(p => ({ ...p, type: 'bonus', multiplier: 1.5 }))}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold border transition-colors ${newMission.type === 'bonus' ? 'bg-orange-600 border-orange-500 text-white' : 'bg-gray-900 border-gray-700 text-gray-400 hover:text-white'}`}>
                      <Zap className="w-4 h-4" /> Bonus (Multiplica ×)
                    </button>
                    <button type="button" onClick={() => setNewMission(p => ({ ...p, type: 'penalty', multiplier: 0.9 }))}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold border transition-colors ${newMission.type === 'penalty' ? 'bg-red-700 border-red-600 text-white' : 'bg-gray-900 border-gray-700 text-gray-400 hover:text-white'}`}>
                      <AlertTriangle className="w-4 h-4" /> Penalidad (Resta %)
                    </button>
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs font-bold uppercase text-gray-400 mb-1 block">Nombre *</label>
                  <input value={newMission.name} onChange={e => setNewMission(p => ({ ...p, name: e.target.value }))} required
                    placeholder={newMission.type === 'bonus' ? 'Ej: Solo RPGs / Maratón Navideña' : 'Ej: Trampa detectada / Savescumming'}
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500 transition-colors" />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-gray-400 mb-1 block">Descripción (opcional)</label>
                  <input value={newMission.description} onChange={e => setNewMission(p => ({ ...p, description: e.target.value }))}
                    placeholder="Condiciones o motivo..."
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500 transition-colors" />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-gray-400 mb-1 block">
                    {newMission.type === 'bonus' ? 'Multiplicador (>1)' : 'Penalidad (0 a 0.99, ej: 0.9 = -10%)'}
                  </label>
                  <div className="flex items-center gap-2">
                    <input type="number" step="0.05"
                      min={newMission.type === 'bonus' ? '1.05' : '0'}
                      max={newMission.type === 'bonus' ? '10' : '0.99'}
                      value={newMission.multiplier}
                      onChange={e => setNewMission(p => ({ ...p, multiplier: parseFloat(e.target.value) || (p.type === 'bonus' ? 1.5 : 0.9) }))}
                      className={`w-28 bg-gray-900 border rounded-xl px-4 py-3 text-white text-center font-black text-xl focus:outline-none transition-colors ${newMission.type === 'bonus' ? 'border-orange-500/50 focus:border-orange-500' : 'border-red-500/50 focus:border-red-500'}`} />
                    <span className={`font-black text-xl ${newMission.type === 'bonus' ? 'text-orange-400' : 'text-red-400'}`}>
                      {newMission.type === 'bonus' ? `×` : `-${Math.round((1 - newMission.multiplier) * 100)}%`}
                    </span>
                  </div>
                </div>
                <div className="sm:col-span-2 flex justify-end">
                  <button type="submit" disabled={savingMission}
                    className={`flex items-center gap-2 text-white font-bold px-6 py-3 rounded-xl transition-colors shadow-lg disabled:opacity-50 ${newMission.type === 'bonus' ? 'bg-orange-600 hover:bg-orange-500' : 'bg-red-700 hover:bg-red-600'}`}>
                    <Plus className="w-4 h-4" /> {savingMission ? 'Guardando...' : 'Crear Misión'}
                  </button>
                </div>
              </form>
            </div>

            {/* Apply Penalty Panel */}
            <div className="bg-red-900/10 border border-red-500/20 rounded-2xl p-6">
              <h2 className="text-xl font-black text-white mb-1 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-400" /> Aplicar Penalidad a Usuario
              </h2>
              <p className="text-gray-400 text-sm mb-5">Elige una misión de penalidad, el jugador afectado y el juego base para calcular el porcentaje de deducción.</p>
              <form onSubmit={applyPenalty} className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                <div>
                  <label className="text-xs font-bold uppercase text-gray-400 mb-1 block">Misión Penalidad</label>
                  <select value={penaltyMissionId} onChange={e => setPenaltyMissionId(e.target.value)} required
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500 transition-colors">
                    <option value="">— Seleccionar —</option>
                    {penaltyMissions.map(m => (
                      <option key={m.id} value={m.id}>{m.name} (-{Math.round((1 - m.multiplier) * 100)}%)</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-gray-400 mb-1 block">Usuario Afectado</label>
                  <select value={penaltyTargetEmail} onChange={e => { setPenaltyTargetEmail(e.target.value); setPenaltyGameId(''); }} required
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500 transition-colors">
                    <option value="">— Seleccionar —</option>
                    {uniqueUsers.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-gray-400 mb-1 block">Juego Base</label>
                  <select value={penaltyGameId} onChange={e => setPenaltyGameId(e.target.value)} required
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500 transition-colors"
                    disabled={!penaltyTargetEmail}>
                    <option value="">— Seleccionar —</option>
                    {userGames.map(p => (
                      <option key={p.game_id} value={p.game_id}>{p.games?.name || `Juego ${p.game_id}`}</option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-3 flex justify-end">
                  <button type="submit" disabled={applyingPenalty}
                    className="flex items-center gap-2 bg-red-700 hover:bg-red-600 text-white font-bold px-6 py-3 rounded-xl transition-colors disabled:opacity-50">
                    <AlertTriangle className="w-4 h-4" /> {applyingPenalty ? 'Aplicando...' : 'Aplicar Penalidad'}
                  </button>
                </div>
              </form>
            </div>

            {/* Missions list */}
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2 mb-4">
                <Swords className="w-5 h-5 text-orange-400" /> Misiones Creadas
              </h2>
              {missionsLoading ? (
                <div className="text-gray-500 py-8 text-center">Cargando misiones...</div>
              ) : missions.length === 0 ? (
                <div className="bg-gray-900 border border-gray-800 p-10 rounded-2xl text-center text-gray-500">No hay misiones creadas aún.</div>
              ) : (
                <div className="flex flex-col gap-3">
                  {missions.map(m => (
                    <div key={m.id} className={`flex items-center gap-4 p-4 rounded-2xl border ${!m.active ? 'bg-gray-900 border-gray-800 opacity-60' : m.type === 'bonus' ? 'bg-orange-500/5 border-orange-500/30' : 'bg-red-500/5 border-red-500/30'}`}>
                      <div className={`flex items-center justify-center w-14 h-14 rounded-xl border text-xl font-black shrink-0 ${!m.active ? 'bg-gray-800 border-gray-700 text-gray-500' : m.type === 'bonus' ? 'bg-orange-500/10 border-orange-500/30 text-orange-300' : 'bg-red-500/10 border-red-500/30 text-red-300'}`}>
                        {m.type === 'bonus' ? `×${m.multiplier}` : `-${Math.round((1 - m.multiplier) * 100)}%`}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border ${m.type === 'bonus' ? 'text-orange-400 border-orange-500/30 bg-orange-500/10' : 'text-red-400 border-red-500/30 bg-red-500/10'}`}>
                            {m.type === 'bonus' ? 'Bonus' : 'Penalidad'}
                          </span>
                          <span className="font-black text-white">{m.name}</span>
                        </div>
                        {m.description && <div className="text-gray-400 text-sm mt-0.5">{m.description}</div>}
                      </div>
                      <div className="flex flex-col gap-2 items-end shrink-0">
                        <button onClick={() => toggleMissionActive(m)}
                          className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-colors ${m.active ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400' : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-emerald-500/10 hover:text-emerald-400'}`}>
                          {m.active ? '● Activa' : '○ Inactiva'}
                        </button>
                        <button onClick={() => deleteMission(m.id)} className="text-xs font-bold text-red-500 hover:text-red-400 flex items-center gap-1 transition-colors">
                          <Trash2 className="w-3 h-3" /> Eliminar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

function TabBtn({ active, onClick, icon, label, color }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string; color: string }) {
  const cls = active
    ? color === 'orange' ? 'bg-orange-600 border-orange-500 text-white shadow-orange-600/20'
      : 'bg-emerald-600 border-emerald-500 text-white shadow-emerald-600/20'
    : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white hover:bg-gray-700';
  return (
    <button onClick={onClick} className={`flex items-center gap-2 px-5 py-2.5 rounded-full border text-sm font-bold transition-all shadow-lg ${cls}`}>
      {icon} {label}
    </button>
  );
}
