import { Ionicons } from '@expo/vector-icons';
import { Tabs } from "expo-router";
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import TrackPlayer, { AppKilledPlaybackBehavior, Capability } from 'react-native-track-player';
import { MusicPlayerBar } from './components/music-player/MusicPlayerBar';
import { AudioPlayerProvider } from "./hooks/AudioPlayerContext";
import { MusicProvider } from "./hooks/MusicContext";

// Keep splash screen visible while we do async setup
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useEffect(() => {
    async function setupTrackPlayer() {
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
          Capability.SeekTo,
        ],
        notificationCapabilities: [
          Capability.Play,
          Capability.Pause,
          Capability.SkipToNext,
          Capability.SkipToPrevious,
          Capability.Stop,
          Capability.SeekTo,
          Capability.JumpForward,
          Capability.JumpBackward,
        ],
        android: {
          appKilledPlaybackBehavior: AppKilledPlaybackBehavior.StopPlaybackAndRemoveNotification,
        },
      });
      console.log('✅ TrackPlayer setup completed with seek capabilities');
      await TrackPlayer.play();
    }
    async function requestNotificationPermission() {
      if (Platform.OS === 'android' && Platform.Version >= 33) {
        try {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
          );
          if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
            console.warn('Notification permission not granted!');
          }
        } catch (e) {
          console.warn('Notification permission request error:', e);
        }
      }
    }
    async function prepare() {
      await setupTrackPlayer();
      await requestNotificationPermission();
      // Hide splash screen after all setup is done
      await SplashScreen.hideAsync();
    }
    prepare();
  }, []);

  return (
    <SafeAreaProvider>
    <StatusBar style="light" backgroundColor="#181A20" translucent={false} />
      <GestureHandlerRootView style={{ flex: 1 }}>
        <MusicProvider>
          <AudioPlayerProvider>
            <SafeAreaView style={{ flex: 1, backgroundColor: '#181A20' }} edges={['top', 'left', 'right']}>
              <Tabs
                screenOptions={{
                  tabBarPosition: 'top',
                  tabBarStyle: {
                    backgroundColor: '#181A20',
                    borderBottomColor: '#23242a',
                    borderTopWidth: 0,
           
                    paddingTop: 10,
                    paddingBottom: 10,
                    height: 60,
                  },
                  tabBarActiveTintColor: '#007AFF',
                  tabBarInactiveTintColor: '#888',
                  tabBarLabelStyle: {
                    fontSize: 12,
                    fontWeight: '600',
                  },
                  headerShown: false,
                }}
              >
                <Tabs.Screen
                  name="index"
                  options={{ href: null }}
                />
                <Tabs.Screen 
                  name="music-player" 
                  options={{ 
                    title: "All Songs",
                    tabBarIcon: ({ color }) => (
                      <Ionicons name="musical-notes-outline" size={22} color={color} />
                    ),
                  }} 
                />
                <Tabs.Screen
                  name="recently-played"
                  options={{
                    title: "Recently Played",
                    tabBarIcon: ({ color }) => (
                      <Ionicons name="time-outline" size={22} color={color} />
                    ),
                  }}
                />
                <Tabs.Screen 
                  name="playlists" 
                  options={{ 
                    title: "Playlists",
                    tabBarIcon: ({ color }) => (
                      <Ionicons name="list-outline" size={22} color={color} />
                    ),
                  }} 
                />
              </Tabs>
              <MusicPlayerBar />
            </SafeAreaView>
          </AudioPlayerProvider>
        </MusicProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
