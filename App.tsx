import React, { useState, useMemo } from 'react';
import { TileDefinition, WallState, HandBlock } from './types';
import { INITIAL_WALL, MAX_TILES_IN_HAND, TILE_ORDER } from './constants';
import { sortTiles, partitionHand, calculateShanten } from './utils/mahjong';
import type { UkeireResult } from './utils/mahjong';
import Wall from './components/Wall';
import HandView from './components/HandView';
import { useUkeireCalculation } from './hooks/useUkeireCalculation';

const App: React.FC = () => {
  // State
  const [wall, setWall] = useState<WallState>(INITIAL_WALL);
  const [hand, setHand] = useState<TileDefinition[]>([]);
  const [hoveredTileIndex, setHoveredTileIndex] = useState<number | null>(null);
  const [hoveredBlock, setHoveredBlock] = useState<HandBlock | null>(null);
  const [isAutoDraw, setIsAutoDraw] = useState<boolean>(false);

  // Use the ukeire calculation hook
  const { status, result, getDiscardUkeire } = useUkeireCalculation({ hand, wall });

  const isCalculating = status === 'loading';

  // --- CALCULATIONS ---

  const sortedHand = useMemo(() => sortTiles(hand), [hand]);

  // Get current stats based on hand state and hover
  const stats: UkeireResult | null = useMemo(() => {
    // When loading, return null to indicate no data available
    if (status === 'loading') return null;
    if (!result) return null;

    // When hovering a tile in a 14-tile hand, show that discard's ukeire
    if (hand.length === 14 && hoveredTileIndex !== null) {
      return getDiscardUkeire(hoveredTileIndex);
    }

    // Otherwise show current hand's ukeire
    return result.ukeire;
  }, [status, result, hand.length, hoveredTileIndex, getDiscardUkeire]);

  // Create blocks for hand display
  const blocks = useMemo(() => {
    return partitionHand(sortedHand, stats ?? undefined);
  }, [sortedHand, stats]);

  // Wall highlights based on current state
  const wallHighlights = useMemo(() => {
    // When loading, show no highlights
    if (!stats) {
      return { green: [] as string[], yellow: [] as string[] };
    }

    // Priority 1: Discard Preview
    if (hand.length === 14 && hoveredTileIndex !== null) {
      return {
        green: stats.shantenImprovement,
        yellow: stats.shapeImprovement
      };
    }

    // Priority 2: Block Analysis
    if (hoveredBlock) {
      return {
        green: hoveredBlock.ukeire.green,
        yellow: hoveredBlock.ukeire.yellow
      };
    }

    // Priority 3: General Status
    return {
      green: stats.shantenImprovement,
      yellow: stats.shapeImprovement
    };
  }, [hoveredBlock, stats, hand.length, hoveredTileIndex]);

  // Ukeire counts for display
  const ukeireCounts = useMemo(() => {
    if (!stats) return { green: 0, yellow: 0 };
    const green = stats.shantenImprovement.reduce((sum, t) => sum + (wall[t] || 0), 0);
    const yellow = stats.shapeImprovement.reduce((sum, t) => sum + (wall[t] || 0), 0);
    return { green, yellow };
  }, [stats, wall]);

  // Status text for display
  const statusText = useMemo(() => {
    if (isCalculating) return "Analyzing...";
    if (!stats) return "Ready";

    const s = stats.shanten;
    if (hand.length === 14 && hoveredTileIndex === null) return "Discard a tile";
    if (s <= -1) return "Ron / Tsumo";
    if (s === 0) return "Tenpai";
    return `${s}-Shanten`;
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
              ukeireGreen={wallHighlights.green}
              ukeireYellow={wallHighlights.yellow}
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
            <div className="text-right flex items-baseline gap-2">
              <span className="text-xs text-slate-400 font-bold tracking-wider">STATUS</span>
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
                <span className="text-green-400">{ukeireCounts.green}</span>
                <span className="text-slate-500 mx-1">+</span>
                <span className="text-yellow-400">{ukeireCounts.yellow}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleAutoDraw}
              className={`px-3 py-1.5 rounded text-xs font-bold transition-colors border ${
                isAutoDraw
                  ? 'bg-teal-600 border-teal-500 text-white hover:bg-teal-500'
                  : 'bg-slate-700 border-slate-600 text-slate-400 hover:text-slate-200 hover:bg-slate-600'
              }`}
            >
              Auto-Draw: {isAutoDraw ? 'ON' : 'OFF'}
            </button>

            <button
              onClick={handleDraw}
              disabled={isAutoDraw || hand.length >= MAX_TILES_IN_HAND}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed rounded text-xs font-bold text-white transition-colors border border-indigo-500 disabled:border-slate-600"
            >
              + Draw Tile
            </button>
            <button
              onClick={handleRandomize}
              className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-xs font-bold text-slate-200 transition-colors border border-slate-600"
            >
              Randomize
            </button>
            <button
              onClick={handleClear}
              className="px-3 py-1.5 bg-red-900/30 hover:bg-red-900/50 text-red-300 rounded text-xs font-bold transition-colors border border-red-900/50"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Hand View */}
        <div className="max-w-6xl mx-auto w-full px-4 py-2">
          <div className="flex justify-between items-center mb-1 px-2">
            <h2 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Your Hand</h2>
          </div>
          <HandView
            blocks={blocks}
            onDiscard={handleDiscard}
            onHoverTile={hand.length === 14 ? setHoveredTileIndex : () => {}}
            onHoverBlock={setHoveredBlock}
            hoveredTileIndex={hoveredTileIndex}
          />
        </div>
      </section>

    </div>
  );
};

export default App;
