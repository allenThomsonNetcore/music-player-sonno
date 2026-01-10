import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Linking, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SwipeableTabWrapper } from '../shared/components/SwipeableTabWrapper';
import { useAudioPlayer } from '../shared/hooks/AudioPlayerContext';
import { Playlist as PlaylistType, useMusic } from '../shared/hooks/MusicContext';
import { useMusicPlayerHeight } from '../shared/hooks/MusicPlayerHeightContext';

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
  const { musicPlayerHeight } = useMusicPlayerHeight();

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
  // Sort playlist songs alphabetically
  const sortedPlaylistSongs = [...selectedPlaylistSongs].sort((a, b) => a.title.localeCompare(b.title));
  console.log('SelectedPlaylistSongs:', selectedPlaylistSongs);

  // Filter available songs for adding to playlist
  const availableSongs = selectedPlaylist 
    ? allSongs.filter(song => !selectedPlaylist.songIds.includes(song.id))
    : [];
  
  const filteredAvailableSongs = availableSongs
    .filter(song => song.title.toLowerCase().includes(addSongsSearchQuery.toLowerCase()))
    .sort((a, b) => a.title.localeCompare(b.title));

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

  const handlePlaySongFromPlaylist = async (song: any) => {
    if (selectedPlaylist) {
      const songs = getSongsForPlaylist(selectedPlaylist);
      setSongList(songs);
      await playMusic(song);
    }
  };

  const handleFeedback = () => {
    const subject = encodeURIComponent('Music Player App Feedback');
    const body = encodeURIComponent(
      `Hi,\n\nI would like to provide feedback about the Music Player app.\n\n` +
      `Device: ${Platform.OS} ${Platform.Version}\n` +
      `App Version: 1.0.0\n\n` +
      `Feedback:\n\n` +
      `Best regards,\n[Your Name]`
    );
    const mailtoUrl = `mailto:allono.at@gmail.com?subject=${subject}&body=${body}`;
    
    Linking.canOpenURL(mailtoUrl).then(supported => {
      if (supported) {
        Linking.openURL(mailtoUrl);
      } else {
        Alert.alert(
          'Email To',
          'Please send feedback to: allono.at@gmail.com',
          [{ text: 'OK' }]
        );
      }
    });
  };

  return (
    <SwipeableTabWrapper currentTab="playlists">
      <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.listContent, { paddingBottom: musicPlayerHeight + 20 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header with title and feedback button */}
      <View style={styles.header}>
        <Text style={styles.title}>Playlists</Text>
        <TouchableOpacity style={styles.feedbackButton} onPress={handleFeedback}>
          <Ionicons name="information-circle-outline" size={24} color="#007AFF" />
          <Text style={styles.feedbackLabel}>Feedback</Text>
        </TouchableOpacity>
      </View>

      {/* Create new playlist */}
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

      {/* Horizontal playlist selector */}
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
        showsHorizontalScrollIndicator={false}
      />

      {/* Selected Playlist Content */}
      {selectedPlaylist && (
        <>
          {/* Songs in Playlist */}
          <View style={styles.playlistSongsHeader}>
            <Text style={styles.playlistSongsTitle}>Songs in "{selectedPlaylist.name}"</Text>
            <TouchableOpacity style={styles.playButton} onPress={handlePlayPlaylist}>
              <Text style={styles.playButtonText}>Play</Text>
            </TouchableOpacity>
          </View>

          {sortedPlaylistSongs.length > 0 ? (
            sortedPlaylistSongs.map(item => (
              <TouchableOpacity key={item.id} onPress={() => handlePlaySongFromPlaylist(item)}>
                <View style={[styles.songRow, currentSong?.id === item.id && styles.currentSongRow]}>
                  <Text style={styles.songTitle} numberOfLines={1}>{item.title}</Text>
                  {currentSong?.id === item.id && <Text style={styles.playingText}></Text>}
                  <TouchableOpacity onPress={() => handleRemoveSong(item.id)}>
                    <Text style={styles.removeText}>-</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <Text style={styles.emptyText}>No songs in this playlist.</Text>
          )}

          {/* Add Songs Section */}
          <Text style={styles.addSongsTitle}>Add Songs</Text>
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search songs to add..."
              placeholderTextColor="#888"
              value={addSongsSearchQuery}
              onChangeText={setAddSongsSearchQuery}
            />
          </View>

          {filteredAvailableSongs.map(item => (
            <View key={item.id} style={styles.songRow}>
              <Text style={styles.songTitle} numberOfLines={1}>{item.title}</Text>
              <TouchableOpacity onPress={() => handleAddSong(item.id)}>
                <Text style={styles.addText}>+</Text>
              </TouchableOpacity>
            </View>
          ))}
           {filteredAvailableSongs.length === 0 && (
             <Text style={styles.emptyText}>
              {addSongsSearchQuery 
                ? `No songs found matching "${addSongsSearchQuery}"` 
                : availableSongs.length === 0 
                  ? 'All songs are already in this playlist.' 
                  : ''
              }
            </Text>
           )}
        </>
      )}
      </ScrollView>
    </SwipeableTabWrapper>
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
    color: 'white',
    fontSize: 24,
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
    fontWeight: 'bold',
  },
  removeText: {
    color: '#FF3B30',
    fontSize: 28,
    fontWeight: 'bold',
  },
  addSongsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 20,
    marginBottom: 10,
  },
  addText: {
    color: '#34C759',
    fontSize: 28,
    fontWeight: 'bold',
  },
  listContent: {
    // paddingBottom is now dynamic based on music player height
  },
  searchContainer: {
    marginBottom: 10,
  },
  searchInput: {
    backgroundColor: '#23242a',
    color: '#fff',
    borderRadius: 8,
    padding: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  feedbackButton: {
    padding: 8,
    alignItems: 'center',
  },
  feedbackLabel: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
}); 