export interface Song {
  id: string;
  title: string;
  uri: string;
  duration?: number;
}

export interface PlaybackStatus {
  isLoaded: boolean;
  positionMillis: number;
  durationMillis: number;
  isPlaying: boolean;
} 