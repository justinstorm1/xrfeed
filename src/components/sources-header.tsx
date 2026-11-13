import { Pressable, Text, View } from "react-native";

import {
  isDefaultOrder,
  resetSourceOrder,
  useOrderedSources,
} from "@/lib/source-order";

/** The "Sources" section label, with Edit/Done to reorder and Reset once the order is custom. */
export function SourcesHeader({
  editing,
  onToggleEditing,
  className,
}: {
  editing: boolean;
  onToggleEditing: () => void;
  className?: string;
}) {
  const sources = useOrderedSources();
  const custom = !isDefaultOrder(sources.map((source) => source.id));

  return (
    <View
      className={["flex-row items-center gap-4", className]
        .filter(Boolean)
        .join(" ")}
    >
      <Text className="flex-1 text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
        Sources
      </Text>
      {editing && custom ? (
        <TextButton label="Reset" onPress={resetSourceOrder} />
      ) : null}
      <TextButton
        label={editing ? "Done" : "Edit"}
        bold={editing}
        accessibilityLabel={
          editing ? "Done reordering sources" : "Reorder sources"
        }
        onPress={onToggleEditing}
      />
    </View>
  );
}

function TextButton({
  label,
  bold,
  accessibilityLabel,
  onPress,
}: {
  label: string;
  bold?: boolean;
  accessibilityLabel?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      hitSlop={12}
      className="active:opacity-50"
    >
      <Text
        className={[
          "text-[15px] text-blue-600 dark:text-blue-400",
          bold ? "font-semibold" : "",
        ].join(" ")}
      >
        {label}
      </Text>
    </Pressable>
  );
}
