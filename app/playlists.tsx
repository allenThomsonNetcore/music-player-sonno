import { useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useAudioPlayer } from './hooks/AudioPlayerContext';
import { Playlist as PlaylistType, useMusic } from './hooks/MusicContext';

export default function PlaylistsScreen() {
  const {
    playlists,
    addPlaylist,
    removePlaylist,
    addSongToPlaylist,
    removeSongFromPlaylist,
    getSongsForPlaylist,
    allSongs,
    setCurrentPlaylist,
  } = useMusic();
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [selectedPlaylist, setSelectedPlaylist] = useState<PlaylistType | null>(null);
  const [addSongsSearchQuery, setAddSongsSearchQuery] = useState('');

  const { currentSong, playMusic, setSongList, stopMusicWithoutClearingTimer } = useAudioPlayer();

  // Reset selectedPlaylist when tab is focused
  useFocusEffect(
    useCallback(() => {
      setSelectedPlaylist(null);
      setAddSongsSearchQuery(''); // Clear search when tab changes
    }, [])
  );

  // Update selectedPlaylist when playlists change
  useEffect(() => {
    if (selectedPlaylist) {
      const updated = playlists.find(p => p.id === selectedPlaylist.id);
      if (updated) {
        setSelectedPlaylist(updated);
      }
    }
  }, [playlists, selectedPlaylist]);

  // Debug log
  console.log('Playlists:', playlists);
  console.log('SelectedPlaylist:', selectedPlaylist);
  const selectedPlaylistSongs = selectedPlaylist ? getSongsForPlaylist(selectedPlaylist) : [];
  console.log('SelectedPlaylistSongs:', selectedPlaylistSongs);

  // Filter available songs for adding to playlist
  const availableSongs = selectedPlaylist 
    ? allSongs.filter(song => !selectedPlaylist.songIds.includes(song.id))
    : [];
  
  const filteredAvailableSongs = availableSongs.filter(song =>
    song.title.toLowerCase().includes(addSongsSearchQuery.toLowerCase())
  );

  const handleCreatePlaylist = () => {
    if (!newPlaylistName.trim()) return;
    addPlaylist(newPlaylistName.trim());
    setNewPlaylistName('');
  };

  const handleDeletePlaylist = (id: string) => {
    Alert.alert('Delete Playlist', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => removePlaylist(id) },
    ]);
  };

  const handleAddSong = (songId: string) => {
    if (selectedPlaylist) {
      console.log('Adding song', songId, 'to playlist', selectedPlaylist.id);
      addSongToPlaylist(selectedPlaylist.id, songId);
    }
  };

  const handleRemoveSong = (songId: string) => {
    if (selectedPlaylist) {
      console.log('Removing song', songId, 'from playlist', selectedPlaylist.id);
      removeSongFromPlaylist(selectedPlaylist.id, songId);
    }
  };

  const handlePlayPlaylist = async () => {
    if (selectedPlaylist) {
      setCurrentPlaylist(selectedPlaylist);
      const songs = getSongsForPlaylist(selectedPlaylist);
      if (songs.length > 0) {
        setSongList(songs);
        await stopMusicWithoutClearingTimer();
        playMusic(songs[0]);
      }
    }
  };

  // Header: horizontal playlist selector
  const renderHeader = () => (
    <View>
      <Text style={styles.title}>Your Playlists</Text>
      <FlatList
        data={playlists}
        extraData={playlists}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.playlistItem, selectedPlaylist?.id === item.id && styles.selectedPlaylist]}
            onPress={() => setSelectedPlaylist(item)}
            onLongPress={() => handleDeletePlaylist(item.id)}
          >
            <Text style={styles.playlistName}>{item.name}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={styles.emptyText}>No playlists yet.</Text>}
        horizontal
        style={{ marginBottom: 40, minHeight: 60 }}
        contentContainerStyle={{ alignItems: 'center', paddingVertical: 10 }}
      />
    </View>
  );

  // Footer: selected playlist songs and add-songs UI
  const renderFooter = () => (
    selectedPlaylist && selectedPlaylistSongs && Array.isArray(selectedPlaylistSongs) ? (
      <View>
        <View style={styles.playlistSongsHeader}>
          <Text style={styles.playlistSongsTitle}>Songs in "{selectedPlaylist.name}"</Text>
          <TouchableOpacity style={styles.playButton} onPress={handlePlayPlaylist}>
            <Text style={styles.playButtonText}>Play</Text>
          </TouchableOpacity>
        </View>
        {selectedPlaylistSongs.length > 0 ? (
          <FlatList
            data={selectedPlaylistSongs}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <View style={[styles.songRow, currentSong?.id === item.id && styles.currentSongRow]}>
                <Text style={styles.songTitle}>{item.title}</Text>
                {currentSong?.id === item.id && <Text style={styles.playingText}>*</Text>}
                <TouchableOpacity onPress={() => handleRemoveSong(item.id)}>
                  <Text style={styles.removeText}>Remove</Text>
                </TouchableOpacity>
              </View>
            )}
            ListEmptyComponent={<Text style={styles.emptyText}>No songs in this playlist.</Text>}
            style={{ marginBottom: 20 }}
          />
        ) : (
          <Text style={styles.emptyText}>No songs in this playlist.</Text>
        )}
        <Text style={styles.addSongsTitle}>Add Songs</Text>
        
        {/* Search Bar for Add Songs */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search songs to add..."
            placeholderTextColor="#888"
            value={addSongsSearchQuery}
            onChangeText={setAddSongsSearchQuery}
          />
        </View>
        
        <FlatList
          data={filteredAvailableSongs}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <View style={styles.songRow}>
              <Text style={styles.songTitle}>{item.title}</Text>
              <TouchableOpacity onPress={() => handleAddSong(item.id)}>
                <Text style={styles.addText}>+</Text>
              </TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              {addSongsSearchQuery 
                ? `No songs found matching "${addSongsSearchQuery}"` 
                : availableSongs.length === 0 
                  ? 'All songs are in this playlist.' 
                  : 'No songs available.'
              }
            </Text>
          }
          style={{ marginBottom: 20 }}
        />
      </View>
    ) : null
  );

  return (
    <View style={styles.container}>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="New playlist name"
          placeholderTextColor="#888"
          value={newPlaylistName}
          onChangeText={setNewPlaylistName}
        />
        <TouchableOpacity style={styles.addButton} onPress={handleCreatePlaylist}>
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={[]}
        keyExtractor={() => ''}
        renderItem={() => null}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#181A20',
    padding: 20,
    paddingTop: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
  },
  inputRow: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  input: {
    flex: 1,
    backgroundColor: '#23242a',
    color: '#fff',
    borderRadius: 8,
    padding: 10,
    marginRight: 10,
  },
  addButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  playlistItem: {
    backgroundColor: '#23242a',
    padding: 16,
    borderRadius: 8,
    marginRight: 10,
    minWidth: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedPlaylist: {
    borderColor: '#007AFF',
    borderWidth: 2,
  },
  playlistName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyText: {
    color: '#888',
    textAlign: 'center',
    marginTop: 40,
  },
  playlistSongsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  playlistSongsTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  playButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  playButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  songRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#23242a',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  currentSongRow: {
    borderColor: '#007AFF',
    borderWidth: 2,
  },
  songTitle: {
    color: '#fff',
    flex: 1,
    marginRight: 10,
  },
  playingText: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  removeText: {
    color: '#FF5252',
    fontWeight: 'bold',
  },
  addSongsTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
  },
  addText: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  listContent: {
    paddingBottom: 20,
  },
  searchContainer: {
    marginBottom: 10,
  },
  searchInput: {
    backgroundColor: '#23242a',
    color: '#fff',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#23242a',
  },
}); 