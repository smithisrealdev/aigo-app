import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { Linking, Pressable, View } from 'react-native';

import { Button, Row, Screen, T, Thumb } from '@/components/ui';
import { mapPins, photos, trip } from '@/data/trip';
import { useSettings } from '@/lib/settings';
import { fonts, onPastel, radius, space, vivid } from '@/theme/tokens';

export default function MapScreen() {
  const { colors, pick, t, isDark } = useSettings();
  const places = trip.days[0];
  const [sel, setSel] = useState(1);
  const p = places[sel];
  return (
    <Screen tint={colors.header.trips} title={pick({ th: 'แผนที่ วันที่ 1', en: 'Map, day 1' })} subtitle={pick({ th: '4 ที่ · เดินทางรวม ประมาณ 45 นาที', en: '4 stops · about 45 min of travel' })} onBack={() => router.back()}
      footer={<Button label={t('place.navigate')} icon="pin" big onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lon}`)} />}>
      {/* shortcut: ภาพแผนที่นิ่งจาก OpenStreetMap, เปลี่ยนเป็น react-native-maps หรือ Google Maps เมื่อต่อข้อมูลจริง */}
      <View style={{ width: '100%', aspectRatio: 1, borderRadius: radius.lg, overflow: 'hidden' }}>
        <Image source={photos.map} style={{ width: '100%', height: '100%', opacity: isDark ? 0.8 : 1 }} contentFit="cover" accessible={false} />
        {places.map((x, i) => {
          const [fx, fy] = mapPins[x.id]; const on = i === sel; const d = on ? 44 : 36;
          return (
            <Pressable key={x.id} accessibilityRole="button" accessibilityLabel={`${i + 1} ${pick(x.name)}`} accessibilityState={{ selected: on }} onPress={() => setSel(i)}
              style={{ position: 'absolute', left: `${fx * 100}%`, top: `${fy * 100}%`, width: d, height: d, marginLeft: -d / 2, marginTop: -d / 2, borderRadius: d, alignItems: 'center', justifyContent: 'center',
                backgroundColor: on ? vivid.yellow : onPastel.ink, borderWidth: on ? 3 : 2, borderColor: on ? onPastel.ink : '#FFFFFF' }}>
              <T v="bodyBold" style={{ color: on ? onPastel.ink : '#FFFFFF', fontFamily: fonts.bodyBold }}>{i + 1}</T>
            </Pressable>
          );
        })}
        <View style={{ position: 'absolute', right: space.sm, bottom: space.sm, paddingHorizontal: 6, borderRadius: 6, backgroundColor: '#FFFFFF' }}><T v="small" tone="pastel">© OpenStreetMap</T></View>
      </View>
      <View>
        <Row last onPress={() => router.push({ pathname: '/place/[id]', params: { id: p.id } })} label={pick(p.name)}>
          <Thumb source={p.photo} />
          <View style={{ flex: 1 }}>
            <T v="subheading">{`${sel + 1}. ${pick(p.name)}`}</T>
            <T v="small" tone="success">{`${p.time} · ${t('it.open')}`}</T>
          </View>
        </Row>
      </View>
    </Screen>
  );
}
