// EXPENSIVE CALCULATIONS - DO NOT IMPORT FROM MAIN THREAD
// These functions are computationally expensive and should only be
// called from web workers. Use the useUkeireCalculation hook instead.

import { TileDefinition, WallState } from '../../types';
import { TILE_ORDER } from '../../constants';
import { calculateShanten } from './tiles';
import type { UkeireResult } from './tiles';

// Helper to get tiles that improve shanten for a specific hand
const getImprovingTiles = (
  hand: TileDefinition[],
  currentShanten: number
): string[] => {
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
const calculateAcceptanceScore = (
  improvingTiles: string[],
  wall: WallState
): number => {
  return improvingTiles.reduce((sum, tStr) => sum + (wall[tStr] || 0), 0);
};

// Main ukeire calculation - EXPENSIVE, runs in worker only
export const calculateHandUkeire = (
  hand: TileDefinition[],
  wall: WallState
): UkeireResult => {
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

    // Hypothetical Hand after drawing T
    const hand14 = [...hand, t];

    // Create Hypothetical Wall
    const wallAfterDraw = { ...wall };
    wallAfterDraw[t.str] = Math.max(0, (wallAfterDraw[t.str] || 0) - 1);

    let maxProposedScore = -1;

    // Iterate over possible discards
    // Optimization: Use a Set of unique tiles to discard
    const uniqueDiscards = new Set<string>();
    for (let i = 0; i < hand14.length; i++) {
      const d = hand14[i];
      if (uniqueDiscards.has(d.str)) continue;
      uniqueDiscards.add(d.str);

      const hand13 = [...hand14];
      hand13.splice(i, 1);

      // Check Shanten - only care if we maintain current shanten level
      if (calculateShanten(hand13) === currentShanten) {
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
