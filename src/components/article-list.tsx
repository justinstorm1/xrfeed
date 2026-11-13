import { Image } from 'expo-image';
import { Stack } from 'expo-router';
import { openBrowserAsync } from 'expo-web-browser';
import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { type Article, SOURCES, type SourceFilter, filterName } from '@/lib/feeds';
import { formatRelativeDate } from '@/lib/format';
import { refreshNews, useNews } from '@/lib/news-store';

import { SourceIcon } from './source-icon';
import { useIsWide, useSidebar } from './split-view';
import { ToolbarIcons } from './toolbar-icons';

export function ArticleList({ filter }: { filter: SourceFilter }) {
  const { articles, status, errors } = useNews(filter);
  const [refreshing, setRefreshing] = useState(false);

  async function refresh() {
    setRefreshing(true);
    try {
      await refreshNews();
    } finally {
      setRefreshing(false);
    }
  }

  const insets = useSafeAreaInsets();
  const wide = useIsWide();
  const sidebar = useSidebar();

  return (
    <>
      <Stack.Screen options={{ title: filterName(filter) }} />
      {/* With the sidebar closed, its open button moves into this header, as in iOS split views. */}
      {wide && !sidebar.visible ? (
        <Stack.Toolbar placement="left">
          <Stack.Toolbar.Button
            icon={ToolbarIcons.showSidebar}
            accessibilityLabel="Show sidebar"
            onPress={sidebar.toggle}
          />
        </Stack.Toolbar>
      ) : null}
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          icon={ToolbarIcons.refresh}
          accessibilityLabel="Refresh"
          onPress={refresh}
        />
      </Stack.Toolbar>
      <FlatList
        className="flex-1 bg-white dark:bg-black"
        contentContainerClassName="grow"
        contentContainerStyle={{ paddingBottom: insets.bottom }}
        contentInsetAdjustmentBehavior="automatic"
        data={articles}
        keyExtractor={(article) => article.id}
        // Keep few rows mounted: every mounted row re-wraps its text when the sidebar slides and
        // this column resizes, so a smaller window keeps each frame cheap.
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={5}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
        ItemSeparatorComponent={Separator}
        ListHeaderComponent={
          errors.length > 0 && articles.length > 0 ? (
            <Text className="px-4 py-3 text-sm text-orange-600 dark:text-orange-400">
              {errors.join(' ')}
            </Text>
          ) : undefined
        }
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center gap-3 p-6">
            {status === 'ready' ? (
              <>
                <Text className="text-xl font-semibold text-black dark:text-white">
                  No Articles
                </Text>
                <Text className="text-center text-base text-neutral-500 dark:text-neutral-400">
                  {errors.join(' ') || 'There’s nothing in this feed right now.'}
                </Text>
                <Pressable
                  onPress={refresh}
                  className="mt-2 rounded-full bg-neutral-100 px-5 py-2 active:opacity-70 dark:bg-neutral-800">
                  <Text className="text-base font-medium text-blue-600 dark:text-blue-400">
                    Try Again
                  </Text>
                </Pressable>
              </>
            ) : (
              <ActivityIndicator />
            )}
          </View>
        }
        renderItem={({ item }) => (
          <ArticleRow article={item} showSource={filter === 'all'} />
        )}
      />
    </>
  );
}

function ArticleRow({ article, showSource }: { article: Article; showSource: boolean }) {
  const source = SOURCES[article.sourceId];
  const meta = [showSource ? source.name : null, formatRelativeDate(article.publishedAt)]
    .filter(Boolean)
    .join(' · ');

  return (
    // Opens the publisher's own page in the in-app browser, so the publisher gets the page view.
    <Pressable
      onPress={() => openBrowserAsync(article.link)}
      className="flex-row items-start gap-3 px-4 py-3 active:bg-neutral-100 dark:active:bg-neutral-900">
        <View className="flex-1 gap-1">
          <View className="flex-row items-center gap-1.5">
            {/* In All News, the favicon shows at a glance which site hosts the story. */}
            {showSource ? <SourceIcon source={source.icon} size={18} /> : null}
            <Text className="text-xs text-neutral-500 dark:text-neutral-400">{meta}</Text>
          </View>
          <Text numberOfLines={3} className="text-base font-semibold text-black dark:text-white">
            {article.title}
          </Text>
          {article.summary ? (
            <Text numberOfLines={2} className="text-sm text-neutral-500 dark:text-neutral-400">
              {article.summary}
            </Text>
          ) : null}
        </View>
        {article.imageUrl ? (
          <Image
            source={{ uri: article.imageUrl }}
            style={{ width: 72, height: 72, borderRadius: 10 }}
            contentFit="cover"
            transition={150}
            recyclingKey={article.id}
          />
        ) : null}
    </Pressable>
  );
}

function Separator() {
  return <View className="ml-4 h-px bg-neutral-200 dark:bg-neutral-800" />;
}
