const RAWG_API_KEY = process.env.NEXT_PUBLIC_RAWG_API_KEY;
const BASE_URL = 'https://api.rawg.io/api';

export interface RawgGame {
  id: number;
  name: string;
  released: string; // YYYY-MM-DD
  background_image: string;
  rating: number;
  playtime: number;
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
    const q = encodeURIComponent(query);
    // Fetch 1: Pura Relevancia Textual (Ideal para juegos Indie con nombres exactos como Mind Over Magic)
    const p1 = fetch(`${BASE_URL}/games?key=${RAWG_API_KEY}&search=${q}&page_size=15`);
    // Fetch 2: Pura Popularidad Mundial (Ideal para evitar que The Witcher quede tapado por The Witch's House)
    const p2 = fetch(`${BASE_URL}/games?key=${RAWG_API_KEY}&search=${q}&ordering=-added&page_size=15`);

    const [res1, res2] = await Promise.all([p1, p2]);
    const [data1, data2] = await Promise.all([res1.json(), res2.json()]);

    // Combinar ambos arrays de resultados
    const combined: RawgGame[] = [...(data1.results || []), ...(data2.results || [])];

    // Eliminar duplicados observando el ID único del juego
    const uniqueGames = Array.from(new Map(combined.map(g => [g.id, g])).values());

    const queryLower = query.trim().toLowerCase();
    
    uniqueGames.sort((a: any, b: any) => {
      const aLower = a.name.toLowerCase();
      const bLower = b.name.toLowerCase();
      
      const aExact = aLower === queryLower;
      const bExact = bLower === queryLower;
      
      // 1. Matches exactos suben instantáneamente al Puesto 1
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;
      
      // 2. Si ninguno es exacto (Ej buscaste 'Witch' y te salen 'The Witcher 3' y 'Witch It'), 
      // ordenamamos por 'added' (La métrica de RAWG equivalente a Cantidad de Dueños / Popularidad Mundial).
      // Esto filtra instantáneamente basurilla o juegos indies de 10 usuarios que tengan el mismo String en el título.
      const aPop = a.added || 0;
      const bPop = b.added || 0;
      
      return bPop - aPop;
    });

    return uniqueGames.slice(0, 10);
  } catch (error) {
    console.error("RAWG Search Error:", error);
    return [];
  }
}
