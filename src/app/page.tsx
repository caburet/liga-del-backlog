'use client';

import { useState, useEffect } from 'react';
import SearchGames from '@/components/SearchGames';
import AuthDialog from '@/components/AuthDialog';
import { RawgGame } from '@/lib/rawg';
import Image from 'next/image';
import { Zap, Star, Compass, Clock, Loader2, Check, AlertCircle, Timer, UploadCloud, ImageIcon } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Session } from '@supabase/supabase-js';

export default function Home() {
  const [selectedGame, setSelectedGame] = useState<RawgGame | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  
  // Data State
  const [hoursPlayed, setHoursPlayed] = useState<number>(0);
  const [hltbProof, setHltbProof] = useState<File | null>(null);
  const [creditsProof, setCreditsProof] = useState<File | null>(null);
  
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

    if (!hltbProof || !creditsProof) {
      setErrorMessage("Debes adjuntar ambas pruebas fotográficas para poder validar la partida.");
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
      return;
    }

    setSaveStatus('saving');
    setErrorMessage('');
    
    // 1. Guardar la info básica del juego en caché
    await supabase.from('games').upsert({
      id: selectedGame.id,
      name: selectedGame.name,
      year: selectedGame.released ? new Date(selectedGame.released).getFullYear() : null,
      rating: selectedGame.rating,
      genres: selectedGame.genres.map(g => g.name),
      cover_url: selectedGame.background_image
    });

    try {
      // 2. Subir Archivos a Supabase Storage (Bucket 'proofs')
      const hltbExt = hltbProof.name.split('.').pop();
      const creditsExt = creditsProof.name.split('.').pop();
      const hltbFileName = `${session.user.id}/${selectedGame.id}_hltb_${Date.now()}.${hltbExt}`;
      const creditsFileName = `${session.user.id}/${selectedGame.id}_credits_${Date.now()}.${creditsExt}`;

      const { error: hError } = await supabase.storage.from('proofs').upload(hltbFileName, hltbProof);
      if (hError) throw new Error("Error subiendo la captura de HLTB: " + hError.message);

      const { error: cError } = await supabase.storage.from('proofs').upload(creditsFileName, creditsProof);
      if (cError) throw new Error("Error subiendo la captura de Créditos: " + cError.message);

      // Obtener URLs públicas (incluso si falla el getPublicUrl no detiene el insert asumiendo el bucket público)
      const hltbUrl = supabase.storage.from('proofs').getPublicUrl(hltbFileName).data.publicUrl;
      const creditsUrl = supabase.storage.from('proofs').getPublicUrl(creditsFileName).data.publicUrl;

      // 3. Upsert a la tabla de plays
      const { error } = await supabase.from('plays').upsert({
        profile_id: session.user.id,
        user_email: session.user.email,
        game_id: selectedGame.id,
        hours_played: hoursPlayed,
        hltb_proof_url: hltbUrl,
        credits_proof_url: creditsUrl,
        completed: true
      }, { onConflict: 'profile_id, game_id' });

      if (error) {
        throw new Error(error.message);
      }

      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 4000);
      
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Error general guardando partida');
      setSaveStatus('error');
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
          Certifica tus victorias subiendo evidencia. Solo verdaderos completistas admitidos.
        </p>

        {/* ── Search ── */}
        <div className="w-full mb-12 relative z-40">
          <SearchGames onSelect={(game) => {
             setSelectedGame(game);
             setSaveStatus('idle');
             setHltbProof(null);
             setCreditsProof(null);
             // Opción Híbrida: Rellenamos con data general de RAWG, pero el user puede modificar a placer
             setHoursPlayed(game.playtime || 0);
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

            {/* Input Hours Card (Opción Híbrida) */}
            <div className="bg-gray-800/80 rounded-2xl p-6 border border-gray-700 flex flex-col gap-5">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-white font-bold text-lg flex items-center gap-2"><Timer className="w-5 h-5 text-purple-400"/> Horas Invertidas</h3>
                  <p className="text-gray-400 text-sm">Corrobóralo con la web de HLTB</p>
                </div>
                <div className="flex items-center gap-2">
                  <input 
                    type="number" 
                    min="0"
                    value={hoursPlayed}
                    onChange={(e) => setHoursPlayed(Number(e.target.value) || 0)}
                    className="bg-gray-900 border border-gray-600 rounded-lg text-white font-black text-2xl w-24 text-center py-2 focus:border-indigo-500 transition-colors outline-none"
                  />
                  <span className="text-gray-500 font-bold text-lg">hrs</span>
                </div>
              </div>
              <input 
                type="range" 
                min="0" 
                max="500" 
                value={hoursPlayed} 
                onChange={(e) => setHoursPlayed(Number(e.target.value))}
                className="w-full accent-purple-500 h-2 bg-gray-900 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* Evidence File Uploads */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FileUploadCard 
                title="Prueba de HowLongToBeat" 
                description="Captura mostrando las horas"
                file={hltbProof}
                onFileChange={setHltbProof}
                accent="border-purple-500/50 text-purple-400"
              />
              <FileUploadCard 
                title="Créditos del Juego" 
                description="Captura de fin de partida"
                file={creditsProof}
                onFileChange={setCreditsProof}
                accent="border-blue-500/50 text-blue-400"
              />
            </div>

            {/* Metric Cards 4-Grid */}
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
                desc={`${selectedGame.genres.length} géneros útiles`}
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
              {saveStatus === 'idle' && (!session ? 'Iniciar Sesión para Guardar' : 'Subir Pruebas y Registrar Victoria')}
              {saveStatus === 'saving' && <><Loader2 className="w-5 h-5 animate-spin" /> Subiendo archivos y guardando...</>}
              {saveStatus === 'success' && <><Check className="w-5 h-5" /> ¡Aprobado y Guardado!</>}
              {saveStatus === 'error' && <><AlertCircle className="w-5 h-5" /> {errorMessage || 'Falla en BD'}</>}
            </button>
          </div>
        )}

      </main>

      {/* Auth Modal Modal */}
      <AuthDialog isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </div>
  );
}

/* ── Auxiliary Components ── */

function FileUploadCard({ title, description, file, onFileChange, accent }: any) {
  return (
    <label className={`relative flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-2xl cursor-pointer hover:bg-gray-800/80 transition-colors ${file ? 'bg-gray-800/50 border-emerald-500/50' : 'bg-gray-900 border-gray-700'}`}>
      <input 
        type="file" 
        accept="image/png, image/jpeg, image/webp" 
        className="hidden" 
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            onFileChange(e.target.files[0]);
          }
        }} 
      />
      {!file ? (
        <>
          <UploadCloud className={`w-8 h-8 mb-2 ${accent}`} />
          <p className="text-white font-bold text-sm text-center">{title}</p>
          <p className="text-gray-500 text-xs mt-1 text-center">{description}</p>
        </>
      ) : (
        <>
          <ImageIcon className="w-8 h-8 mb-2 text-emerald-400" />
          <p className="text-emerald-400 font-bold text-sm text-center line-clamp-1 max-w-full px-2" title={file.name}>{file.name}</p>
          <p className="text-emerald-500/70 text-xs mt-1 text-center">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
        </>
      )}
    </label>
  );
}

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
