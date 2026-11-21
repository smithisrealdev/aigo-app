import { useIsFocused } from 'expo-router';
import { View } from 'react-native';

import { EnergyOrb } from '@/components/reacticx/energy-orb';
import { useSettings } from '@/lib/settings';
import { useReduceMotion } from '@/theme/motion';

// สีของแอป: ส้มหลัก ทอง ชมพู (ธีมมืดสว่างขึ้นนิดให้เด่นบนพื้นเข้ม)
const LIGHT = ['#FF7A45', '#FFB547', '#FF5C8A'];
const DARK = ['#FF8A5B', '#FFC24B', '#FF6F9A'];

/** ลูกพลังงานตอน AiGo วางแผน (EnergyOrb ของ Reacticx); แสดงเฉพาะตอนกำลังวาง หยุดนิ่งเมื่อออกจากหน้าหรือเปิดลดการเคลื่อนไหว */
export function PlanOrb({ size = 180 }: { size?: number }) {
  const { isDark } = useSettings();
  const reduce = useReduceMotion();
  const focused = useIsFocused();
  return (
    <View testID="plan-orb" accessible={false} style={{ width: size, height: size }}>
      <EnergyOrb width={size} height={size} colors={isDark ? DARK : LIGHT} active={focused && !reduce} />
    </View>
  );
}
