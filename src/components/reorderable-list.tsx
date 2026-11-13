import * as Haptics from "expo-haptics";
import { SymbolView } from "expo-symbols";
import { type ReactNode, useEffect } from "react";
import { View, useColorScheme } from "react-native";
import { GestureDetector, usePanGesture } from "react-native-gesture-handler";
import Animated, {
  Easing,
  type SharedValue,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

type Positions = Record<string, number>;

const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);

function toPositions(keys: readonly string[]): Positions {
  return Object.fromEntries(keys.map((key, index) => [key, index]));
}

/** Moves `key` from `from` to `to`, shifting the rows in between by one. */
function move(
  positions: Positions,
  key: string,
  from: number,
  to: number,
): Positions {
  "worklet";
  const next: Positions = {};
  for (const k in positions) {
    const p = positions[k];
    if (k === key) next[k] = to;
    else if (from < to && p > from && p <= to) next[k] = p - 1;
    else if (to < from && p >= to && p < from) next[k] = p + 1;
    else next[k] = p;
  }
  return next;
}

function clamp(value: number, min: number, max: number) {
  "worklet";
  return Math.min(Math.max(value, min), max);
}

/**
 * A short list whose rows can be dragged into a new order by their handle while `editing`.
 *
 * Rows have a fixed height and move with transforms only; the dragged row follows the finger
 * on the UI thread and the others slide out of its way. The new order is reported once, on drop.
 */
export function ReorderableList<T>({
  items,
  keyOf,
  rowHeight,
  editing,
  renderItem,
  onReorder,
}: {
  items: readonly T[];
  keyOf: (item: T) => string;
  rowHeight: number;
  editing: boolean;
  /** Renders a row's content. `handle` is the drag handle while editing, otherwise null. */
  renderItem: (item: T, handle: ReactNode) => ReactNode;
  onReorder: (keys: string[]) => void;
}) {
  const keys = items.map(keyOf);
  const keysSignature = keys.join("|");
  const positions = useSharedValue<Positions>(toPositions(keys));

  // A saved order (or a reset) arrives as new `items`; line the rows up with it.
  useEffect(() => {
    positions.set(toPositions(keysSignature.split("|")));
  }, [keysSignature, positions]);

  function drop(finalPositions: Positions) {
    const next = Object.keys(finalPositions).sort(
      (a, b) => finalPositions[a] - finalPositions[b],
    );
    if (next.join("|") !== keysSignature) onReorder(next);
  }

  return (
    <View style={{ height: items.length * rowHeight }}>
      {items.map((item, index) => {
        const key = keys[index];
        return (
          <Row
            key={key}
            id={key}
            index={index}
            count={items.length}
            rowHeight={rowHeight}
            positions={positions}
            editing={editing}
            onDrop={drop}
          >
            {(handle) => renderItem(item, handle)}
          </Row>
        );
      })}
    </View>
  );
}

function Row({
  id,
  index,
  count,
  rowHeight,
  positions,
  editing,
  onDrop,
  children,
}: {
  id: string;
  index: number;
  count: number;
  rowHeight: number;
  positions: SharedValue<Positions>;
  editing: boolean;
  onDrop: (positions: Positions) => void;
  children: (handle: ReactNode) => ReactNode;
}) {
  const isDark = useColorScheme() === "dark";
  const top = useSharedValue(index * rowHeight);
  const startTop = useSharedValue(0);
  const dragging = useSharedValue(false);

  // Slide into a new slot when another row is dragged past this one.
  useAnimatedReaction(
    () => positions.get()[id],
    (position, previous) => {
      if (position === undefined || position === previous || dragging.get())
        return;
      const y = position * rowHeight;
      top.set(
        previous == null
          ? y
          : withTiming(y, { duration: 200, easing: EASE_OUT }),
      );
    },
  );

  const pan = usePanGesture({
    enabled: editing,
    minDistance: 0,
    onActivate: () => {
      "worklet";
      dragging.set(true);
      startTop.set(top.get());
      scheduleOnRN(Haptics.impactAsync, Haptics.ImpactFeedbackStyle.Light);
    },
    onUpdate: (event) => {
      "worklet";
      const y = clamp(
        startTop.get() + event.translationY,
        0,
        (count - 1) * rowHeight,
      );
      top.set(y);
      const from = positions.get()[id];
      const to = clamp(Math.round(y / rowHeight), 0, count - 1);
      // Only crosses back to JS when the row passes a slot, not every frame.
      if (from !== undefined && to !== from) {
        positions.set(move(positions.get(), id, from, to));
        scheduleOnRN(Haptics.selectionAsync);
      }
    },
    onFinalize: () => {
      "worklet";
      if (!dragging.get()) return;
      dragging.set(false);
      const final = positions.get();
      top.set(
        withSpring((final[id] ?? 0) * rowHeight, {
          duration: 300,
          dampingRatio: 0.8,
        }),
      );
      scheduleOnRN(onDrop, final);
    },
  });

  const style = useAnimatedStyle(() => ({
    zIndex: dragging.get() ? 10 : 0,
    transform: [
      { translateY: top.get() },
      { scale: withTiming(dragging.get() ? 1.03 : 1, { duration: 150 }) },
    ],
    shadowOpacity: withTiming(dragging.get() ? 0.18 : 0, { duration: 150 }),
  }));

  const handle = editing ? (
    <GestureDetector gesture={pan}>
      <View
        accessibilityLabel="Drag to reorder"
        hitSlop={8}
        style={{
          width: 44,
          height: rowHeight,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <SymbolView
          name={{ ios: "line.3.horizontal", android: "drag_handle" }}
          size={20}
          tintColor={isDark ? "#a3a3a3" : "#737373"}
        />
      </View>
    </GestureDetector>
  ) : null;

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          left: 0,
          right: 0,
          top: 0,
          height: rowHeight,
          shadowColor: "#000",
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 4 },
        },
        style,
      ]}
    >
      {children(handle)}
    </Animated.View>
  );
}
