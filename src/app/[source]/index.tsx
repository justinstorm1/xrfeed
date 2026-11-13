import { useLocalSearchParams } from 'expo-router';

import { ArticleList } from '@/components/article-list';
import { Screen } from '@/components/screen';
import { isSourceFilter } from '@/lib/feeds';

export default function SourceScreen() {
  const params = useLocalSearchParams<{ source: string }>();
  return (
    <Screen>
      <ArticleList filter={isSourceFilter(params.source) ? params.source : 'all'} />
    </Screen>
  );
}
