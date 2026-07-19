// Theme 1 shell — the chrome this theme wraps every screen in.
//
// The web's theme1 shell is a side rail + top bar + footer. On a phone that same
// information architecture becomes a top bar, a bottom tab bar, and the category
// strip on Home (see components/CategoryStrip). The shell owns all of it, so a
// second theme can lay the app out completely differently without any screen or
// navigator change.
//
// The navigator reads these three exports through the registry and never imports
// a theme directly:
//   Shell.TopBar  — react-navigation `header`
//   Shell.TabBar  — react-navigation `tabBar`
//   Shell.tabs    — which tabs exist, in order, and what each one renders

import React from 'react';
import { View } from 'react-native';
import { useTheme } from '../../../hooks/useBranding';
import { TopBar } from './TopBar';
import { TabBar } from './TabBar';

// Mirrors the web's MOBILE_TABS_BASE + Account.
//
// `name` is the navigator's route name and `screen` is the registry key it
// renders — they are deliberately separate, because two tabs (Casino and
// Sports) are the same Games screen pre-filtered to different categories. Other
// screens navigate by these route names, so they must stay stable.
const TABS = [
  { name: 'home', screen: 'home', label: 'Home', icon: 'home' },
  {
    name: 'casino',
    screen: 'games',
    label: 'Casino',
    icon: 'dice',
    params: { category: 'live-casino', title: 'Live Casino' },
  },
  {
    name: 'sports',
    screen: 'games',
    label: 'Sports',
    icon: 'football',
    params: { category: 'sports', title: 'Sports' },
  },
  { name: 'promotions', screen: 'promotions', label: 'Promos', icon: 'gift' },
  { name: 'account', screen: 'profile', label: 'Account', icon: 'person' },
];

export default function ThemeShell({ children }) {
  const t = useTheme();
  return <View style={{ flex: 1, backgroundColor: t.appBg }}>{children}</View>;
}

ThemeShell.TopBar = TopBar;
ThemeShell.TabBar = TabBar;
ThemeShell.tabs = TABS;
