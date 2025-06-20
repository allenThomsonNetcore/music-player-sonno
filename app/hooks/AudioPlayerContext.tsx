import { Audio } from 'expo-av';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Song } from '../types/music';
import { setupAudio } from '../utils/audioUtils';
import { useMusic } from './MusicContext';

interface AudioPlayerContextType {
  currentSong: Song | null;
  isPlaying: boolean;
  progress: number;
  duration: number;
  position: number;
  timeRemaining: number | null;
  playMusic: (song: Song) => Promise<void>;
  pauseMusic: () => Promise<void>;
  resumeMusic: () => Promise<void>;
  stopMusic: () => Promise<void>;
  stopMusicWithoutClearingTimer: () => Promise<void>;
  seekTo: (millis: number) => Promise<void>;
  playNext: () => Promise<void>;
  playPrevious: () => Promise<void>;
  startTimer: (minutes: number) => Promise<void>;
  clearTimer: () => void;
  scheduledStopTime: Date | null;
  setScheduledStopTime: (date: Date | null) => void;
  songList: Song[];
  setSongList: (songs: Song[] | ((prev: Song[]) => Song[])) => void;
}

const AudioPlayerContext = createContext<AudioPlayerContextType | undefined>(undefined);

export const AudioPlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [scheduledStopTime, setScheduledStopTime] = useState<Date | null>(null);
  const [songList, setSongList] = useState<Song[]>([]);

  const timerIdRef = useRef<any>(null);
  const countdownRef = useRef<any>(null);
  const currentSongIdRef = useRef<string | null>(null);
  const songListRef = useRef<Song[]>(songList);
  const currentSongRef = useRef<Song | null>(currentSong);

  const { recentlyPlayed, setRecentlyPlayed } = useMusic();

  useEffect(() => { songListRef.current = songList; }, [songList]);
  useEffect(() => { currentSongRef.current = currentSong; }, [currentSong]);

  useEffect(() => {
    setupAudio();
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
      if (timerIdRef.current) clearTimeout(timerIdRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const playNextRef = useRef<() => Promise<void>>(async () => {});
  playNextRef.current = async () => {
    const list = songListRef.current;
    const song = currentSongRef.current;
    if (!list.length || !song) return;
    const idx = list.findIndex(s => s.id === song.id);
    if (idx >= 0 && idx < list.length - 1) {
      await playMusic(list[idx + 1]);
    }
  };

  const onPlaybackStatusUpdate = useCallback((status: any) => {
    if (status.isLoaded && status.durationMillis) {
      setProgress(status.positionMillis / status.durationMillis);
      setDuration(status.durationMillis);
      setPosition(status.positionMillis);
      setIsPlaying(status.isPlaying);
      if (
        status.didJustFinish &&
        !status.isLooping &&
        currentSongRef.current &&
        currentSongIdRef.current === currentSongRef.current.id
      ) {
        // Debug log
        console.log('Auto-advance: calling playNext');
        playNextRef.current();
      }
    }
  }, []);

  const playMusic = async (song: Song) => {
    try {
      // Debug log
      console.log('playMusic called for', song.title);
      if (sound) {
        await sound.unloadAsync();
        setSound(null);
        // Debug log
        console.log('Previous sound unloaded');
      }
      currentSongIdRef.current = song.id;
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: song.uri },
        { shouldPlay: true },
        onPlaybackStatusUpdate
      );
      setSound(newSound);
      setCurrentSong(song);
      setIsPlaying(true);
      
      // Update recently played (most recent first, no duplicates, max 20)
      setRecentlyPlayed((prev: Song[]) => {
        const filtered = prev.filter((s: Song) => s.id !== song.id);
        return [song, ...filtered].slice(0, 20);
      });
      // Start countdown if timer is set but not running
      if (timeRemaining !== null && timeRemaining > 0 && !countdownRef.current) {
        console.log('Starting countdown for existing timer:', timeRemaining);
        countdownRef.current = setInterval(() => {
          setTimeRemaining((prev) => {
            console.log('Timer countdown:', prev);
            if (prev === null || prev <= 0) {
              if (countdownRef.current) clearInterval(countdownRef.current);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }
      
      // Debug log
      console.log('New sound created and playing:', song.title);
    } catch (error) {
      console.error('Error playing sound:', error);
      throw error;
    }
  };

  const pauseMusic = async () => {
    if (sound) {
      await sound.pauseAsync();
      setIsPlaying(false);
      
      // Pause countdown when music is paused
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
    }
  };

  const resumeMusic = async () => {
    if (sound) {
      await sound.playAsync();
      setIsPlaying(true);
      
      // Resume countdown if timer is set
      if (timeRemaining !== null && timeRemaining > 0 && !countdownRef.current) {
        console.log('Resuming countdown for timer:', timeRemaining);
        countdownRef.current = setInterval(() => {
          setTimeRemaining((prev) => {
            console.log('Timer countdown:', prev);
            if (prev === null || prev <= 0) {
              if (countdownRef.current) clearInterval(countdownRef.current);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }
    }
  };

  const stopMusic = async () => {
    try {
      // Debug log
      console.log('stopMusic called');
      if (sound) {
        await sound.stopAsync();
        await sound.unloadAsync();
        setSound(null);
        setIsPlaying(false);
        // Debug log
        console.log('Sound stopped and unloaded');
      }
      if (timerIdRef.current) clearTimeout(timerIdRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
      setTimeRemaining(null);
      setProgress(0);
      setPosition(0);
    } catch (error) {
      console.error('Error stopping music:', error);
      throw error;
    }
  };

  const stopMusicWithoutClearingTimer = async () => {
    try {
      // Debug log
      console.log('stopMusicWithoutClearingTimer called');
      if (sound) {
        await sound.stopAsync();
        await sound.unloadAsync();
        setSound(null);
        setIsPlaying(false);
        // Debug log
        console.log('Sound stopped and unloaded');
      }
      // Don't clear timer state - preserve timeRemaining, progress, and position
      setProgress(0);
      setPosition(0);
    } catch (error) {
      console.error('Error stopping music without clearing timer:', error);
      throw error;
    }
  };

  const seekTo = async (millis: number) => {
    if (sound) {
      await sound.setPositionAsync(millis);
    }
  };

  const playPrevious = async () => {
    if (!songList.length || !currentSong) return;
    const idx = songList.findIndex(s => s.id === currentSong.id);
    if (idx > 0) {
      await playMusic(songList[idx - 1]);
    }
  };

  const startTimer = async (minutes: number) => {
    console.log('startTimer called with', minutes, 'minutes, isPlaying:', isPlaying);
    
    // Clear any existing scheduled stop time when starting countdown timer
    setScheduledStopTime(null);
    
    const seconds = minutes * 60;
    setTimeRemaining(seconds);
    if (timerIdRef.current) clearTimeout(timerIdRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    
    // Only start countdown if music is currently playing
    if (isPlaying) {
      countdownRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          console.log('Timer countdown:', prev);
          if (prev === null || prev <= 0) {
            if (countdownRef.current) clearInterval(countdownRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    
    const millis = minutes * 60000;
    timerIdRef.current = setTimeout(() => {
      console.log('Timer finished, fading out and stopping music');
      fadeOutAndStop();
    }, millis);
    console.log('Timer started for', minutes, 'minutes');
  };

  const clearTimer = () => {
    if (timerIdRef.current) clearTimeout(timerIdRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    setTimeRemaining(null);
    setScheduledStopTime(null);
    setProgress(0);
    setPosition(0);
  };

  // Smooth fade out and stop
  const fadeOutAndStop = async (fadeDuration = 1500) => {
    if (!sound) return;
    try {
      const steps = 15;
      const stepTime = fadeDuration / steps;
      let currentVolume = 1;
      for (let i = 0; i < steps; i++) {
        currentVolume = 1 - (i + 1) / steps;
        await sound.setVolumeAsync(Math.max(currentVolume, 0));
        await new Promise(res => setTimeout(res, stepTime));
      }
      await sound.stopAsync();
      await sound.unloadAsync();
      setSound(null);
      setIsPlaying(false);
      setProgress(0);
      setPosition(0);
      setTimeRemaining(null);
    } catch (error) {
      console.error('Error during fade out:', error);
      // Fallback to hard stop
      await stopMusic();
    }
  };

  // Scheduled stop logic
  useEffect(() => {
    if (!scheduledStopTime) return;
    
    const now = new Date();
    const timeUntilStop = scheduledStopTime.getTime() - now.getTime();
    
    console.log('Schedule time set for:', scheduledStopTime.toLocaleTimeString());
    console.log('Time until stop:', timeUntilStop, 'ms');
    
    if (timeUntilStop > 0) {
      const timeout = setTimeout(() => {
        console.log('Scheduled stop time reached, fading out and stopping music');
        fadeOutAndStop();
        setScheduledStopTime(null);
      }, timeUntilStop);
      return () => clearTimeout(timeout);
    } else {
      // If the scheduled time is in the past, clear it
      console.log('Scheduled time is in the past, clearing');
      setScheduledStopTime(null);
    }
  }, [scheduledStopTime]);

  return (
    <AudioPlayerContext.Provider
      value={{
        currentSong,
        isPlaying,
        progress,
        duration,
        position,
        timeRemaining,
        playMusic,
        pauseMusic,
        resumeMusic,
        stopMusic,
        stopMusicWithoutClearingTimer,
        seekTo,
        playNext: playNextRef.current,
        playPrevious,
        startTimer,
        clearTimer,
        scheduledStopTime,
        setScheduledStopTime,
        songList,
        setSongList,
      }}
    >
      {children}
    </AudioPlayerContext.Provider>
  );
};

export const useAudioPlayer = () => {
  const ctx = useContext(AudioPlayerContext);
  if (!ctx) throw new Error('useAudioPlayer must be used within AudioPlayerProvider');
  return ctx;
}; 