import { Suit, TileDefinition, WallState } from './types';

export const SUITS: Suit[] = ['m', 'p', 's', 'z'];

export const TILE_ORDER: TileDefinition[] = [];

// Generate standard tile definitions
['m', 'p', 's'].forEach((suit) => {
  for (let i = 1; i <= 9; i++) {
    TILE_ORDER.push({ suit: suit as Suit, value: i, str: `${i}${suit}` });
  }
});
// Honors
for (let i = 1; i <= 7; i++) {
  TILE_ORDER.push({ suit: 'z', value: i, str: `${i}z` });
}

export const INITIAL_WALL: WallState = TILE_ORDER.reduce((acc, tile) => {
  acc[tile.str] = 4;
  return acc;
}, {} as WallState);

export const HONOR_TEXT: Record<number, string> = {
  1: 'E', 2: 'S', 3: 'W', 4: 'N', 5: 'Wh', 6: 'G', 7: 'R'
};

export const MAX_TILES_IN_HAND = 14;
