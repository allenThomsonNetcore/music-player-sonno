import AsyncStorage from '@react-native-async-storage/async-storage';
import * as MediaLibrary from 'expo-media-library';
import React, { createContext, useContext, useEffect, useState } from 'react';
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
  refreshAllSongs: () => void;
}

const MusicContext = createContext<MusicContextType | undefined>(undefined);

const PLAYLISTS_STORAGE_KEY = '@music_player_playlists';

export const MusicProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [allSongs, setAllSongs] = useState<Song[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [currentPlaylist, setCurrentPlaylist] = useState<Playlist | null>(null);

  // Load playlists from storage on mount
  useEffect(() => {
    loadPlaylists();
  }, []);

  // Save playlists to storage whenever they change
  useEffect(() => {
    savePlaylists();
  }, [playlists]);

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

  // Fetch all audio files on mount
  const refreshAllSongs = async () => {
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== 'granted') return;
    const media = await MediaLibrary.getAssetsAsync({ mediaType: 'audio', first: 1000 });
    const songs: Song[] = media.assets.map(asset => ({
      id: asset.id,
      title: asset.filename,
      uri: asset.uri,
      duration: asset.duration
    }));
    setAllSongs(songs);
  };

  useEffect(() => {
    refreshAllSongs();
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
    if (!playlist) return allSongs;
    return allSongs.filter(song => playlist.songIds.includes(song.id));
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
        refreshAllSongs,
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