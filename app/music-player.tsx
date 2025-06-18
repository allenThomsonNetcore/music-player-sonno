import DateTimePicker from '@react-native-community/datetimepicker';
import * as MediaLibrary from 'expo-media-library';
import React, { useEffect, useState } from 'react';
import { Alert, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { PlayerControls } from './components/music-player/PlayerControls';
import { Playlist } from './components/music-player/Playlist';
import { useAudioPlayer } from './hooks/useAudioPlayer';
import { Song } from './types/music';
import { formatTime } from './utils/audioUtils';

export default function MusicPlayer() {
  const [playlist, setPlaylist] = useState<Song[]>([]);
  const [duration, setDuration] = useState('');
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [scheduledStopTime, setScheduledStopTime] = useState<Date | null>(null);
  const [permissionGranted, setPermissionGranted] = useState(false);

  // Fetch all audio files on mount
  useEffect(() => {
    const fetchAudioFiles = async () => {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Please grant media library permissions.');
        return;
      }
      setPermissionGranted(true);
      const media = await MediaLibrary.getAssetsAsync({ mediaType: 'audio', first: 1000 });
      const songs: Song[] = media.assets.map(asset => ({
        id: asset.id,
        title: asset.filename,
        uri: asset.uri,
        duration: asset.duration
      }));
      setPlaylist(songs);
    };
    fetchAudioFiles();
  }, []);

  const {
    currentSong,
    isPlaying,
    progress,
    timeRemaining,
    duration: trackDuration,
    position,
    playMusic,
    pauseMusic,
    resumeMusic,
    stopMusic,
    startTimer,
    seekTo,
    playNext,
    playPrevious,
  } = useAudioPlayer(playlist);

  const handlePlayPause = async () => {
    if (isPlaying) {
      await pauseMusic();
    } else {
      if (currentSong) {
        await resumeMusic();
      } else if (playlist.length > 0) {
        await playMusic(playlist[0]);
      } else {
        Alert.alert('No Songs', 'No songs found on device.');
      }
    }
  };

  const handleStop = async () => {
    try {
      await stopMusic();
    } catch (error) {
      Alert.alert('Error', 'Failed to stop the music');
    }
  };

  const handleTimerStart = async () => {
    if (!duration) {
      Alert.alert('Error', 'Please enter a duration');
      return;
    }
    const minutes = parseInt(duration);
    if (isNaN(minutes) || minutes <= 0) {
      Alert.alert('Error', 'Please enter a valid duration');
      return;
    }
    await startTimer(minutes);
  };

  const handleSeek = async (newProgress: number) => {
    if (trackDuration) {
      await seekTo(newProgress * trackDuration);
    }
  };

  const scheduleStop = (event: any, selectedDate?: Date) => {
    setShowTimePicker(false);
    if (selectedDate) {
      setScheduledStopTime(selectedDate);
      const now = new Date();
      const timeUntilStop = selectedDate.getTime() - now.getTime();
      setTimeout(() => {
        stopMusic();
        setScheduledStopTime(null);
      }, timeUntilStop);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollViewContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Music Player</Text>
        </View>

        <View style={styles.mainContent}>
          <PlayerControls
            isPlaying={isPlaying}
            onPlayPause={handlePlayPause}
            onStop={handleStop}
            onNext={playNext}
            onPrevious={playPrevious}
            currentSong={currentSong}
            progress={progress}
            duration={trackDuration}
            position={position}
            onSeek={handleSeek}
          />

          {timeRemaining !== null && (
            <View style={styles.countdownContainer}>
              <Text style={styles.countdownText}>
                Time Remaining: {formatTime(timeRemaining)}
              </Text>
            </View>
          )}

          <View style={styles.timerControls}>
            <TextInput
              style={styles.input}
              placeholder="Enter duration in minutes"
              keyboardType="numeric"
              value={duration}
              onChangeText={setDuration}
            />
            <TouchableOpacity style={styles.timerButton} onPress={handleTimerStart}>
              <Text style={styles.buttonText}>Start Timer</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.timerButton} 
              onPress={() => setShowTimePicker(true)}
            >
              <Text style={styles.buttonText}>Schedule Stop</Text>
            </TouchableOpacity>
          </View>

          {showTimePicker && (
            <DateTimePicker
              value={scheduledStopTime || new Date()}
              mode="time"
              is24Hour={true}
              display="default"
              onChange={scheduleStop}
            />
          )}

          {scheduledStopTime && (
            <Text style={styles.scheduledTime}>
              Scheduled to stop at: {scheduledStopTime.toLocaleTimeString()}
            </Text>
          )}

          <Playlist
            playlist={playlist}
            currentSong={currentSong}
            onSongSelect={playMusic}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  mainContent: {
    flex: 1,
  },
  countdownContainer: {
    padding: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    margin: 20,
  },
  countdownText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  timerControls: {
    padding: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  timerButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: '600',
  },
  scheduledTime: {
    fontSize: 14,
    color: '#666',
    marginTop: 10,
    textAlign: 'center',
  },
}); 