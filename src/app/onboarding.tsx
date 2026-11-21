import { Image, type ImageSource } from 'expo-image';
import { router } from 'expo-router';
import { useRef, useState, type ComponentRef, type ReactNode } from 'react';
import { useWindowDimensions, View } from 'react-native';
import Animated, { useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, type SharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { Button, Mascot, T } from '@/components/ui';
import { art, poses } from '@/data/trip';
import type { L } from '@/lib/i18n';
import { useSettings } from '@/lib/settings';
import { useReduceMotion } from '@/theme/motion';
import { light, radius, space, wide } from '@/theme/tokens';

// หน้าแนะนำแอป แสดงครั้งเดียวตอนเปิดแอปครั้งแรก ข้ามได้ทุกหน้า แล้วเข้าแชตกับ AiGo
// (เจ้าของโปรเจกต์ให้เพิ่มเมื่อ 21 พ.ย. 2026 แทน R1 เดิมที่เข้าแชตทันที) ตัวละครอยู่บนพื้นพาสเทลอ่อนทั้งสองธีมตามข้อกำหนด
// ขึ้นบรรทัดใหม่ในหัวข้อเอง เพราะภาษาไทยไม่มีช่องว่างระหว่างคำ บางเครื่องจึงตัดกลางคำ
const PAGES: { tone: 'sky' | 'sun' | 'mint'; pose?: ImageSource; art?: ImageSource; title: L; body: L }[] = [
  {
    tone: 'sky', pose: poses.wave,
    title: { th: 'สวัสดี ฉันคือ AiGo', en: "Hi, I'm AiGo" },
    body: { th: 'บอกฉันว่าอยากไปไหน กี่วัน ฉันวางแผนให้ทีละวัน พร้อมเที่ยวบิน ที่พัก และร้านอร่อย', en: 'Tell me where and for how long. I plan each day for you, with flights, hotels and good food.' },
  },
  {
    tone: 'sun', art: art.trips,
    title: { th: 'ทั้งทริป\nอยู่ในมือถือ', en: 'Your whole trip\nin your pocket' },
    body: { th: 'เปิดแผนได้แม้ไม่มีเน็ต มีแผนที่รายวัน แอปท้องถิ่นที่ควรโหลด และเช็กลิสต์ก่อนเดินทาง', en: 'Open your plan offline, with day maps, local apps to get and a pre-trip checklist.' },
  },
  {
    tone: 'mint', art: art.watch,
    title: { th: 'ฉันจัดการ\nคุณแค่ตัดสินใจ', en: 'I do the work,\nyou decide' },
    body: { th: 'ฉันปรับแผนให้เองได้ และย้อนกลับได้ทุกครั้ง อะไรที่ต้องจ่ายเงินจะรอคุณกดเสมอ', en: 'I can adjust the plan, and you can always undo. Anything that costs money waits for you.' },
  },
];

export default function Onboarding() {
  const { colors, pick, set, isDark } = useSettings();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const reduce = useReduceMotion();
  const scroller = useRef<ComponentRef<typeof Animated.ScrollView>>(null);
  const [page, setPage] = useState(0);
  const last = page === PAGES.length - 1;
  const finish = (to: '/' | '/login' = '/') => { set({ onboarded: true }); router.replace(to); };
  const next = () => (last ? finish() : scroller.current?.scrollTo({ x: width * (page + 1), animated: true }));
  // ทุกอย่างผูกกับการเลื่อนบนเธรดหน้าจอ (ตามนิ้ว ไม่กระตุก); ปุ่มเปลี่ยนเมื่อเลื่อนเลยครึ่งหน้า ส่งให้ React เฉพาะตอนเลขหน้าเปลี่ยน
  const x = useSharedValue(0);
  const at = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    x.set(e.contentOffset.x);
    const p = Math.min(PAGES.length - 1, Math.max(0, Math.round(e.contentOffset.x / width)));
    if (p !== at.get()) { at.set(p); scheduleOnRN(setPage, p); }
  });
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top, paddingBottom: insets.bottom + space.lg }}>
      <View style={[wide, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.lg, minHeight: 52 }]}>
        <Image source={isDark ? require('@/assets/brand/logo-white.svg') : require('@/assets/brand/logo-ink.svg')} style={{ width: 76, height: 33 }} contentFit="contain" contentPosition="left" accessibilityLabel="AiGo" />
        {!last && <Button kind="ghost" label={pick({ th: 'ข้าม', en: 'Skip' })} onPress={() => finish()} />}
      </View>
      <Animated.ScrollView ref={scroller} horizontal pagingEnabled showsHorizontalScrollIndicator={false} onScroll={onScroll} scrollEventThrottle={16} style={{ flex: 1 }}>
        {PAGES.map((p, i) => (
          <View key={p.tone} style={{ width, paddingHorizontal: space.lg, justifyContent: 'center' }} accessibilityElementsHidden={i !== page} importantForAccessibility={i === page ? 'auto' : 'no-hide-descendants'}>
            <Slide i={i} x={x} width={width} reduce={reduce} tone={light.sticker[p.tone]}
              art={p.pose ? <Mascot pose={p.pose} size={200} /> : <Image source={p.art} style={{ width: 280, height: 210 }} contentFit="contain" accessible={false} />}>
              <T v="hero" accessibilityRole="header">{pick(p.title)}</T>
              <T style={{ color: colors.mutedStrong }}>{pick(p.body)}</T>
            </Slide>
          </View>
        ))}
      </Animated.ScrollView>
      <View style={[wide, { paddingHorizontal: space.lg, gap: space.md }]}>
        <View accessible accessibilityLabel={pick({ th: `หน้า ${page + 1} จาก ${PAGES.length}`, en: `Page ${page + 1} of ${PAGES.length}` })} style={{ flexDirection: 'row', justifyContent: 'center', gap: space.sm, paddingVertical: space.sm }}>
          <Dots x={x} width={width} n={PAGES.length} dot={colors.line} pill={colors.ink} />
        </View>
        <Button kind="dark" big label={last ? pick({ th: 'เริ่มคุยกับ AiGo', en: 'Start chatting with AiGo' }) : pick({ th: 'ถัดไป', en: 'Next' })} onPress={next} />
        {last && <Button kind="ghost" label={pick({ th: 'มีบัญชีอยู่แล้ว เข้าสู่ระบบ', en: 'I have an account. Sign in' })} onPress={() => finish('/login')} />}
      </View>
    </View>
  );
}

/** หน้าหนึ่ง: ภาพในการ์ดเลื่อนช้ากว่าหน้าครึ่งหนึ่ง (parallax) และย่อลงเล็กน้อยเมื่อห่างจากกลาง; ข้อความจางและลอยขึ้นตามระยะ
 *  ลดการเคลื่อนไหว: ภาพนิ่ง ข้อความจางอย่างเดียว */
function Slide({ i, x, width, reduce, tone, art, children }: { i: number; x: SharedValue<number>; width: number; reduce: boolean; tone: string; art: ReactNode; children: ReactNode }) {
  const artStyle = useAnimatedStyle(() => {
    if (reduce) return { transform: [{ translateX: 0 }, { scale: 1 }] };
    const d = x.value / width - i; // 0 = หน้านี้อยู่กลาง, ±1 = หน้าข้างๆ
    return { transform: [{ translateX: d * width * 0.5 }, { scale: 1 - 0.08 * Math.min(1, Math.abs(d)) }] };
  });
  const textStyle = useAnimatedStyle(() => {
    const d = Math.min(1, Math.abs(x.value / width - i));
    return { opacity: 1 - Math.min(1, d * 1.6), transform: [{ translateY: reduce ? 0 : 16 * d }] };
  });
  return (
    <View style={[wide, { gap: space.xl }]}>
      <View style={{ height: 280, borderRadius: radius.xl, backgroundColor: tone, overflow: 'hidden' }}>
        <Animated.View testID={`slide-art-${i}`} style={[{ flex: 1, alignItems: 'center', justifyContent: 'center' }, artStyle]}>{art}</Animated.View>
      </View>
      <Animated.View testID={`slide-text-${i}`} style={[{ gap: space.sm }, textStyle]}>{children}</Animated.View>
    </View>
  );
}

const SLOT = 24;
/** จุดบอกหน้า: แถบเข้มเลื่อนตามนิ้วจากจุดหนึ่งไปอีกจุด ยืดเล็กน้อยระหว่างทาง (ขยับด้วย transform เท่านั้น) */
function Dots({ x, width, n, dot, pill }: { x: SharedValue<number>; width: number; n: number; dot: string; pill: string }) {
  const st = useAnimatedStyle(() => {
    const f = Math.min(n - 1, Math.max(0, x.value / width));
    return { transform: [{ translateX: f * SLOT }, { scaleX: 1 + 0.4 * Math.sin(Math.PI * (f - Math.floor(f))) }] };
  });
  return (
    <View style={{ flexDirection: 'row' }}>
      {Array.from({ length: n }, (_, i) => (
        <View key={i} style={{ width: SLOT, height: 8, alignItems: 'center' }}><View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: dot }} /></View>
      ))}
      <Animated.View testID="page-pill" style={[{ position: 'absolute', left: 0, top: 0, width: SLOT, height: 8, borderRadius: 4, backgroundColor: pill }, st]} />
    </View>
  );
}
