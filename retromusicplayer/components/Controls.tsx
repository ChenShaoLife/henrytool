
import React from 'react';
import { playClickSound } from '../utils/audioHelpers';
import { Play, Pause, SkipBack, SkipForward, Power, Upload as Eject, FolderOpen, List } from 'lucide-react';

interface DeckControlsProps {
  isPlaying: boolean;
  onPlayPause: () => void;
  onPrev: () => void;
  onNext: () => void;
  isPowered: boolean;
  onTogglePower: () => void;
  onEject: () => void;
  onLoad: () => void;
  onTogglePlaylist: () => void;
  isTapeLoaded: boolean;
  playlistOpen: boolean;
  mobileLayout?: boolean;
}

export const DeckControls: React.FC<DeckControlsProps> = ({ 
  isPlaying, 
  onPlayPause, 
  onPrev,
  onNext,
  isPowered,
  onTogglePower,
  onEject,
  onLoad,
  onTogglePlaylist,
  isTapeLoaded,
  playlistOpen,
  mobileLayout = false
}) => {
  
  const handlePress = (e: React.MouseEvent, action: () => void) => {
    // DO NOT use e.preventDefault() here for file inputs on mobile
    playClickSound();
    action();
  };

  const TactileButton = ({ onClick, active = false, label, icon: Icon, disabled = false, color = "zinc" }: any) => {
      const baseColor = color === 'orange' ? 'bg-orange-700' : 'bg-zinc-800';
      const activeColor = color === 'orange' ? 'bg-orange-600' : 'bg-zinc-700';
      
      const iconColor = active || (color === 'orange' && !disabled) ? "text-white drop-shadow-md" : "text-zinc-400";
      
      const sizeClasses = mobileLayout 
        ? 'w-10 h-9 landscape:w-8 landscape:h-7 rounded-[3px]' 
        : 'w-12 h-10 md:w-20 md:h-16 rounded-[4px] md:rounded-md';
      
      const iconSize = mobileLayout ? 16 : 20;

      // 3D Depth calculation
      const depthClass = mobileLayout ? 'h-[2px]' : 'h-[2px] md:h-[4px]';
      
      return (
        <div className={`flex flex-col items-center ${mobileLayout ? 'gap-0' : 'gap-1 md:gap-2'}`}>
            <button 
                onClick={(e) => !disabled && handlePress(e, onClick)}
                className={`
                    group relative flex flex-col items-center justify-start
                    ${sizeClasses}
                    ${disabled ? 'opacity-40 cursor-not-allowed grayscale' : 'cursor-pointer'}
                    select-none outline-none touch-manipulation
                `}
                style={{ WebkitTapHighlightColor: 'transparent' }}
            >
                {/* Shadow/Base Layer (The "Side" of the button) */}
                <div className={`
                    absolute inset-x-0 bottom-0 rounded-b-[inherit] bg-black/50
                    ${depthClass}
                `}></div>

                {/* Main Button Face - Moves up and down via Transform, NOT margin */}
                <div className={`
                    absolute inset-x-0 top-0 bottom-0 rounded-[inherit] 
                    flex items-center justify-center border-t border-white/10
                    ${active ? activeColor : baseColor}
                    transition-transform duration-75 ease-out
                    ${active ? `translate-y-[${mobileLayout ? '2px' : '4px'}]` : 'translate-y-0 hover:-translate-y-[1px] active:translate-y-[2px]'}
                    ${disabled ? '' : 'shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]'}
                `}
                style={{
                    // Manual override for precise 3D effect matching the depthClass
                    // Only apply transform when ACTIVE prop is true (for toggles)
                    // For momentary clicks, CSS active state handles it
                    transform: active ? `translateY(${mobileLayout ? '2px' : '4px'})` : undefined
                }}
                >
                    <Icon 
                        size={iconSize} 
                        className={`
                            ${!mobileLayout ? 'md:w-[24px] md:h-[24px]' : ''}
                            ${mobileLayout ? 'landscape:w-[14px] landscape:h-[14px]' : ''}
                            ${iconColor} 
                            transition-colors duration-200
                        `} 
                    />
                    
                    {/* LED Indicator */}
                    {active && (
                        <div className={`absolute top-1 right-1 rounded-full shadow-[0_0_5px_#4ade80] bg-green-400 ${mobileLayout ? 'w-1 h-1' : 'w-1 h-1 md:w-1.5 md:h-1.5'}`}></div>
                    )}
                </div>
            </button>
            {!mobileLayout && label && <span className="text-[8px] md:text-[9px] font-mono font-bold text-zinc-500 tracking-wider hidden sm:block">{label}</span>}
        </div>
      );
  }

  const dividerClass = mobileLayout 
    ? "h-6 w-[1px] bg-black/20 mx-1 shadow-[1px_0_0_rgba(255,255,255,0.05)]"
    : "h-8 md:h-10 w-[1px] md:w-[2px] bg-black/20 mx-0.5 md:mx-2 shadow-[1px_0_0_rgba(255,255,255,0.05)]";

  return (
    <div className={`w-full h-full flex flex-wrap items-center justify-center ${mobileLayout ? 'gap-2 p-1 bg-transparent' : 'gap-2 md:gap-6 bg-[#1a1a1c] p-2 md:p-4 shadow-inner'}`}>
      
      {/* Power Group */}
      <TactileButton 
         onClick={onTogglePower}
         icon={Power}
         active={isPowered}
         color="orange"
         label="POWER"
      />
      
      <div className={dividerClass}></div>

      {/* Media Management */}
      <TactileButton 
         onClick={onLoad}
         icon={FolderOpen}
         disabled={!isPowered}
         label="LOAD"
      />
      <TactileButton 
         onClick={onTogglePlaylist}
         icon={List}
         active={playlistOpen}
         disabled={!isPowered}
         label="LIST"
      />

      <div className={dividerClass}></div>

      {/* Transport Controls */}
      <TactileButton 
         onClick={onPrev} 
         icon={SkipBack} 
         disabled={!isPowered}
         label="PREV"
      />
      
      <TactileButton 
         onClick={onPlayPause} 
         icon={isPlaying ? Pause : Play} 
         active={isPlaying}
         disabled={!isPowered}
         label="PLAY"
      />

      <TactileButton 
         onClick={onNext} 
         icon={SkipForward} 
         disabled={!isPowered}
         label="NEXT"
      />

      <div className={dividerClass}></div>

      {/* Eject */}
      <TactileButton 
         onClick={onEject} 
         icon={Eject} 
         disabled={!isPowered}
         label="EJECT"
      />

    </div>
  );
};
