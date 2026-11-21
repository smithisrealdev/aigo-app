import { Tabs, type BottomTabBarProps } from 'expo-router/js-tabs';
import { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/components/icon';
import { Glass, lift, tap } from '@/components/ui';
import { useSettings } from '@/lib/settings';
import { fonts, radius, space } from '@/theme/tokens';
import { spring } from '@/theme/motion';

const TABS: { name: string; key: 'tab.aigo' | 'tab.trips'; icon: IconName }[] = [
  { name: 'index', key: 'tab.aigo', icon: 'spark' },
  { name: 'trips', key: 'tab.trips', icon: 'bag' },
];
const SEG = 116;

/** แถบเมนูกระจกลอยกลางจอ แถบสีเข้มเลื่อนตามแท็บที่เลือกแบบสปริง (แบบปุ่ม Plan/Track ของ Polarsteps) */
function FloatingTabBar({ state, emitter, navigateToTab }: BottomTabBarProps) {
  const { colors, isDark, t } = useSettings();
  const insets = useSafeAreaInsets();
  const x = useSharedValue(state.index * SEG);
  useEffect(() => { x.set(withSpring(state.index * SEG, spring.selection)); }, [state.index, x]);
  const pill = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: Math.max(insets.bottom, space.md) + space.xs, alignItems: 'center' }}>
      <View accessibilityRole="tablist" style={[{ borderRadius: radius.pill }, lift(isDark, 1.2)]}>
        <Glass r={radius.pill} style={{ flexDirection: 'row', padding: 6 }}>
          <Animated.View style={[{ position: 'absolute', top: 6, bottom: 6, left: 6, width: SEG, borderRadius: radius.pill, backgroundColor: colors.ink }, pill]} />
          {state.routes.map((route, i) => {
            const tab = TABS.find((x) => x.name === route.name);
            if (!tab) return null;
            const focused = state.index === i;
            const color = focused ? colors.bg : colors.ink;
            const onPress = () => {
              const e = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!focused && !e.defaultPrevented) { tap(); navigateToTab(route.key); }
            };
            return (
              <Pressable key={route.key} accessibilityRole="tab" accessibilityState={{ selected: focused }} accessibilityLabel={t(tab.key)} onPress={onPress}
                style={{ width: SEG, height: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Icon name={tab.icon} color={color} size={20} />
                <Text style={{ fontFamily: fonts.bodyBold, fontSize: 15, color }}>{t(tab.key)}</Text>
              </Pressable>
            );
          })}
        </Glass>
      </View>
    </View>
  );
}

export default function TabLayout() {
  const { t } = useSettings();
  return (
    <Tabs tabBar={(p) => <FloatingTabBar {...p} />} screenOptions={{ headerShown: false }}>
      {TABS.map((tab) => <Tabs.Screen key={tab.name} name={tab.name} options={{ title: t(tab.key) }} />)}
    </Tabs>
  );
}
