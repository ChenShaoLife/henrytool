
import React, { useEffect, useRef, useState } from 'react';
import { Track } from '../types';
import { Music, Disc, Clock, GripVertical, Trash2 } from 'lucide-react';
import { formatTime } from '../utils/audioHelpers';

interface PlaylistProps {
  tracks: Track[];
  currentTrackIndex: number;
  onTrackSelect: (index: number) => void;
  onReorder: (newTracks: Track[]) => void;
  onRemoveTrack: (index: number) => void;
}

const Playlist: React.FC<PlaylistProps> = ({ tracks, currentTrackIndex, onTrackSelect, onReorder, onRemoveTrack }) => {
  const activeRef = useRef<HTMLDivElement>(null);
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (activeRef.current) {
      activeRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentTrackIndex]);

  // Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, position: number) => {
    dragItem.current = position;
  };

  const handleDragEnter = (e: React.DragEvent, position: number) => {
    dragOverItem.current = position;
  };

  const handleDragEnd = () => {
    if (dragItem.current === null || dragOverItem.current === null) return;
    
    const copyList = [...tracks];
    const dragItemContent = copyList[dragItem.current];
    copyList.splice(dragItem.current, 1);
    copyList.splice(dragOverItem.current, 0, dragItemContent);
    
    dragItem.current = null;
    dragOverItem.current = null;
    onReorder(copyList);
  };

  // Remove Logic
  const handleContextMenu = (e: React.MouseEvent, index: number) => {
      e.preventDefault();
      if (window.confirm(`Remove "${tracks[index].name}" from playlist?`)) {
          onRemoveTrack(index);
      }
  };

  const handleTouchStart = (index: number) => {
      longPressTimer.current = setTimeout(() => {
          if (window.confirm(`Remove "${tracks[index].name}" from playlist?`)) {
              onRemoveTrack(index);
          }
      }, 800);
  };

  const handleTouchEnd = () => {
      if (longPressTimer.current) {
          clearTimeout(longPressTimer.current);
          longPressTimer.current = null;
      }
  };

  if (tracks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-zinc-500 p-8 text-center border-2 border-dashed border-zinc-700 rounded-xl bg-zinc-900/50">
        <Disc size={48} className="mb-4 opacity-50" />
        <p className="text-lg font-retro mb-2">No Records Found</p>
        <p className="text-sm">Click the folder button to load your collection.</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto pr-2 select-none">
      <h2 className="text-zinc-400 text-xs font-bold uppercase tracking-widest mb-4 sticky top-0 bg-zinc-900/95 py-2 backdrop-blur-sm z-10 flex justify-between">
        <span>Collection ({tracks.length})</span>
        <span className="text-[10px] opacity-50">LONG PRESS TO REMOVE</span>
      </h2>
      <div className="space-y-1">
        {tracks.map((track, index) => {
          const isActive = index === currentTrackIndex;
          return (
            <div
              key={track.id}
              ref={isActive ? activeRef : null}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragEnter={(e) => handleDragEnter(e, index)}
              onDragEnd={handleDragEnd}
              onClick={() => onTrackSelect(index)}
              onContextMenu={(e) => handleContextMenu(e, index)}
              onTouchStart={() => handleTouchStart(index)}
              onTouchEnd={handleTouchEnd}
              className={`
                group flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all duration-200
                ${isActive ? 'bg-amber-900/40 border border-amber-800/50' : 'hover:bg-zinc-800 border border-transparent'}
              `}
            >
              {/* Drag Handle */}
              <div className="text-zinc-600 cursor-grab active:cursor-grabbing hover:text-zinc-400">
                  <GripVertical size={14} />
              </div>

              <div className={`
                w-10 h-10 rounded shadow-md flex items-center justify-center text-zinc-500 overflow-hidden bg-zinc-900 shrink-0
                ${isActive ? 'animate-pulse' : ''}
              `}>
                {track.coverUrl ? (
                    <img src={track.coverUrl} className="w-full h-full object-cover" alt="art" />
                ) : (
                    <Music size={18} />
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <p className={`font-medium truncate ${isActive ? 'text-amber-400' : 'text-zinc-300'}`}>
                  {track.name}
                </p>
                <div className="flex justify-between items-center pr-2">
                    <p className="text-xs text-zinc-500 truncate">{track.artist || 'Unknown'}</p>
                    {track.duration ? (
                        <p className="text-[10px] text-zinc-600 font-mono flex items-center gap-1">
                            <Clock size={8} /> {formatTime(track.duration)}
                        </p>
                    ) : null}
                </div>
              </div>

              {isActive && (
                <div className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]"></div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Playlist;
