import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Song } from '../../types/music';

interface PlaylistProps {
  playlist: Song[];
  currentSong: Song | null;
  onSongSelect: (song: Song) => void;
}

export const Playlist: React.FC<PlaylistProps> = ({ playlist, currentSong, onSongSelect }) => {
  return (
    <View style={styles.playlistContainer}>
      <View style={styles.playlistHeader}>
        <Text style={styles.playlistTitle}>Playlist</Text>
        <Text style={styles.supportedFormats}>
          Supported formats: MP3, WAV, AAC, M4A
        </Text>
      </View>
      <View style={styles.playlist}>
        {playlist.length === 0 ? (
          <View style={styles.emptyPlaylist}>
            <Ionicons name="musical-notes" size={40} color="#ccc" />
            <Text style={styles.emptyPlaylistText}>
              No songs in playlist. Tap + to add music.
            </Text>
          </View>
        ) : (
          playlist.map((song) => (
            <TouchableOpacity
              key={song.id}
              style={[
                styles.playlistItem,
                currentSong?.id === song.id && styles.currentSong
              ]}
              onPress={() => onSongSelect(song)}
            >
              <Ionicons 
                name={currentSong?.id === song.id ? "musical-note" : "musical-note-outline"} 
                size={24} 
                color={currentSong?.id === song.id ? "#007AFF" : "#666"} 
              />
              <Text style={[
                styles.songItemTitle,
                currentSong?.id === song.id && styles.currentSongTitle
              ]} numberOfLines={1}>
                {song.title}
              </Text>
            </TouchableOpacity>
          ))
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  playlistContainer: {
    flex: 1,
    padding: 20,
  },
  playlistHeader: {
    marginBottom: 10,
  },
  playlistTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 5,
  },
  supportedFormats: {
    fontSize: 12,
    color: '#666',
    marginBottom: 10,
  },
  playlist: {
    flex: 1,
  },
  playlistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  currentSong: {
    backgroundColor: '#f0f0f0',
  },
  songItemTitle: {
    marginLeft: 10,
    fontSize: 16,
    flex: 1,
  },
  currentSongTitle: {
    color: '#007AFF',
    fontWeight: '600',
  },
  emptyPlaylist: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyPlaylistText: {
    marginTop: 10,
    color: '#666',
    textAlign: 'center',
  },
}); 