import TrackPlayer from 'react-native-track-player';

module.exports = async function () {
  // Simple notification control handlers - no navigation
  TrackPlayer.addEventListener('remote-play', () => {
    console.log('📱 Play button tapped');
    TrackPlayer.play();
  });
  
  TrackPlayer.addEventListener('remote-pause', () => {
    console.log('📱 Pause button tapped');
    TrackPlayer.pause();
  });
  
  TrackPlayer.addEventListener('remote-stop', () => {
    console.log('📱 Stop button tapped');
    TrackPlayer.stop();
  });
  
  TrackPlayer.addEventListener('remote-next', () => {
    console.log('📱 Next button tapped');
    TrackPlayer.skipToNext();
  });
  
  TrackPlayer.addEventListener('remote-previous', () => {
    console.log('📱 Previous button tapped');
    TrackPlayer.skipToPrevious();
  });
  
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
}; 