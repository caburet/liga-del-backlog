'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { User, LogOut, Trophy, Gamepad2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Session } from '@supabase/supabase-js';
import AuthDialog from '@/components/AuthDialog';

export default function Navbar() {
  const [session, setSession] = useState<Session | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <>
      <nav className="w-full absolute top-0 left-0 p-6 flex justify-between items-start z-50 pointer-events-none">
        
        {/* Navigation Links */}
        <div className="flex gap-4 pointer-events-auto">
          <Link 
            href="/" 
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-bold text-sm transition-colors border backdrop-blur-md shadow-lg ${
              pathname === '/' 
              ? 'bg-indigo-600 border-indigo-500 text-white shadow-indigo-500/20' 
              : 'bg-gray-800/80 border-gray-700 text-gray-300 hover:text-white hover:bg-gray-700'
            }`}
          >
            <Gamepad2 className="w-4 h-4" /> Registrar Juego
          </Link>
          <Link 
            href="/leaderboards" 
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-bold text-sm transition-colors border backdrop-blur-md shadow-lg ${
              pathname === '/leaderboards' 
              ? 'bg-indigo-600 border-indigo-500 text-white shadow-indigo-500/20' 
              : 'bg-gray-800/80 border-gray-700 text-gray-300 hover:text-white hover:bg-gray-700'
            }`}
          >
            <Trophy className="w-4 h-4" /> Liga Global
          </Link>
        </div>

        {/* Auth Status */}
        <div className="pointer-events-auto">
          {session ? (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-300 bg-gray-800/80 px-4 py-2 border border-gray-700 rounded-full backdrop-blur-md shadow-lg">
                <User className="w-4 h-4 text-indigo-400" />
                {session.user.email}
              </div>
              <button 
                onClick={handleSignOut}
                className="text-gray-400 hover:text-red-400 transition-colors p-2 bg-gray-800/80 border border-gray-700 rounded-full backdrop-blur-md shadow-lg"
                title="Cerrar sesión"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button 
              onClick={() => setIsAuthOpen(true)}
              className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white text-sm font-bold px-6 py-2.5 rounded-full border border-gray-600 transition-colors shadow-lg"
            >
              <User className="w-4 h-4" /> Iniciar Sesión
            </button>
          )}
        </div>

      </nav>
      
      {/* Navbar's Auth Modal (can be opened from any page by clicking Iniciar Sesion on top right) */}
      <AuthDialog isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </>
  );
}
