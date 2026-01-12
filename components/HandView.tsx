import React, { useState } from 'react';
import { HandBlock, BlockType } from '../types';
import Tile from './Tile';

interface HandViewProps {
  blocks: HandBlock[];
  onDiscard: (index: number) => void;
  onHoverTile: (index: number | null) => void;
  onHoverBlock: (block: HandBlock | null) => void;
  hoveredTileIndex: number | null;
}

const HandView: React.FC<HandViewProps> = ({ 
  blocks, onDiscard, onHoverTile, onHoverBlock, hoveredTileIndex 
}) => {
  const [expandedBlocks, setExpandedBlocks] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) => {
    setExpandedBlocks(prev => ({ ...prev, [id]: !prev[id] }));
  };

  let globalTileIndex = 0;

  return (
    <div className="w-full min-h-[100px] flex flex-col justify-center">
      <div className="flex flex-wrap justify-center items-end gap-2 md:gap-4">
        {blocks.length === 0 && (
          <div className="text-slate-500 text-sm italic py-8">Empty Hand</div>
        )}
        
        {blocks.map((block) => {
          const isComplex = block.type === BlockType.COMPLEX;
          const isExpanded = expandedBlocks[block.id];
          
          return (
            <div 
              key={block.id} 
              className="flex flex-col items-center group relative"
              onMouseEnter={() => onHoverBlock(block)}
              onMouseLeave={() => onHoverBlock(null)}
            >
              {/* Complex Expansion Toggle - Top (since popover is bottom) - Wait, we want popover UP. */}
              
              {/* Expanded Sub-blocks View - Pop Upwards */}
              {isComplex && isExpanded && block.subBlocks && (
                <div className="absolute bottom-full mb-3 p-3 bg-slate-900 rounded border border-slate-700 shadow-2xl z-40 w-max animate-in slide-in-from-bottom-2 fade-in">
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-2 border-b border-slate-800 pb-1">Decomposition</div>
                  <div className="flex gap-2">
                    {block.subBlocks.map((sub, idx) => (
                      <div key={idx} className="flex bg-slate-800 p-1 rounded border border-slate-700">
                         {sub.tiles.map((t, ti) => <Tile key={ti} {...t} size="sm" />)}
                      </div>
                    ))}
                  </div>
                  {/* Arrow */}
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 border-b border-r border-slate-700 rotate-45"></div>
                </div>
              )}

              {/* Block Container */}
              <div className={`
                flex items-center p-1.5 rounded-lg transition-all duration-200
                ${isComplex ? 'bg-slate-700/50 border border-slate-600 border-dashed' : 'bg-transparent'}
                hover:bg-slate-700 hover:shadow-lg
              `}>
                {block.tiles.map((tile, i) => {
                  const currentGlobalIndex = globalTileIndex++;
                  const isHovering = hoveredTileIndex === currentGlobalIndex;
                  
                  return (
                    <div key={`${block.id}_${i}`} className="mx-px md:mx-0.5 relative">
                       {/* Discard Indicator */}
                       {isHovering && (
                         <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-red-500 text-white text-[10px] py-1 px-2 rounded shadow-lg z-50 font-bold whitespace-nowrap">
                           DISCARD
                         </div>
                       )}
                       <Tile 
                         {...tile} 
                         onClick={() => onDiscard(currentGlobalIndex)}
                         onHover={() => onHoverTile(currentGlobalIndex)}
                         onLeave={() => onHoverTile(null)}
                         selected={isHovering}
                         size="md"
                       />
                    </div>
                  );
                })}
              </div>
              
               {/* Label & Toggle */}
               <div className="mt-1 h-4 flex items-center justify-center w-full">
                {isComplex ? (
                    <button 
                    onClick={() => toggleExpand(block.id)}
                    className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center bg-slate-900/50 px-2 rounded-full"
                    >
                    {isExpanded ? '▲' : '▼ Expand'}
                    </button>
                ) : (
                    <div className="text-[9px] text-slate-600 uppercase tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity">
                        {block.type}
                    </div>
                )}
               </div>

            </div>
          );
        })}
      </div>
    </div>
  );
};

export default HandView;