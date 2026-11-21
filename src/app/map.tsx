import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Linking, Platform, ScrollView, View } from 'react-native';

import { TripMap } from '@/components/tripMap';
import { Button, Chip, FadeIn, Screen, StopCard, T } from '@/components/ui';
import { mapsLink, navLink } from '@/lib/links';
import { dayPoints } from '@/lib/mapPoints';
import { usePhotos } from '@/lib/photos';
import { useSettings } from '@/lib/settings';
import { useTrip } from '@/lib/tripStore';
import { radius, space } from '@/theme/tokens';

const MAP_H = 420;

// แผนที่ของวัน (R12): แผนที่จริงด้านบน หมุดเลขตามลำดับในแผน แตะหมุดหรือชิปแล้วการ์ดของที่นั้นขึ้น และหมุดนั้นใหญ่ขึ้น
// ตำแหน่งที่ AI เดาบอกว่า "ตำแหน่งโดยประมาณ"; ไม่มีตำแหน่งหรือห่างจากที่อื่นของวันเกิน 50 กม. ไม่ปักหมุด ให้ค้นใน Google Maps แทน
export default function MapScreen() {
  const { colors, pick, t } = useSettings();
  const { trip } = useTrip();
  const params = useLocalSearchParams<{ day?: string }>();
  const [day, setDay] = useState(() => Math.min(Math.max(0, Number(params.day) || 0), Math.max(0, trip.totalDays - 1)));
  const [sel, setSel] = useState<string>();
  const places = trip.days[day] ?? [];
  const p = places.find((x) => x.id === sel) ?? places[0];
  const n = p ? places.indexOf(p) + 1 : 0;
  const near = trip.destination.en;
  const photo = usePhotos(places.filter((x) => !x.photo).map((x) => ({ name: x.name.en, near })));
  // ทริปตัวอย่างมีพิกัดที่ตรวจแล้ว ทริปที่ AiGo วางใช้พิกัดที่ AI เดา
  const { points, missing } = dayPoints(places, (x) => pick(x.name), trip.sample);
  const where = !p ? undefined : missing.includes(p.id) ? 'none' : trip.sample ? 'ok' : 'approx';
  const search = () => p && Linking.openURL(mapsLink(`${p.name.en} ${near}`));
  // ไม่ได้ปักหมุด (ไม่มีพิกัดหรือพิกัดไกลผิดเมือง) นำทางด้วยชื่อแทนพิกัด
  const navigate = () => p && Linking.openURL(navLink(where === 'none' ? { name: `${p.name.en}, ${near}` } : { name: p.name.en, lat: p.lat, lon: p.lon }, Platform.OS));
  const top = (
    <View style={{ height: MAP_H }}>
      <TripMap points={points} selected={p?.id} onSelect={setSel} showUser pad={{ top: 0.28, bottom: 0.14, x: 0.12 }} />
      {/* ขอบบนของแผ่นข้อมูล ทับแผนที่เล็กน้อยแบบหน้าแผน */}
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: radius.xl, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, backgroundColor: colors.bg }} />
    </View>
  );
  return (
    <Screen top={top} title={`${pick({ th: 'แผนที่', en: 'Map' })} · ${t('it.day', { n: day + 1 })}`} subtitle={pick({ th: `${places.length} ที่`, en: `${places.length} stops` })}
      onBack={() => router.back()} footer={p && <Button label={t('place.navigate')} icon="pin" big onPress={navigate} />}>
      {trip.totalDays > 1 && (
        <FadeIn>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -space.lg }} contentContainerStyle={{ gap: space.sm, paddingHorizontal: space.lg }}>
            {Array.from({ length: trip.totalDays }, (_, d) => (
              <Chip key={d} label={t('it.day', { n: d + 1 })} selected={d === day} a11y={t('it.dayA11y', { n: d + 1 })} onPress={() => { setDay(d); setSel(undefined); }} />
            ))}
          </ScrollView>
        </FadeIn>
      )}
      {!p && <T tone="muted">{pick({ th: 'วันนี้ยังไม่มีที่แวะ ถ้า AiGo กำลังวางแผนอยู่ เดี๋ยวจะขึ้นเอง', en: 'No stops on this day yet. If AiGo is still planning, they will show up here.' })}</T>}
      {p && (
        <FadeIn index={1} style={{ gap: space.md }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -space.lg }} contentContainerStyle={{ gap: space.sm, paddingHorizontal: space.lg }}>
            {places.map((x, i) => <Chip key={x.id} label={`${i + 1} · ${pick(x.name)}`} selected={x.id === p.id} onPress={() => setSel(x.id)} />)}
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
          <T v="small" tone="muted">{pick({ th: 'แตะหมุดหรือชื่อด้านบนเพื่อเลือก', en: 'Tap a pin or a name above to choose' })}</T>
        </FadeIn>
      )}
    </Screen>
  );
}
