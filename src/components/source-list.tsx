import { Link, Stack } from "expo-router";
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
import { refreshNews } from "@/lib/news-store";
import { setSourceOrder, useFilters } from "@/lib/source-order";

import { FilterIcon, useFilterCounts } from "./filter-icon";
import { ReorderableList } from "./reorderable-list";
import { SourcesHeader } from "./sources-header";
import { ToolbarIcons } from "./toolbar-icons";

const ROW_HEIGHT = 56;

/** The sources list at compact width. Regular width shows `SourceSidebar` instead. */
export function SourceList() {
  const [allNews, ...sources] = useFilters();
  const [editing, setEditing] = useState(false);
  const insets = useSafeAreaInsets();

  return (
    <>
      <Stack.Screen options={{ title: "XR Feed" }} />
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          icon={ToolbarIcons.refresh}
          accessibilityLabel="Refresh"
          onPress={refreshNews}
        />
      </Stack.Toolbar>
      <ScrollView
        className="flex-1 bg-white dark:bg-black"
        contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
        contentInsetAdjustmentBehavior="automatic"
      >
        <SourceRow filter={allNews} editing={editing} handle={null} />
        <SourcesHeader
          editing={editing}
          onToggleEditing={() => setEditing((e) => !e)}
          className="px-4 pb-2 pt-6"
        />
        <ReorderableList
          items={sources}
          keyOf={(filter) => filter.id}
          rowHeight={ROW_HEIGHT}
          editing={editing}
          onReorder={(ids) => setSourceOrder(ids as SourceId[])}
          renderItem={(filter, handle) => (
            <SourceRow filter={filter} editing={editing} handle={handle} />
          )}
        />
      </ScrollView>
    </>
  );
}

function SourceRow({
  filter,
  editing,
  handle,
}: {
  filter: Filter;
  editing: boolean;
  handle: ReactNode;
}) {
  const counts = useFilterCounts();
  const isDark = useColorScheme() === "dark";
  const count = counts[filter.id] ?? 0;

  const content = (
    <>
      <FilterIcon filter={filter} size={28} />
      <Text
        numberOfLines={1}
        className="flex-1 text-base text-black dark:text-white"
      >
        {filter.name}
      </Text>
      {handle ?? (
        <>
          {count > 0 ? (
            <Text className="text-base text-neutral-500 dark:text-neutral-400">
              {count}
            </Text>
          ) : null}
          <SymbolView
            name={{ ios: "chevron.right", android: "chevron_right" }}
            size={14}
            // neutral-400 / neutral-500
            tintColor={isDark ? "#a3a3a3" : "#737373"}
          />
        </>
      )}
    </>
  );

  // Opaque, so a dragged row covers the rows it passes over.
  const rowClass =
    "flex-row items-center gap-3 border-b border-neutral-200 bg-white pl-4 dark:border-neutral-800 dark:bg-black";

  if (editing) {
    return (
      <View
        style={{ height: ROW_HEIGHT }}
        className={[rowClass, handle ? "pr-1" : "pr-4 opacity-40"].join(" ")}
      >
        {content}
      </View>
    );
  }
  return (
    <Link
      href={{ pathname: "/[source]", params: { source: filter.id } }}
      asChild
    >
      <Pressable
        style={{ height: ROW_HEIGHT }}
        className={[
          rowClass,
          "pr-4 active:bg-neutral-100 dark:active:bg-neutral-900",
        ].join(" ")}
      >
        {content}
      </Pressable>
    </Link>
  );
}
