
import React from 'react';
import { TAPE_MAX_RADIUS, TAPE_MIN_RADIUS } from '../constants';

interface CassetteTapeProps {
  isPlaying: boolean;
  progress: number; // 0 to 1
  coverUrl?: string;
  title: string;
  artist?: string;
  format?: string;
  qualityLabel?: string;
  color?: string;
}

const CassetteTape: React.FC<CassetteTapeProps> = ({ 
  isPlaying, 
  progress, 
  coverUrl,
  title,
  artist,
  format,
  qualityLabel,
  color = '#dc2626'
}) => {
  
  const calculateRadius = (percentFull: number) => {
    const rMin2 = TAPE_MIN_RADIUS * TAPE_MIN_RADIUS;
    const rMax2 = TAPE_MAX_RADIUS * TAPE_MAX_RADIUS;
    const currentR2 = rMin2 + (rMax2 - rMin2) * percentFull;
    return Math.sqrt(currentR2);
  };

  const supplyRadius = calculateRadius(1 - progress);
  const takeupRadius = calculateRadius(progress);

  return (
    <div className="relative w-full h-full bg-[#1a1a1a] rounded-lg shadow-2xl overflow-hidden flex flex-col items-center p-[2%] border border-zinc-800 select-none">
      
      {/* Plastic Texture */}
      <div className="absolute inset-0 bg-noise opacity-10 pointer-events-none z-0"></div>
      
      {/* Screws */}
      <Screw top="4%" left="3%" />
      <Screw top="4%" right="3%" />
      <Screw bottom="4%" left="3%" />
      <Screw bottom="4%" right="3%" />

      {/* --- LABEL AREA --- */}
      <div className="relative w-[92%] h-[68%] mt-[2%] rounded-[4px] overflow-hidden flex flex-col shadow-sm z-10">
          
          {/* Top White Strip */}
          <div className="w-full h-[35%] bg-[#e4e4e7] relative flex items-start pt-2 lg:pt-3 px-4 lg:px-6 justify-between">
              {/* Top Left: SIDE A */}
              <span className="text-[13px] md:text-[15px] lg:text-[16px] landscape:text-[11px] font-sans font-bold text-zinc-900 tracking-wide">SIDE A</span>
              
              {/* Top Right: Quality (Lossless, etc) */}
              <span className="text-[13px] md:text-[15px] lg:text-[16px] landscape:text-[11px] font-mono font-bold text-zinc-500 tracking-wide uppercase">
                  {qualityLabel || "NORMAL BIAS"}
              </span>

              {/* Optional Cover Art Thumb (Absolute) */}
              {coverUrl && (
                  <div className="absolute top-1 lg:top-2 left-1/2 -translate-x-1/2 h-[80%] aspect-square border border-black/10 opacity-80 mix-blend-multiply">
                      <img src={coverUrl} className="w-full h-full object-cover grayscale" alt="art" />
                  </div>
              )}
          </div>

          {/* Bottom Colored Strip */}
          <div 
            className="w-full h-[65%] relative flex items-center px-4 md:px-6 lg:px-6 transition-colors duration-700"
            style={{ backgroundColor: color }}
          >
               <div className="flex flex-col text-white w-full h-full justify-end pb-3 lg:pb-5">
                   
                   <div className="flex justify-between items-end w-full gap-4">
                       {/* Bottom Left: Title */}
                       <div className="flex flex-col overflow-hidden flex-1">
                           <span className="text-[16px] md:text-[22px] lg:text-[24px] landscape:text-[16px] font-bold truncate leading-tight tracking-tight drop-shadow-md">
                               {title || "NO TAPE"}
                           </span>
                       </div>

                       {/* Bottom Right: Artist */}
                       <span className="text-[11px] md:text-[13px] lg:text-[14px] landscape:text-[10px] font-medium opacity-90 truncate max-w-[40%] text-right font-mono shrink-0">
                           {artist || "UNKNOWN"}
                       </span>
                   </div>
               </div>
          </div>
      </div>

      {/* --- REEL WINDOW AREA --- */}
      <div className="absolute top-[28%] left-1/2 -translate-x-1/2 w-[70%] h-[25%] z-20 flex items-center justify-between px-[5%]">
           
           {/* 
              OPAQUE BACKGROUND (Layer 0)
              Fixes "hollow" issue. Solid black background blocks visibility of texture behind it.
           */}
           <div className="absolute inset-0 bg-[#0f0f10] rounded-full border-[3px] border-[#1a1a1a] shadow-inner overflow-hidden pointer-events-none z-0">
               {/* Reflection/Shine */}
               <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent skew-x-12 opacity-30"></div>
           </div>

           {/* Tape Bridge (Connecting the reels visually) - Layer 10 (Above opaque background) */}
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[15%] bg-[#3a2a22] z-10 shadow-sm"></div>

           {/* Reels - Layer 20 (Above Bridge) */}
           <Reel isPlaying={isPlaying} radiusPercent={supplyRadius} side="left" />
           <Reel isPlaying={isPlaying} radiusPercent={takeupRadius} side="right" />

           {/* Center Bridge Transparency (Glass Reflection) - Layer 30 (Top) */}
           <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[40%] h-full bg-zinc-900/40 backdrop-blur-[1px] z-30 border-x border-white/5 pointer-events-none"></div>
      </div>

      {/* --- BOTTOM TAPE PATH --- */}
      <div className="absolute bottom-0 w-[68%] h-[16%] bg-[#121212] rounded-t-[4px] border-t border-zinc-800 shadow-[0_-2px_10px_rgba(0,0,0,0.5)] z-20 overflow-hidden flex justify-center">
            
            {/* Magnetic Tape Strip */}
            <div className="relative w-[80%] h-full bg-[#3f2e26] overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/60"></div>
                {isPlaying && (
                    <div className="absolute inset-0 bg-noise bg-[length:50px_50px] opacity-60 mix-blend-soft-light animate-pan-x"></div>
                )}
            </div>
            
            <div className="absolute bottom-0 w-[15%] h-[60%] bg-[#71717a] rounded-t-[2px]"></div>
            
            <div className="absolute bottom-2 left-6 w-2 md:w-3 h-2 md:h-3 bg-black rounded-full shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)] border border-zinc-800"></div>
            <div className="absolute bottom-2 right-6 w-2 md:w-3 h-2 md:h-3 bg-black rounded-full shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)] border border-zinc-800"></div>
      </div>

    </div>
  );
};

const Screw = ({top, left, right, bottom}: any) => (
    <div 
        className="absolute w-2 lg:w-3 h-2 lg:h-3 rounded-full bg-zinc-700 shadow-[inset_0_1px_2px_rgba(0,0,0,1)] flex items-center justify-center z-20 border border-black/50"
        style={{top, left, right, bottom}}
    >
        <div className="w-[60%] h-[15%] bg-zinc-950 rotate-45"></div>
        <div className="absolute w-[60%] h-[15%] bg-zinc-950 -rotate-45"></div>
    </div>
)

interface ReelProps {
    isPlaying: boolean;
    radiusPercent: number;
    side: 'left' | 'right';
}

const Reel: React.FC<ReelProps> = ({ isPlaying, radiusPercent, side }) => {
    return (
        <div className="relative w-12 h-12 lg:w-20 lg:h-20 flex items-center justify-center z-20">
            {/* The Tape Pack (Dark Brown) */}
            <div 
                className="absolute rounded-full shadow-lg transition-all duration-300 ease-linear z-10"
                style={{
                    width: `${radiusPercent * 2.8}%`, 
                    height: `${radiusPercent * 2.8}%`,
                    background: 'repeating-radial-gradient(#3a2a22, #241812 1px, #3a2a22 2px)',
                    boxShadow: 'inset 0 0 10px rgba(0,0,0,0.5)'
                }}
            ></div>

            {/* The White Plastic Spool (Spins) */}
            <div 
                className={`relative w-[45%] h-[45%] bg-[#f4f4f5] rounded-full flex items-center justify-center z-20 shadow-md border-[3px] border-zinc-300 ${isPlaying ? 'animate-spin-slow' : ''}`}
            >
                 <div className="absolute inset-0">
                     {[0, 60, 120, 180, 240, 300].map(deg => (
                         <div key={deg} className="absolute top-1/2 left-1/2 w-[15%] h-full bg-[#d4d4d8] -translate-x-1/2 -translate-y-1/2" style={{ transform: `translate(-50%, -50%) rotate(${deg}deg)`}}></div>
                     ))}
                 </div>
                 <div className="absolute w-[80%] h-[80%] bg-transparent border-[3px] border-zinc-400 rounded-full"></div>
            </div>
        </div>
    )
}

export default CassetteTape;
