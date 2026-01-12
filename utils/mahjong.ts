
import { TileDefinition, BlockType, HandBlock, Suit, WallState } from '../types';
import { TILE_ORDER } from '../constants';

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

// --- SHANTEN CALCULATION (Simplified Standard 4-mentsu + 1-pair) ---

// Result of recursive analysis
interface AnalysisResult {
  mentsu: number;
  tatsu: number;
  pairs: number;
}

// Recursively find max groups and pairs
function recursiveShanten(
  counts: number[], // index 0-8 for 1-9
  current: AnalysisResult
): AnalysisResult {
  let best = { ...current };

  // Heuristic Score to maximize: Mentsu worth most, then Tatsu/Pairs roughly equal for "progress"
  const getScore = (r: AnalysisResult) => r.mentsu * 10 + r.tatsu + r.pairs;

  // Find first tile
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

  // Try Tatsu (Partial)
  // Ryanmen/Penchan
  if (i < 8 && counts[i] > 0 && counts[i+1] > 0) {
    counts[i]--; counts[i+1]--;
    const res = recursiveShanten(counts, { ...current, tatsu: current.tatsu + 1 });
    if (getScore(res) > getScore(best)) best = res;
    counts[i]++; counts[i+1]++;
  }
  // Kanchan
  if (i < 7 && counts[i] > 0 && counts[i+2] > 0) {
    counts[i]--; counts[i+2]--;
    const res = recursiveShanten(counts, { ...current, tatsu: current.tatsu + 1 });
    if (getScore(res) > getScore(best)) best = res;
    counts[i]++; counts[i+2]++;
  }

  // Skip this tile (treat as isolated)
  counts[i]--;
  const res = recursiveShanten(counts, current);
  if (getScore(res) > getScore(best)) best = res;
  counts[i]++;

  return best;
}

// Analyze a dictionary of counts to find max Mentsu, Tatsu, Pairs
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
  
  // Standard Shanten Check (4 Mentsu + 1 Pair)
  let minShanten = 8;
  const uniqueTiles = Array.from(new Set(tiles.map(t => t.str)));
  
  // Case 1: Chiitoitsu
  let pairCount = 0;
  let distinctPairs = 0;
  Object.values(counts).forEach(c => { if (c >= 2) { pairCount++; distinctPairs++; }});
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


// --- HAND DECOMPOSITION ---

// Group consecutive tiles in same suit
export const partitionHand = (tiles: TileDefinition[], globalUkeire?: UkeireResult): HandBlock[] => {
  const sorted = sortTiles(tiles);
  const blocks: HandBlock[] = [];
  
  if (sorted.length === 0) return [];

  let currentBlock: TileDefinition[] = [sorted[0]];
  
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i-1];
    const curr = sorted[i];
    
    // Group if same suit and value is within 2
    const isConnected = 
      prev.suit === curr.suit && 
      (prev.suit === 'z' ? prev.value === curr.value : (curr.value - prev.value <= 2));

    if (isConnected) {
      currentBlock.push(curr);
    } else {
      blocks.push(createBlock(currentBlock, globalUkeire));
      currentBlock = [curr];
    }
  }
  blocks.push(createBlock(currentBlock, globalUkeire));
  
  return blocks;
};

const createBlock = (tiles: TileDefinition[], globalUkeire?: UkeireResult): HandBlock => {
  const sorted = sortTiles(tiles);
  const type = identifyBlockType(sorted);
  const id = sorted.map(t => t.str).join('');
  
  // Assign ukeire by filtering the global results based on connectivity to this block
  let ukeire = { green: [] as string[], yellow: [] as string[] };
  
  if (globalUkeire) {
    const filterTiles = (candidates: string[]) => {
      return candidates.filter(cStr => {
         const cSuit = cStr.slice(-1) as Suit;
         const cVal = parseInt(cStr.slice(0, -1));
         
         return sorted.some(t => {
           if (t.suit !== cSuit) return false;
           // Exact match for honors, range match for numbers
           if (t.suit === 'z') return t.value === cVal; 
           return Math.abs(t.value - cVal) <= 2;
         });
      });
    };
    
    ukeire.green = filterTiles(globalUkeire.shantenImprovement);
    ukeire.yellow = filterTiles(globalUkeire.shapeImprovement);
  }

  // Simple decomposition for complex shapes
  let subBlocks: HandBlock[] | undefined = undefined;
  if (type === BlockType.COMPLEX) {
    subBlocks = decomposeComplex(sorted);
  }

  return { id, tiles: sorted, type, ukeire, subBlocks };
};

const identifyBlockType = (tiles: TileDefinition[]): BlockType => {
  if (tiles.length === 1) return BlockType.ISOLATED;
  if (tiles.length === 2) {
    if (tiles[0].value === tiles[1].value) return BlockType.TOITSU;
    if (tiles[0].suit === 'z') return BlockType.ISOLATED; 
    const diff = tiles[1].value - tiles[0].value;
    if (diff === 1) {
      if (tiles[0].value === 1 || tiles[1].value === 9) return BlockType.TATSU_PENCHAN;
      return BlockType.TATSU_RYANMEN;
    }
    if (diff === 2) return BlockType.TATSU_KANCHAN;
    return BlockType.ISOLATED; 
  }
  if (tiles.length === 3) {
    if (tiles[0].value === tiles[1].value && tiles[1].value === tiles[2].value) return BlockType.MENTSU;
    if (tiles[0].suit !== 'z' && tiles[0].value + 1 === tiles[1].value && tiles[1].value + 1 === tiles[2].value) return BlockType.MENTSU;
  }
  return BlockType.COMPLEX;
};

const decomposeComplex = (tiles: TileDefinition[]): HandBlock[] => {
  const remaining = [...tiles];
  return [{
      id: 'sub1',
      tiles: remaining,
      type: BlockType.COMPLEX,
      ukeire: { green: [], yellow: [] }
  }];
};


// --- UKEIRE CALCULATION ---

export interface UkeireResult {
  shantenImprovement: string[]; 
  shapeImprovement: string[];   
  shanten: number;
}

// Helper to get tiles that improve shanten for a specific hand
const getImprovingTiles = (hand: TileDefinition[], currentShanten: number): string[] => {
  const improving: string[] = [];
  TILE_ORDER.forEach(t => {
    const nextHand = [...hand, t];
    if (calculateShanten(nextHand) < currentShanten) {
      improving.push(t.str);
    }
  });
  return improving;
};

// Calculate actual acceptance score (sum of available wall tiles)
const calculateAcceptanceScore = (improvingTiles: string[], wall: WallState): number => {
  return improvingTiles.reduce((sum, tStr) => sum + (wall[tStr] || 0), 0);
};

export const calculateHandUkeire = (hand: TileDefinition[], wall: WallState): UkeireResult => {
  const currentShanten = calculateShanten(hand);
  
  // 1. Calculate Base Green List (Shanten Improvement)
  const shantenImprovement = getImprovingTiles(hand, currentShanten);
  
  // 2. Calculate Base Acceptance Score
  const baseAcceptanceScore = calculateAcceptanceScore(shantenImprovement, wall);
  
  const shapeImprovement: string[] = [];
  
  // 3. Calculate Yellow List (Shape Improvement)
  // Simulation: Try adding every tile T (that isn't green).
  // Then check if we can discard D to get a hand with SAME shanten but BETTER acceptance.
  
  TILE_ORDER.forEach(t => {
    // If it's already green, skip
    if (shantenImprovement.includes(t.str)) return;
    
    // We only care about T if it connects to the hand. 
    // Optimization: Skip isolated tiles? No, sometimes isolated tiles allow better switches (e.g. Honor tanki).
    // Let's run full check, but rely on Shanten pruning.
    
    // Hypothetical Hand after drawing T
    const hand14 = [...hand, t];
    
    // Create Hypothetical Wall
    // Decrease T, Increase Discard D
    // Optimization: We can compute score using `baseAcceptanceScore` + delta, but the set of improving tiles changes.
    // So we need to recalculate `getImprovingTiles` for the new hand.
    
    const wallAfterDraw = { ...wall };
    wallAfterDraw[t.str] = Math.max(0, (wallAfterDraw[t.str] || 0) - 1);
    
    let maxProposedScore = -1;
    
    // Iterate over possible discards
    // Optimization: Use a Set of unique tiles to discard to avoid 14 iterations if duplicates exist
    const uniqueDiscards = new Set<string>();
    for (let i = 0; i < hand14.length; i++) {
        const d = hand14[i];
        if (uniqueDiscards.has(d.str)) continue;
        uniqueDiscards.add(d.str);
        
        const hand13 = [...hand14];
        hand13.splice(i, 1);
        
        // Check Shanten
        // We only care if we maintain the current shanten level.
        // (If we improve shanten, then T would have been Green, but we handled that).
        // (If we worsen shanten, it's a bad discard).
        if (calculateShanten(hand13) === currentShanten) {
            // This is a candidate transformation.
            // Calculate its acceptance.
            const proposedImproving = getImprovingTiles(hand13, currentShanten);
            
            // Adjust wall for the discard (it becomes available)
            const wallAfterDiscard = { ...wallAfterDraw };
            wallAfterDiscard[d.str] = (wallAfterDiscard[d.str] || 0) + 1;
            
            const score = calculateAcceptanceScore(proposedImproving, wallAfterDiscard);
            if (score > maxProposedScore) {
                maxProposedScore = score;
            }
        }
    }
    
    if (maxProposedScore > baseAcceptanceScore) {
        shapeImprovement.push(t.str);
    }
  });

  return { shantenImprovement, shapeImprovement, shanten: currentShanten };
};
