'use server';

import { HowLongToBeatService } from 'howlongtobeat';

const hltbService = new HowLongToBeatService();

export async function getGamePlaytime(gameName: string): Promise<number | null> {
  try {
    const results = await hltbService.search(gameName);
    
    // Sort array to put exact name matches first, or heavily prioritized
    const exactMatch = results.find(r => r.name.toLowerCase() === gameName.toLowerCase());
    const bestMatch = exactMatch || results[0];

    if (bestMatch && bestMatch.gameplayMain > 0) {
      return bestMatch.gameplayMain;
    }
  } catch (error) {
    console.error("HLTB Error:", error);
  }
  return null;
}
