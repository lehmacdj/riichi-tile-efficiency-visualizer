import { TileDefinition, Suit } from '../../types';

// --- HELPERS ---

export const getTileStr = (suit: Suit, value: number) => `${value}${suit}`;

// Sort tiles standard mahjong way
export const sortTiles = (tiles: TileDefinition[]): TileDefinition[] => {
  const suitOrder: Record<Suit, number> = { m: 0, p: 1, s: 2, z: 3 };
  return [...tiles].sort((a, b) => {
    if (a.suit !== b.suit) return suitOrder[a.suit] - suitOrder[b.suit];
    return a.value - b.value;
  });
};

export const countTiles = (tiles: TileDefinition[]): Record<string, number> => {
  const counts: Record<string, number> = {};
  tiles.forEach(t => {
    counts[t.str] = (counts[t.str] || 0) + 1;
  });
  return counts;
};

// --- SHANTEN CALCULATION ---

// Result of recursive analysis
interface AnalysisResult {
  mentsu: number;
  tatsu: number;
  pairs: number;
}

// Recursively find max groups and pairs
function recursiveShanten(
  counts: number[],
  current: AnalysisResult
): AnalysisResult {
  let best = { ...current };

  const getScore = (r: AnalysisResult) => r.mentsu * 10 + r.tatsu + r.pairs;

  let i = 0;
  while (i < counts.length && counts[i] === 0) i++;
  if (i >= counts.length) return best;

  // Try Koutsu (Triplet)
  if (counts[i] >= 3) {
    counts[i] -= 3;
    const res = recursiveShanten(counts, { ...current, mentsu: current.mentsu + 1 });
    if (getScore(res) > getScore(best)) best = res;
    counts[i] += 3;
  }

  // Try Shuuntsu (Sequence)
  if (i < 7 && counts[i] > 0 && counts[i+1] > 0 && counts[i+2] > 0) {
    counts[i]--; counts[i+1]--; counts[i+2]--;
    const res = recursiveShanten(counts, { ...current, mentsu: current.mentsu + 1 });
    if (getScore(res) > getScore(best)) best = res;
    counts[i]++; counts[i+1]++; counts[i+2]++;
  }

  // Try Toitsu (Pair)
  if (counts[i] >= 2) {
    counts[i] -= 2;
    const res = recursiveShanten(counts, { ...current, pairs: current.pairs + 1 });
    if (getScore(res) > getScore(best)) best = res;
    counts[i] += 2;
  }

  // Try Tatsu (Ryanmen/Penchan)
  if (i < 8 && counts[i] > 0 && counts[i+1] > 0) {
    counts[i]--; counts[i+1]--;
    const res = recursiveShanten(counts, { ...current, tatsu: current.tatsu + 1 });
    if (getScore(res) > getScore(best)) best = res;
    counts[i]++; counts[i+1]++;
  }

  // Try Tatsu (Kanchan)
  if (i < 7 && counts[i] > 0 && counts[i+2] > 0) {
    counts[i]--; counts[i+2]--;
    const res = recursiveShanten(counts, { ...current, tatsu: current.tatsu + 1 });
    if (getScore(res) > getScore(best)) best = res;
    counts[i]++; counts[i+2]++;
  }

  // Skip this tile
  counts[i]--;
  const res = recursiveShanten(counts, current);
  if (getScore(res) > getScore(best)) best = res;
  counts[i]++;

  return best;
}

function analyzeShapes(counts: Record<string, number>): AnalysisResult {
  let totalM = 0;
  let totalT = 0;
  let totalP = 0;

  const shapes: number[][] = [
    [1,2,3,4,5,6,7,8,9].map(n => counts[`${n}m`] || 0),
    [1,2,3,4,5,6,7,8,9].map(n => counts[`${n}p`] || 0),
    [1,2,3,4,5,6,7,8,9].map(n => counts[`${n}s`] || 0),
    [1,2,3,4,5,6,7].map(n => counts[`${n}z`] || 0),
  ];

  for (let s = 0; s < 3; s++) {
    const res = recursiveShanten([...shapes[s]], { mentsu: 0, tatsu: 0, pairs: 0 });
    totalM += res.mentsu;
    totalT += res.tatsu;
    totalP += res.pairs;
  }

  // Honors
  const zCounts = shapes[3];
  for (let i = 0; i < 7; i++) {
    if (zCounts[i] >= 3) {
      totalM++;
    } else if (zCounts[i] === 2) {
      totalP++;
    }
  }

  return { mentsu: totalM, tatsu: totalT, pairs: totalP };
}

// Main Shanten function
export const calculateShanten = (tiles: TileDefinition[]): number => {
  const counts = countTiles(tiles);

  let minShanten = 8;
  const uniqueTiles = Array.from(new Set(tiles.map(t => t.str)));

  // Case 1: Chiitoitsu
  let distinctPairs = 0;
  Object.values(counts).forEach(c => { if (c >= 2) distinctPairs++; });
  const shantenChiitoi = 6 - distinctPairs;

  // Case 2: Kokushi
  const terminals = ["1m","9m","1p","9p","1s","9s","1z","2z","3z","4z","5z","6z","7z"];
  let termCount = 0;
  let hasTermPair = false;
  terminals.forEach(t => {
    if (counts[t] > 0) termCount++;
    if (counts[t] >= 2) hasTermPair = true;
  });
  const shantenKokushi = 13 - termCount - (hasTermPair ? 1 : 0);

  minShanten = Math.min(shantenChiitoi, shantenKokushi);

  // Case 3: Standard (Head + 4 Groups)
  for (const headTile of uniqueTiles) {
    if (counts[headTile] >= 2) {
      const tempCounts = {...counts};
      tempCounts[headTile] -= 2;
      const res = analyzeShapes(tempCounts);
      let m = res.mentsu;
      let t = res.tatsu + res.pairs;
      if (m + t > 4) t = 4 - m;
      const currentShanten = 8 - (2 * m) - t - 1;
      if (currentShanten < minShanten) minShanten = currentShanten;
    }
  }

  // Case 4: No Head
  const res = analyzeShapes(counts);
  let m = res.mentsu;
  let t = res.tatsu + res.pairs;
  if (m + t > 4) t = 4 - m;
  const shantenNoHead = 8 - (2 * m) - t;

  if (shantenNoHead < minShanten) minShanten = shantenNoHead;

  return minShanten;
};

// --- UKEIRE TYPES ---

export interface UkeireResult {
  shantenImprovement: string[];
  shapeImprovement: string[];
  shanten: number;
}
