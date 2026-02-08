/**
 * Ukeire (tile acceptance) calculation tests
 *
 * Ukeire refers to tiles that improve a hand:
 *   - shantenImprovement (green): Tiles that reduce shanten
 *   - shapeImprovement (yellow): Tiles that improve acceptance without
 *     reducing shanten
 *
 * Add regression tests here as issues are discovered.
 */

import { describe, it, expect } from 'vitest';
import { calculateHandUkeire } from '../_expensive';
import { parseHand, createWallFromHand } from '../notation';

describe('calculateHandUkeire', () => {
  it('ryanmen wait accepts 2 tiles', () => {
    // 45m waiting on 3m or 6m
    const hand = parseHand('45m123456p789s11z');
    const wall = createWallFromHand(hand);
    const result = calculateHandUkeire(hand, wall);

    expect(result.shanten).toBe(0);
    expect(result.shantenImprovement).toContain('3m');
    expect(result.shantenImprovement).toContain('6m');
    expect(result.shantenImprovement).toHaveLength(2);
  });

  it('kanchan wait accepts 1 tile', () => {
    // 46m waiting on 5m only
    const hand = parseHand('46m123456p789s11z');
    const wall = createWallFromHand(hand);
    const result = calculateHandUkeire(hand, wall);

    expect(result.shanten).toBe(0);
    expect(result.shantenImprovement).toContain('5m');
    expect(result.shantenImprovement).toHaveLength(1);
  });

  it('complete hand has no improving tiles', () => {
    const hand = parseHand('123456789m123p11s');
    const wall = createWallFromHand(hand);
    const result = calculateHandUkeire(hand, wall);

    expect(result.shanten).toBe(-1);
    expect(result.shantenImprovement).toHaveLength(0);
  });

  // ==========================================================================
  // REGRESSION TESTS - Add specific problem cases below
  // Example:
  //   it('description of the issue', () => {
  //     const hand = parseHand('...');
  //     const wall = createWallFromHand(hand);
  //     const result = calculateHandUkeire(hand, wall);
  //     expect(result.shantenImprovement).toContain('...');
  //   });
  // ==========================================================================
});
