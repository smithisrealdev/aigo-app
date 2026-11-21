import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, FadeIn, FadeOut, ReduceMotion, useAnimatedStyle, useSharedValue, withTiming, ZoomIn, type SharedValue } from 'react-native-reanimated';

import { Icon } from '@/components/icon';
import { tap } from '@/components/ui';
import { useSettings } from '@/lib/settings';
import { spring, useReduceMotion } from '@/theme/motion';

const COUNT = 36;
const SECONDS = 1.6;
const GRAVITY = 900; // px/s²
const COLORS = ['#FF7A45', '#FFB547', '#FF5C8A', '#0FA3B1', '#8F7BFF', '#2BB673'];
// สุ่มแบบคงที่ตามลำดับชิ้น: ทุกครั้งที่วาดได้ภาพเดิม
const rnd = (i: number, k: number) => { const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return x - Math.floor(x); };
type Piece = { vx: number; vy: number; spin: number; turn: number; w: number; h: number; round: boolean; color: string };
const piece = (i: number): Piece => {
  const angle = -Math.PI * (0.08 + 0.84 * rnd(i, 1)); // พุ่งขึ้นเป็นรูปพัด
  const speed = 300 + 320 * rnd(i, 2);
  return { vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, spin: (rnd(i, 3) - 0.5) * 1440, turn: rnd(i, 4) * 360,
    w: 6 + 4 * rnd(i, 5), h: 10 + 6 * rnd(i, 6), round: rnd(i, 7) > 0.7, color: COLORS[i % COLORS.length] };
};

/**
 * แผนเสร็จระหว่างดูอยู่: เครื่องหมายสำเร็จเด้งกลางจอ กระดาษสีระเบิดครั้งเดียว และสั่นเบาๆ แล้วจางหายเอง
 * วางทับทั้งจอ (ไม่รับการแตะ) จึงเห็นเสมอไม่ว่าเลื่อนอยู่ตรงไหน; ลดการเคลื่อนไหวแล้วเครื่องหมายจางเข้า ไม่มีกระดาษสี
 */
export function Celebrate({ label }: { label: string }) {
  const { colors } = useSettings();
  const reduce = useReduceMotion();
  const [pieces, setPieces] = useState(() => (reduce ? [] : Array.from({ length: COUNT }, (_, i) => piece(i))));
  const [show, setShow] = useState(true);
  const t = useSharedValue(0);
  useEffect(() => {
    tap('success');
    t.set(withTiming(1, { duration: SECONDS * 1000, easing: Easing.linear }));
    const a = setTimeout(() => setPieces([]), SECONDS * 1000 + 100);
    const b = setTimeout(() => setShow(false), SECONDS * 1000 + 600);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, [t]);
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
      {show && (
        <Animated.View testID="plan-celebrate" accessible accessibilityLabel={label} accessibilityLiveRegion="polite"
          entering={reduce ? FadeIn.duration(200).reduceMotion(ReduceMotion.Never) : ZoomIn.springify().stiffness(spring.checkPop.stiffness).damping(spring.checkPop.damping)}
          exiting={FadeOut.duration(250).reduceMotion(ReduceMotion.Never)}
          style={{ width: 104, height: 104, borderRadius: 52, backgroundColor: colors.success, alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: colors.bg }}>
          <Icon name="check" color={colors.bg} size={52} />
        </Animated.View>
      )}
      <View style={{ position: 'absolute', left: '50%', top: '50%', width: 0, height: 0 }}>
        {pieces.map((p, i) => <Confetti key={i} p={p} t={t} />)}
      </View>
    </View>
  );
}

function Confetti({ p, t }: { p: Piece; t: SharedValue<number> }) {
  const st = useAnimatedStyle(() => {
    const s = t.value * SECONDS;
    return {
      opacity: t.value < 0.7 ? 1 : (1 - t.value) / 0.3,
      transform: [{ translateX: p.vx * s }, { translateY: p.vy * s + 0.5 * GRAVITY * s * s }, { rotate: `${p.turn + p.spin * s}deg` }],
    };
  });
  return <Animated.View testID="confetti" style={[{ position: 'absolute', left: -p.w / 2, top: -p.h / 2, width: p.w, height: p.h, borderRadius: p.round ? p.w / 2 : 2, backgroundColor: p.color }, st]} />;
}
