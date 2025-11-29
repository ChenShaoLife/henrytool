
import { Track } from '../types';
import { parseFlacTags, parseId3Tags } from './metadataParser';
import { CASSETTE_COLORS } from '../constants';

// Reusable audio context context to prevent lag
let uiAudioCtx: AudioContext | null = null;

const getAudioCtx = () => {
    if (!uiAudioCtx) {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContext) uiAudioCtx = new AudioContext();
    }
    if (uiAudioCtx && uiAudioCtx.state === 'suspended') {
        uiAudioCtx.resume();
    }
    return uiAudioCtx;
};

export const playClickSound = () => {
  requestAnimationFrame(() => {
    try {
        const ctx = getAudioCtx();
        if (ctx) {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.connect(gain);
            gain.connect(ctx.destination);

            const now = ctx.currentTime;
            osc.frequency.setValueAtTime(600, now);
            osc.frequency.exponentialRampToValueAtTime(100, now + 0.08);
            
            gain.gain.setValueAtTime(0.05, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

            osc.start(now);
            osc.stop(now + 0.08);
        }
    } catch (e) { /* Silent fail */ }
  });
};

export const playMechanicalSound = (type: 'eject' | 'insert') => {
    requestAnimationFrame(() => {
        try {
            const ctx = getAudioCtx();
            if (!ctx) return;
            const now = ctx.currentTime;
            
            const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
            const output = noiseBuffer.getChannelData(0);
            for (let i = 0; i < output.length; i++) {
                output[i] = Math.random() * 2 - 1;
            }

            const noise = ctx.createBufferSource();
            noise.buffer = noiseBuffer;
            const noiseGain = ctx.createGain();
            const filter = ctx.createBiquadFilter();

            noise.connect(filter);
            filter.connect(noiseGain);
            noiseGain.connect(ctx.destination);

            if (type === 'eject') {
                // Low "Ker-chunk"
                filter.type = 'lowpass';
                filter.frequency.setValueAtTime(500, now);
                filter.frequency.exponentialRampToValueAtTime(100, now + 0.4);
                noiseGain.gain.setValueAtTime(0.3, now);
                noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
                noise.start(now);
                noise.stop(now + 0.4);
            } else {
                // High "Click-Slide"
                filter.type = 'bandpass';
                filter.frequency.setValueAtTime(1000, now);
                noiseGain.gain.setValueAtTime(0.2, now);
                noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
                noise.start(now);
                noise.stop(now + 0.2);
            }
        } catch(e) { /* Silent fail */ }
    });
};

const getQualityLabel = (ext: string): string => {
    switch (ext) {
        case 'FLAC':
        case 'WAV':
        case 'AIFF':
            return 'LOSSLESS';
        case 'M4A':
        case 'AAC':
            return 'HIGH QUALITY';
        case 'MP3':
            return 'STEREO'; // Retro vibe
        default:
            return 'NORMAL BIAS';
    }
};

// Process FileList from <input type="file">
export const processFileList = async (fileList: FileList): Promise<Track[]> => {
  const files = Array.from(fileList);
  const tracks: Track[] = [];
  let globalCoverBlob: Blob | null = null;

  // 1. Find global cover art (Folder.jpg etc)
  const imageFiles = files.filter(f => f.type.startsWith('image/'));
  const coverFile = imageFiles.find(f => {
      const name = f.name.toLowerCase();
      return name.includes('front') || name.includes('cover') || name.includes('folder');
  }) || imageFiles[0];

  if (coverFile) {
      globalCoverBlob = coverFile;
  }
  
  const globalCoverUrl = globalCoverBlob ? URL.createObjectURL(globalCoverBlob) : undefined;

  // 2. Find Audio files
  const audioFiles = files.filter(f => {
      const name = f.name.toLowerCase();
      return name.endsWith('.mp3') || name.endsWith('.wav') || name.endsWith('.flac') || name.endsWith('.m4a') || f.type.startsWith('audio/');
  });
  
  for (const file of audioFiles) {
    let lyrics = undefined;
    let artist = 'Unknown Artist';
    
    // Parse metadata
    try {
        if (file.name.toLowerCase().endsWith('.flac')) {
            const tags = await parseFlacTags(file);
            if (tags.lyrics) lyrics = tags.lyrics;
            if (tags.artist) artist = tags.artist;
        } else if (file.name.toLowerCase().endsWith('.mp3')) {
            const tags = await parseId3Tags(file);
            if (tags.lyrics) lyrics = tags.lyrics;
        }
    } catch (e) {
        console.warn("Metadata parse failed for", file.name, e);
    }

    // Get Format
    const ext = file.name.split('.').pop()?.toUpperCase() || 'AUDIO';
    const qualityLabel = getQualityLabel(ext);
    
    // Assign Random Color
    const randomColor = CASSETTE_COLORS[Math.floor(Math.random() * CASSETTE_COLORS.length)];

    tracks.push({
      id: crypto.randomUUID(),
      name: file.name.replace(/\.[^/.]+$/, ""),
      file: file, 
      coverUrl: globalCoverUrl,
      artist: artist,
      lyrics: lyrics,
      duration: 0,
      format: ext,
      qualityLabel: qualityLabel,
      color: randomColor
    });
  }
  
  return tracks.sort((a, b) => a.name.localeCompare(b.name));
};

export const formatTime = (seconds: number) => {
  if (isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const parseLrc = (lrc?: string) => {
    if (!lrc) return [];
    const lines = lrc.split('\n');
    const result: { time: number, text: string }[] = [];
    const timeRegex = /\[(\d{2}):(\d{2})(\.(\d{2,3}))?\]/;
    
    for (const line of lines) {
        const match = timeRegex.exec(line);
        if (match) {
            const min = parseInt(match[1]);
            const sec = parseInt(match[2]);
            const ms = match[4] ? parseInt(match[4]) : 0;
            const time = min * 60 + sec + (ms / (match[4]?.length === 3 ? 1000 : 100));
            const text = line.replace(timeRegex, '').trim();
            if (text) result.push({ time, text });
        } else if (line.trim()) {
            result.push({ time: -1, text: line.trim() });
        }
    }
    return result;
};
