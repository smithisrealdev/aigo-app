import { Tabs } from 'expo-router/js-tabs';

import { Icon, type IconName } from '@/components/icon';
import { useSettings } from '@/lib/settings';
import { fonts } from '@/theme/tokens';

const TABS: { name: string; key: 'tab.aigo' | 'tab.trips'; icon: IconName }[] = [
  { name: 'index', key: 'tab.aigo', icon: 'spark' },
  { name: 'trips', key: 'tab.trips', icon: 'bag' },
];

export default function TabLayout() {
  const { colors, t } = useSettings();
  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: colors.ink,
      tabBarInactiveTintColor: colors.muted,
      tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.line, height: 76, paddingTop: 6 },
      tabBarLabelStyle: { fontFamily: fonts.bodySemi, fontSize: 12 },
    }}>
      {TABS.map((tab) => (
        <Tabs.Screen key={tab.name} name={tab.name}
          options={{ title: t(tab.key), tabBarIcon: ({ focused }) => <Icon name={tab.icon} color={focused ? colors.ink : colors.muted} /> }} />
      ))}
    </Tabs>
  );
}
