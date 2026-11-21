import { Image, type ImageSource } from 'expo-image';
import { router } from 'expo-router';
import { useRef, useState, type ComponentRef } from 'react';
import { ScrollView, useWindowDimensions, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Mascot, T } from '@/components/ui';
import { art, poses } from '@/data/trip';
import type { L } from '@/lib/i18n';
import { useSettings } from '@/lib/settings';
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
  const scroller = useRef<ComponentRef<typeof ScrollView>>(null);
  const [page, setPage] = useState(0);
  const last = page === PAGES.length - 1;
  const finish = (to: '/' | '/login' = '/') => { set({ onboarded: true }); router.replace(to); };
  const next = () => (last ? finish() : scroller.current?.scrollTo({ x: width * (page + 1), animated: true }));
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => setPage(Math.min(PAGES.length - 1, Math.max(0, Math.round(e.nativeEvent.contentOffset.x / width))));
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top, paddingBottom: insets.bottom + space.lg }}>
      <View style={[wide, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.lg, minHeight: 52 }]}>
        <Image source={isDark ? require('@/assets/brand/logo-white.svg') : require('@/assets/brand/logo-ink.svg')} style={{ width: 76, height: 33 }} contentFit="contain" contentPosition="left" accessibilityLabel="AiGo" />
        {!last && <Button kind="ghost" label={pick({ th: 'ข้าม', en: 'Skip' })} onPress={() => finish()} />}
      </View>
      <ScrollView ref={scroller} horizontal pagingEnabled showsHorizontalScrollIndicator={false} onScroll={onScroll} scrollEventThrottle={32} style={{ flex: 1 }}>
        {PAGES.map((p, i) => (
          <View key={p.tone} style={{ width, paddingHorizontal: space.lg, justifyContent: 'center' }} accessibilityElementsHidden={i !== page} importantForAccessibility={i === page ? 'auto' : 'no-hide-descendants'}>
            <View style={[wide, { gap: space.xl }]}>
              <View style={{ height: 280, borderRadius: radius.xl, backgroundColor: light.sticker[p.tone], alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                {p.pose ? <Mascot pose={p.pose} size={200} /> : <Image source={p.art} style={{ width: 280, height: 210 }} contentFit="contain" accessible={false} />}
              </View>
              <View style={{ gap: space.sm }}>
                <T v="hero" accessibilityRole="header">{pick(p.title)}</T>
                <T style={{ color: colors.mutedStrong }}>{pick(p.body)}</T>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
      <View style={[wide, { paddingHorizontal: space.lg, gap: space.md }]}>
        <View accessible accessibilityLabel={pick({ th: `หน้า ${page + 1} จาก ${PAGES.length}`, en: `Page ${page + 1} of ${PAGES.length}` })} style={{ flexDirection: 'row', justifyContent: 'center', gap: space.sm, paddingVertical: space.sm }}>
          {PAGES.map((p, i) => <View key={p.tone} style={{ width: i === page ? 24 : 8, height: 8, borderRadius: 4, backgroundColor: i === page ? colors.ink : colors.line }} />)}
        </View>
        <Button kind="dark" big label={last ? pick({ th: 'เริ่มคุยกับ AiGo', en: 'Start chatting with AiGo' }) : pick({ th: 'ถัดไป', en: 'Next' })} onPress={next} />
        {last && <Button kind="ghost" label={pick({ th: 'มีบัญชีอยู่แล้ว เข้าสู่ระบบ', en: 'I have an account. Sign in' })} onPress={() => finish('/login')} />}
      </View>
    </View>
  );
}
