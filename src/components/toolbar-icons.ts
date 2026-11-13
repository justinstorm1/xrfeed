import { Icon } from '@expo/ui';

/**
 * Icons for `Stack.Toolbar.Button`. iOS takes SF Symbols; Android only takes image sources, so it
 * gets the matching Material Symbol. `Icon.select` bundles only the current platform's icon.
 */
export const ToolbarIcons = {
  refresh: Icon.select({
    ios: 'arrow.clockwise',
    android: import('@expo/material-symbols/refresh.xml'),
  }),
  showSidebar: Icon.select({
    ios: 'sidebar.left',
    android: import('@expo/material-symbols/left_panel_open.xml'),
  }),
};
