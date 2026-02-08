/**
 * Shape decomposition and block identification tests
 *
 * Block types:
 *   - MENTSU: Complete set (triplet 111 or sequence 123)
 *   - TOITSU: Pair (11)
 *   - TATSU_RYANMEN: Open wait (23 - waits on 1 or 4)
 *   - TATSU_PENCHAN: Edge wait (12 or 89 - waits on 3 or 7)
 *   - TATSU_KANCHAN: Center wait (13 - waits on 2)
 *   - COMPLEX: Multi-tile shapes (234567, 11123, etc)
 *   - ISOLATED: Single tile
 *
 * Add regression tests here as issues are discovered.
 */

import { describe, it, expect } from 'vitest';
import { partitionHand, identifyBlockType } from '../blocks';
import { BlockType } from '../../../types';
import { parseHand } from '../notation';

describe('identifyBlockType', () => {
  it('triplet is MENTSU', () => {
    expect(identifyBlockType(parseHand('555m'))).toBe(BlockType.MENTSU);
  });

  it('sequence is MENTSU', () => {
    expect(identifyBlockType(parseHand('123m'))).toBe(BlockType.MENTSU);
  });

  it('pair is TOITSU', () => {
    expect(identifyBlockType(parseHand('55m'))).toBe(BlockType.TOITSU);
  });

  it('adjacent tiles are RYANMEN', () => {
    expect(identifyBlockType(parseHand('23m'))).toBe(BlockType.TATSU_RYANMEN);
  });

  it('edge wait is PENCHAN', () => {
    expect(identifyBlockType(parseHand('12m'))).toBe(BlockType.TATSU_PENCHAN);
    expect(identifyBlockType(parseHand('89m'))).toBe(BlockType.TATSU_PENCHAN);
  });

  it('gap wait is KANCHAN', () => {
    expect(identifyBlockType(parseHand('13m'))).toBe(BlockType.TATSU_KANCHAN);
  });

  it('single tile is ISOLATED', () => {
    expect(identifyBlockType(parseHand('5m'))).toBe(BlockType.ISOLATED);
  });
});

describe('partitionHand', () => {
  it('separates different suits', () => {
    const blocks = partitionHand(parseHand('123m456p'));
    expect(blocks).toHaveLength(2);
  });

  it('groups connected tiles', () => {
    const blocks = partitionHand(parseHand('123m'));
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe(BlockType.MENTSU);
  });

  it('separates isolated tiles in same suit', () => {
    // 1m and 9m are not connected (gap > 2)
    const blocks = partitionHand(parseHand('19m'));
    expect(blocks).toHaveLength(2);
  });

  // ==========================================================================
  // REGRESSION TESTS - Add specific problem cases below
  // Example:
  //   it('description of the issue', () => {
  //     const blocks = partitionHand(parseHand('...'));
  //     expect(blocks[0].type).toBe(BlockType.EXPECTED);
  //   });
  // ==========================================================================
});
