import { Audio } from 'expo-av';

export const setupAudio = async () => {
  try {
    await Audio.requestPermissionsAsync();
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      shouldDuckAndroid: true,
    });
    return true;
  } catch (error) {
    console.error('Error setting up audio:', error);
    return false;
  }
};

export const formatTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

export const calculateProgress = (positionMillis: number, durationMillis: number): number => {
  if (!durationMillis) return 0;
  return positionMillis / durationMillis;
}; 