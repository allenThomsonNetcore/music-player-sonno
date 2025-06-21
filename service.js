import TrackPlayer from 'react-native-track-player';

module.exports = async function () {
  TrackPlayer.addEventListener('remote-play', () => TrackPlayer.play());
  TrackPlayer.addEventListener('remote-pause', () => TrackPlayer.pause());
  TrackPlayer.addEventListener('remote-stop', () => TrackPlayer.stop());
  TrackPlayer.addEventListener('remote-next', () => TrackPlayer.skipToNext());
  TrackPlayer.addEventListener('remote-previous', () => TrackPlayer.skipToPrevious());
  
  // Handle seek events from notification controls
  TrackPlayer.addEventListener('remote-seek', async (event) => {
    try {
      console.log('🎯 Remote seek to position:', event.position);
      await TrackPlayer.seekTo(event.position);
    } catch (error) {
      console.error('❌ Error seeking to position:', error);
    }
  });
  
  // Handle jump forward/backward events
  TrackPlayer.addEventListener('remote-jump-forward', async (event) => {
    try {
      const currentPosition = await TrackPlayer.getPosition();
      const newPosition = currentPosition + (event.interval || 15);
      console.log('⏭️ Jumping forward to:', newPosition);
      await TrackPlayer.seekTo(newPosition);
    } catch (error) {
      console.error('❌ Error jumping forward:', error);
    }
  });
  
  TrackPlayer.addEventListener('remote-jump-backward', async (event) => {
    try {
      const currentPosition = await TrackPlayer.getPosition();
      const newPosition = Math.max(0, currentPosition - (event.interval || 15));
      console.log('⏮️ Jumping backward to:', newPosition);
      await TrackPlayer.seekTo(newPosition);
    } catch (error) {
      console.error('❌ Error jumping backward:', error);
    }
  });
  // You can add more event handlers here if needed
}; 