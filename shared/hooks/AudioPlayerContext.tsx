import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus, PermissionsAndroid, Platform } from 'react-native';
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

// Timer mode enum
export enum TimerMode {
  COUNTDOWN = 'countdown',
  END_OF_SONG = 'end_of_song',
  SCHEDULED = 'scheduled'
}

interface AudioPlayerContextType {
  currentSong: Song | null;
  isPlaying: boolean;
  progress: number;
  duration: number;
  position: number;
  timeRemaining: number | null;
  timerMode: TimerMode | null;
  playMusic: (song: Song) => Promise<void>;
  pauseMusic: () => Promise<void>;
  resumeMusic: () => Promise<void>;
  stopMusic: () => Promise<void>;
  stopMusicWithoutClearingTimer: () => Promise<void>;
  seekTo: (millis: number) => Promise<void>;
  playNext: () => Promise<void>;
  playPrevious: () => Promise<void>;
  startTimer: (minutes: number) => Promise<void>;
  startEndOfSongTimer: () => Promise<void>;
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
  const [timerMode, setTimerMode] = useState<TimerMode | null>(null);
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
  const notificationPermissionRequested = useRef(false);

  // New refs for pause/resume functionality
  const timerPausedTime = useRef<number | null>(null); // When timer was paused
  const timerRemainingWhenPaused = useRef<number | null>(null); // Remaining time when paused

  const { recentlyPlayed, setRecentlyPlayed } = useMusic();

  // TrackPlayer hooks (reduced update frequency for better performance)
  const playbackState = usePlaybackState();
  const { position, duration } = useProgress(500); // Reduced from 250ms to 500ms

  const pendingTimer = useRef<number | null>(null);
  const lastPositionRef = useRef<number>(0);
  const songEndDetectedRef = useRef<boolean>(false);
  const endOfSongCheckInterval = useRef<any>(null);

  const isFadingOut = useRef(false);

  useEffect(() => { songListRef.current = songList; }, [songList]);
  useEffect(() => { currentSongRef.current = currentSong; }, [currentSong]);

  // Update isPlaying based on TrackPlayer state
  const isPlaying = (typeof playbackState === 'object' ? playbackState.state : playbackState) === TrackPlayerState.Playing;
  const progress = duration > 0 ? position / duration : 0;

  // Request notification permission when needed
  const requestNotificationPermission = async () => {
    if (notificationPermissionRequested.current) return;
    
    if (Platform.OS === 'android' && Platform.Version >= 33) {
      try {
        // Check if permission is already granted
        const hasPermission = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
        );
        
        if (hasPermission) {
          console.log('Notification permission already granted');
          notificationPermissionRequested.current = true;
          return;
        }
        
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
        );
        
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          console.log('Notification permission granted');
        } else {
          console.warn('Notification permission not granted!');
        }
        
        notificationPermissionRequested.current = true;
      } catch (e) {
        console.warn('Notification permission request error:', e);
        notificationPermissionRequested.current = true;
      }
    }
  };

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

  // Listen for multiple events to handle end-of-song timer
  useTrackPlayerEvents([Event.PlaybackQueueEnded, Event.PlaybackState], async (event) => {
    console.log('[END_OF_SONG] TrackPlayer event fired:', event.type);

    if (event.type === Event.PlaybackQueueEnded) {
      console.log('[END_OF_SONG] PlaybackQueueEnded event fired');

      // Check if we have an active end-of-song timer and haven't already detected end
      if (timerMode === TimerMode.END_OF_SONG && !songEndDetectedRef.current) {
        console.log('[END_OF_SONG] End-of-song timer active, stopping music via queue end event');
        songEndDetectedRef.current = true;
        await TrackPlayer.stop();
        clearTimer();
        stopBackgroundTimer();
      }
    }

    if (event.type === Event.PlaybackState) {
      console.log('[END_OF_SONG] PlaybackState changed to:', event.state);

      // Only handle Ended state, not loading/ready/playing transitions
      if (event.state === TrackPlayerState.Ended && timerMode === TimerMode.END_OF_SONG && !songEndDetectedRef.current) {
        console.log('[END_OF_SONG] Playback ended with end-of-song timer active, stopping music via state event');
        songEndDetectedRef.current = true;
        await TrackPlayer.stop();
        clearTimer();
        stopBackgroundTimer();
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

  // Track the current queue to avoid unnecessary rebuilds
  const currentQueueRef = useRef<string[]>([]);

  // Play a song (optimized to avoid unnecessary queue rebuilds)
  const playMusic = async (song: Song) => {
    // Request notification permission when user first plays music
    await requestNotificationPermission();

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
    songEndDetectedRef.current = false; // Reset end detection flag for new song

    // Clear any existing end-of-song check when starting new song
    if (endOfSongCheckInterval.current) {
      clearInterval(endOfSongCheckInterval.current);
      endOfSongCheckInterval.current = null;
    }

    isSettingTrack.current = true;
    try {
      const currentSongIds = songListRef.current.map(s => s.id);
      const queueNeedsUpdate = JSON.stringify(currentQueueRef.current) !== JSON.stringify(currentSongIds);

      if (queueNeedsUpdate) {
        console.log('Queue needs update, rebuilding...');
        // Only rebuild queue if the song list has changed
        await TrackPlayer.reset();
        await TrackPlayer.add(songListRef.current.map(s => ({
          id: s.id,
          url: s.uri,
          title: s.title,
          artist: '',
          duration: s.duration ? s.duration / 1000 : undefined,
        })));
        currentQueueRef.current = currentSongIds;
      }

      // Find and skip to the requested song
      const idx = songListRef.current.findIndex(s => s.id === song.id);
      if (idx >= 0) {
        const currentTrackIndex = await TrackPlayer.getCurrentTrack();
        if (currentTrackIndex !== idx) {
          console.log(`Skipping to track ${idx}`);
          await TrackPlayer.skip(idx);
        }
      }

      await TrackPlayer.play();

      // Persist last played song (async, don't await)
      AsyncStorage.setItem('lastPlayedSong', JSON.stringify(song));

      // Update recently played (optimized)
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
    // Pause countdown timer if it's active (but not scheduled timer)
    if (timerMode === TimerMode.COUNTDOWN && countdownRef.current) {
      pauseCountdownTimer();
    }
  };

  const resumeMusic = async () => {
    await TrackPlayer.play();
    // Resume countdown timer if it was paused (but not scheduled timer)
    if (timerMode === TimerMode.COUNTDOWN && timerRemainingWhenPaused.current !== null) {
      resumeCountdownTimer();
    }
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
      const currentTrackIndex = await TrackPlayer.getCurrentTrack();
      if (currentTrackIndex !== null && currentTrackIndex < songListRef.current.length - 1) {
        await TrackPlayer.skipToNext();
        // TrackPlayer automatically starts playing the next track
      }
    } catch (e) {
      console.log('No next track available');
    }
  };

  const playPrevious = async () => {
    try {
      const currentTrackIndex = await TrackPlayer.getCurrentTrack();
      if (currentTrackIndex !== null && currentTrackIndex > 0) {
        await TrackPlayer.skipToPrevious();
        // TrackPlayer automatically starts playing the previous track
      }
    } catch (e) {
      console.log('No previous track available');
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
    setTimerMode(TimerMode.COUNTDOWN);

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

  const startEndOfSongTimer = async () => {
    console.log('[END_OF_SONG] Starting end-of-song timer');
    console.log('[END_OF_SONG] Current state - isPlaying:', isPlaying, 'currentSong:', currentSong?.title, 'duration:', duration, 'position:', position);

    if (!isPlaying || !currentSong) {
      console.log('[END_OF_SONG] No music playing, cannot start end-of-song timer');
      return;
    }

    // Clear any existing timers
    clearTimer();

    // Reset detection flag
    songEndDetectedRef.current = false;

    // Set timer mode and display status
    setTimerMode(TimerMode.END_OF_SONG);
    setTimeRemaining(-1); // Special value to indicate end-of-song timer

    // Clear scheduled timers
    setScheduledStopTime(null);
    setIsScheduledStopActive(false);

    // Modify the TrackPlayer queue to only contain the current song
    // This prevents auto-advance to the next song
    await setupSingleSongQueue(currentSong);

    // Start periodic check for song end (more reliable than events)
    startEndOfSongCheck();

    console.log('[END_OF_SONG] End-of-song timer activated - will stop after current song');
    console.log('[END_OF_SONG] Song duration:', duration, 'current position:', position, 'remaining:', (duration - position) / 1000, 'seconds');
  };

  const setupSingleSongQueue = async (song: Song) => {
    console.log('[END_OF_SONG] Setting up single-song queue for:', song.title);
    try {
      // Get current position to preserve playback position
      const currentPosition = await TrackPlayer.getPosition();

      // Reset queue with only the current song
      await TrackPlayer.reset();
      await TrackPlayer.add({
        id: song.id,
        url: song.uri,
        title: song.title,
        artist: '',
        duration: song.duration ? song.duration / 1000 : undefined,
      });

      // Resume from the same position
      await TrackPlayer.seekTo(currentPosition);
      await TrackPlayer.play();

      console.log('[END_OF_SONG] Single-song queue setup complete, resumed at position:', currentPosition);
    } catch (error) {
      console.error('[END_OF_SONG] Error setting up single-song queue:', error);
    }
  };

  const startEndOfSongCheck = () => {
    // Clear any existing check
    if (endOfSongCheckInterval.current) {
      clearInterval(endOfSongCheckInterval.current);
    }

    console.log('[END_OF_SONG] Starting periodic end-of-song check');

    endOfSongCheckInterval.current = setInterval(async () => {
      if (timerMode !== TimerMode.END_OF_SONG || songEndDetectedRef.current) {
        console.log('[END_OF_SONG] Stopping periodic check - timer mode changed or already detected');
        clearInterval(endOfSongCheckInterval.current);
        endOfSongCheckInterval.current = null;
        return;
      }

      try {
        const currentState = await TrackPlayer.getState();
        const currentPosition = await TrackPlayer.getPosition();
        const currentDuration = await TrackPlayer.getDuration();

        console.log(`[END_OF_SONG] Check - State: ${currentState}, Position: ${currentPosition.toFixed(1)}s, Duration: ${currentDuration.toFixed(1)}s`);

        // Check if playback has stopped/ended
        if (currentState === TrackPlayerState.Stopped || currentState === TrackPlayerState.Ended) {
          console.log('[END_OF_SONG] Playback stopped/ended detected via periodic check');
          songEndDetectedRef.current = true;
          clearInterval(endOfSongCheckInterval.current);
          endOfSongCheckInterval.current = null;

          // Stop music and clear timer - song has ended naturally
          console.log('[END_OF_SONG] Song ended naturally, stopping playback');
          await TrackPlayer.stop();
          clearTimer();
          stopBackgroundTimer();
        }
        // Check if we're very close to the end (within 1 second and above 95% progress)
        else if (currentDuration > 0 && currentPosition > 0) {
          const remaining = currentDuration - currentPosition;
          const progress = currentPosition / currentDuration;

          if (remaining <= 1 && progress >= 0.95) {
            console.log('[END_OF_SONG] Very close to end detected via periodic check');
            songEndDetectedRef.current = true;
            clearInterval(endOfSongCheckInterval.current);
            endOfSongCheckInterval.current = null;

            // Wait for the remaining time plus a small buffer
            setTimeout(async () => {
              if (timerMode === TimerMode.END_OF_SONG) {
                console.log('[END_OF_SONG] Executing end-of-song timer after waiting for song to finish');
                await TrackPlayer.stop();
                clearTimer();
                stopBackgroundTimer();
              }
            }, (remaining * 1000) + 500); // Wait for remaining time + 0.5s buffer
          }
        }
      } catch (error) {
        console.error('[END_OF_SONG] Error in periodic check:', error);
      }
    }, 2000); // Check every 2 seconds (reduced from 1 second for better performance)
  };

  useEffect(() => {
    console.log(`[TIMER] useEffect triggered - isPlaying: ${isPlaying}, pendingTimer: ${pendingTimer.current}, pausedTimer: ${timerRemainingWhenPaused.current}`);

    if (isPlaying) {
      // Handle pending timer (when timer was set before music started)
      if (pendingTimer.current) {
        console.log(`[TIMER] Music started playing, executing pending timer for ${pendingTimer.current} minutes`);
        startBackgroundTimer(pendingTimer.current);
        pendingTimer.current = null;
      }
      // Handle resumed timer (when music was paused and now resumed)
      else if (timerMode === TimerMode.COUNTDOWN && timerRemainingWhenPaused.current !== null) {
        console.log(`[TIMER] Music resumed, resuming countdown timer`);
        resumeCountdownTimer();
      }
    }
  }, [isPlaying, timerMode]);

  // Monitor progress for end-of-song detection (fallback method) - DISABLED for now due to calculation issues
  useEffect(() => {
    if (timerMode === TimerMode.END_OF_SONG && duration > 0 && position >= 0) {
      const progressPercent = position / duration;
      const remainingMs = duration - position;
      const remainingSeconds = remainingMs / 1000;

      // Debug logging only - don't trigger based on progress for now
      if (progressPercent > 0.1) { // Only log after 10% to reduce spam
        console.log(`[END_OF_SONG] Progress: ${(progressPercent * 100).toFixed(1)}%, Position: ${(position/1000).toFixed(1)}s, Duration: ${(duration/1000).toFixed(1)}s, Remaining: ${remainingSeconds.toFixed(1)}s`);
      }

      // DISABLED: Progress-based detection due to calculation issues
      // Only rely on TrackPlayer events for now
      /*
      if (remainingSeconds <= 1 && progressPercent >= 0.95 && !songEndDetectedRef.current && isPlaying) {
        console.log('[END_OF_SONG] Song ending detected via progress monitoring - very close to end');
        songEndDetectedRef.current = true;

        setTimeout(async () => {
          if (timerMode === TimerMode.END_OF_SONG) {
            console.log('[END_OF_SONG] Executing end-of-song timer via progress detection');
            await forceStopMusic();
            clearTimer();
            stopBackgroundTimer();
          }
        }, Math.max(200, remainingMs - 200));
      }
      */
    }

    // Reset detection flag when song changes or timer is cleared
    if (timerMode !== TimerMode.END_OF_SONG) {
      songEndDetectedRef.current = false;
    }
  }, [position, duration, timerMode, isPlaying]);

  const pauseCountdownTimer = () => {
    if (timerMode !== TimerMode.COUNTDOWN || !countdownRef.current) return;

    console.log('[COUNTDOWN_TIMER] Pausing countdown timer');

    // Store the current remaining time
    if (timerEndTime.current) {
      const remainingMillis = timerEndTime.current - Date.now();
      timerRemainingWhenPaused.current = Math.max(0, remainingMillis);
      timerPausedTime.current = Date.now();
      console.log(`[COUNTDOWN_TIMER] Paused with ${Math.ceil(timerRemainingWhenPaused.current / 1000)}s remaining`);
    }

    // Clear the active countdown interval
    if (countdownRef.current) {
      BackgroundTimer.clearInterval(countdownRef.current);
      countdownRef.current = null;
    }

    // Clear the main timer
    if (timerIdRef.current) {
      BackgroundTimer.clearTimeout(timerIdRef.current);
      timerIdRef.current = null;
    }
  };

  const resumeCountdownTimer = () => {
    if (timerMode !== TimerMode.COUNTDOWN || timerRemainingWhenPaused.current === null) return;

    console.log('[COUNTDOWN_TIMER] Resuming countdown timer');

    const remainingMillis = timerRemainingWhenPaused.current;
    const remainingSeconds = Math.ceil(remainingMillis / 1000);

    console.log(`[COUNTDOWN_TIMER] Resuming with ${remainingSeconds}s remaining`);

    // Update the end time based on remaining time
    timerEndTime.current = Date.now() + remainingMillis;

    // Clear the paused state
    timerRemainingWhenPaused.current = null;
    timerPausedTime.current = null;

    // Start background timer support if not already started
    if (!backgroundTimerStarted.current) {
      BackgroundTimer.start();
      backgroundTimerStarted.current = true;
    }

    // Restart the countdown interval
    countdownRef.current = BackgroundTimer.setInterval(() => {
      const currentRemainingMillis = timerEndTime.current! - Date.now();
      const currentRemainingSeconds = Math.ceil(currentRemainingMillis / 1000);

      console.log(`[COUNTDOWN_TIMER] Resumed countdown: ${currentRemainingSeconds}s remaining`);
      setTimeRemaining(currentRemainingSeconds > 0 ? currentRemainingSeconds : 0);

      if (currentRemainingMillis <= 0) {
        console.log('[COUNTDOWN_TIMER] Resumed timer finished - force stopping music');
        BackgroundTimer.clearInterval(countdownRef.current);
        countdownRef.current = null;
        forceStopMusic().then(() => {
          console.log('[COUNTDOWN_TIMER] Force stop completed, clearing timer state');
          clearTimer();
          stopBackgroundTimer();
        });
      }
    }, 1000);

    // Set up the main timer for the remaining time
    timerIdRef.current = BackgroundTimer.setTimeout(() => {
      console.log('[COUNTDOWN_TIMER] Resumed main timer fired - force stopping music');
      if (countdownRef.current) {
        BackgroundTimer.clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
      forceStopMusic().then(() => {
        console.log('[COUNTDOWN_TIMER] Force stop completed, clearing timer state');
        clearTimer();
        stopBackgroundTimer();
      });
    }, remainingMillis);
  };

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

    // Clear end-of-song check interval
    if (endOfSongCheckInterval.current) {
      console.log('[TIMER] Clearing end-of-song check interval');
      clearInterval(endOfSongCheckInterval.current);
      endOfSongCheckInterval.current = null;
    }

    // Clear paused timer state
    timerRemainingWhenPaused.current = null;
    timerPausedTime.current = null;

    // Only stop background timer if we're not fading out
    if (backgroundTimerStarted.current && !isFadingOut.current) {
      stopBackgroundTimer();
    }

    setTimeRemaining(null);
    setTimerMode(null);
    if (clearScheduled) {
      setScheduledStopTime(null);
      setIsScheduledStopActive(false);
    }
    pendingTimer.current = null;
    timerEndTime.current = null;
    songEndDetectedRef.current = false;

    // Don't automatically restore queue when user manually clears timer
    // Queue will be restored when user plays a new song normally
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
      setTimerMode(TimerMode.SCHEDULED);
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
        timerMode,
        playMusic,
        pauseMusic,
        resumeMusic,
        stopMusic,
        stopMusicWithoutClearingTimer,
        seekTo,
        playNext,
        playPrevious,
        startTimer,
        startEndOfSongTimer,
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