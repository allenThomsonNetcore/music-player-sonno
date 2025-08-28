import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { TimerMode, useAudioPlayer } from '../../hooks/AudioPlayerContext';
import { useMusicPlayerHeight } from '../../hooks/MusicPlayerHeightContext';
import { formatTime } from '../../utils/audioUtils';
import { PlayerControls } from './PlayerControls';

export const MusicPlayerBar: React.FC = () => {
  const {
    currentSong,
    isPlaying,
    progress,
    timeRemaining,
    timerMode,
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
    startEndOfSongTimer,
    scheduledStopTime,
    setScheduledStopTime,
    clearTimer: clearAudioTimer,
    testBackgroundTimer,
    activateScheduledStop,
  } = useAudioPlayer();

  const [timerInput, setTimerInput] = useState('');
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [pickerDefaultTime, setPickerDefaultTime] = useState(new Date(Date.now() + 60 * 60 * 1000));
  const [userHidTimer, setUserHidTimer] = useState(false);

  const {
    musicPlayerHeight,
    setMusicPlayerHeight,
    isTimerSectionVisible,
    setIsTimerSectionVisible
  } = useMusicPlayerHeight();

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
    if (timerInput) {
      // Handle countdown timer
      const minutes = parseInt(timerInput);
      if (isNaN(minutes) || minutes <= 0) return;
      console.log('Starting timer for', minutes, 'minutes');
      await startTimer(minutes);
      setTimerInput(''); // Clear input after starting
    } else if (scheduledStopTime && !timeRemaining) {
      // Handle scheduled stop activation
      console.log('Activating scheduled stop');
      activateScheduledStop();
    }
  };

  const handleEndOfSongTimer = async () => {
    if (!currentSong || !isPlaying) return;
    console.log('Starting end-of-song timer');
    await startEndOfSongTimer();
  };

  // Auto-show timer section when timer is active (but only if user hasn't manually hidden it)
  useEffect(() => {
    if ((timeRemaining !== null || timerMode === TimerMode.END_OF_SONG || scheduledStopTime) && !userHidTimer) {
      setIsTimerSectionVisible(true);
    }
  }, [timeRemaining, timerMode, scheduledStopTime, userHidTimer]);

  // Update music player height when timer section visibility changes
  useEffect(() => {
    const baseHeight = 120; // Base height without timer section
    const timerSectionHeight = 100; // Approximate height of timer section
    const newHeight = isTimerSectionVisible ? baseHeight + timerSectionHeight : baseHeight;
    setMusicPlayerHeight(newHeight);
  }, [isTimerSectionVisible, setMusicPlayerHeight]);

  const handleMusicPlayerLayout = (event: any) => {
    const { height } = event.nativeEvent.layout;
    setMusicPlayerHeight(height);
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
    setUserHidTimer(false); // Reset user hide preference when clearing timers
  };

  const clearCountdownTimer = () => {
    console.log('Clearing countdown timer only');
    clearAudioTimer(false); // Don't clear scheduled timers
    setTimerInput('');
    // Only reset userHidTimer if no other timers are active
    if (!scheduledStopTime && timerMode !== TimerMode.END_OF_SONG) {
      setUserHidTimer(false);
    }
  };

  return (
    <>
      <View style={styles.stickyBar} onLayout={handleMusicPlayerLayout}>
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

        {/* Timer Toggle Button */}
        <TouchableOpacity
          style={styles.timerToggleButton}
          onPress={() => {
            const newVisibility = !isTimerSectionVisible;
            setIsTimerSectionVisible(newVisibility);
            // Track if user is manually hiding the timer while it's active
            if (!newVisibility && (timeRemaining !== null || timerMode === TimerMode.END_OF_SONG || scheduledStopTime)) {
              setUserHidTimer(true);
            } else if (newVisibility) {
              setUserHidTimer(false);
            }
          }}
        >
          <Text style={styles.timerToggleText}>
            {isTimerSectionVisible ? ' Hide Timer' : ' Timer'}
            {(timeRemaining !== null || timerMode === TimerMode.END_OF_SONG || scheduledStopTime) && ' (Active)'}
          </Text>
          {(timeRemaining !== null || timerMode === TimerMode.END_OF_SONG || scheduledStopTime) && (
            <View style={styles.timerIndicator} />
          )}
        </TouchableOpacity>

        {/* Timer Section - Collapsible */}
        {isTimerSectionVisible && (
          <View style={styles.timerSection}>
          {/* Countdown Timer Row */}
          <View style={styles.timerInputRow}>
            <TextInput
              style={styles.timerInput}
              placeholder="Timer (minutes)"
              placeholderTextColor="#888"
              keyboardType="numeric"
              value={timerInput}
              onChangeText={setTimerInput}
            />
            <TouchableOpacity
              style={[
                styles.timerButton,
                (!timerInput && !scheduledStopTime) && styles.disabledButton
              ]}
              onPress={handleTimerStart}
              disabled={!timerInput && !scheduledStopTime}
            >
              <Text style={[
                styles.buttonText,
                (!timerInput && !scheduledStopTime) && styles.disabledButtonText
              ]}>
                {timerInput ? 'Start Timer' : (scheduledStopTime && !timeRemaining ? 'Start Schedule' : 'Start')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Timer Options Row */}
          <View style={styles.timerOptionsRow}>
            <TouchableOpacity
              style={[styles.scheduleButton, isPlaying && styles.disabledButton]}
              onPress={handleScheduleButtonPress}
              disabled={isPlaying}
            >
              <Text style={[styles.buttonText, isPlaying && styles.disabledButtonText]}>
                {isPlaying ? 'Schedule' : 'Schedule'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.endOfSongButton, !currentSong && styles.disabledButton]}
              onPress={handleEndOfSongTimer}
              disabled={!currentSong}
            >
              <Text style={[styles.buttonText, !currentSong && styles.disabledButtonText]}>End of Song</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.clearButton} onPress={timeRemaining ? clearCountdownTimer : clearTimer}>
              <Text style={styles.clearButtonText}>Clear</Text>
            </TouchableOpacity>
          </View>

          {/* Status Messages */}
          {(scheduledStopTime || timeRemaining !== null || timerMode === TimerMode.END_OF_SONG) && (
            <View style={styles.statusContainer}>
              {scheduledStopTime && (
                <View style={styles.scheduledStatusRow}>
                  <Text style={styles.statusText}>
                    ⏱ Scheduled to stop at: {scheduledStopTime.toLocaleTimeString()}
                  </Text>
                </View>
              )}
              {timeRemaining !== null && timeRemaining > 0 && (
                <Text style={styles.statusText}>
                  ⏱ Countdown: {formatTime(timeRemaining)}
                </Text>
              )}
              {timerMode === TimerMode.END_OF_SONG && timeRemaining === -1 && (
                <Text style={styles.statusText}>
                  🎵 Will stop after current song ends
                </Text>
              )}
            </View>
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
    paddingVertical: 6,
  },
  timerInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  timerOptionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginHorizontal: 3,
    borderWidth: 1,
    borderColor: '#444',
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  endOfSongButton: {
    backgroundColor: '#23242a',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginHorizontal: 3,
    borderWidth: 1,
    borderColor: '#444',
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearButton: {
    backgroundColor: '#23242a',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginHorizontal: 3,
    borderWidth: 1,
    borderColor: '#444',
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  testButton: {
    backgroundColor: '#23242a',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 6,
    borderWidth: 1,
    borderColor: '#444',
  },
  buttonText: {
    color: '#007AFF',
    fontWeight: '600',
    fontSize: 11,
    textAlign: 'center',
  },
  clearButtonText: {
    color: '#007AFF',
    fontWeight: '600',
    fontSize: 11,
    textAlign: 'center',
  },
  testButtonText: {
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
  scheduledStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusText: {
    fontSize: 12,
    color: '#fff',
    textAlign: 'center',
    fontWeight: '500',
    flex: 1,
  },
  disabledButton: {
    backgroundColor: '#444',
  },
  disabledButtonText: {
    color: '#888',
  },
  timerToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#23242a',
    borderRadius: 6,
    marginHorizontal: 12,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: '#444',
  },
  timerToggleText: {
    color: '#007AFF',
    fontSize: 12,
    fontWeight: '600',
  },
  timerIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF6B35',
    marginLeft: 8,
  },
});