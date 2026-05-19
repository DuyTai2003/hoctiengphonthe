'use client';

import { createContext, useContext, useRef, useCallback, useState, ReactNode } from 'react';

interface AudioContextType {
  play: (id: string, url: string) => Promise<HTMLAudioElement>;
  stop: (id: string) => void;
  stopAll: () => void;
  activeId: string | null;
}

const AudioContext = createContext<AudioContextType>({
  play: async () => { throw new Error('Not initialized'); },
  stop: () => {},
  stopAll: () => {},
  activeId: null,
});

export function AudioProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const [activeId, setActiveId] = useState<string | null>(null);

  const stopAll = useCallback(() => {
    audioRef.current.forEach((audio) => {
      audio.pause();
      audio.currentTime = 0;
    });
    audioRef.current.clear();
    setActiveId(null);
  }, []);

  const stop = useCallback((id: string) => {
    const audio = audioRef.current.get(id);
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      audioRef.current.delete(id);
      if (activeId === id) setActiveId(null);
    }
  }, [activeId]);

  const play = useCallback(async (id: string, url: string): Promise<HTMLAudioElement> => {
    // Dừng tất cả audio khác
    stopAll();

    const audio = new Audio(url);
    audioRef.current.set(id, audio);
    setActiveId(id);

    audio.onended = () => {
      audioRef.current.delete(id);
      setActiveId(null);
    };
    audio.onerror = () => {
      audioRef.current.delete(id);
      setActiveId(null);
    };

    await audio.play();
    return audio;
  }, [stopAll]);

  return (
    <AudioContext.Provider value={{ play, stop, stopAll, activeId }}>
      {children}
    </AudioContext.Provider>
  );
}

export function useAudio() {
  return useContext(AudioContext);
}
