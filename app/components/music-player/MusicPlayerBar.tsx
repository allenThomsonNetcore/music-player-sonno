import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useAudioPlayer } from '../../hooks/AudioPlayerContext';
import { formatTime } from '../../utils/audioUtils';
import { PlayerControls } from './PlayerControls';

export const MusicPlayerBar: React.FC = () => {
  const {
    currentSong,
    isPlaying,
    progress,
    timeRemaining,
    duration,
    position,
    playMusic,
    pauseMusic,
    resumeMusic,
    stopMusic,
    seekTo,
    playNext,
    playPrevious,
    startTimer,
    scheduledStopTime,
    setScheduledStopTime,
    clearTimer: clearAudioTimer,
  } = useAudioPlayer();

  const [timerInput, setTimerInput] = useState('');
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [pickerDefaultTime, setPickerDefaultTime] = useState(new Date(Date.now() + 60 * 60 * 1000));

  // Debug logging for timer state
  console.log('MusicPlayerBar - timeRemaining:', timeRemaining, 'scheduledStopTime:', scheduledStopTime);

  // Debug logging for DateTimePicker visibility
  useEffect(() => {
    console.log('DateTimePicker visibility changed:', showTimePicker);
  }, [showTimePicker]);

  const handlePlayPause = async () => {
    if (isPlaying) {
      await pauseMusic();
    } else {
      if (currentSong) {
        await playMusic(currentSong);
      }
    }
  };

  const handleTimerStart = async () => {
    if (!timerInput) return;
    const minutes = parseInt(timerInput);
    if (isNaN(minutes) || minutes <= 0) return;
    console.log('Starting timer for', minutes, 'minutes');
    await startTimer(minutes);
    setTimerInput(''); // Clear input after starting
  };

  const handleScheduleStop = (event: any, selectedDate?: Date) => {
    setShowTimePicker(false);

    // For iOS/Android compatibility, check event.type or event.nativeEvent.type
    const eventType = event?.type || event?.nativeEvent?.type;

    if (eventType === 'set' && selectedDate) {
      const now = new Date();
      const timeUntilStop = selectedDate.getTime() - now.getTime();

      if (timeUntilStop > 0) {
        clearAudioTimer();
        setScheduledStopTime(selectedDate);
      }
    }
    // If eventType is 'dismissed' or not 'set', do nothing
  };

  const handleScheduleButtonPress = () => {
    console.log('Schedule button pressed, current showTimePicker:', showTimePicker);
    // Set a fresh default time when opening the picker
    const now = new Date();
    const freshDefaultTime = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now
    setPickerDefaultTime(freshDefaultTime);
    console.log('Setting picker default time to:', freshDefaultTime.toLocaleTimeString());
    console.log('Current time is:', now.toLocaleTimeString());
    setShowTimePicker(true);
    console.log('showTimePicker set to true');
  };

  const clearTimer = () => {
    console.log('Clearing timer');
    clearAudioTimer();
    setScheduledStopTime(null);
    setTimerInput('');
  };

  return (
    <>
      <View style={styles.stickyBar}>
        <PlayerControls
          isPlaying={isPlaying}
          onPlayPause={handlePlayPause}
          onStop={stopMusic}
          onNext={playNext}
          onPrevious={playPrevious}
          currentSong={currentSong}
          progress={progress}
          duration={duration}
          position={position}
          onSeek={val => seekTo(val * duration)}
        />
        
        {/* Timer Section */}
        <View style={styles.timerSection}>
          {/* Timer Input Row */}
          <View style={styles.timerInputRow}>
            <TextInput
              style={styles.timerInput}
              placeholder="Timer (minutes)"
              placeholderTextColor="#888"
              keyboardType="numeric"
              value={timerInput}
              onChangeText={setTimerInput}
            />
            <TouchableOpacity style={styles.timerButton} onPress={handleTimerStart}>
              <Text style={styles.buttonText}>Start</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.scheduleButton} onPress={handleScheduleButtonPress}>
              <Text style={styles.buttonText}>Schedule</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.clearButton} onPress={clearTimer}>
              <Text style={styles.clearButtonText}>Clear</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Status Messages */}
        {(scheduledStopTime || timeRemaining !== null) && (
          <View style={styles.statusContainer}>
            {scheduledStopTime && (
              <Text style={styles.statusText}>
                ⏱ Scheduled to stop at: {scheduledStopTime.toLocaleTimeString()}
              </Text>
            )}
            {timeRemaining !== null && timeRemaining > 0 && (
              <Text style={styles.statusText}>
                ⏱ Countdown: {formatTime(timeRemaining)}
              </Text>
            )}
          </View>
        )}
      </View>
      
      {/* DateTimePicker rendered outside sticky bar */}
      {showTimePicker && (
        <DateTimePicker
          key={`picker-${Date.now()}`}
          value={pickerDefaultTime}
          mode="time"
          is24Hour={true}
          display="spinner"
          onChange={handleScheduleStop}
          style={{ backgroundColor: 'white' }}
        />
      )}
    </>
  );
};

const styles = StyleSheet.create({
  stickyBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#181A20',
    borderTopWidth: 1,
    borderTopColor: '#23242a',
    zIndex: 100,
    paddingBottom: 4,
  },
  timerSection: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  timerInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timerInput: {
    backgroundColor: '#23242a',
    color: '#fff',
    borderRadius: 6,
    padding: 8,
    marginRight: 8,
    flex: 1,
    borderWidth: 1,
    borderColor: '#23242a',
    fontSize: 14,
  },
  timerButton: {
    backgroundColor: '#23242a',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 6,
    borderWidth: 1,
    borderColor: '#444',
  },
  scheduleButton: {
    backgroundColor: '#23242a',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 6,
    borderWidth: 1,
    borderColor: '#444',
  },
  clearButton: {
    backgroundColor: '#23242a',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#444',
  },
  buttonText: {
    color: '#007AFF',
    fontWeight: '600',
    fontSize: 12,
  },
  clearButtonText: {
    color: '#007AFF',
    fontWeight: '600',
    fontSize: 12,
  },
  statusContainer: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#23242a',
    marginHorizontal: 12,
    marginBottom: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    color: '#fff',
    textAlign: 'center',
    fontWeight: '500',
  },
}); 