import { TileDefinition, BlockType, HandBlock, Suit } from '../../types';
import { sortTiles } from './tiles';
import type { UkeireResult } from './tiles';

// Group consecutive tiles in same suit
export const partitionHand = (
  tiles: TileDefinition[],
  globalUkeire?: UkeireResult
): HandBlock[] => {
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

const createBlock = (
  tiles: TileDefinition[],
  globalUkeire?: UkeireResult
): HandBlock => {
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

export const identifyBlockType = (tiles: TileDefinition[]): BlockType => {
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
    if (tiles[0].value === tiles[1].value && tiles[1].value === tiles[2].value) {
      return BlockType.MENTSU;
    }
    if (tiles[0].suit !== 'z' &&
        tiles[0].value + 1 === tiles[1].value &&
        tiles[1].value + 1 === tiles[2].value) {
      return BlockType.MENTSU;
    }
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
