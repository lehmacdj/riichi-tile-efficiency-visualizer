import React, { useState } from 'react';
import { Suit } from '../types';

interface TileProps {
  suit: Suit;
  value: number;
  str: string;
  onClick?: () => void;
  onHover?: () => void;
  onLeave?: () => void;
  selected?: boolean;
  highlight?: 'green' | 'yellow' | 'none'; // Ukeire status
  dimmed?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const getTileImageSrc = (suit: Suit, value: number) => {
  // Use jsDelivr for reliable content delivery
  const baseUrl = 'https://cdn.jsdelivr.net/gh/FluffyStuff/riichi-mahjong-tiles@master/src/Regular';
  
  if (suit === 'm') return `${baseUrl}/Man${value}.svg`;
  if (suit === 'p') return `${baseUrl}/Pin${value}.svg`;
  if (suit === 's') return `${baseUrl}/Sou${value}.svg`;
  
  // Honors
  const honorMap: Record<number, string> = {
    1: 'Ton', 2: 'Nan', 3: 'Sha', 4: 'Pei', 
    5: 'Haku', 6: 'Hatsu', 7: 'Chun'
  };
  return `${baseUrl}/${honorMap[value]}.svg`;
};

const Tile: React.FC<TileProps> = ({ 
  suit, value, str, onClick, onHover, onLeave, selected, highlight, dimmed, size = 'md' 
}) => {
  const [imgError, setImgError] = useState(false);
  const imgSrc = getTileImageSrc(suit, value);

  // Fallback display value
  let displayValue: string | React.ReactNode = value;
  if (suit === 'z') {
    const honors = ['E', 'S', 'W', 'N', 'Wh', 'G', 'R'];
    displayValue = honors[value - 1];
  }
  const SUIT_COLORS = {
    m: 'text-red-400',
    p: 'text-blue-400',
    s: 'text-green-400',
    z: 'text-purple-400',
  };

  const sizeClasses = {
    sm: 'w-8 h-11',
    md: 'w-10 h-14',
    lg: 'w-14 h-20',
  };

  const highlightClasses = {
    none: '',
    green: 'ring-2 ring-green-500 bg-green-500/20 rounded',
    yellow: 'ring-2 ring-yellow-400 bg-yellow-400/20 rounded',
  };

  return (
    <div
      onClick={onClick}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      className={`
        ${sizeClasses[size]} 
        ${highlight ? highlightClasses[highlight] : ''}
        ${selected ? '-translate-y-2 shadow-xl ring-2 ring-blue-500 rounded' : ''}
        ${dimmed ? 'opacity-30 grayscale' : 'opacity-100'}
        relative flex flex-col items-center justify-center
        cursor-pointer select-none transition-all duration-150
        hover:brightness-110 active:translate-y-0 active:scale-95
      `}
    >
      {!imgError ? (
        <img 
          src={imgSrc} 
          alt={str} 
          className="w-full h-full object-contain drop-shadow-sm" 
          loading="lazy"
          onError={() => setImgError(true)}
        />
      ) : (
        // Fallback to text if image fails
        <div className={`w-full h-full bg-slate-800 border border-slate-600 rounded flex flex-col items-center justify-center font-bold font-mono ${size === 'sm' ? 'text-xs' : 'text-base'}`}>
          <span className={`${SUIT_COLORS[suit]}`}>{displayValue}</span>
          <span className="text-[8px] text-gray-500 absolute bottom-0.5 right-1 uppercase">{suit}</span>
        </div>
      )}

      {/* Highlight overlay */}
      {highlight === 'green' && <div className="absolute inset-0 bg-green-500/10 rounded pointer-events-none"></div>}
      {highlight === 'yellow' && <div className="absolute inset-0 bg-yellow-400/10 rounded pointer-events-none"></div>}
    </div>
  );
};

export default Tile;