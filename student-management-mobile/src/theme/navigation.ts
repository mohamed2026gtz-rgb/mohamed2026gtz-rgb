import { colors } from './colors';

export const headerScreenOptions = {
  headerStyle: { backgroundColor: colors.primaryDark },
  headerTintColor: colors.white,
  headerTitleStyle: { fontWeight: '700' as const },
};

export const tabScreenOptions = {
  ...headerScreenOptions,
  tabBarActiveTintColor: colors.primary,
  tabBarInactiveTintColor: colors.textMuted,
  tabBarStyle: {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
  },
};