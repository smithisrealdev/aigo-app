import { router, useIsFocused } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { ScrollView, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TripGlobe } from '@/components/tripMap';
import { Button, Chip, IconButton, lift, T } from '@/components/ui';
import { useGlobeTrips } from '@/lib/globe';
import { GLOBE_SPACE } from '@/lib/mapPoints';
import { useSettings } from '@/lib/settings';
import { useTrip } from '@/lib/tripStore';
import { radius, space } from '@/theme/tokens';

// ทริปทั้งหมดบนลูกโลกแบบ Polarsteps: ซูมเข้าออกได้ แตะรูปบนลูกโลกหรือชื่อทริปแล้วกล้องบินไปที่ทริปนั้น การ์ดด้านล่างเปิดแผนของทริปนั้น
// แผ่นด้านล่างไม่ลากขึ้นลง (ต่างจากหน้าแผนที่ของวัน) เพราะมีของน้อย ลูกโลกจึงเห็นได้เกือบทั้งจอ
export default function GlobeScreen() {
  const { colors, isDark, pick, t } = useSettings();
  const { trips, openTrip } = useTrip();
  const spots = useGlobeTrips();
  const insets = useSafeAreaInsets();
  const { height: H } = useWindowDimensions();
  const [sel, setSel] = useState<string>();
  const focused = useIsFocused();
  // ความสูงของแผ่นด้านล่าง: ลูกโลกและทริปที่เลือกอยู่ในส่วนที่แผ่นไม่บัง (วาดลูกโลกหลังวัดได้ กล้องจะได้ไม่ขยับตอนเปิดหน้า)
  const [panel, setPanel] = useState(0);
  const cur = trips.find((x) => x.id === sel);
  const missing = trips.length - spots.length;
  const open = () => { if (!cur) return; openTrip(cur.id); router.push('/itinerary'); };

  return (
    <View style={{ flex: 1, backgroundColor: GLOBE_SPACE }}>
      {/* อวกาศสีเข้มทั้งสองธีม: ตัวหนังสือแถบบนสีขาว เฉพาะตอนหน้านี้อยู่บนจอ (เปิดแผนต่อจากหน้านี้ แถบบนกลับเป็นสีตามธีม) */}
      {focused && <StatusBar style="light" />}
      {panel > 0 && <TripGlobe trips={spots} selected={sel} onSelect={setSel} pad={{ top: (insets.top + 64) / H, bottom: (panel + 28) / H, x: 0.1 }} />}
      <View style={{ position: 'absolute', left: space.lg, right: space.lg, top: insets.top + space.sm, flexDirection: 'row', justifyContent: 'space-between' }}>
        <IconButton icon="back" label={t('common.back')} onPress={() => router.back()} variant="glass" />
        {sel && <IconButton icon="globe" label={pick({ th: 'ดูทั้งโลก', en: 'Show the whole world' })} onPress={() => setSel(undefined)} variant="glass" />}
      </View>
      <View onLayout={(e) => setPanel(Math.round(e.nativeEvent.layout.height))}
        style={[{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: space.lg, paddingBottom: Math.max(insets.bottom, space.md), gap: space.md, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, backgroundColor: colors.bg }, lift(isDark, 1)]}>
        <View style={{ paddingHorizontal: space.lg, gap: 2 }}>
          <T v="title" accessibilityRole="header">{pick({ th: 'ทริปของฉันบนลูกโลก', en: 'My trips on the globe' })}</T>
          <T v="bodyBold" tone="muted">{pick({ th: `${spots.length} ทริป`, en: `${spots.length} ${spots.length === 1 ? 'trip' : 'trips'}` })}</T>
        </View>
        {spots.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm, paddingHorizontal: space.lg }}>
            {spots.map((s) => <Chip key={s.key} label={s.label} selected={s.key === sel} onPress={() => setSel(s.key)} />)}
          </ScrollView>
        )}
        <View style={{ paddingHorizontal: space.lg, gap: space.md }}>
          {cur ? (
            <>
              <View style={{ gap: 2 }}>
                <T v="heading">{pick(cur.title)}</T>
                <T tone="muted">{`${pick(cur.dates)} · ${pick({ th: `${cur.totalDays} วัน ${cur.days.flat().length} ที่`, en: `${cur.totalDays} days, ${cur.days.flat().length} stops` })}`}</T>
              </View>
              <Button label={t('trips.open')} icon="next" big onPress={open} />
            </>
          ) : (
            <T tone="muted">{spots.length
              ? pick({ th: 'แตะรูปบนลูกโลกหรือชื่อทริปเพื่อบินไปดู ใช้สองนิ้วซูมเข้าออกได้', en: 'Tap a photo on the globe or a trip name to fly there. Pinch to zoom in and out.' })
              : pick({ th: 'ยังไม่มีทริปที่มีที่เที่ยว ทริปที่ AiGo วางแล้วจะขึ้นบนลูกโลกนี้', en: 'No trips with places yet. Trips AiGo plans will show up on this globe.' })}</T>
          )}
          {missing > 0 && spots.length > 0 && (
            <T v="small" tone="muted">{pick({ th: `อีก ${missing} ทริปยังไม่มีที่เที่ยว จะขึ้นเมื่อ AiGo วางแผนให้`, en: `${missing} more ${missing === 1 ? 'trip has' : 'trips have'} no places yet and will show up once AiGo plans them.` })}</T>
          )}
        </View>
      </View>
    </View>
  );
}
