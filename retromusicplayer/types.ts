
export interface Track {
  id: string;
  name: string;
  artist?: string;
  album?: string;
  fileHandle?: FileSystemFileHandle;
  file?: File; 
  coverUrl?: string; 
  duration?: number;
  lyrics?: string; 
  format?: string;
  qualityLabel?: string;
  color?: string;
}

export interface FolderData {
  handle: FileSystemDirectoryHandle;
  name: string;
}

export enum PlaybackState {
  STOPPED = 'STOPPED',
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
}

export enum DeckState {
  EMPTY = 'EMPTY',
  LOADING = 'LOADING',
  LOADED = 'LOADED',
  EJECTING = 'EJECTING'
}

export interface PlayerState {
  volume: number;
  currentTrackIndex: number;
  playbackState: PlaybackState;
  currentTime: number;
  duration: number;
  isShuffling: boolean;
  isRepeating: boolean;
  tracks: Track[];
  directoryName?: string;
}

export type Theme = 'wood' | 'black' | 'white';
