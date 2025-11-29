
import React, { useMemo, useEffect, useRef } from 'react';
import { parseLrc } from '../utils/audioHelpers';

interface LyricsDisplayProps {
  rawLyrics?: string;
  currentTime: number;
  isPowered: boolean;
}

const LyricsDisplay: React.FC<LyricsDisplayProps> = ({ rawLyrics, currentTime, isPowered }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const { isSynced, lines } = useMemo(() => {
    if (!rawLyrics) return { isSynced: false, lines: [] };
    const parsed = parseLrc(rawLyrics);
    const isSynced = parsed.some(l => l.time !== -1);
    if (!isSynced) {
        return { 
            isSynced: false, 
            lines: rawLyrics.split('\n').filter(l => l.trim()).map((text, i) => ({ time: i, text })) 
        };
    }
    return { isSynced: true, lines: parsed };
  }, [rawLyrics]);

  // Find active line
  const activeIndex = useMemo(() => {
    if (!isSynced) return -1;
    for (let i = lines.length - 1; i >= 0; i--) {
        if (currentTime >= lines[i].time) {
            return i;
        }
    }
    return -1;
  }, [currentTime, lines, isSynced]);

  // Precise Scroll Logic using scrollTop (Desktop & Mobile)
  useEffect(() => {
      if (containerRef.current && isSynced && activeIndex !== -1) {
          const container = containerRef.current;
          const activeEl = container.children[activeIndex] as HTMLElement;

          if (activeEl) {
            // Calculate absolute position
            const containerCenter = container.clientHeight / 2;
            const elCenter = activeEl.offsetHeight / 2;
            const elTop = activeEl.offsetTop;

            // Target scroll position: Element Top - (Container Half - Element Half)
            const targetScroll = elTop - containerCenter + elCenter;

            container.scrollTo({
                top: targetScroll,
                behavior: 'smooth'
            });
          }
      }
  }, [activeIndex, isSynced, isPowered]);

  if (!isPowered) {
      return (
          <div className="w-full h-full bg-[#080808] flex items-center justify-center relative shadow-inner overflow-hidden">
             <div className="text-orange-900/20 font-led text-2xl tracking-[0.1em] font-bold">OFFLINE</div>
          </div>
      )
  }

  return (
    <div className="w-full h-full bg-[#050505] relative font-led shadow-[inset_0_0_20px_rgba(0,0,0,1)] border-t border-b border-zinc-900 group overflow-hidden">
       {/* Gradient Masks/Scanlines */}
       <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.5)_50%)] bg-[length:100%_4px] pointer-events-none z-20 opacity-30"></div>
       <div className="absolute top-0 left-0 w-full h-1/3 bg-gradient-to-b from-black via-black/80 to-transparent z-10 pointer-events-none"></div>
       <div className="absolute bottom-0 left-0 w-full h-1/3 bg-gradient-to-t from-black via-black/80 to-transparent z-10 pointer-events-none"></div>
       
       <div 
         ref={containerRef}
         className="h-full w-full px-4 flex flex-col items-center text-center relative z-0 overflow-hidden no-scrollbar py-[40%]"
       >
          {lines.length === 0 ? (
              <div className="absolute inset-0 flex items-center justify-center">
                  <div className="flex flex-col items-center gap-2">
                     <span className="text-orange-500/50 font-led text-xl animate-pulse tracking-widest">NO LYRICS FOUND</span>
                  </div>
              </div>
          ) : (
              lines.map((line, idx) => {
                  const isActive = idx === activeIndex;
                  return (
                    <div 
                        key={idx} 
                        className={`
                            py-3 lg:py-4 transition-all duration-300 ease-out w-full
                            ${isActive 
                                ? 'text-orange-500 text-xl md:text-3xl lg:text-4xl leading-relaxed opacity-100 scale-105 drop-shadow-[0_0_10px_rgba(249,115,22,0.8)]' 
                                : 'text-orange-900/40 text-sm md:text-lg lg:text-xl opacity-40 blur-[0.5px]'
                            }
                        `}
                        // text-balance helps prevent orphans on small landscape screens
                        style={{ textWrap: 'balance' } as any}
                    >
                        {line.text}
                    </div>
                  )
              })
          )}
       </div>
    </div>
  );
};

export default LyricsDisplay;
