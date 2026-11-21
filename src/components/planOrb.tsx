import { useIsFocused } from 'expo-router';
import { useEffect, useId } from 'react';
import { View } from 'react-native';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

import { useSettings } from '@/lib/settings';
import { useReduceMotion } from '@/theme/motion';

/** เว็บ: ลูกสีหมุนช้าๆ แทนลูกพลังงาน (Skia ใช้เฉพาะบนมือถือ เว็บจึงไม่ต้องโหลด) หยุดเมื่อเดียวกับบนมือถือ */
export function PlanOrb({ size = 180 }: { size?: number }) {
  const { isDark } = useSettings();
  const reduce = useReduceMotion();
  const focused = useIsFocused();
  const on = focused && !reduce;
  const id = 'o' + useId().replace(/[^a-zA-Z0-9]/g, '');
  const turn = useSharedValue(0);
  useEffect(() => {
    if (!on) { cancelAnimation(turn); return; }
    turn.set(0);
    turn.set(withRepeat(withTiming(1, { duration: 7000, easing: Easing.linear }), -1, false));
  }, [on, turn]);
  const spin = useAnimatedStyle(() => ({ transform: [{ rotate: `${turn.value * 360}deg` }] }));
  const [c0, c1, c2] = isDark ? ['#FF8A5B', '#FFC24B', '#FF6F9A'] : ['#FF7A45', '#FFB547', '#FF5C8A'];
  return (
    <View testID="plan-orb" accessible={false} style={{ width: size, height: size }}>
      <Animated.View style={[{ width: size, height: size }, spin]}>
        <Svg width={size} height={size} viewBox="0 0 100 100">
          <Defs>
            <RadialGradient id={`${id}b`} cx="50" cy="50" r="44" gradientUnits="userSpaceOnUse">
              <Stop offset="0" stopColor="#FFFFFF" stopOpacity="1" /><Stop offset="0.35" stopColor={c0} stopOpacity="1" />
              <Stop offset="0.8" stopColor={c2} stopOpacity="0.85" /><Stop offset="1" stopColor={c2} stopOpacity="0" />
            </RadialGradient>
            <RadialGradient id={`${id}g`} cx="36" cy="38" r="20" gradientUnits="userSpaceOnUse">
              <Stop offset="0" stopColor={c1} stopOpacity="0.95" /><Stop offset="1" stopColor={c1} stopOpacity="0" />
            </RadialGradient>
            <RadialGradient id={`${id}p`} cx="66" cy="62" r="18" gradientUnits="userSpaceOnUse">
              <Stop offset="0" stopColor={c2} stopOpacity="0.9" /><Stop offset="1" stopColor={c2} stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Circle cx="50" cy="50" r="44" fill={`url(#${id}b)`} />
          <Circle cx="36" cy="38" r="20" fill={`url(#${id}g)`} />
          <Circle cx="66" cy="62" r="18" fill={`url(#${id}p)`} />
        </Svg>
      </Animated.View>
    </View>
  );
}
