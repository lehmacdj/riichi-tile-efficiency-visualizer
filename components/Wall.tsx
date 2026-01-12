import React from 'react';
import { WallState, TileDefinition } from '../types';
import { TILE_ORDER } from '../constants';
import Tile from './Tile';

interface WallProps {
  wall: WallState;
  onUpdateCount: (id: string, delta: number) => void;
  onSelectTile: (tile: TileDefinition) => void;
  ukeireGreen: string[];
  ukeireYellow: string[];
  discardPreviewMode?: boolean;
}

const Wall: React.FC<WallProps> = ({ 
  wall, onUpdateCount, onSelectTile, ukeireGreen, ukeireYellow, discardPreviewMode 
}) => {
  
  const renderSuitRow = (suit: string, tiles: TileDefinition[]) => (
    <div className="flex flex-col md:flex-row md:items-start py-2 border-b border-slate-800 last:border-0" key={suit}>
      <div className="flex-1 flex flex-wrap justify-center gap-x-3 gap-y-4">
        {tiles.map((tile) => {
          const count = wall[tile.str] || 0;
          const isGreen = ukeireGreen.includes(tile.str);
          const isYellow = ukeireYellow.includes(tile.str);
          
          let highlight: 'green' | 'yellow' | 'none' = 'none';
          if (isGreen) highlight = 'green';
          else if (isYellow) highlight = 'yellow';

          return (
            <div key={tile.str} className="flex flex-col items-center relative w-9">
              <Tile 
                {...tile} 
                highlight={highlight} 
                dimmed={count === 0 && !isGreen && !isYellow}
                onClick={() => onSelectTile(tile)}
                size="sm"
              />
              
              {/* Ukeire Indicator Dot */}
              {(isGreen || isYellow) && (
                <div className={`absolute -top-1.5 -right-1.5 w-3 h-3 rounded-full border-2 border-slate-900 ${isGreen ? 'bg-green-500' : 'bg-yellow-400'}`}></div>
              )}

              {/* Always Visible Controls */}
              <div className="flex items-center justify-between w-full mt-1 bg-slate-800 rounded-lg overflow-hidden border border-slate-700">
                <button 
                  onClick={(e) => { e.stopPropagation(); onUpdateCount(tile.str, -1); }}
                  className="w-full flex items-center justify-center hover:bg-red-900/50 text-slate-400 hover:text-red-300 text-[10px] h-4 transition-colors"
                >-</button>
                <span className={`px-1 text-[10px] font-mono font-bold leading-none ${count === 0 ? 'text-red-500' : 'text-slate-200'}`}>
                  {count}
                </span>
                <button 
                  onClick={(e) => { e.stopPropagation(); onUpdateCount(tile.str, 1); }}
                  className="w-full flex items-center justify-center hover:bg-blue-900/50 text-slate-400 hover:text-blue-300 text-[10px] h-4 transition-colors"
                >+</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const manzu = TILE_ORDER.filter(t => t.suit === 'm');
  const pinzu = TILE_ORDER.filter(t => t.suit === 'p');
  const souzu = TILE_ORDER.filter(t => t.suit === 's');
  const honors = TILE_ORDER.filter(t => t.suit === 'z');

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex-1 overflow-y-auto pr-1">
        <div className="flex flex-col">
          {renderSuitRow('man', manzu)}
          {renderSuitRow('pin', pinzu)}
          {renderSuitRow('sou', souzu)}
          {renderSuitRow('hon', honors)}
        </div>
      </div>
    </div>
  );
};

export default Wall;