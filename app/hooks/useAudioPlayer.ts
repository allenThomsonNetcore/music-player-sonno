import { Audio } from 'expo-av';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Song } from '../types/music';
import { setupAudio } from '../utils/audioUtils';

export const useAudioPlayer = (playlist: Song[] = []) => {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [duration, setDuration] = useState<number>(0);
  const [position, setPosition] = useState<number>(0);
  const [onSongEnd, setOnSongEnd] = useState<(() => void) | null>(null);

  const timerIdRef = useRef<number | null>(null);
  const countdownRef = useRef<number | null>(null);
  const playlistRef = useRef<Song[]>(playlist);

  useEffect(() => {
    playlistRef.current = playlist;
  }, [playlist]);

  useEffect(() => {
    setupAudio();
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
      if (timerIdRef.current) clearTimeout(timerIdRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [sound]);

  const onPlaybackStatusUpdate = useCallback((status: any) => {
    if (status.isLoaded && status.durationMillis) {
      setProgress(status.positionMillis / status.durationMillis);
      setDuration(status.durationMillis);
      setPosition(status.positionMillis);
      setIsPlaying(status.isPlaying);
      if (status.didJustFinish && !status.isLooping && onSongEnd) {
        onSongEnd();
      }
    }
  }, [onSongEnd]);

  const playMusic = async (song: Song) => {
    try {
      if (sound) {
        await sound.unloadAsync();
      }
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: song.uri },
        { shouldPlay: true },
        onPlaybackStatusUpdate
      );
      setSound(newSound);
      setCurrentSong(song);
      setIsPlaying(true);
    } catch (error) {
      console.error('Error playing sound:', error);
      throw error;
    }
  };

  const pauseMusic = async () => {
    if (sound) {
      await sound.pauseAsync();
      setIsPlaying(false);
    }
  };

  const resumeMusic = async () => {
    if (sound) {
      await sound.playAsync();
      setIsPlaying(true);
    }
  };

  const stopMusic = async () => {
    try {
      if (sound) {
        await sound.stopAsync();
        setIsPlaying(false);
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

  const seekTo = async (millis: number) => {
    if (sound) {
      await sound.setPositionAsync(millis);
    }
  };

  const startTimer = async (minutes: number) => {
    // Only start timer after playback is confirmed started
    if (!isPlaying) return;
    const seconds = minutes * 60;
    setTimeRemaining(seconds);
    if (timerIdRef.current) clearTimeout(timerIdRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === null || prev <= 0) {
          if (countdownRef.current) clearInterval(countdownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    const millis = minutes * 60000;
    timerIdRef.current = setTimeout(() => {
      stopMusic();
    }, millis);
  };

  // Next/Previous
  const playNext = async () => {
    if (!playlistRef.current.length || !currentSong) return;
    const idx = playlistRef.current.findIndex(s => s.id === currentSong.id);
    if (idx >= 0 && idx < playlistRef.current.length - 1) {
      await playMusic(playlistRef.current[idx + 1]);
    }
  };
  const playPrevious = async () => {
    if (!playlistRef.current.length || !currentSong) return;
    const idx = playlistRef.current.findIndex(s => s.id === currentSong.id);
    if (idx > 0) {
      await playMusic(playlistRef.current[idx - 1]);
    }
  };

  return {
    currentSong,
    isPlaying,
    progress,
    timeRemaining,
    duration,
    position,
    playMusic,
    pauseMusic,
    resumeMusic,
    stopMusic,
    startTimer,
    seekTo,
    playNext,
    playPrevious,
    setOnSongEnd,
  };
}; 