import React, { useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useAudioPlayer } from '../shared/hooks/AudioPlayerContext';
import { useMusic } from '../shared/hooks/MusicContext';
import { Song } from '../shared/types/music';

export default function RecentlyPlayedScreen() {
  const { getRecentlyPlayedSongs } = useMusic();
  const songList = getRecentlyPlayedSongs();
  const { currentSong, playMusic, setSongList, stopMusicWithoutClearingTimer } = useAudioPlayer();
  const [searchQuery, setSearchQuery] = useState('');

  // Filter songs based on search query
  const filteredSongs = songList
    .filter(song => song.title.toLowerCase().includes(searchQuery.toLowerCase()));

  const handlePlaySong = async (song: Song) => {
    setSongList(filteredSongs);
    await stopMusicWithoutClearingTimer();
    playMusic(song);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Recently Played</Text>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search recently played..."
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
            {currentSong?.id === item.id && <Text style={styles.playingText}>*</Text>}
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            {searchQuery ? `No recently played songs matching "${searchQuery}"` : 'No recently played songs.'}
          </Text>
        }
        style={{ flex: 1 }}
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
    paddingBottom: 20,
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
   
    fontWeight: 'bold',
  },
  emptyText: {
    color: '#888',
    textAlign: 'center',
    marginTop: 40,
  },
}); 