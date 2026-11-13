import type { ComponentProps } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

const EDGES = ['left', 'right'] as const;

/**
 * Root view for every page. Pads all four safe area edges, the same way on iOS and Android.
 * Under the native header the top inset resolves to 0, since the header already covers it.
 * Scroll views inside should not also use `contentInsetAdjustmentBehavior="automatic"`, or iOS
 * would add the insets a second time.
 */
export function Screen({ className, ...props }: ComponentProps<typeof SafeAreaView>) {
  return (
    <SafeAreaView
      edges={EDGES}
      className={['flex-1 bg-white dark:bg-black', className].filter(Boolean).join(' ')}
      {...props}
    />
  );
}
