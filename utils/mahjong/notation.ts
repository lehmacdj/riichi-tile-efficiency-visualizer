/**
 * Tile notation utilities for Riichi Mahjong
 *
 * Hand notation format:
 *   - Numbered tiles: digits followed by suit
 *     (m=manzu, p=pinzu, s=souzu, z=honors)
 *     Examples: "123m" = 1m 2m 3m, "111z" = 1z 1z 1z
 *   - Honor shortcuts (can be used instead of z notation):
 *     E=East(1z), S=South(2z), W=West(3z), N=North(4z)
 *     Wh=White(5z), G=Green(6z), R=Red(7z)
 *
 * Examples:
 *   "123m456p789s11122z" - 3 sequences + East triplet + South pair
 *   "123m456p789sEEESSh" - Same using honor shortcuts
 *   "19m19p19s1234567z"  - Kokushi musou tiles
 *   "1112345678999m"     - Chuuren poutou shape
 */

import { TileDefinition, Suit, WallState } from '../../types';
import { INITIAL_WALL } from '../../constants';

const HONOR_MAP: Record<string, number> = {
  E: 1,
  S: 2,
  W: 3,
  N: 4,
  Wh: 5,
  G: 6,
  R: 7,
};

/**
 * Parse a hand notation string into TileDefinition array
 *
 * @example
 * parseHand("123m456p")
 * // Returns tiles for 1m, 2m, 3m, 4p, 5p, 6p
 * parseHand("EEEWWh")
 * // Returns tiles for 1z, 1z, 1z, 3z, 3z
 */
export function parseHand(
  notation: string
): TileDefinition[] {
  const tiles: TileDefinition[] = [];
  let pendingDigits: number[] = [];
  let i = 0;

  while (i < notation.length) {
    const char = notation[i];
    const nextChar = notation[i + 1];

    if (char === 'W' && nextChar === 'h') {
      tiles.push(makeTile('z', 5));
      i += 2;
    } else if (char in HONOR_MAP) {
      tiles.push(makeTile('z', HONOR_MAP[char]));
      i++;
    } else if (
      char === 'm' || char === 'p' ||
      char === 's' || char === 'z'
    ) {
      for (const digit of pendingDigits) {
        tiles.push(makeTile(char as Suit, digit));
      }
      pendingDigits = [];
      i++;
    } else if (char >= '1' && char <= '9') {
      pendingDigits.push(parseInt(char));
      i++;
    } else {
      i++;
    }
  }

  return tiles;
}

/** Create a single TileDefinition */
export function makeTile(
  suit: Suit,
  value: number
): TileDefinition {
  return { suit, value, str: `${value}${suit}` };
}

/** Create a wall state from hand (removes tiles from wall) */
export function createWallFromHand(
  hand: TileDefinition[]
): WallState {
  const wall = { ...INITIAL_WALL };
  for (const tile of hand) {
    wall[tile.str] = Math.max(
      0, (wall[tile.str] || 0) - 1
    );
  }
  return wall;
}

/** Format tiles back to notation string */
export function formatHand(
  tiles: TileDefinition[]
): string {
  const bySuit: Record<Suit, number[]> =
    { m: [], p: [], s: [], z: [] };

  for (const tile of tiles) {
    bySuit[tile.suit].push(tile.value);
  }

  const suits: Suit[] = ['m', 'p', 's', 'z'];
  return suits
    .filter(suit => bySuit[suit].length > 0)
    .map(suit => {
      bySuit[suit].sort((a, b) => a - b);
      return bySuit[suit].join('') + suit;
    })
    .join('');
}

/** Parse notation and return tile strings like ["1m", "7p"] */
export function parseTileStrings(
  notation: string
): string[] {
  return parseHand(notation).map(t => t.str);
}
