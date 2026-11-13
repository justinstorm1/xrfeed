import { Image } from "expo-image";
import { usePathname } from "expo-router";
import { SymbolView } from "expo-symbols";
import { type ReactNode, useState } from "react";
import {
  Pressable,
  ScrollView,
  Text,
  View,
  useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { Filter, SourceId } from "@/lib/feeds";
import { setSourceOrder, useFilters } from "@/lib/source-order";

import { FilterIcon, useFilterCounts } from "./filter-icon";
import { ReorderableList } from "./reorderable-list";
import { SourcesHeader } from "./sources-header";
import { selectSource, useSelectedSource, useSidebar } from "./split-view";

/** Each row is 52pt tall with a 4pt gap below it. */
const ROW_HEIGHT = 56;

/** The split view's sidebar column. Compact width uses `SourceList` instead. */
export function SourceSidebar() {
  const insets = useSafeAreaInsets();
  const [allNews, ...sources] = useFilters();
  const [editing, setEditing] = useState(false);
  const sidebar = useSidebar();
  const isDark = useColorScheme() === "dark";

  return (
    <ScrollView
      className="flex-1 bg-neutral-50 dark:bg-neutral-950"
      contentContainerStyle={{
        paddingTop: insets.top + 16,
        paddingBottom: insets.bottom + 24,
        paddingLeft: insets.left,
      }}
    >
      <View className="flex-row items-center gap-3 px-6 pb-6">
        <Image
          source={require("@/assets/images/XRFeed.png")}
          style={{ width: 36, height: 36 }}
          accessible={false}
        />
        <Text className="flex-1 text-2xl font-bold text-black dark:text-white">
          XR Feed
        </Text>
        {/* Closes the sidebar; the detail column's header then shows the button to reopen it. */}
        <Pressable
          onPress={sidebar.toggle}
          accessibilityRole="button"
          accessibilityLabel="Hide sidebar"
          hitSlop={10}
          className="h-9 w-9 items-center justify-center rounded-full active:bg-neutral-200 dark:active:bg-neutral-800"
        >
          <SymbolView
            name={{ ios: "sidebar.left", android: "left_panel_close" }}
            size={22}
            tintColor={isDark ? "#60a5fa" : "#2563eb"}
          />
        </Pressable>
      </View>

      <SidebarRow filter={allNews} editing={editing} handle={null} />
      <SourcesHeader
        editing={editing}
        onToggleEditing={() => setEditing((e) => !e)}
        className="px-6 pb-3 pt-5"
      />
      <ReorderableList
        items={sources}
        keyOf={(filter) => filter.id}
        rowHeight={ROW_HEIGHT}
        editing={editing}
        onReorder={(ids) => setSourceOrder(ids as SourceId[])}
        renderItem={(filter, handle) => (
          <SidebarRow filter={filter} editing={editing} handle={handle} />
        )}
      />
    </ScrollView>
  );
}

function SidebarRow({
  filter,
  editing,
  handle,
}: {
  filter: Filter;
  editing: boolean;
  handle: ReactNode;
}) {
  const counts = useFilterCounts();
  const selected = useSelectedSource();
  const pathname = usePathname();
  const isSelected = !editing && filter.id === selected;
  const count = counts[filter.id] ?? 0;

  const content = (
    <>
      <FilterIcon
        filter={filter}
        size={26}
        tintColor={isSelected ? "white" : undefined}
      />
      <Text
        numberOfLines={1}
        className={[
          "flex-1 text-base",
          isSelected
            ? "font-semibold text-white"
            : "text-black dark:text-white",
        ].join(" ")}
      >
        {filter.name}
      </Text>
      {handle ??
        (count > 0 && !editing ? (
          <Text
            className={[
              "text-sm tabular-nums",
              isSelected
                ? "text-white/80"
                : "text-neutral-500 dark:text-neutral-400",
            ].join(" ")}
          >
            {count}
          </Text>
        ) : null)}
    </>
  );

  const pill = "h-[52px] flex-row items-center gap-3.5 rounded-xl";

  return (
    <View style={{ height: ROW_HEIGHT }} className="px-4">
      {editing ? (
        // Opaque, so a dragged row covers the rows it passes over.
        <View
          className={[
            pill,
            "bg-white pl-3.5 dark:bg-neutral-900",
            handle ? "pr-0" : "pr-3.5 opacity-40",
          ].join(" ")}
        >
          {content}
        </View>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: isSelected }}
          onPress={() => selectSource(filter.id, selected, pathname)}
          className={[
            pill,
            "px-3.5",
            isSelected
              ? "bg-blue-600 dark:bg-blue-500"
              : "active:bg-neutral-200 dark:active:bg-neutral-800",
          ].join(" ")}
        >
          {content}
        </Pressable>
      )}
    </View>
  );
}
