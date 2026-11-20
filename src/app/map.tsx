import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Button, Chip, FadeIn, lift, Screen, SketchMap, StopCard, T } from '@/components/ui';
import { mapPins, photos } from '@/data/trip';
import { navLink } from '@/lib/links';
import { useSettings } from '@/lib/settings';
import { useTrip } from '@/lib/tripStore';
import { fonts, radius, space } from '@/theme/tokens';

export default function MapScreen() {
  const { colors, pick, t, isDark } = useSettings();
  const { trip } = useTrip();
  const places = trip.days[0] ?? [];
  const [sel, setSel] = useState(Math.min(1, places.length - 1));
  const p = places[sel];
  if (!p) return <Screen title={t('common.sample')} onBack={() => router.back()}><T>{pick(trip.title)}</T></Screen>;
  // ทริปตัวอย่างมีภาพแผนที่จริงของวันที่ 1 ทริปที่ AiGo สร้างใช้แผนที่ร่างจากพิกัด
  const real = trip.sample && places.every((x) => mapPins[x.id]);
  const route = real ? places.map((x, i) => `${i ? 'L' : 'M'}${mapPins[x.id][0] * 100} ${mapPins[x.id][1] * 100}`).join(' ') : '';
  return (
    <Screen title={pick({ th: 'แผนที่ วันที่ 1', en: 'Map, day 1' })} subtitle={pick({ th: `${places.length} ที่`, en: `${places.length} stops` })} onBack={() => router.back()}
      footer={<Button label={t('place.navigate')} icon="pin" big onPress={() => Linking.openURL(navLink({ name: p.name.en, lat: p.lat, lon: p.lon }, Platform.OS))} />}>
      {/* shortcut: ภาพแผนที่นิ่งจาก OpenStreetMap, เปลี่ยนเป็น react-native-maps หรือ Google Maps เมื่อต่อข้อมูลจริง */}
      <FadeIn>
        <View style={[{ width: '100%', aspectRatio: 1, borderRadius: radius.xl, overflow: 'hidden' }, lift(isDark, 0.8)]}>
          {!real && <SketchMap points={places.filter((x) => x.lat || x.lon).map((x) => ({ key: x.id, lat: x.lat, lon: x.lon, label: pick(x.name) }))} pad={{ top: 0.14, bottom: 0.14, x: 0.14 }} />}
          {real && <>
          <Image source={photos.map} style={{ width: '100%', height: '100%', opacity: isDark ? 0.82 : 1 }} contentFit="cover" accessible={false} />
          <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" pointerEvents="none">
            <Path d={route} stroke="#2A2622" strokeOpacity={0.8} strokeWidth={3.5} strokeDasharray="0.5 9" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" fill="none" />
          </Svg>
          {places.map((x, i) => {
            const [fx, fy] = mapPins[x.id]; const on = i === sel; const d = on ? 44 : 34;
            return (
              <Pressable key={x.id} accessibilityRole="button" accessibilityLabel={`${i + 1} ${pick(x.name)}`} accessibilityState={{ selected: on }} onPress={() => setSel(i)} hitSlop={6}
                style={{ position: 'absolute', left: `${fx * 100}%`, top: `${fy * 100}%`, width: d, height: d, marginLeft: -d / 2, marginTop: -d / 2, borderRadius: d, alignItems: 'center', justifyContent: 'center',
                  backgroundColor: on ? colors.primary : '#2A2622', borderWidth: 3, borderColor: '#FFFFFF' }}>
                <Text style={{ fontFamily: fonts.bodyBold, fontSize: on ? 17 : 14, color: on ? '#2A2622' : '#FFFFFF' }}>{i + 1}</Text>
              </Pressable>
            );
          })}
          <View style={{ position: 'absolute', right: space.sm, bottom: space.sm, paddingHorizontal: 6, borderRadius: 6, backgroundColor: '#FFFFFF' }}><Text style={{ fontFamily: fonts.body, fontSize: 12, color: '#2A2622' }}>© OpenStreetMap</Text></View>
          </>}
        </View>
      </FadeIn>
      <FadeIn index={1} style={{ gap: space.md }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -space.lg }} contentContainerStyle={{ gap: space.sm, paddingHorizontal: space.lg }}>
          {places.map((x, i) => <Chip key={x.id} label={`${i + 1} · ${pick(x.name)}`} selected={i === sel} onPress={() => setSel(i)} />)}
        </ScrollView>
        <StopCard n={sel + 1} photo={p.photo} name={pick(p.name)} time={p.time} meta={pick(p.tip)} status={p.checked ? t('it.open') : t('it.unchecked')} statusTone={p.checked ? 'success' : 'muted'}
          onPress={() => router.push({ pathname: '/place/[id]', params: { id: p.id } })} />
        <T v="small" tone="muted">{pick({ th: 'แตะหมุดหรือชื่อที่ด้านบนเพื่อเลือก', en: 'Tap a pin or a name above to choose' })}</T>
      </FadeIn>
    </Screen>
  );
}
