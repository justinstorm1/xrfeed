import * as SplashScreen from 'expo-splash-screen';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { Image, StyleSheet, View, useColorScheme } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

// Keep the native splash up until the animated one has drawn its first frame in the same spot.
SplashScreen.preventAutoHideAsync();
SplashScreen.setOptions({ duration: 0, fade: false });

/** Matches `imageWidth` for expo-splash-screen in app.json, so the handoff is seamless. */
const ICON_SIZE = 140;
/** The broadcast waves' shared center, as a fraction of the icon (measured from the artwork). */
const WAVE_ORIGIN = '62% 42.5%';
/** When the icon starts zooming away to reveal the app. */
const REVEAL_AT = 760;

const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
const EASE_IN_OUT = Easing.bezier(0.77, 0, 0.175, 1);

const IMAGES = {
  flat: require('@/assets/images/XRFeed.png'),
  tile: require('@/assets/images/splash/tile.png'),
  headset: require('@/assets/images/splash/headset.png'),
  waveInner: require('@/assets/images/splash/wave-inner.png'),
  waveOuter: require('@/assets/images/splash/wave-outer.png'),
};
const IMAGE_COUNT = Object.keys(IMAGES).length;

/**
 * Takes over from the native splash with the same icon, then plays a short launch animation:
 * the icon dips, springs back while its two signal waves broadcast out one after the other, the
 * name fades in, and the icon zooms through the screen as the app settles into place.
 *
 * Runs once per cold launch (~1.3s). With Reduce Motion on, it simply fades out.
 */
export function AnimatedSplash({ children }: { children: ReactNode }) {
  const [done, setDone] = useState(false);
  const reduced = useReducedMotion();
  const isDark = useColorScheme() === 'dark';

  const loaded = useRef(0);
  const started = useRef(false);

  const flat = useSharedValue(1);
  const tile = useSharedValue(1);
  const inner = useSharedValue(1);
  const outer = useSharedValue(1);
  const title = useSharedValue(0);
  const zoom = useSharedValue(1);
  const icon = useSharedValue(1);
  const backdrop = useSharedValue(1);
  const app = useSharedValue(1);

  function start() {
    if (started.current) return;
    started.current = true;
    // The overlay now shows exactly what the native splash showed.
    SplashScreen.hide();
    const finish = () => setDone(true);

    if (reduced) {
      icon.set(withTiming(0, { duration: 250 }));
      backdrop.set(
        withTiming(0, { duration: 250 }, (finished) => {
          if (finished) scheduleOnRN(finish);
        }),
      );
      return;
    }

    // Swap the flattened icon for its layers, and pull the waves in so they can broadcast.
    flat.set(withTiming(0, { duration: 160, easing: EASE_OUT }));
    inner.set(
      withSequence(
        withTiming(0, { duration: 160, easing: EASE_OUT }),
        withDelay(100, withTiming(1, { duration: 280, easing: EASE_OUT })),
      ),
    );
    outer.set(
      withSequence(
        withTiming(0, { duration: 160, easing: EASE_OUT }),
        withDelay(220, withTiming(1, { duration: 300, easing: EASE_OUT })),
      ),
    );
    // Dip, then spring back as the signal goes out.
    tile.set(
      withSequence(
        withTiming(0.9, { duration: 220, easing: EASE_IN_OUT }),
        withSpring(1, { duration: 500, dampingRatio: 0.55 }),
      ),
    );
    title.set(
      withSequence(
        withDelay(380, withTiming(1, { duration: 320, easing: EASE_OUT })),
        withDelay(REVEAL_AT - 700, withTiming(0, { duration: 150, easing: EASE_OUT })),
      ),
    );
    // Reveal: the icon zooms through the screen while the app settles into place behind it.
    zoom.set(withDelay(REVEAL_AT, withTiming(9, { duration: 480, easing: EASE_IN_OUT })));
    icon.set(withDelay(REVEAL_AT + 160, withTiming(0, { duration: 260, easing: EASE_OUT })));
    // Shrink the app while it's hidden behind the backdrop, then settle it as the icon zooms away.
    app.set(
      withSequence(
        withTiming(0.94, { duration: 0 }),
        withDelay(REVEAL_AT + 80, withTiming(1, { duration: 520, easing: EASE_OUT })),
      ),
    );
    backdrop.set(
      withDelay(
        REVEAL_AT + 140,
        withTiming(0, { duration: 340, easing: EASE_OUT }, (finished) => {
          if (finished) scheduleOnRN(finish);
        }),
      ),
    );
  }

  function onImageLoad() {
    loaded.current += 1;
    if (loaded.current === IMAGE_COUNT) start();
  }

  // Never hold the app hostage to an image callback that doesn't arrive.
  useEffect(() => {
    const timeout = setTimeout(start, 800);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const appStyle = useAnimatedStyle(() => ({ transform: [{ scale: app.get() }] }));
  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdrop.get() }));
  const iconStyle = useAnimatedStyle(() => ({
    opacity: icon.get(),
    transform: [{ scale: zoom.get() }],
  }));
  const tileStyle = useAnimatedStyle(() => ({ transform: [{ scale: tile.get() }] }));
  const flatStyle = useAnimatedStyle(() => ({ opacity: flat.get() }));
  const innerStyle = useAnimatedStyle(() => ({
    opacity: inner.get(),
    transform: [{ scale: 0.6 + 0.4 * inner.get() }],
  }));
  const outerStyle = useAnimatedStyle(() => ({
    opacity: outer.get(),
    transform: [{ scale: 0.6 + 0.4 * outer.get() }],
  }));
  const titleStyle = useAnimatedStyle(() => ({
    opacity: title.get(),
    transform: [{ translateY: 10 * (1 - title.get()) }],
  }));

  return (
    <View style={styles.fill}>
      <Animated.View style={[styles.fill, appStyle]}>{children}</Animated.View>
      {done ? null : (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          {/* Same colors as the native splash in app.json. */}
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: isDark ? '#000000' : '#ffffff' },
              backdropStyle,
            ]}
          />
          <View style={styles.center}>
            <Animated.View style={[styles.icon, iconStyle]}>
              <Animated.View style={[styles.layer, tileStyle]}>
                <Layer source={IMAGES.tile} onLoad={onImageLoad} />
                <Layer source={IMAGES.headset} onLoad={onImageLoad} />
                <Animated.View
                  style={[styles.layer, { transformOrigin: WAVE_ORIGIN }, innerStyle]}>
                  <Layer source={IMAGES.waveInner} onLoad={onImageLoad} />
                </Animated.View>
                <Animated.View
                  style={[styles.layer, { transformOrigin: WAVE_ORIGIN }, outerStyle]}>
                  <Layer source={IMAGES.waveOuter} onLoad={onImageLoad} />
                </Animated.View>
              </Animated.View>
              {/* The exact native splash image on top, so the first frame matches it. */}
              <Animated.View style={[styles.layer, flatStyle]}>
                <Layer source={IMAGES.flat} onLoad={onImageLoad} />
              </Animated.View>
            </Animated.View>
            <Animated.Text
              style={[styles.title, { color: isDark ? '#ffffff' : '#0a0a0a' }, titleStyle]}>
              XR Feed
            </Animated.Text>
          </View>
        </View>
      )}
    </View>
  );
}

function Layer({ source, onLoad }: { source: number; onLoad: () => void }) {
  // An explicit size: with only absolute edges, images fell back to their 512px natural size.
  return <Image source={source} style={styles.layer} onLoad={onLoad} fadeDuration={0} />;
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { width: ICON_SIZE, height: ICON_SIZE },
  layer: { position: 'absolute', left: 0, top: 0, width: ICON_SIZE, height: ICON_SIZE },
  // Positioned below the icon without moving it off the native splash's center.
  title: {
    position: 'absolute',
    top: '50%',
    marginTop: ICON_SIZE / 2 + 20,
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
});
