
export type Suit = 'm' | 'p' | 's' | 'z'; // Manzu, Pinzu, Souzu, Zihai (Honor)

export interface Tile {
  suit: Suit;
  value: number; // 1-9 for m,p,s; 1-7 for z (1=E, 2=S, 3=W, 4=N, 5=Wh, 6=G, 7=R)
  id: string; // unique identifier for React keys (e.g., '1m_0')
}

export interface TileDefinition {
  suit: Suit;
  value: number;
  str: string; // e.g., '1m', '5p', '1z'
}

export type WallState = Record<string, number>; // Map '1m' -> count (e.g., 3)

export enum BlockType {
  MENTSU = 'MENTSU',   // Complete set (123, 111)
  TOITSU = 'TOITSU',   // Pair (11)
  TATSU_RYANMEN = 'RYANMEN', // Open wait (23)
  TATSU_PENCHAN = 'PENCHAN', // Edge wait (12, 89)
  TATSU_KANCHAN = 'KANCHAN', // Center wait (13)
  COMPLEX = 'COMPLEX', // 23456, 11123, etc.
  ISOLATED = 'ISOLATED' // Single tile
}

export interface HandBlock {
  id: string;
  tiles: TileDefinition[];
  type: BlockType;
  ukeire: {
    green: string[];
    yellow: string[];
  };
  subBlocks?: HandBlock[]; // For complex shapes
}
