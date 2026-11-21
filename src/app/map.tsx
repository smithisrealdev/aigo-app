import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Linking, PanResponder, Platform, ScrollView, useWindowDimensions, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TripMap } from '@/components/tripMap';
import { Button, Chip, IconButton, lift, StopCard, T } from '@/components/ui';
import { mapsLink, navLink } from '@/lib/links';
import { dayPoints, navTarget } from '@/lib/mapPoints';
import { usePhotos, usePlaceGeo } from '@/lib/photos';
import { useSettings } from '@/lib/settings';
import { useTrip } from '@/lib/tripStore';
import { radius, space, touch } from '@/theme/tokens';

// แผนที่ของวัน (R12, สเปกแผนที่ในแอปเฟส 1): แผนที่เต็มจอ แผ่นข้อมูลด้านล่างลากขึ้นลงได้ (แตะที่จับก็สลับได้)
// หมุดเลขตามลำดับในแผน แตะหมุดหรือชิปแล้วการ์ดของที่นั้นขึ้น และหมุดนั้นใหญ่ขึ้น; แผนที่จัดหมุดให้อยู่ในส่วนที่ไม่ถูกแผ่นบัง
// ตำแหน่งที่ AI เดาบอกว่า "ตำแหน่งโดยประมาณ"; ไม่มีตำแหน่งหรือห่างจากที่อื่นของวันเกิน 50 กม. ไม่ปักหมุด ให้ค้นใน Google Maps แทน
export default function MapScreen() {
  const { colors, isDark, pick, t } = useSettings();
  const { trip } = useTrip();
  const insets = useSafeAreaInsets();
  const { height: H } = useWindowDimensions();
  const params = useLocalSearchParams<{ day?: string }>();
  const [day, setDay] = useState(() => Math.min(Math.max(0, Number(params.day) || 0), Math.max(0, trip.totalDays - 1)));
  const [sel, setSel] = useState<string>();
  const places = trip.days[day] ?? [];
  const p = places.find((x) => x.id === sel) ?? places[0];
  const n = p ? places.indexOf(p) + 1 : 0;
  const near = trip.destination.en;
  const photo = usePhotos(places.filter((x) => !x.photo).map((x) => ({ name: x.name.en, near })));
  // ทริปตัวอย่างมีพิกัดที่ตรวจแล้ว ทริปที่ AiGo วางตรวจกับพิกัดของบทความ Wikipedia (ได้มาพร้อมรูป) ที่เหลือเป็นตำแหน่งที่ AI เดา
  const geo = usePlaceGeo(trip.sample ? [] : places.map((x) => ({ name: x.name.en, near })));
  const { points, missing } = dayPoints(places, (x) => pick(x.name), trip.sample ? (x) => x : (x) => geo({ name: x.name.en, near }));
  const where = !p ? undefined : missing.includes(p.id) ? 'none' : points.find((x) => x.key === p.id)?.approx ? 'approx' : 'ok';
  const search = () => p && Linking.openURL(mapsLink(`${p.name.en} ${near}`));
  const navigate = () => p && Linking.openURL(navLink(navTarget({ id: p.id, name: p.name.en }, points, near), Platform.OS));

  // แผ่นข้อมูล: ยุบ (เห็นชื่อวัน ชิปที่แวะ และการ์ด) กับขยาย (เห็นทั้งหมด); y = ระยะที่เลื่อนลงจากตอนขยาย
  // shortcut: จับความสูงจอตอนเปิดหน้า (แอปล็อกแนวตั้ง) ถ้าเปิดหมุนจอเมื่อไหร่ให้สร้างตัวลากใหม่ตามความสูง
  const low = Math.round(Math.min(H * 0.44, 400));
  const high = Math.round(Math.min(H * 0.76, 660));
  const travel = high - low;
  const [open, setOpen] = useState(false);
  const y = useSharedValue(travel);
  const sheet = useAnimatedStyle(() => ({ transform: [{ translateY: y.get() }] }));
  const snap = (toOpen: boolean) => { y.set(withTiming(toOpen ? 0 : travel, { duration: 260, easing: Easing.out(Easing.cubic) })); setOpen(toOpen); };
  const [grip] = useState(() => {
    let from = 0;
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => { from = y.get(); },
      onPanResponderMove: (_, g) => { y.set(Math.min(travel, Math.max(0, from + g.dy))); },
      onPanResponderRelease: (_, g) => {
        // แตะเฉยๆ สลับยุบ/ขยาย; ลากแล้วปล่อยไปทางที่ปัด หรือใกล้ฝั่งไหนไปฝั่งนั้น
        if (Math.abs(g.dy) < 6) return snap(from > travel / 2);
        snap(g.vy < -0.3 || (g.vy <= 0.3 && from + g.dy < travel / 2));
      },
    });
  });
  // ส่วนล่างของแผนที่ที่ถูกแผ่นบัง (+28: โลโก้ เครดิต และปุ่มตำแหน่งของแผนที่อยู่เหนือขอบแผ่นพอดี)
  const covered = open ? high : low;
  const footer = touch.big + space.md + Math.max(insets.bottom, space.md);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <TripMap points={points} selected={p?.id} onSelect={setSel} showUser pad={{ top: (insets.top + 64) / H, bottom: (covered + 28) / H, x: 0.12 }} />
      <View style={{ position: 'absolute', left: space.lg, top: insets.top + space.sm }}>
        <IconButton icon="back" label={t('common.back')} onPress={() => router.back()} variant="glass" />
      </View>
      <Animated.View style={[{ position: 'absolute', left: 0, right: 0, bottom: 0, height: high, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, backgroundColor: colors.bg }, lift(isDark, 1), sheet]}>
        {/* ที่จับและหัวแผ่น: ลากขึ้นลง หรือแตะเพื่อสลับ (โปรแกรมอ่านหน้าจอใช้ปัดขึ้นลงแทน) */}
        <View {...grip.panHandlers} accessible accessibilityRole="adjustable" accessibilityLabel={pick({ th: 'แผ่นข้อมูลของวัน ลากขึ้นลงเพื่อดูเพิ่ม', en: 'Day sheet, drag up or down to see more' })}
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]} onAccessibilityAction={(e) => snap(e.nativeEvent.actionName === 'increment')}
          style={{ paddingTop: space.sm, paddingHorizontal: space.lg, paddingBottom: space.md, gap: 2 }}>
          <View style={{ alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: colors.line, marginBottom: space.sm }} />
          <T v="title" accessibilityRole="header">{`${pick({ th: 'แผนที่', en: 'Map' })} · ${t('it.day', { n: day + 1 })}`}</T>
          <T v="bodyBold" tone="muted">{pick({ th: `${places.length} ที่`, en: `${places.length} stops` })}</T>
        </View>
        <ScrollView scrollEnabled={open} showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: space.md, paddingHorizontal: space.lg, paddingBottom: footer + space.lg }}>
          {!p && <T tone="muted">{pick({ th: 'วันนี้ยังไม่มีที่แวะ ถ้า AiGo กำลังวางแผนอยู่ เดี๋ยวจะขึ้นเอง', en: 'No stops on this day yet. If AiGo is still planning, they will show up here.' })}</T>}
          {p && (
            <>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -space.lg }} contentContainerStyle={{ gap: space.sm, paddingHorizontal: space.lg }}>
                {places.map((x, i) => (
                  <Chip key={x.id} label={`${i + 1} · ${pick(x.name)}${missing.includes(x.id) ? pick({ th: ' · ไม่มีหมุด', en: ' · no pin' }) : ''}`} selected={x.id === p.id} onPress={() => setSel(x.id)} />
                ))}
              </ScrollView>
              <StopCard n={n} photo={p.photo ?? photo({ name: p.name.en, near })} name={pick(p.name)} time={p.time} meta={pick(p.tip)}
                status={p.checked ? t('it.open') : t('it.unchecked')} statusTone={p.checked ? 'success' : 'muted'}
                onPress={() => router.push({ pathname: '/place/[id]', params: { id: p.id } })} />
              {where !== 'ok' && (
                <View style={{ gap: space.sm }}>
                  <T v="small" tone="muted">
                    {where === 'none'
                      ? pick({ th: 'ยังไม่มีตำแหน่ง: ที่นี้ไม่ได้ปักหมุดบนแผนที่ ค้นชื่อใน Google Maps ได้', en: 'No position yet: this stop is not pinned. You can search for it in Google Maps.' })
                      : pick({ th: 'ตำแหน่งโดยประมาณ: AiGo เดาตำแหน่งนี้ หมุดอาจคลาดไปบ้าง ดูใน Google Maps ให้แน่ใจก่อนไป', en: 'Approximate position: AiGo guessed it, so the pin may be off. Check Google Maps before you go.' })}
                  </T>
                  <Button kind="secondary" icon="map" label={pick({ th: 'ค้นใน Google Maps', en: 'Search Google Maps' })} onPress={search} style={{ alignSelf: 'flex-start', minHeight: 44 }} />
                </View>
              )}
            </>
          )}
          {trip.totalDays > 1 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -space.lg }} contentContainerStyle={{ gap: space.sm, paddingHorizontal: space.lg }}>
              {Array.from({ length: trip.totalDays }, (_, d) => (
                <Chip key={d} label={t('it.day', { n: d + 1 })} selected={d === day} a11y={t('it.dayA11y', { n: d + 1 })} onPress={() => { setDay(d); setSel(undefined); }} />
              ))}
            </ScrollView>
          )}
          <T v="small" tone="muted">{pick({ th: 'แตะหมุดหรือชื่อด้านบนเพื่อเลือก ลากแผ่นนี้ขึ้นเพื่อเปลี่ยนวัน', en: 'Tap a pin or a name above to choose. Drag this sheet up to change the day.' })}</T>
        </ScrollView>
      </Animated.View>
      {p && (
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: space.lg, paddingTop: space.md, paddingBottom: Math.max(insets.bottom, space.md), backgroundColor: colors.bg }}>
          <Button label={t('place.navigate')} icon="pin" big onPress={navigate} />
        </View>
      )}
    </View>
  );
}
