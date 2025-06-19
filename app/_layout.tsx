import { Tabs } from "expo-router";
import { StatusBar } from 'expo-status-bar';
import { Text } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { MusicPlayerBar } from './components/music-player/MusicPlayerBar';
import { AudioPlayerProvider } from "./hooks/AudioPlayerContext";
import { MusicProvider } from "./hooks/MusicContext";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <GestureHandlerRootView style={{ flex: 1 }}>
        <MusicProvider>
          <AudioPlayerProvider>
            <SafeAreaView style={{ flex: 1 }} edges={['top']}>
              <Tabs
                screenOptions={{
                  tabBarPosition: 'top',
                  tabBarStyle: {
                    backgroundColor: '#181A20',
                    borderBottomColor: '#23242a',
                    borderTopWidth: 0,
                    borderBottomWidth: 1,
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
                  name="music-player" 
                  options={{ 
                    title: "All Songs",
                    tabBarIcon: ({ color }) => (
                      <Text style={{ color, fontSize: 20 }}>🎵</Text>
                    ),
                  }} 
                />
                <Tabs.Screen 
                  name="playlists" 
                  options={{ 
                    title: "Playlists",
                    tabBarIcon: ({ color }) => (
                      <Text style={{ color, fontSize: 20 }}>📋</Text>
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
