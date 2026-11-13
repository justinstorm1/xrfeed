import { Image } from 'expo-image';
import { View } from 'react-native';

/**
 * A site's favicon on a white rounded tile. Favicons are drawn for a white browser tab, so some are
 * black or white on transparent; the tile keeps every one legible in both light and dark mode.
 */
export function SourceIcon({ source, size = 24 }: { source: number; size?: number }) {
  const padding = Math.max(1, Math.round(size / 12));
  return (
    <View
      style={{
        width: size,
        height: size,
        padding,
        borderRadius: size / 4,
        borderCurve: 'continuous',
        backgroundColor: 'white',
        overflow: 'hidden',
      }}>
      <Image
        source={source}
        style={{ flex: 1, borderRadius: size / 6 }}
        contentFit="contain"
        accessible={false}
      />
    </View>
  );
}
