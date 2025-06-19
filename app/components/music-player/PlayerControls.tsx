import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

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
  // Animation for music icon
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isPlaying) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(scaleAnim, { toValue: 1.1, duration: 400, useNativeDriver: true }),
          Animated.timing(scaleAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        ])
      ).start();
    } else {
      scaleAnim.stopAnimation();
      scaleAnim.setValue(1);
    }
  }, [isPlaying]);

  return (
    <View style={styles.container}>
      {/* Song Info Row */}
      <View style={styles.songInfoRow}>
        <Animated.View style={[styles.miniAlbumArt, { transform: [{ scale: scaleAnim }] }]}>
          <Ionicons name="musical-notes" size={16} color="#666" />
        </Animated.View>
        
        <View style={styles.songTextContainer}>
          <Text style={styles.songTitle} numberOfLines={1}>
            {currentSong?.title || 'No song selected'}
          </Text>
          <Text style={styles.timeText}>
            {formatTime(position)} / {formatTime(duration)}
          </Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={duration > 0 ? duration : 1}
          value={position}
          minimumTrackTintColor="#007AFF"
          maximumTrackTintColor="#444"
          thumbTintColor="#fff"
          onSlidingComplete={val => onSeek(val / duration)}
          disabled={duration === 0}
        />
      </View>

      {/* Controls Row */}
      <View style={styles.controls}>
        <TouchableOpacity onPress={onPrevious} style={styles.controlButton}>
          <Ionicons name="play-skip-back" size={20} color="#007AFF" />
        </TouchableOpacity>
        
        <TouchableOpacity onPress={onPlayPause} style={styles.controlButton}>
          <Ionicons name={isPlaying ? "pause" : "play"} size={24} color="#007AFF" />
        </TouchableOpacity>
        
        <TouchableOpacity onPress={onStop} style={styles.controlButton}>
          <Ionicons name="stop" size={20} color="#007AFF" />
        </TouchableOpacity>
        
        <TouchableOpacity onPress={onNext} style={styles.controlButton}>
          <Ionicons name="play-skip-forward" size={20} color="#007AFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 12,
    backgroundColor: '#181A20',
  },
  songInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  miniAlbumArt: {
    width: 32,
    height: 32,
    backgroundColor: '#23242a',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  songTextContainer: {
    flex: 1,
  },
  songTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  timeText: {
    fontSize: 11,
    color: '#888',
  },
  progressContainer: {
    marginBottom: 8,
  },
  slider: {
    width: '100%',
    height: 20,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlButton: {
    marginHorizontal: 8,
    padding: 4,
  },
}); 