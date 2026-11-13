import { router, useGlobalSearchParams, usePathname } from "expo-router";
import { type ReactNode, createContext, use, useEffect, useState } from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { type SourceFilter, isSourceFilter } from "@/lib/feeds";

import { SourceSidebar } from "./source-sidebar";

/**
 * A two-column layout that works the same on iOS and Android.
 *
 * At regular width (tablets, unfolded foldables like the iPhone Duo, large phones in landscape) the
 * sources sidebar sits beside the navigation stack. At compact width the sidebar disappears and the
 * stack's first screen lists the sources instead, so the app becomes a normal drill-down.
 *
 * The stack is never more than two screens deep — `index` and one `[source]` — so folding or
 * rotating at any point leaves a sensible back stack:
 *  - wide: `index` shows All News; picking a source pushes or replaces the `[source]` screen
 *  - compact: `index` shows the sources list; the `[source]` screen's back button returns to it
 */
const WIDE_MIN_WIDTH = 700;

export function useIsWide() {
  return useWindowDimensions().width >= WIDE_MIN_WIDTH;
}

export function sidebarWidth(windowWidth: number) {
  return windowWidth >= 1100 ? 340 : 300;
}

const SidebarContext = createContext({ visible: true, toggle: () => {} });

/** Whether the wide layout's sidebar is open, and a toggle for the sidebar buttons. */
export function useSidebar() {
  return use(SidebarContext);
}

// iOS sheet curve: quick start, long gentle settle.
const EASE_SLIDE = Easing.bezier(0.32, 0.72, 0, 1);
const SLIDE_DURATION = 350;

export function SplitView({ children }: { children: ReactNode }) {
  const { width } = useWindowDimensions();
  const wide = width >= WIDE_MIN_WIDTH;
  const sidebar = wide ? sidebarWidth(width) : 0;
  const reduced = useReducedMotion();
  const [visible, setVisible] = useState(true);

  // Like the native split view's "tile" behavior: the sidebar slides in beside the detail column
  // and the detail column resizes along with it, rather than the sidebar covering it.
  //
  // The sidebar only moves (a transform). The detail column's left edge follows it, which is a
  // layout change every frame; Reanimated applies it on the UI thread, and the article list keeps
  // few rows mounted so each re-layout stays cheap.
  const progress = useSharedValue(1);
  useEffect(() => {
    progress.set(
      reduced
        ? Number(visible)
        : withTiming(Number(visible), {
            duration: SLIDE_DURATION,
            easing: EASE_SLIDE,
          }),
    );
  }, [visible, reduced, progress]);

  const sidebarStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: (progress.get() - 1) * sidebar }],
  }));
  const detailStyle = useAnimatedStyle(() => ({
    left: progress.get() * sidebar,
  }));

  return (
    <SidebarContext value={{ visible, toggle: () => setVisible((v) => !v) }}>
      <View className="flex-1 overflow-hidden bg-white dark:bg-black">
        <Animated.View style={[styles.detail, detailStyle]}>
          {children}
        </Animated.View>
        {wide ? (
          // Fading in avoids a hard pop when a foldable opens or the device rotates.
          <Animated.View
            entering={FadeIn.duration(200)}
            exiting={FadeOut.duration(150)}
            style={[styles.sidebar, { width: sidebar }, sidebarStyle]}
            className="border-r border-neutral-200 dark:border-neutral-800"
          >
            <SourceSidebar />
          </Animated.View>
        ) : null}
      </View>
    </SidebarContext>
  );
}

const styles = StyleSheet.create({
  detail: { position: "absolute", top: 0, bottom: 0, right: 0 },
  sidebar: { position: "absolute", top: 0, bottom: 0, left: 0 },
});

/** The source shown in the detail column: `index` counts as All News. */
export function useSelectedSource(): SourceFilter {
  const pathname = usePathname();
  const params = useGlobalSearchParams<{ source?: string }>();
  if (pathname === "/") return "all";
  return isSourceFilter(params.source) ? params.source : "all";
}

/** Shows a source in the detail column, keeping the stack at most two screens deep. */
export function selectSource(
  source: SourceFilter,
  current: SourceFilter,
  pathname: string,
) {
  if (source === current) return;
  if (source === "all") {
    if (router.canDismiss()) router.dismissAll();
    return;
  }
  if (pathname === "/") {
    router.push({ pathname: "/[source]", params: { source } });
  } else {
    router.replace({ pathname: "/[source]", params: { source } });
  }
}
