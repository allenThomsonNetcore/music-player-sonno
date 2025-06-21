import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
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
  clearTimer: () => void;
  scheduledStopTime: Date | null;
  setScheduledStopTime: (date: Date | null) => void;
  songList: Song[];
  setSongList: (songs: Song[] | ((prev: Song[]) => Song[])) => void;
}

const AudioPlayerContext = createContext<AudioPlayerContextType | undefined>(undefined);

export const AudioPlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [scheduledStopTime, setScheduledStopTime] = useState<Date | null>(null);
  const [songList, setSongList] = useState<Song[]>([]);

  const timerIdRef = useRef<any>(null);
  const countdownRef = useRef<any>(null);
  const songListRef = useRef<Song[]>(songList);
  const currentSongRef = useRef<Song | null>(currentSong);
  const isSettingTrack = useRef(false);

  const { recentlyPlayed, setRecentlyPlayed } = useMusic();

  // TrackPlayer hooks
  const playbackState = usePlaybackState();
  const { position, duration } = useProgress(250);

  const pendingTimer = useRef<number | null>(null);

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

  // Fade out and stop for TrackPlayer
  const fadeOutAndStop = async (fadeDuration = 3000) => {
    try {
      const initialVolume = await TrackPlayer.getVolume();
      if (initialVolume === 0) return; // Already faded or fading

      const steps = 20;
      const stepTime = fadeDuration / steps;
      const volumeStep = initialVolume / steps;
      let currentVolume = initialVolume;

      for (let i = 0; i < steps; i++) {
        currentVolume -= volumeStep;
        if (currentVolume < 0) currentVolume = 0;
        await TrackPlayer.setVolume(currentVolume);
        await new Promise(res => setTimeout(res, stepTime));
      }
      await TrackPlayer.pause();
      await TrackPlayer.setVolume(initialVolume); // Restore volume for next play
    } catch (e) {
      await TrackPlayer.pause(); // Fallback to just pausing
    }
  };

  // Timer logic (updated)
  const fadeDuration = 3000; // 1 second

  const startCountdown = (minutes: number) => {
    if (timerIdRef.current) clearTimeout(timerIdRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);

    const millis = minutes * 60000;
    const endTime = Date.now() + millis;

    // Set up the interval to decrement the UI
    countdownRef.current = setInterval(() => {
      const remainingMillis = endTime - Date.now();
      setTimeRemaining(Math.ceil(remainingMillis / 1000));

      if (remainingMillis <= 0) {
        if (countdownRef.current) clearInterval(countdownRef.current);
        setTimeRemaining(0);
      }
    }, 1000);

    // Set up the timeout to actually stop the music
    timerIdRef.current = setTimeout(() => {
      fadeOutAndStop(fadeDuration);
    }, Math.max(0, millis - fadeDuration));
  };

  const startTimer = async (minutes: number) => {
    setScheduledStopTime(null);
    const seconds = minutes * 60;
    setTimeRemaining(seconds); // Set UI immediately

    if (isPlaying) {
      startCountdown(minutes);
    } else {
      // Save the pending timer if not playing yet
      pendingTimer.current = minutes;
    }
  };

  // Watch for playback start to trigger pending timer
  useEffect(() => {
    if (isPlaying && pendingTimer.current) {
      startCountdown(pendingTimer.current);
      pendingTimer.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying]);

  const clearTimer = () => {
    if (timerIdRef.current) clearTimeout(timerIdRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    setTimeRemaining(null);
    setScheduledStopTime(null);
    pendingTimer.current = null; // Clear any pending timer
  };

  // Handle app state changes to ensure timers work in background
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        // App came to foreground, check if any timers should have expired
        if (timeRemaining !== null && timeRemaining <= 0) {
          // Timer expired while app was in background
          fadeOutAndStop(fadeDuration);
          clearTimer();
        }
        
        if (scheduledStopTime) {
          const now = new Date();
          const timeUntilStop = scheduledStopTime.getTime() - now.getTime();
          if (timeUntilStop <= 0) {
            // Scheduled stop time passed while app was in background
            fadeOutAndStop(fadeDuration);
            setScheduledStopTime(null);
          }
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [timeRemaining, scheduledStopTime]);

  // Scheduled stop logic (updated)
  useEffect(() => {
    if (!scheduledStopTime) return;
    const now = new Date();
    const timeUntilStop = scheduledStopTime.getTime() - now.getTime();
    if (timeUntilStop > 0) {
      // Start fade-out before scheduled stop time so music stops exactly at scheduled time
      const fadeTimeout = setTimeout(() => {
        fadeOutAndStop(fadeDuration);
        setScheduledStopTime(null);
      }, Math.max(0, timeUntilStop - fadeDuration));
      return () => clearTimeout(fadeTimeout);
    } else {
      setScheduledStopTime(null);
    }
  }, [scheduledStopTime]);

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