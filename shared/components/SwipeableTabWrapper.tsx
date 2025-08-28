
import { useRouter } from 'expo-router';
import React from 'react';
import { View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';

interface SwipeableTabWrapperProps {
  children: React.ReactNode;
  currentTab: string;
}

const TAB_ORDER = ['music-player', 'recently-played', 'playlists'];

export const SwipeableTabWrapper: React.FC<SwipeableTabWrapperProps> = ({
  children,
  currentTab
}) => {
  const router = useRouter();

  const navigateToTab = (tabName: string) => {
    router.push(`/${tabName}` as any);
  };

  const panGesture = Gesture.Pan()
    .minPointers(1)           // Require exactly 1 finger
    .maxPointers(1)           // Don't interfere with multi-touch gestures
    .activeOffsetX([-10, 10]) // Only activate when horizontal movement > 10px
    .failOffsetY([-20, 20])   // Fail if vertical movement > 20px (allow scrolling)
    .onEnd((event) => {
      const { translationX, velocityX, translationY } = event;

      // Minimum swipe distance and velocity thresholds
      const SWIPE_THRESHOLD = 50;
      const VELOCITY_THRESHOLD = 500;

      // Only process if it's primarily a horizontal gesture
      if (Math.abs(translationY) > Math.abs(translationX)) {
        return; // This is more of a vertical gesture, ignore it
      }

      const currentIndex = TAB_ORDER.indexOf(currentTab);

      // Swipe right (positive translationX) - go to previous tab
      if ((translationX > SWIPE_THRESHOLD || velocityX > VELOCITY_THRESHOLD) && currentIndex > 0) {
        const previousTab = TAB_ORDER[currentIndex - 1];
        runOnJS(navigateToTab)(previousTab);
      }
      // Swipe left (negative translationX) - go to next tab
      else if ((translationX < -SWIPE_THRESHOLD || velocityX < -VELOCITY_THRESHOLD) && currentIndex < TAB_ORDER.length - 1) {
        const nextTab = TAB_ORDER[currentIndex + 1];
        runOnJS(navigateToTab)(nextTab);
      }
    });

  return (
    <GestureDetector gesture={panGesture}>
      <View style={{ flex: 1 }}>
        {children}
      </View>
    </GestureDetector>
  );
};
