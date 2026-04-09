import { NextResponse } from 'next/server';

const RAWG_API_KEY = process.env.RAWG_API_KEY || process.env.NEXT_PUBLIC_RAWG_API_KEY;
const BASE_URL = 'https://api.rawg.io/api';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!RAWG_API_KEY) {
    return NextResponse.json({ error: "RAWG_API_KEY no configurada" }, { status: 500 });
  }

  if (!query || query.trim().length < 2) {
    return NextResponse.json({ results: [] });
  }

  try {
    const q = encodeURIComponent(query);
    
    // Usamos fetch de Next.js con caché por 24 horas (o hasta que cambien los parámetros)
    // Esto comparte los resultados entre todos los usuarios del sitio.
    
    const fetchOptions = {
      next: { revalidate: 86400 } // Caché por 1 día
    };

    const [res1, res2] = await Promise.all([
      fetch(`${BASE_URL}/games?key=${RAWG_API_KEY}&search=${q}&page_size=15`, fetchOptions),
      fetch(`${BASE_URL}/games?key=${RAWG_API_KEY}&search=${q}&ordering=-added&page_size=15`, fetchOptions)
    ]);

    const data1 = await res1.json();
    const data2 = await res2.json();

    const combined = [...(data1.results || []), ...(data2.results || [])];
    
    // Deduplicación por ID
    const uniqueMap = new Map();
    combined.forEach(g => uniqueMap.set(g.id, g));
    const uniqueGames = Array.from(uniqueMap.values());

    const queryLower = query.trim().toLowerCase();
    
    uniqueGames.sort((a: any, b: any) => {
      const aLower = a.name.toLowerCase();
      const bLower = b.name.toLowerCase();
      const aExact = aLower === queryLower;
      const bExact = bLower === queryLower;
      
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;
      
      const aPop = a.added || 0;
      const bPop = b.added || 0;
      return bPop - aPop;
    });

    return NextResponse.json({ results: uniqueGames.slice(0, 10) });
  } catch (error: any) {
    console.error("API Proxy Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
