import TrackPlayer from 'react-native-track-player';

// Register the service (required for Android background controls)
TrackPlayer.registerPlaybackService(() => require('../service.js'));

// Minimal player setup (call once at app start)
// export async function setupTrackPlayer() {
//   await TrackPlayer.setupPlayer();
//   await TrackPlayer.updateOptions({
//     capabilities: [
//       Capability.Play,
//       Capability.Pause,
//       Capability.SkipToNext,
//       Capability.SkipToPrevious,
//       Capability.Stop,
//     ],
//     compactCapabilities: [
//       Capability.Play,
//       Capability.Pause,
//       Capability.SkipToNext,
//       Capability.SkipToPrevious,
//     ],
//   });
// } 