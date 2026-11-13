import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useColorScheme } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { AnimatedSplash } from "@/components/animated-splash";
import { SplitView, useIsWide } from "@/components/split-view";
import "./global.css";

/**
 * One layout for iOS and Android: a custom split view around a native stack.
 *  - `index`: All News when wide (the sidebar lists the sources), the sources list when compact
 *  - `[source]`: that source's articles
 *
 * Tapping an article opens the publisher's own page in the in-app browser, so the publisher gets
 * the page view.
 */
export default function RootLayout() {
  const colorScheme = useColorScheme();
  const wide = useIsWide();

  return (
    // Gesture Handler needs a root view for the drag-to-reorder source lists.
    <GestureHandlerRootView style={{ flex: 1 }}>
      {/* Without a theme, navigators use the light theme and paint white behind screens while
          they mount, which flashes in dark mode. */}
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <StatusBar style="auto" />
        <AnimatedSplash>
          <SplitView>
            <Stack screenOptions={{ headerBackButtonDisplayMode: "minimal" }}>
              <Stack.Screen name="index" />
              <Stack.Screen
                name="[source]/index"
                options={{
                  title: "",
                  // When wide, the sidebar switches sources: no back button, swipe or slide.
                  headerBackVisible: !wide,
                  gestureEnabled: !wide,
                  animation: wide ? "none" : "default",
                }}
              />
            </Stack>
          </SplitView>
        </AnimatedSplash>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
