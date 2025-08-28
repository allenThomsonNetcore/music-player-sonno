import TrackPlayer, { AppKilledPlaybackBehavior, Capability } from 'react-native-track-player';

// Register the service (required for Android background controls)
TrackPlayer.registerPlaybackService(() => require('../service.js'));

// Player setup (call once at app start)
export async function setupTrackPlayer() {
  await TrackPlayer.setupPlayer();
  await TrackPlayer.updateOptions({
    capabilities: [
      Capability.Play,
      Capability.Pause,
      Capability.SkipToNext,
      Capability.SkipToPrevious,
      Capability.Stop,
      Capability.SeekTo,
      Capability.JumpForward,
      Capability.JumpBackward,
    
   
    ],
    compactCapabilities: [
      Capability.Play,
      Capability.Pause,
      Capability.SkipToNext,
      Capability.SkipToPrevious,
      Capability.JumpForward,
      Capability.JumpBackward,
    ],
    android: {
      appKilledPlaybackBehavior: AppKilledPlaybackBehavior.StopPlaybackAndRemoveNotification,
    },
  });
} 