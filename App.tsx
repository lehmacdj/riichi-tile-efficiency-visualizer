import React, { useState, useMemo } from 'react';
import { TileDefinition, WallState, HandBlock } from './types';
import { INITIAL_WALL, MAX_TILES_IN_HAND, TILE_ORDER } from './constants';
import { sortTiles, partitionHand, calculateShanten } from './utils/mahjong';
import type { UkeireResult } from './utils/mahjong';
import Wall from './components/Wall';
import HandView from './components/HandView';
import { useUkeireCalculation } from './hooks/useUkeireCalculation';

function countUkeire(tiles: string[], wall: WallState): number {
  return tiles.reduce((sum, t) => sum + (wall[t] || 0), 0);
}

function formatShantenStatus(shanten: number): string {
  if (shanten <= -1) return 'Ron / Tsumo';
  if (shanten === 0) return 'Tenpai';
  return `${shanten}-Shanten`;
}

// Button style constants
const BUTTON_BASE = 'px-3 py-1.5 rounded text-xs font-bold transition-colors border';
const BUTTON_TOGGLE_ON = 'bg-emerald-600 border-emerald-500 text-white hover:bg-emerald-500';
const BUTTON_TOGGLE_OFF = 'bg-slate-700 border-slate-600 text-slate-400 hover:text-slate-200 hover:bg-slate-600';
const BUTTON_DISABLED = 'bg-slate-800 border-slate-700 text-slate-600 cursor-not-allowed opacity-50';
const BUTTON_SECONDARY = 'bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600';

function getToggleButtonClass(isActive: boolean): string {
  return `${BUTTON_BASE} ${isActive ? BUTTON_TOGGLE_ON : BUTTON_TOGGLE_OFF}`;
}

const App: React.FC = () => {
  // State
  const [wall, setWall] = useState<WallState>(INITIAL_WALL);
  const [hand, setHand] = useState<TileDefinition[]>([]);
  const [hoveredTileIndex, setHoveredTileIndex] = useState<number | null>(null);
  const [hoveredBlock, setHoveredBlock] = useState<HandBlock | null>(null);
  const [isAutoDraw, setIsAutoDraw] = useState<boolean>(false);
  const [showBestDiscard, setShowBestDiscard] = useState<boolean>(false);

  // Use the ukeire calculation hook
  const { status, result, getDiscardUkeire } = useUkeireCalculation({ hand, wall });

  const isCalculating = status === 'loading';

  // --- CALCULATIONS ---

  const sortedHand = useMemo(() => sortTiles(hand), [hand]);

  // Compute best discard(s) for 14-tile hand
  const bestDiscard = useMemo(() => {
    if (hand.length !== 14 || !result?.discardResults) return null;

    let bestScore = -Infinity;
    let bestUkeire: UkeireResult | null = null;
    const tileScores = new Map<number, number>();

    // First pass: find best score and compute all scores
    // Score prioritizes: lower shanten > more shanten-improving tiles > more shape-improving tiles
    result.discardResults.forEach((ukeire, index) => {
      const shantenImprovementCount = countUkeire(ukeire.shantenImprovement, wall);
      const shapeImprovementCount = countUkeire(ukeire.shapeImprovement, wall);
      const score =
        -ukeire.shanten * 1000000 +
        shantenImprovementCount * 1000 +
        shapeImprovementCount;
      tileScores.set(index, score);

      if (score > bestScore) {
        bestScore = score;
        bestUkeire = ukeire;
      }
    });

    if (!bestUkeire) return null;

    // Second pass: collect all tiles with the best score
    const bestTiles = new Set<string>();
    tileScores.forEach((score, index) => {
      if (score === bestScore) {
        bestTiles.add(sortedHand[index]?.str);
      }
    });

    return { ukeire: bestUkeire, bestTiles };
  }, [hand.length, result, wall, sortedHand]);

  // Get current stats based on hand state and hover (used for wall highlights)
  const stats: UkeireResult | null = useMemo(() => {
    if (status === 'loading') return null;
    if (!result) return null;

    if (hand.length === 14) {
      // Only show stats when hovering (for wall highlights)
      if (hoveredTileIndex !== null) {
        return getDiscardUkeire(hoveredTileIndex);
      }
      // Otherwise show nothing (no wall highlights)
      return null;
    }

    return result.ukeire;
  }, [status, result, hand.length, hoveredTileIndex, getDiscardUkeire]);

  // Create blocks for hand display
  const blocks = useMemo(() => {
    return partitionHand(sortedHand, stats ?? undefined);
  }, [sortedHand, stats]);

  // Wall highlights based on current state
  const wallHighlights = useMemo(() => {
    const noHighlights = {
      shantenImprovement: [] as string[],
      shapeImprovement: [] as string[]
    };

    if (!stats) return noHighlights;

    // Priority 1: Discard Preview
    if (hand.length === 14 && hoveredTileIndex !== null) {
      return {
        shantenImprovement: stats.shantenImprovement,
        shapeImprovement: stats.shapeImprovement
      };
    }

    // Priority 2: Block Analysis
    if (hoveredBlock) {
      return {
        shantenImprovement: hoveredBlock.ukeire.green,
        shapeImprovement: hoveredBlock.ukeire.yellow
      };
    }

    // Priority 3: General Status
    return {
      shantenImprovement: stats.shantenImprovement,
      shapeImprovement: stats.shapeImprovement
    };
  }, [hoveredBlock, stats, hand.length, hoveredTileIndex]);

  // Ukeire counts for display
  const ukeireCounts = useMemo(() => {
    if (!stats) return { shantenImprovement: 0, shapeImprovement: 0 };
    return {
      shantenImprovement: countUkeire(stats.shantenImprovement, wall),
      shapeImprovement: countUkeire(stats.shapeImprovement, wall),
    };
  }, [stats, wall]);

  // Best discard display (shanten + acceptance)
  const bestDiscardDisplay = useMemo(() => {
    if (!showBestDiscard || !bestDiscard) return null;
    const { ukeire } = bestDiscard;
    return {
      shanten: ukeire.shanten,
      shantenImprovementCount: countUkeire(ukeire.shantenImprovement, wall),
      shapeImprovementCount: countUkeire(ukeire.shapeImprovement, wall),
    };
  }, [showBestDiscard, bestDiscard, wall]);

  // Status text for display
  const statusText = useMemo(() => {
    if (isCalculating) return "Analyzing...";

    // 14-tile hand: show "Discard a tile" unless hovering
    if (hand.length === 14) {
      if (hoveredTileIndex === null || !stats) return "Discard a tile";
      return formatShantenStatus(stats.shanten);
    }

    if (!stats) return "Ready";
    return formatShantenStatus(stats.shanten);
  }, [stats, hand.length, hoveredTileIndex, isCalculating]);

  // --- ACTIONS ---

  const handleUpdateWallCount = (id: string, delta: number) => {
    setWall(prev => {
      const current = prev[id] || 0;
      const newVal = Math.max(0, Math.min(4, current + delta));
      return { ...prev, [id]: newVal };
    });
  };

  const handleSelectTile = (tile: TileDefinition) => {
    if (hand.length >= MAX_TILES_IN_HAND) return;
    if (wall[tile.str] <= 0) return;

    setHand(prev => [...prev, tile]);
    handleUpdateWallCount(tile.str, -1);
  };

  const handleDraw = () => {
    if (hand.length >= MAX_TILES_IN_HAND) return;

    const available = TILE_ORDER.filter(t => wall[t.str] > 0);
    if (available.length === 0) return;

    const pick = available[Math.floor(Math.random() * available.length)];
    setHand(prev => [...prev, pick]);
    handleUpdateWallCount(pick.str, -1);
  };

  const handleDiscard = (sortedIndex: number) => {
    setHoveredTileIndex(null);

    const tileToRemove = sortedHand[sortedIndex];
    if (!tileToRemove) return;

    const rawIndex = hand.findIndex(t => t.suit === tileToRemove.suit && t.value === tileToRemove.value);
    if (rawIndex === -1) return;

    const nextHand = [...hand];
    nextHand.splice(rawIndex, 1);

    const nextWall = { ...wall };

    if (isAutoDraw) {
      const available = TILE_ORDER.filter(t => nextWall[t.str] > 0);
      if (available.length > 0) {
        const pick = available[Math.floor(Math.random() * available.length)];
        nextHand.push(pick);
        nextWall[pick.str]--;
      }
    }

    setHand(nextHand);
    setWall(nextWall);
  };

  const handleRandomize = () => {
    setHoveredTileIndex(null);
    const newWall = { ...INITIAL_WALL };
    const newHand: TileDefinition[] = [];

    const count = isAutoDraw ? 14 : 13;

    for (let i = 0; i < count; i++) {
      const available = TILE_ORDER.filter(t => newWall[t.str] > 0);
      if (available.length === 0) break;
      const pick = available[Math.floor(Math.random() * available.length)];
      newHand.push(pick);
      newWall[pick.str]--;
    }
    setWall(newWall);
    setHand(newHand);
  };

  const handleClear = () => {
    setHoveredTileIndex(null);
    setWall(INITIAL_WALL);
    setHand([]);
  };

  const handleToggleAutoDraw = () => {
    const newValue = !isAutoDraw;
    setIsAutoDraw(newValue);

    // When enabling Auto-Draw, immediately draw up to 14 tiles
    if (newValue && hand.length < 14) {
      let currentHand = [...hand];
      let currentWall = { ...wall };

      while (currentHand.length < 14) {
        const available = TILE_ORDER.filter(t => currentWall[t.str] > 0);
        if (available.length === 0) break;
        const pick = available[Math.floor(Math.random() * available.length)];
        currentHand.push(pick);
        currentWall[pick.str]--;
      }

      setHand(currentHand);
      setWall(currentWall);
    }
  };

  // Determine shanten for status display color
  const displayShanten = stats?.shanten ?? result?.shanten ?? 8;

  return (
    <div className="h-screen w-full bg-slate-900 text-slate-100 font-sans flex flex-col overflow-hidden">

      {/* Minimal App Header */}
      <header className="shrink-0 bg-slate-900 border-b border-slate-800 px-4 py-2 flex items-center justify-center z-20">
        <h1 className="text-sm font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-green-400 opacity-80">
          RIICHI EFFICIENCY
        </h1>
      </header>

      {/* Main Content - The Wall (Scrollable) */}
      <main className="flex-1 min-h-0 relative bg-slate-900 p-2 overflow-hidden flex flex-col items-center">
        <div className="w-full max-w-5xl h-full flex flex-col">
          <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 md:p-6">
            <Wall
              wall={wall}
              onUpdateCount={handleUpdateWallCount}
              onSelectTile={handleSelectTile}
              ukeireGreen={wallHighlights.shantenImprovement}
              ukeireYellow={wallHighlights.shapeImprovement}
              discardPreviewMode={hand.length === 14 && hoveredTileIndex !== null}
            />
          </div>
        </div>
      </main>

      {/* Bottom Section Wrapper */}
      <section className="shrink-0 bg-slate-800 border-t border-slate-700 shadow-[0_-4px_20px_rgba(0,0,0,0.5)] z-30 flex flex-col">

        {/* Menu / Status Bar */}
        <div className="bg-slate-800 border-b border-slate-700/50 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-baseline gap-2">
              <span className={`text-xl font-bold flex items-center gap-2 ${isCalculating ? 'text-blue-400' : (displayShanten <= 0 ? 'text-green-400' : 'text-white')}`}>
                {isCalculating && (
                  <svg className="animate-spin h-4 w-4 text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                {statusText}
              </span>
            </div>

            {/* Ukeire Counts Display */}
            {stats && (stats.shantenImprovement.length > 0 || stats.shapeImprovement.length > 0) && !isCalculating && (
              <div className="flex items-center ml-2 px-2 py-1 bg-slate-900 rounded border border-slate-600 font-mono text-sm font-bold">
                <span className="text-green-400">{ukeireCounts.shantenImprovement}</span>
                <span className="text-slate-500 mx-1">+</span>
                <span className="text-yellow-400">{ukeireCounts.shapeImprovement}</span>
              </div>
            )}

            {/* Best Discard Display (shanten + acceptance, no highlights) */}
            {bestDiscardDisplay && !isCalculating && hoveredTileIndex === null && (
              <div className="flex items-center ml-2 px-2 py-1 bg-slate-900 rounded border border-slate-600 font-mono text-sm font-bold">
                <span className="text-slate-300 mr-2">
                  Best: {formatShantenStatus(bestDiscardDisplay.shanten)}
                </span>
                <span className="text-green-400">{bestDiscardDisplay.shantenImprovementCount}</span>
                <span className="text-slate-500 mx-1">+</span>
                <span className="text-yellow-400">{bestDiscardDisplay.shapeImprovementCount}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Toggle: Auto-Draw */}
            <button
              onClick={handleToggleAutoDraw}
              className={getToggleButtonClass(isAutoDraw)}
            >
              Auto-Draw: {isAutoDraw ? 'ON' : 'OFF'}
            </button>

            {/* Toggle: Show Best (disabled when < 14 tiles) */}
            <button
              onClick={() => setShowBestDiscard(!showBestDiscard)}
              disabled={hand.length !== 14}
              className={
                hand.length !== 14
                  ? `${BUTTON_BASE} ${BUTTON_DISABLED}`
                  : getToggleButtonClass(showBestDiscard)
              }
            >
              Show Best{hand.length === 14 ? `: ${showBestDiscard ? 'ON' : 'OFF'}` : ''}
            </button>

            <div className="w-px h-5 bg-slate-600 mx-1" />

            {/* Primary: Draw Tile */}
            <button
              onClick={handleDraw}
              disabled={isAutoDraw || hand.length >= MAX_TILES_IN_HAND}
              className={`${BUTTON_BASE} ${
                isAutoDraw || hand.length >= MAX_TILES_IN_HAND
                  ? 'bg-slate-700 border-slate-600 text-slate-500 cursor-not-allowed opacity-60'
                  : 'bg-indigo-600 border-indigo-500 text-white hover:bg-indigo-500'
              }`}
            >
              + Draw Tile
            </button>

            <button
              onClick={handleRandomize}
              className={`${BUTTON_BASE} ${BUTTON_SECONDARY}`}
            >
              Randomize
            </button>

            <button
              onClick={handleClear}
              className={`${BUTTON_BASE} bg-slate-700 border-red-800/50 text-red-400 hover:bg-red-900/30 hover:text-red-300 hover:border-red-700/50`}
            >
              Clear
            </button>
          </div>
        </div>

        {/* Hand View */}
        <div className="max-w-6xl mx-auto w-full px-4 py-3">
          <HandView
            blocks={blocks}
            onDiscard={handleDiscard}
            onHoverTile={hand.length === 14 ? setHoveredTileIndex : () => {}}
            onHoverBlock={setHoveredBlock}
            hoveredTileIndex={hoveredTileIndex}
            bestDiscardTiles={showBestDiscard && bestDiscard ? bestDiscard.bestTiles : null}
          />
        </div>
      </section>

    </div>
  );
};

export default App;
