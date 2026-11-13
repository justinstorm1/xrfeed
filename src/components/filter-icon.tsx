import { SymbolView } from 'expo-symbols';
import { useColorScheme } from 'react-native';

import type { Filter } from '@/lib/feeds';
import { useNews } from '@/lib/news-store';

import { SourceIcon } from './source-icon';

/** A source's favicon, or the newspaper symbol for All News. */
export function FilterIcon({
  filter,
  size,
  tintColor,
}: {
  filter: Filter;
  size: number;
  tintColor?: string;
}) {
  const isDark = useColorScheme() === 'dark';
  if (filter.icon) return <SourceIcon source={filter.icon} size={size} />;
  return (
    <SymbolView
      name={{ ios: 'newspaper', android: 'newspaper' }}
      size={size}
      tintColor={tintColor ?? (isDark ? '#60a5fa' : '#2563eb')}
    />
  );
}

/** Number of loaded articles for each source, plus `all`. */
export function useFilterCounts(): Record<string, number> {
  const { articles } = useNews();
  const counts: Record<string, number> = { all: articles.length };
  for (const article of articles) counts[article.sourceId] = (counts[article.sourceId] ?? 0) + 1;
  return counts;
}
