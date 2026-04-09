'use client';

import { useState, useEffect, useTransition } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { searchGames, RawgGame } from '@/lib/rawg';
import Image from 'next/image';

export default function SearchGames({ onSelect }: { onSelect: (game: RawgGame) => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<RawgGame[]>([]);
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (query.trim().length >= 2) {
        startTransition(async () => {
          const res = await searchGames(query);
          setResults(res);
          setIsOpen(true);
        });
      } else {
        setResults([]);
        setIsOpen(false);
      }
    }, 250);
    return () => clearTimeout(handler);
  }, [query]);

  return (
    <div className="relative w-full z-[100]">
      {/* Search Input */}
      <div className="relative flex items-center">
        <Search className="absolute left-4 text-gray-400 w-5 h-5" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => { if (results.length > 0) setIsOpen(true); }}
          placeholder="Busca un juego..."
          className="
            w-full rounded-xl border-2 border-gray-600 bg-gray-800
            text-white text-lg font-medium
            py-4 pl-12 pr-12
            placeholder:text-gray-500
            focus:outline-none focus:border-indigo-500
            transition-colors
          "
        />
        {isPending && (
          <Loader2 className="absolute right-4 animate-spin text-indigo-400 w-5 h-5" />
        )}
      </div>

      {/* Dropdown Results */}
      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 rounded-xl border border-gray-700 bg-gray-800 shadow-2xl overflow-hidden max-h-[420px] overflow-y-auto">
          {results.map((game) => (
            <button
              key={game.id}
              onClick={() => {
                onSelect(game);
                setQuery('');
                setIsOpen(false);
              }}
              className="
                w-full flex items-center gap-4 px-4 py-3
                hover:bg-gray-700/60 transition-colors text-left
                border-b border-gray-700/50 last:border-b-0
              "
            >
              {/* Thumbnail */}
              {game.background_image ? (
                <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-gray-900 shrink-0">
                  <Image
                    src={game.background_image}
                    alt={game.name}
                    fill
                    className="object-cover"
                    sizes="56px"
                  />
                </div>
              ) : (
                <div className="w-14 h-14 bg-gray-900 rounded-lg shrink-0 flex items-center justify-center text-gray-600 text-xs">
                  N/A
                </div>
              )}

              {/* Info */}
              <div className="flex flex-col flex-1 min-w-0">
                <span className="text-white font-semibold text-base truncate">{game.name}</span>
                <div className="flex items-center gap-3 mt-1 text-sm text-gray-400">
                  <span>{game.released ? new Date(game.released).getFullYear() : '—'}</span>
                  <span className="text-amber-400 font-medium">★ {game.rating.toFixed(1)}</span>
                  <span className="truncate text-gray-500 text-xs">{game.genres.map(g => g.name).join(', ')}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
