import AsyncStorage from '@react-native-async-storage/async-storage';
import * as MediaLibrary from 'expo-media-library';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';
import { Song } from '../types/music';

export interface Playlist {
  id: string;
  name: string;
  songIds: string[];
}

interface MusicContextType {
  allSongs: Song[];
  playlists: Playlist[];
  currentPlaylist: Playlist | null;
  setCurrentPlaylist: (playlist: Playlist | null) => void;
  addPlaylist: (name: string) => void;
  removePlaylist: (id: string) => void;
  addSongToPlaylist: (playlistId: string, songId: string) => void;
  removeSongFromPlaylist: (playlistId: string, songId: string) => void;
  getSongsForPlaylist: (playlist: Playlist | null) => Song[];
  getRecentlyPlayedSongs: () => Song[];
  refreshAllSongs: (requestPermissionIfNeeded?: boolean) => void;
  requestStoragePermissions: (forceRequest?: boolean) => Promise<boolean>;
  recentlyPlayed: Song[];
  setRecentlyPlayed: (songs: Song[] | ((prev: Song[]) => Song[])) => void;
}

const MusicContext = createContext<MusicContextType | undefined>(undefined);

const PLAYLISTS_STORAGE_KEY = '@music_player_playlists';
const RECENTLY_PLAYED_STORAGE_KEY = '@music_player_recently_played';

export const MusicProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [allSongs, setAllSongs] = useState<Song[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [currentPlaylist, setCurrentPlaylist] = useState<Playlist | null>(null);
  const [recentlyPlayed, setRecentlyPlayed] = useState<Song[]>([]);
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null); // Cache permission status

  // Load playlists and recently played from storage on mount
  useEffect(() => {
    loadPlaylists();
    loadRecentlyPlayed();
  }, []);

  // Save playlists to storage whenever they change
  useEffect(() => {
    savePlaylists();
  }, [playlists]);

  // Save recently played to storage whenever it changes
  useEffect(() => {
    saveRecentlyPlayed();
  }, [recentlyPlayed]);

  const loadPlaylists = async () => {
    try {
      const storedPlaylists = await AsyncStorage.getItem(PLAYLISTS_STORAGE_KEY);
      if (storedPlaylists) {
        const parsedPlaylists = JSON.parse(storedPlaylists);
        setPlaylists(parsedPlaylists);
        console.log('Loaded playlists from storage:', parsedPlaylists);
      }
    } catch (error) {
      console.error('Error loading playlists:', error);
    }
  };

  const savePlaylists = async () => {
    try {
      await AsyncStorage.setItem(PLAYLISTS_STORAGE_KEY, JSON.stringify(playlists));
      console.log('Saved playlists to storage:', playlists);
    } catch (error) {
      console.error('Error saving playlists:', error);
    }
  };

  const loadRecentlyPlayed = async () => {
    try {
      const stored = await AsyncStorage.getItem(RECENTLY_PLAYED_STORAGE_KEY);
      if (stored) {
        const parsed: Song[] = JSON.parse(stored);
        setRecentlyPlayed(parsed);
      }
    } catch (error) {
      console.error('Error loading recently played:', error);
    }
  };

  const saveRecentlyPlayed = async () => {
    try {
      await AsyncStorage.setItem(RECENTLY_PLAYED_STORAGE_KEY, JSON.stringify(recentlyPlayed));
    } catch (error) {
      console.error('Error saving recently played:', error);
    }
  };

  // Request storage permissions for different Android versions (with caching)
  const requestStoragePermissions = async (forceRequest: boolean = false): Promise<boolean> => {
    // Return cached result if available and not forcing a new request
    if (!forceRequest && permissionGranted !== null) {
      return permissionGranted;
    }

    if (Platform.OS !== 'android') {
      // For iOS, use MediaLibrary permissions
      const { status } = await MediaLibrary.requestPermissionsAsync();
      const granted = status === 'granted';
      setPermissionGranted(granted);
      return granted;
    }

    try {
      // For Android 13+ (API 33+), request READ_MEDIA_AUDIO
      if (Platform.Version >= 33) {
        const hasAudioPermission = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.READ_MEDIA_AUDIO
        );

        if (hasAudioPermission) {
          console.log('READ_MEDIA_AUDIO permission already granted');
          setPermissionGranted(true);
          return true;
        }

        // Only show permission dialog if explicitly requested
        if (forceRequest) {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.READ_MEDIA_AUDIO,
            {
              title: 'Music Access Permission',
              message: 'SONNO needs access to your music files to play them.',
              buttonNeutral: 'Ask Me Later',
              buttonNegative: 'Cancel',
              buttonPositive: 'OK',
            }
          );

          const isGranted = granted === PermissionsAndroid.RESULTS.GRANTED;
          setPermissionGranted(isGranted);

          if (isGranted) {
            console.log('READ_MEDIA_AUDIO permission granted');
          } else {
            console.warn('READ_MEDIA_AUDIO permission denied');
          }
          return isGranted;
        } else {
          setPermissionGranted(false);
          return false;
        }
      } else {
        // For Android 12 and below, request READ_EXTERNAL_STORAGE
        const hasStoragePermission = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE
        );

        if (hasStoragePermission) {
          console.log('READ_EXTERNAL_STORAGE permission already granted');
          setPermissionGranted(true);
          return true;
        }

        // Only show permission dialog if explicitly requested
        if (forceRequest) {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
            {
              title: 'Storage Access Permission',
              message: 'SONNO needs access to your storage to find music files.',
              buttonNeutral: 'Ask Me Later',
              buttonNegative: 'Cancel',
              buttonPositive: 'OK',
            }
          );

          const isGranted = granted === PermissionsAndroid.RESULTS.GRANTED;
          setPermissionGranted(isGranted);

          if (isGranted) {
            console.log('READ_EXTERNAL_STORAGE permission granted');
          } else {
            console.warn('READ_EXTERNAL_STORAGE permission denied');
          }
          return isGranted;
        } else {
          setPermissionGranted(false);
          return false;
        }
      }
    } catch (error) {
      console.error('Error requesting storage permissions:', error);
      setPermissionGranted(false);
      return false;
    }
  };

  // Fetch all audio files (optimized to avoid repeated permission checks)
  const refreshAllSongs = async (requestPermissionIfNeeded: boolean = false) => {
    // Check permission status (uses cache if available)
    const hasPermission = await requestStoragePermissions(requestPermissionIfNeeded);

    if (!hasPermission) {
      if (requestPermissionIfNeeded) {
        console.warn('Storage permission not granted, cannot load songs');
      }
      return;
    }

    try {
      console.log('Loading music files...');
      const media = await MediaLibrary.getAssetsAsync({ mediaType: 'audio', first: 1000 });
      console.log(`Found ${media.assets.length} audio files`);

      const songs: Song[] = media.assets.map(asset => ({
        id: asset.id,
        title: asset.filename,
        uri: asset.uri,
        duration: asset.duration
      }));

      // Sort alphabetically by title
      songs.sort((a, b) => a.title.localeCompare(b.title));
      setAllSongs(songs);
      console.log('Songs loaded successfully:', songs.length);
    } catch (error) {
      console.error('Error loading songs:', error);
    }
  };

  useEffect(() => {
    // On initial load, request permissions if needed
    refreshAllSongs(true);
  }, []);

  const addPlaylist = (name: string) => {
    const newPlaylist = { id: Date.now().toString(), name, songIds: [] };
    setPlaylists(prev => [...prev, newPlaylist]);
    console.log('Added new playlist:', newPlaylist);
  };

  const removePlaylist = (id: string) => {
    setPlaylists(prev => prev.filter(p => p.id !== id));
    if (currentPlaylist?.id === id) setCurrentPlaylist(null);
    console.log('Removed playlist:', id);
  };

  const addSongToPlaylist = (playlistId: string, songId: string) => {
    setPlaylists(prev => prev.map(p =>
      p.id === playlistId && !p.songIds.includes(songId)
        ? { ...p, songIds: [...p.songIds, songId] }
        : p
    ));
    console.log('Added song', songId, 'to playlist', playlistId);
  };

  const removeSongFromPlaylist = (playlistId: string, songId: string) => {
    setPlaylists(prev => prev.map(p =>
      p.id === playlistId
        ? { ...p, songIds: p.songIds.filter(id => id !== songId) }
        : p
    ));
    console.log('Removed song', songId, 'from playlist', playlistId);
  };

  const getSongsForPlaylist = (playlist: Playlist | null) => {
    let result: Song[];
    if (!playlist) {
      result = allSongs;
    } else {
      result = allSongs.filter(song => playlist.songIds.includes(song.id));
    }
    // Sort alphabetically by title
    return [...result].sort((a, b) => a.title.localeCompare(b.title));
  };

  const getRecentlyPlayedSongs = () => {
    // Only include songs that still exist in allSongs (in case files are deleted)
    const allIds = new Set(allSongs.map(s => s.id));
    return recentlyPlayed.filter(song => allIds.has(song.id));
  };

  return (
    <MusicContext.Provider
      value={{
        allSongs,
        playlists,
        currentPlaylist,
        setCurrentPlaylist,
        addPlaylist,
        removePlaylist,
        addSongToPlaylist,
        removeSongFromPlaylist,
        getSongsForPlaylist,
        getRecentlyPlayedSongs,
        refreshAllSongs,
        requestStoragePermissions,
        recentlyPlayed,
        setRecentlyPlayed,
      }}
    >
      {children}
    </MusicContext.Provider>
  );
};

export const useMusic = () => {
  const ctx = useContext(MusicContext);
  if (!ctx) throw new Error('useMusic must be used within a MusicProvider');
  return ctx;
}; 