
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Track, PlayerState, PlaybackState, DeckState } from './types';
import { processFileList, formatTime, playClickSound, playMechanicalSound } from './utils/audioHelpers';
import * as db from './utils/db';

// Components
import CassetteTape from './components/CassetteTape';
import { DeckControls } from './components/Controls';
import Playlist from './components/Playlist';
import LyricsDisplay from './components/LyricsDisplay';
import { Disc3 } from 'lucide-react';

const App: React.FC = () => {
  // Data State
  const [tracks, setTracks] = useState<Track[]>([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState<number>(-1);
  
  // Playback State
  const [playbackState, setPlaybackState] = useState<PlaybackState>(PlaybackState.STOPPED);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  
  // Deck Mechanical State
  const [isReady, setIsReady] = useState(false);
  const [isPowered, setIsPowered] = useState(false);
  const [deckState, setDeckState] = useState<DeckState>(DeckState.EMPTY);
  
  // UI State
  const [showPlaylist, setShowPlaylist] = useState(false);

  // Refs
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize
  useEffect(() => {
    const init = async () => {
      const savedTracks = await db.getTracks();
      if (savedTracks.length > 0) {
        setTracks(savedTracks);
        setDeckState(DeckState.EMPTY); 
      }
      const savedVolume = await db.getSettings('volume');
      if (typeof savedVolume === 'number') {
          // Volume logic if implemented
      }
      setIsReady(true);
    };
    init();
  }, []);

  // Audio Events
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.crossOrigin = "anonymous";
    }

    const audio = audioRef.current;
    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => {
        setDuration(audio.duration);
        if (currentTrackIndex > -1 && tracks[currentTrackIndex]?.duration === 0) {
            const newTracks = [...tracks];
            newTracks[currentTrackIndex].duration = audio.duration;
            setTracks(newTracks);
        }
    };
    const handleEnded = () => handleNext();

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [tracks, currentTrackIndex]); 

  // Power Effect
  useEffect(() => {
    if (!isPowered) {
      if (audioRef.current) audioRef.current.pause();
      setPlaybackState(PlaybackState.STOPPED);
      setShowPlaylist(false);
    } else if (deckState === DeckState.LOADED && playbackState === PlaybackState.PLAYING) {
        audioRef.current?.play().catch(console.error);
    }
  }, [isPowered]);

  // Handle Track Loading Sequence
  const changeTrack = useCallback(async (index: number) => {
    if (index < 0 || index >= tracks.length) return;

    // Eject first
    if (deckState === DeckState.LOADED || deckState === DeckState.LOADING) {
        setPlaybackState(PlaybackState.STOPPED);
        audioRef.current?.pause();
        playMechanicalSound('eject');
        setDeckState(DeckState.EJECTING);
        await new Promise(r => window.setTimeout(r, 800));
    }

    // Load Audio
    setCurrentTrackIndex(index);
    const track = tracks[index];
    let file: File | undefined;
    if (track.fileHandle) {
        try { file = await track.fileHandle.getFile(); } catch (e) { console.error(e); }
    } else if (track.file) {
        file = track.file;
    }

    if (file && audioRef.current) {
        const url = URL.createObjectURL(file);
        audioRef.current.src = url;
        audioRef.current.load();
    }

    // Insert Animation
    playMechanicalSound('insert');
    setDeckState(DeckState.LOADING);
    await new Promise(r => window.setTimeout(r, 1000));
    setDeckState(DeckState.LOADED);

    // Auto Play
    if (isPowered) {
        setPlaybackState(PlaybackState.PLAYING);
        audioRef.current?.play().catch(console.error);
    }

  }, [tracks, deckState, isPowered]);

  const handlePlayPause = () => {
    if (!isPowered || deckState !== DeckState.LOADED) return;
    
    if (playbackState === PlaybackState.PLAYING) {
      audioRef.current?.pause();
      setPlaybackState(PlaybackState.PAUSED);
    } else {
      audioRef.current?.play().catch(console.error);
      setPlaybackState(PlaybackState.PLAYING);
    }
  };

  const handleNext = () => changeTrack(currentTrackIndex + 1 >= tracks.length ? 0 : currentTrackIndex + 1);
  const handlePrev = () => changeTrack(currentTrackIndex - 1 < 0 ? tracks.length - 1 : currentTrackIndex - 1);
  
  const handleEject = async () => {
      if (deckState === DeckState.LOADED) {
          setPlaybackState(PlaybackState.STOPPED);
          audioRef.current?.pause();
          playMechanicalSound('eject');
          setDeckState(DeckState.EJECTING);
          await new Promise(r => window.setTimeout(r, 800));
          setDeckState(DeckState.EMPTY);
          setCurrentTrackIndex(-1);
      }
  };

  const handlePowerCheck = (action: () => void) => {
    if (!isPowered) {
        playClickSound();
        alert("Please turn ON the power first.");
        return;
    }
    action();
  }

  const handleFilesSelect = () => fileInputRef.current?.click();
  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = await processFileList(e.target.files);
      
      // Filter Duplicates based on name + size
      const uniqueNewTracks = newFiles.filter(newTrack => {
          const isDuplicate = tracks.some(existing => 
             existing.name === newTrack.name && existing.file?.size === newTrack.file?.size
          );
          return !isDuplicate;
      });

      if (uniqueNewTracks.length === 0) {
          alert("Selected files are already in the playlist.");
          return;
      }
      
      const updatedTracks = [...tracks, ...uniqueNewTracks];
      await db.saveTracks(uniqueNewTracks); 
      setTracks(updatedTracks);
      
      if (isPowered) setShowPlaylist(true);
    }
  };

  const handleRemoveTrack = async (index: number) => {
    // 1. Update State
    const newTracks = [...tracks];
    newTracks.splice(index, 1);
    setTracks(newTracks);
    
    // 2. Update DB (Simplified clear/resave for this demo, optimally delete by ID)
    await db.clearTracks();
    await db.saveTracks(newTracks);

    // 3. Logic if active track removed
    if (index === currentTrackIndex) {
        handleEject();
    } else if (index < currentTrackIndex) {
        setCurrentTrackIndex(currentTrackIndex - 1);
    }
  };

  const currentTrack = tracks[currentTrackIndex];
  const progress = duration > 0 ? currentTime / duration : 0;

  return (
    <div className="fixed inset-0 flex items-center justify-center font-sans select-none bg-[#121212] overflow-hidden p-0 landscape:p-4 lg:p-0">
      
      <input 
        type="file" 
        multiple 
        accept="audio/mpeg,audio/wav,audio/flac,audio/x-m4a,audio/aac,audio/*"
        ref={fileInputRef} 
        onChange={handleFileInputChange} 
        className="hidden" 
      />

      {/* 
         UNIVERSAL LAYOUT CONTROLLER 
         - Mobile/Tablet Portrait: Flex Column, Full Width/Height
         - Mobile Landscape: Fixed Aspect Ratio Box (Fits in screen)
         - Desktop: Rigid Box (90vh height, locked 16/10 aspect ratio, locked Grid)
      */}
      <div className="
            relative bg-[#18181b] shadow-2xl overflow-hidden
            w-full h-full flex flex-col 
            
            /* Landscape Mobile: Behave like a 'device' sitting in the center */
            landscape:w-auto landscape:h-full landscape:aspect-[16/10] landscape:rounded-xl landscape:shadow-2xl
            landscape:grid landscape:grid-cols-[1.3fr_1fr] landscape:gap-0

            /* Desktop: Strict Rigid Box */
            lg:h-[90vh] lg:w-auto lg:aspect-[16/10] lg:max-h-none lg:max-w-none lg:rounded-lg
            lg:grid lg:grid-cols-[65%_35%] lg:gap-0
      ">
        
        {/* HEADER */}
        <div className="h-10 lg:h-14 landscape:h-8 bg-[#121212] border-b border-white/5 flex justify-between items-center px-4 lg:px-6 shrink-0 z-20 shadow-md lg:col-span-2 landscape:col-span-2">
             <div className="flex items-center gap-2 lg:gap-3">
                 <Disc3 size={18} className="text-orange-600 landscape:w-4 landscape:h-4" />
                 <span className="text-zinc-400 font-mono text-[10px] lg:text-xs tracking-[0.2em] font-bold">TEAC<span className="text-white">H</span> V-900X</span>
             </div>
             <div className="flex gap-2 lg:gap-4 text-[8px] lg:text-[9px] text-zinc-600 font-mono font-bold tracking-wider">
                 <span className={isPowered ? "text-orange-500 shadow-glow" : ""}>PWR: {isPowered ? 'ON' : 'OFF'}</span>
                 <span className="hidden sm:inline">TYPE IV METAL</span>
             </div>
        </div>

        {/* --- LEFT SECTION (DECK) --- */}
        <div className="flex-1 lg:h-full landscape:h-full flex flex-col min-h-0 bg-[#0f0f10] border-r border-black relative z-10">
            
            <div className="flex-1 flex flex-col justify-center px-2 lg:px-12 landscape:px-4 py-2 lg:py-0">
                
                {/* 
                   CASSETTE WRAPPER 
                   This container forces the aspect ratio of the cassette. 
                   It reserves space so the layout doesn't jump when empty.
                */}
                <div className="w-full relative mx-auto max-w-[500px] lg:max-w-full aspect-[1.58] bg-[#080808] rounded-lg shadow-[inset_0_2px_10px_rgba(0,0,0,1)] border border-white/5 overflow-hidden ring-1 ring-white/5">
                    {/* Inner Mover for Eject Animation */}
                    <div 
                        className="w-full h-full flex items-center justify-center transition-transform duration-700 ease-in-out"
                        style={{
                            transform: deckState === DeckState.EJECTING || deckState === DeckState.LOADING || deckState === DeckState.EMPTY
                                ? 'translateY(120%)' 
                                : 'translateY(0)'
                        }}
                    >
                         {(deckState !== DeckState.EMPTY) && currentTrack && (
                             <CassetteTape 
                                isPlaying={playbackState === PlaybackState.PLAYING && isPowered}
                                progress={progress}
                                coverUrl={currentTrack.coverUrl}
                                title={currentTrack.name}
                                artist={currentTrack.artist}
                                format={currentTrack.format}
                                qualityLabel={currentTrack.qualityLabel}
                                color={currentTrack.color}
                             />
                         )}
                    </div>
                </div>

                {/* Status Leds */}
                <div className="mt-4 lg:mt-8 landscape:mt-2 flex justify-center gap-6 lg:gap-8 shrink-0">
                    <StatusLed label="POWER" on={isPowered} color="bg-orange-500" />
                    <StatusLed label="RUN" on={playbackState === PlaybackState.PLAYING && isPowered} color="bg-green-500" />
                    <StatusLed label="REC" on={false} color="bg-red-500" />
                </div>

                {/* Mobile/Landscape Integrated Controls */}
                <div className="lg:hidden mt-4 landscape:mt-2 w-full flex justify-center shrink-0">
                     <DeckControls 
                        mobileLayout={true}
                        isPlaying={playbackState === PlaybackState.PLAYING}
                        onPlayPause={handlePlayPause}
                        onPrev={handlePrev}
                        onNext={handleNext}
                        onEject={handleEject}
                        isPowered={isPowered}
                        onTogglePower={() => setIsPowered(!isPowered)}
                        isTapeLoaded={deckState === DeckState.LOADED}
                        onLoad={() => handlePowerCheck(handleFilesSelect)}
                        onTogglePlaylist={() => handlePowerCheck(() => setShowPlaylist(!showPlaylist))}
                        playlistOpen={showPlaylist}
                     />
                </div>
            </div>
        </div>

        {/* --- RIGHT SECTION (LYRICS/DISPLAY) --- */}
        <div className="relative bg-[#050505] flex flex-col flex-1 min-h-0 border-l border-white/5 min-w-0">
            {/* Time Counter */}
            <div className="h-10 lg:h-16 landscape:h-8 border-b border-white/5 flex items-center justify-between px-6 landscape:px-3 bg-[#0a0a0a] shadow-md z-10 shrink-0">
                 <span className="text-zinc-700 font-mono text-[9px] lg:text-[10px] tracking-widest font-bold">COUNTER</span>
                 <span className={`text-2xl lg:text-4xl landscape:text-xl font-led tracking-widest ${isPowered ? 'text-orange-500 drop-shadow-[0_0_5px_rgba(249,115,22,0.5)]' : 'text-zinc-900'}`}>
                     {isPowered ? formatTime(currentTime) : '00:00'}
                 </span>
            </div>

            {/* Lyrics Area */}
            <div className="flex-1 relative min-h-0 bg-[#000]">
                <LyricsDisplay 
                    rawLyrics={currentTrack?.lyrics}
                    currentTime={currentTime}
                    isPowered={isPowered}
                />
            </div>
        </div>

        {/* --- BOTTOM CONTROLS (DESKTOP ONLY) --- */}
        <div className="hidden lg:block bg-[#18181b] border-t border-white/5 shrink-0 z-20 relative shadow-[0_-5px_30px_rgba(0,0,0,1)] pb-safe lg:col-span-2">
            <DeckControls 
                isPlaying={playbackState === PlaybackState.PLAYING}
                onPlayPause={handlePlayPause}
                onPrev={handlePrev}
                onNext={handleNext}
                onEject={handleEject}
                isPowered={isPowered}
                onTogglePower={() => setIsPowered(!isPowered)}
                isTapeLoaded={deckState === DeckState.LOADED}
                onLoad={() => handlePowerCheck(handleFilesSelect)}
                onTogglePlaylist={() => handlePowerCheck(() => setShowPlaylist(!showPlaylist))}
                playlistOpen={showPlaylist}
             />
        </div>

      </div>

      {/* Playlist Drawer */}
      <div className={`fixed inset-y-0 right-0 w-80 bg-[#121212] border-l border-zinc-800 transform transition-transform duration-300 z-50 shadow-2xl ${showPlaylist && isPowered ? 'translate-x-0' : 'translate-x-full'}`}>
         <div className="p-5 border-b border-zinc-800 flex justify-between items-center bg-[#0a0a0a]">
            <h2 className="text-orange-500 font-mono text-xs tracking-widest font-bold">TAPE LIBRARY</h2>
            <button onClick={() => setShowPlaylist(false)} className="text-zinc-500 hover:text-white transition-colors">✕</button>
         </div>
         <div className="h-full overflow-hidden p-2">
            <Playlist 
                tracks={tracks}
                currentTrackIndex={currentTrackIndex}
                onTrackSelect={(idx) => {
                    changeTrack(idx);
                }}
                onReorder={(newTracks) => {
                    setTracks(newTracks);
                    db.saveTracks(newTracks);
                }}
                onRemoveTrack={handleRemoveTrack}
            />
         </div>
      </div>

      <audio ref={audioRef} />
    </div>
  );
};

const StatusLed = ({ label, on, color }: { label: string, on: boolean, color: string }) => (
    <div className="flex flex-col items-center gap-1 lg:gap-2">
        <div className={`
            w-1.5 h-1.5 lg:w-2 lg:h-2 rounded-full transition-all duration-300 border border-black/50
            ${on ? color + ' shadow-[0_0_8px_currentColor] brightness-125 scale-110' : 'bg-zinc-900 shadow-inner'}
        `}></div>
        <span className="text-[7px] lg:text-[8px] landscape:text-[7px] font-mono text-zinc-500 font-bold tracking-widest">{label}</span>
    </div>
)

export default App;
