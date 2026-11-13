import type { SFSymbol } from 'sf-symbols-typescript';

import { decodeEntities, getAttribute, stripTags } from './html';

export type SourceId =
  | 'uploadvr'
  | 'roadtovr'
  | 'mixed'
  | 'ghosthowls'
  | 'auganix'
  | 'arinsider'
  | 'nextreality'
  | 'hypergrid'
  | 'metaquest'
  | 'metadev'
  | 'ninetofivemac'
  | 'techradar'
  | 'cnet'
  | 'goodvr';
export type SourceFilter = SourceId | 'all';

/** How a source's URL is read: an RSS feed, or a section page for sites without one. */
export type Source = {
  id: SourceId;
  name: string;
  feedUrl: string;
  /** The site's own favicon (a bundled `require()` asset), so it shows instantly and survives site redesigns. */
  icon: number;
};

/** In the default display order; people can reorder them (see `source-order.ts`). */
export const SOURCES: Record<SourceId, Source> = {
  uploadvr: {
    id: 'uploadvr',
    name: 'UploadVR',
    feedUrl: 'https://www.uploadvr.com/rss/',
    icon: require('@/assets/images/sources/uploadvr.png'),
  },
  roadtovr: {
    id: 'roadtovr',
    name: 'Road to VR',
    feedUrl: 'https://www.roadtovr.com/feed/',
    icon: require('@/assets/images/sources/roadtovr.png'),
  },
  goodvr: {
    id: 'goodvr',
    name: 'Good Virtual Reality',
    // A Substack; the bare goodvirtualreality.com domain fails TLS, so use www.
    feedUrl: 'https://www.goodvirtualreality.com/feed',
    icon: require('@/assets/images/sources/goodvr.png'),
  },
  ghosthowls: {
    id: 'ghosthowls',
    name: 'The Ghost Howls',
    feedUrl: 'https://skarredghost.com/feed/',
    icon: require('@/assets/images/sources/ghosthowls.png'),
  },
  cnet: {
    id: 'cnet',
    name: 'CNET',
    feedUrl: 'https://www.cnet.com/tech/computing/gadgets/vr-ar-productivity/feed/',
    icon: require('@/assets/images/sources/cnet.png'),
  },
  metadev: {
    id: 'metadev',
    name: 'Meta VR Developer Blog',
    feedUrl: 'https://developers.meta.com/vr/blog/rss/',
    // Same Meta logo as the Meta Quest Blog; the developer site only serves a 32px favicon.
    icon: require('@/assets/images/sources/metaquest.png'),
  },
  metaquest: {
    id: 'metaquest',
    name: 'Meta Quest Blog',
    feedUrl: 'https://www.meta.com/blog/quest/rss/',
    icon: require('@/assets/images/sources/metaquest.png'),
  },
  arinsider: {
    id: 'arinsider',
    name: 'AR Insider',
    feedUrl: 'https://arinsider.co/feed/',
    icon: require('@/assets/images/sources/arinsider.png'),
  },
  mixed: {
    id: 'mixed',
    name: 'MIXED',
    feedUrl: 'https://mixed-news.com/en/feed/',
    icon: require('@/assets/images/sources/mixed.png'),
  },
  ninetofivemac: {
    id: 'ninetofivemac',
    name: '9to5Mac',
    feedUrl: 'https://9to5mac.com/guides/vision-pro/feed/',
    icon: require('@/assets/images/sources/ninetofivemac.png'),
  },
  techradar: {
    id: 'techradar',
    name: 'TechRadar',
    feedUrl: 'https://www.techradar.com/feeds/tag/vr',
    icon: require('@/assets/images/sources/techradar.png'),
  },
  nextreality: {
    id: 'nextreality',
    name: 'Next Reality',
    feedUrl: 'https://next.reality.news/rss/',
    icon: require('@/assets/images/sources/nextreality.png'),
  },
  hypergrid: {
    id: 'hypergrid',
    name: 'Hypergrid Business',
    feedUrl: 'https://www.hypergridbusiness.com/feed/',
    icon: require('@/assets/images/sources/hypergrid.png'),
  },
  auganix: {
    id: 'auganix',
    name: 'Auganix',
    feedUrl: 'https://www.auganix.org/feed/',
    icon: require('@/assets/images/sources/auganix.png'),
  },
};

export type Filter = { id: SourceFilter; name: string } & (
  | { systemImage: SFSymbol; icon?: undefined }
  | { icon: number; systemImage?: undefined }
);

export function isSourceFilter(value: unknown): value is SourceFilter {
  return value === 'all' || (typeof value === 'string' && value in SOURCES);
}

export function filterName(filter: SourceFilter): string {
  return filter === 'all' ? 'All News' : SOURCES[filter].name;
}

export type Article = {
  id: string;
  sourceId: SourceId;
  title: string;
  link: string;
  author?: string;
  publishedAt: number;
  summary: string;
  imageUrl?: string;
  contentHtml: string;
  categories: string[];
};

export async function fetchSource(source: Source): Promise<Article[]> {
  const response = await fetch(source.feedUrl, {
    headers: { Accept: 'application/rss+xml, application/xml;q=0.9, */*;q=0.8' },
  });
  if (!response.ok) {
    throw new Error(`${source.name} returned ${response.status}`);
  }
  return parseRss(await response.text(), source.id);
}

export function parseRss(xml: string, sourceId: SourceId): Article[] {
  const articles: Article[] = [];
  for (const [, item] of xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)) {
    const title = stripTags(readTag(item, 'title') ?? '');
    const link = readTag(item, 'link')?.trim();
    if (!title || !link) continue;

    const contentHtml = readTag(item, 'content:encoded') ?? readTag(item, 'description') ?? '';
    articles.push({
      id: hashId(`${sourceId}:${readTag(item, 'guid') ?? link}`),
      sourceId,
      title,
      link,
      author: stripTags(readTag(item, 'dc:creator') ?? '') || undefined,
      publishedAt: parseRssDate(readTag(item, 'pubDate') ?? ''),
      summary: summarize(readTag(item, 'description') ?? '', contentHtml),
      imageUrl: findImage(item, contentHtml),
      contentHtml,
      categories: [...item.matchAll(/<category\b[^>]*>([\s\S]*?)<\/category>/gi)]
        .map(([, value]) => stripTags(unwrapCdata(value)))
        .filter(Boolean),
    });
  }
  return articles;
}

function unwrapCdata(value: string): string {
  return value.replace(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/, '$1');
}

function readTag(xml: string, name: string): string | undefined {
  const match = xml.match(new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)</${name}>`, 'i'));
  if (!match) return undefined;
  const value = unwrapCdata(match[1]);
  // Values outside CDATA are XML-escaped; CDATA values are raw HTML and decoded later. Some feeds
  // (Meta's blog) escape the CDATA wrapper itself, so unwrap again after decoding.
  return value === match[1] ? unwrapCdata(decodeEntities(value)) : value;
}

function findImage(item: string, contentHtml: string): string | undefined {
  const candidates = [
    item.match(/<media:content\b[^>]*>/i)?.[0],
    item.match(/<media:thumbnail\b[^>]*>/i)?.[0],
    item.match(/<enclosure\b[^>]*type=["']image[^>]*>/i)?.[0],
  ];
  for (const tag of candidates) {
    const url = tag && getAttribute(tag, 'url');
    if (url) return url;
  }
  const img = contentHtml.match(/<img\b[^>]*>/i)?.[0];
  const src = img && getAttribute(img, 'src');
  return src && /^https?:/i.test(src) ? src : undefined;
}

function summarize(description: string, contentHtml: string): string {
  // WordPress appends "The post … appeared first on …" to every description.
  const fromDescription = stripTags(description.replace(/<p>The post[\s\S]*?<\/p>/i, ''));
  const text =
    fromDescription || stripTags(contentHtml.match(/<p\b[^>]*>([\s\S]*?)<\/p>/i)?.[1] ?? '');
  return text.length > 220 ? `${text.slice(0, 217).trimEnd()}…` : text;
}

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

// Parses RFC 822 dates ("Fri, 23 Oct 2026 15:03:46 -0700") without relying on engine-specific Date parsing.
function parseRssDate(value: string): number {
  const match = value.match(
    /(\d{1,2})\s+([a-z]{3})[a-z]*\s+(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([+-]\d{4}|[a-z]+)?/i,
  );
  if (!match) return Date.parse(value) || 0;
  const [, day, month, year, hours, minutes, seconds = '0', zone = 'GMT'] = match;
  const monthIndex = MONTHS.indexOf(month.toLowerCase());
  if (monthIndex === -1) return Date.parse(value) || 0;

  let offsetMinutes = 0;
  if (/^[+-]\d{4}$/.test(zone)) {
    const sign = zone[0] === '-' ? -1 : 1;
    offsetMinutes = sign * (Number(zone.slice(1, 3)) * 60 + Number(zone.slice(3)));
  }
  return (
    Date.UTC(+year, monthIndex, +day, +hours, +minutes, +seconds) - offsetMinutes * 60_000
  );
}

/** A short, stable id derived from a feed item's guid or link. */
function hashId(value: string): string {
  let h = 5381;
  for (let i = 0; i < value.length; i++) {
    h = ((h << 5) + h + value.charCodeAt(i)) | 0;
  }
  return (h >>> 0).toString(36);
}
