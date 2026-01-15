import React, { useState, useMemo, useEffect, useRef } from 'react';
import { TileDefinition, WallState, HandBlock } from './types';
import { INITIAL_WALL, MAX_TILES_IN_HAND, TILE_ORDER } from './constants';
import * as Mahjong from './utils/mahjong';
import Wall from './components/Wall';
import HandView from './components/HandView';

const App: React.FC = () => {
  // State
  const [wall, setWall] = useState<WallState>(INITIAL_WALL);
  const [hand, setHand] = useState<TileDefinition[]>([]);
  const [hoveredTileIndex, setHoveredTileIndex] = useState<number | null>(null);
  const [hoveredBlock, setHoveredBlock] = useState<HandBlock | null>(null);
  const [isAutoDraw, setIsAutoDraw] = useState<boolean>(false);
  
  // Async Calculation State
  const [cachedUkeire, setCachedUkeire] = useState<Mahjong.UkeireResult[] | null>(null);
  const [isCalculating, setIsCalculating] = useState<boolean>(false);

  // Ref to track valid calculation requests
  const requestIdRef = useRef(0);

  // --- CALCULATIONS ---

  const sortedHand = useMemo(() => Mahjong.sortTiles(hand), [hand]);

  // Time-sliced calculation effect
  useEffect(() => {
    if (hand.length !== 14) {
        setCachedUkeire(null);
        setIsCalculating(false);
        return;
    }

    setIsCalculating(true);
    setCachedUkeire(null);
    
    // Increment request ID to invalidate any pending old requests
    const reqId = requestIdRef.current + 1;
    requestIdRef.current = reqId;

    const runCalculation = async () => {
        const results: Mahjong.UkeireResult[] = new Array(sortedHand.length);
        const cache = new Map<string, Mahjong.UkeireResult>();

        for (let i = 0; i < sortedHand.length; i++) {
            // Check if a new request started
            if (requestIdRef.current !== reqId) return;

            // Yield to main thread to prevent UI freeze
            // We await a timeout of 0ms, which pushes the execution to the end of the event loop queue,
            // allowing the browser to render a frame.
            await new Promise(resolve => setTimeout(resolve, 0));

            const tile = sortedHand[i];
            const key = tile.str;

            if (cache.has(key)) {
                results[i] = cache.get(key)!;
            } else {
                const subHand = sortedHand.filter((_, idx) => idx !== i);
                const res = Mahjong.calculateHandUkeire(subHand, wall);
                cache.set(key, res);
                results[i] = res;
            }
        }

        // Final check before updating state
        if (requestIdRef.current === reqId) {
            setCachedUkeire(results);
            setIsCalculating(false);
        }
    };

    runCalculation();

  }, [sortedHand, wall, hand.length]);

  const activeHand = useMemo(() => {
    if (hand.length === 14 && hoveredTileIndex !== null) {
      // hoveredTileIndex comes from HandView, which uses sortedHand indices
      return sortedHand.filter((_, i) => i !== hoveredTileIndex);
    }
    return sortedHand;
  }, [sortedHand, hand.length, hoveredTileIndex]);

  // Calculate stats first, based on active hand
  const stats = useMemo(() => {
    // Priority: If hand is full and we are hovering, try to use cached results
    if (hand.length === 14 && hoveredTileIndex !== null) {
        if (cachedUkeire && cachedUkeire[hoveredTileIndex]) {
            return cachedUkeire[hoveredTileIndex];
        }
        // Fallback: If cache isn't ready, compute just for this specific tile synchronously.
        // This keeps hover responsive even if background analysis is pending.
        if (activeHand.length === 13) {
             return Mahjong.calculateHandUkeire(activeHand, wall);
        }
    }

    if (activeHand.length === 13) {
       return Mahjong.calculateHandUkeire(activeHand, wall);
    }
    return { 
      shanten: Mahjong.calculateShanten(activeHand), 
      shantenImprovement: [], 
      shapeImprovement: [] 
    };
  }, [activeHand, wall, cachedUkeire, hoveredTileIndex, hand.length]);

  // Then create blocks, passing the stats for context-aware ukeire
  const blocks = useMemo(() => {
    return Mahjong.partitionHand(sortedHand, stats);
  }, [sortedHand, stats]);

  const wallHighlights = useMemo(() => {
    // Priority 1: Discard Preview
    // If we are hovering a tile to discard (hand full), show the resulting hand's ukeire.
    // This takes precedence over block hovering because the user is interacting with a specific tile.
    if (hand.length === 14 && hoveredTileIndex !== null) {
        return {
          green: stats.shantenImprovement,
          yellow: stats.shapeImprovement
        };
    }

    // Priority 2: Block Analysis
    // If not discarding, checking a specific block shows its internal ukeire.
    if (hoveredBlock) {
      return { 
        green: hoveredBlock.ukeire.green, 
        yellow: hoveredBlock.ukeire.yellow 
      };
    }

    // Priority 3: General Status
    // Show current hand's ukeire (e.g. while drawing or idle with < 14 tiles)
    return {
      green: stats.shantenImprovement,
      yellow: stats.shapeImprovement
    };
  }, [hoveredBlock, stats, hand.length, hoveredTileIndex]);

  const ukeireCounts = useMemo(() => {
      const green = stats.shantenImprovement.reduce((sum, t) => sum + (wall[t] || 0), 0);
      const yellow = stats.shapeImprovement.reduce((sum, t) => sum + (wall[t] || 0), 0);
      return { green, yellow };
  }, [stats, wall]);

  const statusText = useMemo(() => {
    if (isCalculating) return "Analyzing...";
    const s = stats.shanten;
    if (hand.length === 14 && hoveredTileIndex === null) return "Discard a tile";
    if (s <= -1) return "Ron / Tsumo";
    if (s === 0) return "Tenpai";
    return `${s}-Shanten`;
  }, [stats.shanten, hand.length, hoveredTileIndex, isCalculating]);

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

    // Add to hand, remove from wall
    setHand(prev => [...prev, tile]);
    handleUpdateWallCount(tile.str, -1);
  };

  const handleDraw = () => {
    if (hand.length >= MAX_TILES_IN_HAND) return;

    // Find available tiles from current wall state
    const available = TILE_ORDER.filter(t => wall[t.str] > 0);
    
    if (available.length === 0) return;

    // Random pick
    const pick = available[Math.floor(Math.random() * available.length)];
    
    setHand(prev => [...prev, pick]);
    handleUpdateWallCount(pick.str, -1);
  };

  const handleDiscard = (sortedIndex: number) => {
    // Reset hover state immediately to avoid sticky discard highlights
    setHoveredTileIndex(null);

    // Correctly identify tile from the sorted view
    const tileToRemove = sortedHand[sortedIndex];
    if (!tileToRemove) return;

    const rawIndex = hand.findIndex(t => t.suit === tileToRemove.suit && t.value === tileToRemove.value);
    if (rawIndex === -1) return;

    // Prepare next state
    const nextHand = [...hand];
    nextHand.splice(rawIndex, 1);

    // Copy wall state (discarded tiles stay out of the wall)
    const nextWall = { ...wall };

    // Auto Draw Logic
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
    // Clear current hand to wall
    const newWall = { ...INITIAL_WALL };
    const newHand: TileDefinition[] = [];
    
    // Pick 13 tiles, or 14 if auto-draw is on
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
           
           {/* Menu / Status Bar (Moved Here) */}
           <div className="bg-slate-800 border-b border-slate-700/50 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                 <div className="text-right flex items-baseline gap-2">
                    <span className="text-xs text-slate-400 font-bold tracking-wider">STATUS</span>
                    <span className={`text-xl font-bold flex items-center gap-2 ${isCalculating ? 'text-blue-400' : (stats.shanten <= 0 ? 'text-green-400' : 'text-white')}`}>
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
                 {(stats.shantenImprovement.length > 0 || stats.shapeImprovement.length > 0) && !isCalculating && (
                   <div className="flex items-center ml-2 px-2 py-1 bg-slate-900 rounded border border-slate-600 font-mono text-sm font-bold">
                     <span className="text-green-400">{ukeireCounts.green}</span>
                     <span className="text-slate-500 mx-1">+</span>
                     <span className="text-yellow-400">{ukeireCounts.yellow}</span>
                   </div>
                 )}
              </div>

              <div className="flex items-center gap-2">
                 <button
                   onClick={() => setIsAutoDraw(!isAutoDraw)}
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