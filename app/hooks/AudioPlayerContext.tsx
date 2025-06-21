import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import BackgroundTimer from 'react-native-background-timer';
import TrackPlayer, {
  Event,
  State as TrackPlayerState,
  usePlaybackState,
  useProgress,
  useTrackPlayerEvents
} from 'react-native-track-player';
import { Song } from '../types/music';
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
  clearTimer: (clearScheduled?: boolean) => void;
  scheduledStopTime: Date | null;
  setScheduledStopTime: (date: Date | null) => void;
  activateScheduledStop: () => void;
  songList: Song[];
  setSongList: (songs: Song[] | ((prev: Song[]) => Song[])) => void;
  testBackgroundTimer: () => void;
}

const AudioPlayerContext = createContext<AudioPlayerContextType | undefined>(undefined);

export const AudioPlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [scheduledStopTime, setScheduledStopTime] = useState<Date | null>(null);
  const [songList, setSongList] = useState<Song[]>([]);
  const [isScheduledStopActive, setIsScheduledStopActive] = useState(false);

  const timerIdRef = useRef<any>(null);
  const countdownRef = useRef<any>(null);
  const songListRef = useRef<Song[]>(songList);
  const currentSongRef = useRef<Song | null>(currentSong);
  const isSettingTrack = useRef(false);
  const backgroundTimerStarted = useRef(false);
  const timerEndTime = useRef<number | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  const { recentlyPlayed, setRecentlyPlayed } = useMusic();

  // TrackPlayer hooks
  const playbackState = usePlaybackState();
  const { position, duration } = useProgress(250);

  const pendingTimer = useRef<number | null>(null);

  const isFadingOut = useRef(false);

  useEffect(() => { songListRef.current = songList; }, [songList]);
  useEffect(() => { currentSongRef.current = currentSong; }, [currentSong]);

  // Update isPlaying based on TrackPlayer state
  const isPlaying = (typeof playbackState === 'object' ? playbackState.state : playbackState) === TrackPlayerState.Playing;
  const progress = duration > 0 ? position / duration : 0;

  // Listen for track change events to update currentSong
  useTrackPlayerEvents([Event.PlaybackTrackChanged], async (event) => {
    if (isSettingTrack.current) return;

    if (event.type === Event.PlaybackTrackChanged && event.nextTrack != null) {
      const track = await TrackPlayer.getTrack(event.nextTrack);
      if (track && track.id) {
        const song = songListRef.current.find(s => s.id === track.id);
        if (song && song.id !== currentSongRef.current?.id) {
          setCurrentSong(song);
        }
      }
    }
  });

  // Handle app state changes for background timer
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      console.log(`[APP_STATE] App state changed from ${appStateRef.current} to ${nextAppState}`);
      
      if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
        // App came to foreground
        console.log('[APP_STATE] App came to foreground');
        if (timerEndTime.current) {
          const remainingTime = Math.max(0, timerEndTime.current - Date.now());
          const remainingSeconds = Math.ceil(remainingTime / 1000);
          console.log(`[APP_STATE] Updating timer remaining: ${remainingSeconds}s`);
          setTimeRemaining(remainingSeconds > 0 ? remainingSeconds : 0);
          
          if (remainingTime <= 0) {
            console.log('[APP_STATE] Timer expired while in background');
            clearTimer();
          }
        }
      } else if (nextAppState.match(/inactive|background/)) {
        // App went to background
        console.log('[APP_STATE] App went to background');
      }
      
      appStateRef.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, []);

  // On mount, restore last played song
  useEffect(() => {
    AsyncStorage.getItem('lastPlayedSong').then(data => {
      if (data) {
        setCurrentSong(JSON.parse(data));
      }
    });
  }, []);

  // Play a song (replace queue with songList, skip to selected song)
  const playMusic = async (song: Song) => {
    const playbackState = await TrackPlayer.getState();
    if (
      (playbackState === TrackPlayerState.Paused || playbackState === TrackPlayerState.Ready) &&
      currentSong?.id === song.id
    ) {
      await TrackPlayer.play();
      return;
    }

    console.log('TrackPlayer.playMusic called for', song.title);
    setCurrentSong(song); // Optimistically update UI
    isSettingTrack.current = true;
    try {
      // Replace queue with current songList
      await TrackPlayer.reset();
      await TrackPlayer.add(songListRef.current.map(s => ({
        id: s.id,
        url: s.uri,
        title: s.title,
        artist: '',
        duration: s.duration ? s.duration / 1000 : undefined,
      })));
      const idx = songListRef.current.findIndex(s => s.id === song.id);
      if (idx >= 0) {
        await TrackPlayer.skip(idx);
      }
      await TrackPlayer.play();

      // Persist last played song
      AsyncStorage.setItem('lastPlayedSong', JSON.stringify(song));
      // Update recently played
      setRecentlyPlayed((prev: Song[]) => {
        const filtered = prev.filter((s: Song) => s.id !== song.id);
        return [song, ...filtered].slice(0, 20);
      });
    } catch (error) {
      console.error('Error playing song:', error);
      throw error;
    } finally {
      isSettingTrack.current = false;
    }
  };

  const pauseMusic = async () => {
    await TrackPlayer.pause();
  };

  const resumeMusic = async () => {
    await TrackPlayer.play();
  };

  const stopMusic = async () => {
    await TrackPlayer.stop();
    setCurrentSong(null);
  };

  const stopMusicWithoutClearingTimer = async () => {
    await TrackPlayer.stop();
  };

  const seekTo = async (millis: number) => {
    await TrackPlayer.seekTo(millis / 1000);
  };

  const playNext = async () => {
    try {
      await TrackPlayer.skipToNext();
      await TrackPlayer.play();
    } catch (e) {
      // No next track
    }
  };

  const playPrevious = async () => {
    try {
      await TrackPlayer.skipToPrevious();
      await TrackPlayer.play();
    } catch (e) {
      // No previous track
    }
  };

  // Fade out and pause for TrackPlayer (preserves position)
  const fadeOutAndPause = async (fadeDuration = 3000) => {
    console.log(`[FADE] Starting fade out over ${fadeDuration}ms`);
    isFadingOut.current = true;
    
    try {
      // Ensure background timer is started for reliable execution
      if (!backgroundTimerStarted.current) {
        BackgroundTimer.start();
        backgroundTimerStarted.current = true;
        console.log('[FADE] Background timer started for fade-out');
      }
      
      const initialVolume = await TrackPlayer.getVolume();
      console.log(`[FADE] Initial volume: ${initialVolume}`);
      if (initialVolume === 0) {
        console.log('[FADE] Volume already 0, just pausing');
        await TrackPlayer.pause();
        isFadingOut.current = false;
        return;
      }

      const steps = 20;
      const stepTime = fadeDuration / steps;
      const volumeStep = initialVolume / steps;
      let currentVolume = initialVolume;
      console.log(`[FADE] Fade steps: ${steps}, step time: ${stepTime}ms, volume step: ${volumeStep}`);

      // Use BackgroundTimer for reliable background execution
      for (let i = 0; i < steps; i++) {
        currentVolume -= volumeStep;
        if (currentVolume < 0) currentVolume = 0;
        await TrackPlayer.setVolume(currentVolume);
        console.log(`[FADE] Step ${i + 1}/${steps}: volume = ${currentVolume.toFixed(3)}`);
        
        // Use BackgroundTimer.setTimeout instead of regular setTimeout
        await new Promise<void>(res => {
          BackgroundTimer.setTimeout(() => res(), stepTime);
        });
      }
      console.log('[FADE] Fade complete, pausing and restoring volume');
      await TrackPlayer.pause();
      await TrackPlayer.setVolume(initialVolume); // Restore volume for next play
      console.log(`[FADE] Volume restored to ${initialVolume}`);
    } catch (e) {
      console.error('[FADE] Error during fade out:', e);
      await TrackPlayer.pause(); // Fallback to just pausing
    } finally {
      isFadingOut.current = false;
      console.log('[FADE] Fade out process completed');
    }
  };

  // Force stop music immediately (more reliable than fade out)
  const forceStopMusic = async () => {
    console.log('[FORCE_STOP] Force stopping music');
    isFadingOut.current = true;
    
    try {
      // Use fade out instead of immediate pause for better UX
      await fadeOutAndPause(3000);
      console.log('[FORCE_STOP] Music faded out and paused successfully');
      
    } catch (e) {
      console.error('[FORCE_STOP] Error during fade out:', e);
      // Try pause as fallback
      try {
        await TrackPlayer.pause();
        console.log('[FORCE_STOP] Music paused as fallback');
      } catch (pauseError) {
        console.error('[FORCE_STOP] Even pause failed:', pauseError);
      }
    } finally {
      isFadingOut.current = false;
      console.log('[FORCE_STOP] Force stop process completed');
    }
  };

  // Fixed background timer implementation
  const startBackgroundTimer = (minutes: number) => {
    console.log(`[BACKGROUND_TIMER] Starting background timer for ${minutes} minutes`);
    
    // Check if music is actually playing
    if (!isPlaying) {
      console.log('[BACKGROUND_TIMER] Music not playing, storing as pending timer');
      pendingTimer.current = minutes;
      return;
    }
    
    // Clear existing timers but preserve the timeRemaining state
    if (timerIdRef.current) {
      console.log('[BACKGROUND_TIMER] Clearing existing main timer');
      BackgroundTimer.clearTimeout(timerIdRef.current);
      timerIdRef.current = null;
    }
    
    if (countdownRef.current) {
      console.log('[BACKGROUND_TIMER] Clearing existing countdown interval');
      BackgroundTimer.clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    
    // Only stop background timer if we're not fading out
    if (backgroundTimerStarted.current && !isFadingOut.current) {
      stopBackgroundTimer();
    }
    
    // Clear scheduled timers but keep timeRemaining
    setScheduledStopTime(null);
    setIsScheduledStopActive(false);
    pendingTimer.current = null;
    timerEndTime.current = null;
    
    const totalMillis = minutes * 60 * 1000;
    const endTime = Date.now() + totalMillis;
    timerEndTime.current = endTime;
    
    console.log(`[BACKGROUND_TIMER] Timer will end at ${new Date(endTime).toLocaleTimeString()}`);
    
    // Start background timer support
    if (!backgroundTimerStarted.current) {
      BackgroundTimer.start();
      backgroundTimerStarted.current = true;
      console.log('[BACKGROUND_TIMER] Background timer started');
    }
    
    // Set up countdown using BackgroundTimer.setInterval for consistency
    countdownRef.current = BackgroundTimer.setInterval(() => {
      const remainingMillis = timerEndTime.current! - Date.now();
      const remainingSeconds = Math.ceil(remainingMillis / 1000);
      
      console.log(`[BACKGROUND_TIMER] Countdown: ${remainingSeconds}s remaining`);
      setTimeRemaining(remainingSeconds > 0 ? remainingSeconds : 0);
      
      if (remainingMillis <= 0) {
        console.log('[BACKGROUND_TIMER] Timer finished - force stopping music');
        BackgroundTimer.clearInterval(countdownRef.current);
        countdownRef.current = null;
        // Force stop the music immediately
        forceStopMusic().then(() => {
          console.log('[BACKGROUND_TIMER] Force stop completed, clearing timer state');
          clearTimer();
          stopBackgroundTimer();
        });
      }
    }, 1000);
    
    // Set up the main timer to trigger force stop (backup)
    timerIdRef.current = BackgroundTimer.setTimeout(() => {
      console.log('[BACKGROUND_TIMER] Main timer fired - force stopping music');
      if (countdownRef.current) {
        BackgroundTimer.clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
      // Force stop the music immediately
      forceStopMusic().then(() => {
        console.log('[BACKGROUND_TIMER] Force stop completed, clearing timer state');
        clearTimer();
        stopBackgroundTimer();
      });
    }, totalMillis);
    
    console.log(`[BACKGROUND_TIMER] Main timer set for ${totalMillis}ms`);
  };

  const startTimer = async (minutes: number) => {
    console.log(`[TIMER] startTimer called with ${minutes} minutes`);
    const seconds = minutes * 60;
    setTimeRemaining(seconds);

    if (isPlaying) {
      console.log('[TIMER] Music is playing, starting background timer immediately');
      // Clear scheduled timers when starting a countdown timer
      setScheduledStopTime(null);
      setIsScheduledStopActive(false);
      startBackgroundTimer(minutes);
    } else {
      console.log(`[TIMER] Music not playing, storing pending timer for ${minutes} minutes`);
      pendingTimer.current = minutes;
      // Don't clear existing timers, just store the pending timer
    }
  };

  useEffect(() => {
    console.log(`[TIMER] useEffect triggered - isPlaying: ${isPlaying}, pendingTimer: ${pendingTimer.current}`);
    if (isPlaying && pendingTimer.current) {
      console.log(`[TIMER] Music started playing, executing pending timer for ${pendingTimer.current} minutes`);
      startBackgroundTimer(pendingTimer.current);
      pendingTimer.current = null;
    }
  }, [isPlaying]);

  const stopBackgroundTimer = () => {
    if (backgroundTimerStarted.current) {
      console.log('[TIMER] Stopping background timer');
      BackgroundTimer.stop();
      backgroundTimerStarted.current = false;
    }
  };

  const clearTimer = (clearScheduled = true) => {
    console.log('[TIMER] Clearing all timers');
    
    if (timerIdRef.current) {
      console.log('[TIMER] Clearing main background timer');
      BackgroundTimer.clearTimeout(timerIdRef.current);
      timerIdRef.current = null;
    }
    
    if (countdownRef.current) {
      console.log('[TIMER] Clearing countdown interval');
      BackgroundTimer.clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    
    // Only stop background timer if we're not fading out
    if (backgroundTimerStarted.current && !isFadingOut.current) {
      stopBackgroundTimer();
    }
    
    setTimeRemaining(null);
    if (clearScheduled) {
      setScheduledStopTime(null);
      setIsScheduledStopActive(false);
    }
    pendingTimer.current = null;
    timerEndTime.current = null;
  };

  // Handle scheduled stop time
  useEffect(() => {
    if (!scheduledStopTime || !isScheduledStopActive) return;
    
    console.log(`[SCHEDULED] Scheduled stop time set for ${scheduledStopTime.toLocaleTimeString()}`);
    const timeUntilStop = scheduledStopTime.getTime() - Date.now();
    
    if (timeUntilStop > 0) {
      console.log(`[SCHEDULED] Time until stop: ${Math.ceil(timeUntilStop / 1000)}s`);
      timerEndTime.current = scheduledStopTime.getTime();
      
      // Start background timer support if not already started
      if (!backgroundTimerStarted.current) {
        BackgroundTimer.start();
        backgroundTimerStarted.current = true;
        console.log('[SCHEDULED] Background timer started for scheduled stop');
      }
      
      // Set up countdown
      countdownRef.current = BackgroundTimer.setInterval(() => {
        const remainingMillis = timerEndTime.current! - Date.now();
        const remainingSeconds = Math.ceil(remainingMillis / 1000);
        
        setTimeRemaining(remainingSeconds > 0 ? remainingSeconds : 0);
        
        if (remainingMillis <= 0) {
          console.log('[SCHEDULED] Scheduled stop time reached');
          BackgroundTimer.clearInterval(countdownRef.current);
          countdownRef.current = null;
          forceStopMusic().then(() => {
            console.log('[SCHEDULED] Force stop completed, clearing timer state');
            clearTimer();
            stopBackgroundTimer();
          });
        }
      }, 1000);
      
      const fadeTimeout = BackgroundTimer.setTimeout(() => {
        console.log('[SCHEDULED] Scheduled stop timer fired - starting force stop');
        forceStopMusic().then(() => {
          console.log('[SCHEDULED] Force stop completed, clearing timer state');
          clearTimer();
          stopBackgroundTimer();
        });
      }, timeUntilStop);
      
      return () => {
        console.log('[SCHEDULED] Clearing scheduled stop timer');
        BackgroundTimer.clearTimeout(fadeTimeout);
      };
    } else {
      console.log('[SCHEDULED] Scheduled stop time has already passed');
      clearTimer();
    }
  }, [scheduledStopTime, isScheduledStopActive]);

  // Function to activate scheduled stop
  const activateScheduledStop = () => {
    if (scheduledStopTime) {
      console.log('[SCHEDULED] Activating scheduled stop');
      setIsScheduledStopActive(true);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log('[CLEANUP] Cleaning up timers on unmount');
      clearTimer();
    };
  }, []);

  const testBackgroundTimer = () => {
    console.log('[TEST] Testing background timer with 5 second timer');
    if (isPlaying) {
      // Set a 5 second timer for testing
      startBackgroundTimer(1/12); // 5 seconds
    } else {
      console.log('[TEST] Music not playing, cannot test timer');
    }
  };

  return (
    <AudioPlayerContext.Provider
      value={{
        currentSong,
        isPlaying,
        progress,
        duration: duration * 1000, // convert to ms
        position: position * 1000, // convert to ms
        timeRemaining,
        playMusic,
        pauseMusic,
        resumeMusic,
        stopMusic,
        stopMusicWithoutClearingTimer,
        seekTo,
        playNext,
        playPrevious,
        startTimer,
        clearTimer,
        scheduledStopTime,
        setScheduledStopTime,
        activateScheduledStop,
        songList,
        setSongList,
        testBackgroundTimer,
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