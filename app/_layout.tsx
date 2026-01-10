import { Ionicons } from '@expo/vector-icons';
import { Tabs, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { AppState, Linking, PermissionsAndroid, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { MusicPlayerBar } from '../shared/components/music-player/MusicPlayerBar';
import { AudioPlayerProvider } from '../shared/hooks/AudioPlayerContext';
import { MusicProvider } from '../shared/hooks/MusicContext';
import { MusicPlayerHeightProvider } from '../shared/hooks/MusicPlayerHeightContext';
import { setupTrackPlayer } from '../shared/trackPlayerSetup';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);
  const [shouldNavigateToMusicPlayer, setShouldNavigateToMusicPlayer] = useState(false);

  async function requestNotificationPermission() {
    if (Platform.OS === 'android' && Platform.Version >= 33) {
      try {
        // Check if permission is already granted
        const hasPermission = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
        );
        
        if (hasPermission) {
          console.log('Notification permission already granted');
          return true;
        }
        
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
        );
        
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          console.log('Notification permission granted');
          return true;
        } else {
          console.warn('Notification permission not granted!');
          return false;
        }
      } catch (e) {
        console.warn('Notification permission request error:', e);
        return false;
      }
    }
    return true; // For iOS or older Android versions
  }

  async function setupDeepLinking() {
    const { addEventListener } = require('expo-linking');
    
    addEventListener('url', (event: { url: string }) => {
      console.log('📱 Deep link received:', event.url);
      if (event.url.includes('notification.click')) {
        console.log('📱 Notification click detected - navigating to All Songs');
        router.replace('/music-player');
      }
    });
  }

  async function prepare() {
    await setupTrackPlayer();
    
    // Handle notification clicks immediately when app starts
    const initialUrl = await Linking.getInitialURL();
    if (initialUrl && initialUrl.includes('notification.click')) {
      console.log('📱 App opened from notification click - setting navigation flag');
      setShouldNavigateToMusicPlayer(true);
    }
    
    await setupDeepLinking();
    
    // Handle app state changes to prevent unmatched route errors
    const handleAppStateChange = async (nextAppState: string) => {
      if (nextAppState === 'active') {
        const initialUrl = await Linking.getInitialURL();
        console.log('📱 App became active - ensuring proper navigation');
        
        if (initialUrl && initialUrl.includes('notification.click')) {
          console.log('📱 App became active from notification - navigating to All Songs');
          router.replace('/music-player');
        }
      }
    };
    
    AppState.addEventListener('change', handleAppStateChange);
    
    setIsReady(true);
    
    // Hide splash screen after all setup is done
    await SplashScreen.hideAsync();
  }

  useEffect(() => {
    prepare();
    
    // Handle notification clicks when app is already running
    const handleUrl = (url: string) => {
      console.log('📱 Deep link received:', url);
      if (url.includes('notification.click')) {
        console.log('📱 Notification click detected - navigating to All Songs');
        router.replace('/music-player');
      }
    };

    // Check current URL immediately
    Linking.getInitialURL().then(url => {
      if (url && url.includes('notification.click')) {
        console.log('📱 Initial URL contains notification.click - navigating immediately');
        router.replace('/music-player');
      }
    });

    const subscription = Linking.addEventListener('url', ({ url }) => handleUrl(url));
    return () => subscription?.remove();
  }, [router]);

  // Navigate to music player if needed after app is ready
  useEffect(() => {
    if (isReady && shouldNavigateToMusicPlayer) {
      console.log('📱 App ready, navigating to music player from notification');
      router.replace('/music-player');
      setShouldNavigateToMusicPlayer(false);
    }
  }, [isReady, shouldNavigateToMusicPlayer, router]);

  if (!isReady) {
    return null; // Show splash screen while preparing
  }

  return (
    <SafeAreaProvider style={{ backgroundColor: '#181A20' }}>
      <StatusBar style="light" backgroundColor="#181A20" translucent={false} />
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#181A20' }}>
        <MusicProvider>
          <AudioPlayerProvider>
            <MusicPlayerHeightProvider>
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
                  tabBarHideOnKeyboard: false,
                  tabBarShowLabel: true,
                  lazy: false, // Disable lazy loading to prevent white flashes
                }}
                initialRouteName="music-player"
              >
                <Tabs.Screen
                  name="index"
                  options={{
                    href: null,
                  }}
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
            </MusicPlayerHeightProvider>
          </AudioPlayerProvider>
        </MusicProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
