import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface PlayerControlsProps {
  isPlaying: boolean;
  onPlayPause: () => void;
  onStop: () => void;
  onNext: () => void;
  onPrevious: () => void;
  currentSong: { title: string } | null;
  progress: number;
  duration: number;
  position: number;
  onSeek: (progress: number) => void;
}

function formatTime(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export const PlayerControls: React.FC<PlayerControlsProps> = ({
  isPlaying,
  onPlayPause,
  onStop,
  onNext,
  onPrevious,
  currentSong,
  progress,
  duration,
  position,
  onSeek,
}) => {
  // Calculate progress bar width and handle press
  const handleSeekBarPress = (event: any) => {
    const { locationX, width } = event.nativeEvent;
    const newProgress = locationX / width;
    onSeek(newProgress);
  };

  return (
    <View style={styles.container}>
      <View style={styles.albumArt}>
        <Ionicons name="musical-notes" size={80} color="#666" />
      </View>

      <Text style={styles.songTitle} numberOfLines={2}>
        {currentSong?.title || 'No song selected'}
      </Text>

      <View style={styles.progressBarContainer}>
        <Pressable style={{ flex: 1 }} onPress={handleSeekBarPress}>
          <View style={[styles.progressBar, { width: `${progress * 100}%` }]} />
        </Pressable>
        <View style={styles.timeRow}>
          <Text style={styles.timeText}>{formatTime(position)}</Text>
          <Text style={styles.timeText}>{formatTime(duration)}</Text>
        </View>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity onPress={onPrevious} style={styles.controlButton}>
          <Ionicons name="play-skip-back" size={32} color="#007AFF" />
        </TouchableOpacity>
        <TouchableOpacity onPress={onPlayPause} style={styles.controlButton}>
          <Ionicons name={isPlaying ? "pause-circle" : "play-circle"} size={48} color="#007AFF" />
        </TouchableOpacity>
        <TouchableOpacity onPress={onStop} style={styles.controlButton}>
          <Ionicons name="stop-circle-outline" size={32} color="#007AFF" />
        </TouchableOpacity>
        <TouchableOpacity onPress={onNext} style={styles.controlButton}>
          <Ionicons name="play-skip-forward" size={32} color="#007AFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  albumArt: {
    width: 200,
    height: 200,
    backgroundColor: '#f0f0f0',
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  songTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  progressBarContainer: {
    width: '100%',
    height: 32,
    justifyContent: 'center',
    marginBottom: 20,
  },
  progressBar: {
    position: 'absolute',
    left: 0,
    top: 14,
    height: 4,
    backgroundColor: '#007AFF',
    borderRadius: 2,
    zIndex: 1,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  timeText: {
    fontSize: 12,
    color: '#666',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  controlButton: {
    marginHorizontal: 10,
  },
}); 