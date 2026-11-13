import { useEffect, useSyncExternalStore } from 'react';

import { type Article, type SourceFilter, SOURCES, fetchSource } from './feeds';

type NewsState = {
  articles: Article[];
  status: 'idle' | 'loading' | 'ready';
  errors: string[];
  updatedAt?: number;
};

let state: NewsState = { articles: [], status: 'idle', errors: [] };
let inFlight: Promise<void> | null = null;
const listeners = new Set<() => void>();

function setState(next: Partial<NewsState>) {
  state = { ...state, ...next };
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Fetches every feed. Concurrent calls share the same request. */
export function refreshNews(): Promise<void> {
  inFlight ??= (async () => {
    setState({ status: 'loading' });
    const sources = Object.values(SOURCES);
    const results = await Promise.allSettled(sources.map(fetchSource));

    const errors: string[] = [];
    const articles = results.flatMap((result, index) => {
      if (result.status === 'fulfilled') return result.value;
      errors.push(`Couldn’t load ${sources[index].name}.`);
      // Keep what we already had for a source that failed this time.
      return state.articles.filter((article) => article.sourceId === sources[index].id);
    });
    articles.sort((a, b) => b.publishedAt - a.publishedAt);

    setState({ articles, errors, status: 'ready', updatedAt: Date.now() });
    inFlight = null;
  })();
  return inFlight;
}

function useNewsState() {
  const snapshot = useSyncExternalStore(subscribe, () => state);

  useEffect(() => {
    if (snapshot.status === 'idle') refreshNews();
  }, [snapshot.status]);

  return snapshot;
}

export function useNews(filter: SourceFilter = 'all') {
  const snapshot = useNewsState();
  const articles =
    filter === 'all'
      ? dedupeByLink(snapshot.articles)
      : snapshot.articles.filter((article) => article.sourceId === filter);

  return { ...snapshot, articles };
}

/**
 * Sources sometimes carry the same story (e.g. syndicated or aggregated articles). In All News keep
 * one copy per link, preferring the one with the most article text.
 */
function dedupeByLink(articles: Article[]): Article[] {
  const best = new Map<string, Article>();
  for (const article of articles) {
    const key = article.link.replace(/^https?:\/\/(www\.)?/, '').replace(/[?#].*$/, '').replace(/\/$/, '');
    const current = best.get(key);
    if (!current || article.contentHtml.length > current.contentHtml.length) best.set(key, article);
  }
  const keep = new Set(best.values());
  return articles.filter((article) => keep.has(article));
}
