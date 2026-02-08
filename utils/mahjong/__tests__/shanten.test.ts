/**
 * Shanten calculation tests
 *
 * Shanten = number of tiles away from tenpai (ready hand)
 *   -1 = Complete hand (winning)
 *    0 = Tenpai (one tile from winning)
 *    1 = Iishanten (one tile from tenpai)
 *    2+ = Further from ready
 *
 * Add regression tests here as issues are discovered.
 */

import { describe, it, expect } from 'vitest';
import { calculateShanten } from '../tiles';
import { parseHand } from '../notation';

describe('calculateShanten', () => {
  // Basic sanity checks
  it('complete hand is -1 shanten', () => {
    // 123m 456m 789m 123p + 11s pair = winning hand
    expect(calculateShanten(parseHand('123456789m123p11s'))).toBe(-1);
  });

  it('tenpai hand is 0 shanten', () => {
    // 123m 456m 789m 123p + 1s tanki wait
    expect(calculateShanten(parseHand('123456789m123p1s'))).toBe(0);
  });

  it('chiitoitsu tenpai is 0 shanten', () => {
    // 6 pairs + 1 single = tenpai
    expect(calculateShanten(parseHand('1133m5577p2244s6z'))).toBe(0);
  });

  it('kokushi tenpai is 0 shanten', () => {
    // All 13 terminals/honors with one pair
    expect(calculateShanten(parseHand('19m19p19s1234567z'))).toBe(0);
  });

  // ==========================================================================
  // REGRESSION TESTS - Add specific problem cases below
  // Example:
  //   it('description of the issue', () => {
  //     expect(calculateShanten(parseHand('...'))).toBe(expectedValue);
  //   });
  // ==========================================================================
});
