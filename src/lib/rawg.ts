const RAWG_API_KEY = process.env.NEXT_PUBLIC_RAWG_API_KEY;
const BASE_URL = 'https://api.rawg.io/api';

export interface RawgGame {
  id: number;
  name: string;
  released: string; // YYYY-MM-DD
  background_image: string;
  rating: number;
  genres: { name: string }[];
}

/**
 * Busca juegos en RAWG API dado un texto
 */
export async function searchGames(query: string): Promise<RawgGame[]> {
  if (!RAWG_API_KEY) {
    console.warn("RAWG_API_KEY is not defined in environment variables");
    return [];
  }

  if (!query || query.trim().length < 2) return [];

  try {
    const url = `${BASE_URL}/games?key=${RAWG_API_KEY}&search=${encodeURIComponent(query)}&page_size=10`;
    const res = await fetch(url);
    
    if (!res.ok) {
      throw new Error(`RAWG API responded with status: ${res.status}`);
    }
    
    const data = await res.json();
    return data.results as RawgGame[];
  } catch (error) {
    console.error("RAWG Search Error:", error);
    return [];
  }
}
