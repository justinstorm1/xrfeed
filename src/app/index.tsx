import { ArticleList } from '@/components/article-list';
import { Screen } from '@/components/screen';
import { SourceList } from '@/components/source-list';
import { useIsWide } from '@/components/split-view';

// Wide: the sidebar lists the sources, so the first screen is All News.
// Compact: the first screen is the sources list.
export default function Index() {
  const wide = useIsWide();
  return <Screen>{wide ? <ArticleList filter="all" /> : <SourceList />}</Screen>;
}
