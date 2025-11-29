import { openDB, DBSchema } from 'idb';
import { Track } from '../types';

interface RetroGrooveDB extends DBSchema {
  settings: {
    key: string;
    value: any;
  };
  tracks: {
    key: string;
    value: Track;
  };
}

const dbPromise = openDB<RetroGrooveDB>('retro-groove-db', 1, {
  upgrade(db) {
    db.createObjectStore('settings');
    db.createObjectStore('tracks', { keyPath: 'id' });
  },
});

export const saveSettings = async (key: string, value: any) => {
  return (await dbPromise).put('settings', value, key);
};

export const getSettings = async (key: string) => {
  return (await dbPromise).get('settings', key);
};

export const saveTracks = async (tracks: Track[]) => {
  const db = await dbPromise;
  const tx = db.transaction('tracks', 'readwrite');
  await Promise.all([
    ...tracks.map(track => tx.store.put(track)),
    tx.done
  ]);
};

export const getTracks = async (): Promise<Track[]> => {
  return (await dbPromise).getAll('tracks');
};

export const clearTracks = async () => {
  return (await dbPromise).clear('tracks');
};
