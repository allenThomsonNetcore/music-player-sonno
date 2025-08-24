import React, { createContext, useContext, useState } from 'react';

interface MusicPlayerHeightContextType {
  musicPlayerHeight: number;
  setMusicPlayerHeight: (height: number) => void;
  isTimerSectionVisible: boolean;
  setIsTimerSectionVisible: (visible: boolean) => void;
}

const MusicPlayerHeightContext = createContext<MusicPlayerHeightContextType | undefined>(undefined);

export const MusicPlayerHeightProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [musicPlayerHeight, setMusicPlayerHeight] = useState(120); // Default height
  const [isTimerSectionVisible, setIsTimerSectionVisible] = useState(false);

  return (
    <MusicPlayerHeightContext.Provider
      value={{
        musicPlayerHeight,
        setMusicPlayerHeight,
        isTimerSectionVisible,
        setIsTimerSectionVisible,
      }}
    >
      {children}
    </MusicPlayerHeightContext.Provider>
  );
};

export const useMusicPlayerHeight = () => {
  const context = useContext(MusicPlayerHeightContext);
  if (context === undefined) {
    throw new Error('useMusicPlayerHeight must be used within a MusicPlayerHeightProvider');
  }
  return context;
};
