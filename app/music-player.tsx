import { useFocusEffect } from 'expo-router';
import React, { useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useAudioPlayer } from './hooks/AudioPlayerContext';
import { useMusic } from './hooks/MusicContext';
import { Song } from './types/music';

export default function AllSongsScreen() {
  const {
    allSongs,
    currentPlaylist,
    getSongsForPlaylist,
    setCurrentPlaylist,
  } = useMusic();

  const songList = getSongsForPlaylist(null); // Always get all songs
  const { currentSong, playMusic, setSongList, stopMusicWithoutClearingTimer } = useAudioPlayer();
  const [searchQuery, setSearchQuery] = useState('');

  // Filter songs based on search query
  const filteredSongs = songList.filter(song =>
    song.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // On tab focus, set the global player's songList to all songs
  useFocusEffect(
    React.useCallback(() => {
      setSongList(songList);
    }, [songList, setSongList])
  );

  const handlePlaySong = async (song: Song) => {
    setSongList(songList);
    await stopMusicWithoutClearingTimer();
    playMusic(song);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>All Songs</Text>
      
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search songs..."
          placeholderTextColor="#888"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <FlatList
        data={filteredSongs}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.songRow, currentSong?.id === item.id && styles.currentSongRow]}
            onPress={() => handlePlaySong(item)}
          >
            <Text style={styles.songTitle}>{item.title}</Text>
            {currentSong?.id === item.id && <Text style={styles.playingText}>Playing</Text>}
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            {searchQuery ? `No songs found matching "${searchQuery}"` : 'No songs found on device.'}
          </Text>
        }
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
    paddingTop: 20, // Reduced since SafeAreaView handles the notification area
  },
  searchContainer: {
    marginBottom: 20,
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
  listContent: {
    paddingBottom: 20, // Reduced since no bottom tabs
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
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
  emptyText: {
    color: '#888',
    textAlign: 'center',
    marginTop: 40,
  },
}); 