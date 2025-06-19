import { Ionicons } from '@expo/vector-icons';
import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';
import Slider from '@react-native-community/slider';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Song } from '../../types/music';

interface BottomSheetPlayerProps {
  currentSong: Song | null;
  isPlaying: boolean;
  progress: number;
  duration: number;
  position: number;
  timeRemaining: number | null;
  onPlayPause: () => void;
  onStop: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onSeek: (progress: number) => void;
  onStartTimer: (minutes: number) => void;
}

function formatTime(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export const BottomSheetPlayer: React.FC<BottomSheetPlayerProps> = ({
  currentSong,
  isPlaying,
  progress,
  duration,
  position,
  timeRemaining,
  onPlayPause,
  onStop,
  onNext,
  onPrevious,
  onSeek,
  onStartTimer,
}) => {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['80', '50%'], []);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // Animation for music icon
  const scaleAnim = useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    if (isPlaying) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(scaleAnim, { toValue: 1.15, duration: 400, useNativeDriver: true }),
          Animated.timing(scaleAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        ])
      ).start();
    } else {
      scaleAnim.stopAnimation();
      scaleAnim.setValue(1);
    }
  }, [isPlaying]);

  const handleSheetChanges = useCallback((index: number) => {
    setCurrentIndex(index);
  }, []);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={0}
        appearsOnIndex={1}
      />
    ),
    []
  );

  const handleSeek = (value: number) => {
    const newPosition = value;
    onSeek(newPosition / duration);
  };

  const MiniPlayer = () => (
    <View style={styles.miniPlayer}>
      <View style={styles.miniPlayerContent}>
        <Animated.View style={[styles.miniAlbumArt, { transform: [{ scale: scaleAnim }] }]}>
          <Ionicons name="musical-notes" size={24} color="#666" />
        </Animated.View>
        
        <View style={styles.miniSongInfo}>
          <Text style={styles.miniSongTitle} numberOfLines={1}>
            {currentSong?.title || 'No song selected'}
          </Text>
          <Text style={styles.miniSongArtist} numberOfLines={1}>
            {currentSong?.duration ? `${Math.floor(currentSong.duration / 1000)}s` : 'Unknown duration'}
          </Text>
        </View>

        <View style={styles.miniControls}>
          <TouchableOpacity onPress={onPrevious} style={styles.miniControlButton}>
            <Ionicons name="play-skip-back" size={20} color="#007AFF" />
          </TouchableOpacity>
          
          <TouchableOpacity onPress={onPlayPause} style={styles.miniControlButton}>
            <Ionicons name={isPlaying ? "pause" : "play"} size={24} color="#007AFF" />
          </TouchableOpacity>
          
          <TouchableOpacity onPress={onNext} style={styles.miniControlButton}>
            <Ionicons name="play-skip-forward" size={20} color="#007AFF" />
          </TouchableOpacity>
        </View>
      </View>
      
      <View style={styles.miniProgressBar}>
        <View style={[styles.miniProgressFill, { width: `${progress * 100}%` }]} />
      </View>
    </View>
  );

  const ExpandedPlayer = () => (
    <View style={styles.expandedPlayer}>
      <View style={styles.expandedHeader}>
        <Text style={styles.expandedTitle}>Now Playing</Text>
        <TouchableOpacity onPress={() => bottomSheetRef.current?.snapToIndex(0)}>
          <Ionicons name="chevron-down" size={24} color="#666" />
        </TouchableOpacity>
      </View>

      <Animated.View style={[styles.albumArt, { transform: [{ scale: scaleAnim }] }]}>
        <Ionicons name="musical-notes" size={80} color="#666" />
      </Animated.View>

      <Text style={styles.songTitle} numberOfLines={2}>
        {currentSong?.title || 'No song selected'}
      </Text>
      
      <Text style={styles.songArtist} numberOfLines={1}>
        {currentSong?.duration ? `${Math.floor(currentSong.duration / 1000)}s` : 'Unknown duration'}
      </Text>

      <View style={styles.progressContainer}>
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={duration > 0 ? duration : 1}
          value={position}
          minimumTrackTintColor="#007AFF"
          maximumTrackTintColor="#444"
          thumbTintColor="#fff"
          onSlidingComplete={handleSeek}
          disabled={duration === 0}
        />
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

      {/* Timer Controls */}
      <View style={styles.timerContainer}>
        <Text style={styles.timerTitle}>Sleep Timer</Text>
        <View style={styles.timerButtons}>
          <TouchableOpacity 
            style={styles.timerButton} 
            onPress={() => onStartTimer(15)}
          >
            <Text style={styles.timerButtonText}>15m</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.timerButton} 
            onPress={() => onStartTimer(30)}
          >
            <Text style={styles.timerButtonText}>30m</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.timerButton} 
            onPress={() => onStartTimer(60)}
          >
            <Text style={styles.timerButtonText}>1h</Text>
          </TouchableOpacity>
        </View>
        {timeRemaining !== null && (
          <Text style={styles.timerStatus}>
            Timer: {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
          </Text>
        )}
      </View>
    </View>
  );

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={0}
      snapPoints={snapPoints}
      onChange={handleSheetChanges}
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.bottomSheetBackground}
      handleIndicatorStyle={styles.handleIndicator}
    >
      <BottomSheetView style={styles.contentContainer}>
        {currentIndex === 0 ? <MiniPlayer /> : <ExpandedPlayer />}
      </BottomSheetView>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  bottomSheetBackground: {
    backgroundColor: '#fff',
  },
  handleIndicator: {
    backgroundColor: '#ccc',
  },
  contentContainer: {
    flex: 1,
  },
  miniPlayer: {
    height: 80,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  miniPlayerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  miniAlbumArt: {
    width: 48,
    height: 48,
    backgroundColor: '#f0f0f0',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  miniSongInfo: {
    flex: 1,
    marginRight: 12,
  },
  miniSongTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  miniSongArtist: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  miniControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  miniControlButton: {
    marginHorizontal: 8,
  },
  miniProgressBar: {
    height: 2,
    backgroundColor: '#eee',
  },
  miniProgressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
  },
  expandedPlayer: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
  },
  expandedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 20,
  },
  expandedTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
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
    marginBottom: 8,
    textAlign: 'center',
    paddingHorizontal: 20,
    color: '#333',
  },
  songArtist: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  progressContainer: {
    width: '100%',
    marginBottom: 20,
  },
  slider: {
    width: '100%',
    height: 32,
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
    marginBottom: 30,
  },
  controlButton: {
    marginHorizontal: 10,
  },
  timerContainer: {
    width: '100%',
    alignItems: 'center',
  },
  timerTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  timerButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 12,
  },
  timerButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginHorizontal: 8,
  },
  timerButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  timerStatus: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
}); 