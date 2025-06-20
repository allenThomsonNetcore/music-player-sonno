import { Ionicons } from '@expo/vector-icons';
import { Tabs } from "expo-router";
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { MusicPlayerBar } from './components/music-player/MusicPlayerBar';
import { AudioPlayerProvider } from "./hooks/AudioPlayerContext";
import { MusicProvider } from "./hooks/MusicContext";

export default function RootLayout() {
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
