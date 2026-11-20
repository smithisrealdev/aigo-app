import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { AskBar, Card, Chip, IconButton, Row, Screen, T, Thumb, useToast } from '@/components/ui';
import { legs, photos, trip } from '@/data/trip';
import { useSettings } from '@/lib/settings';
import { radius, space } from '@/theme/tokens';

export default function Itinerary() {
  const { colors, t, pick } = useSettings();
  const [day, setDay] = useState(0);
  const toast = useToast();
  const places = trip.days[day] ?? [];
  const checked = places.filter((p) => p.checked).length;
  return (
    <Screen tint={colors.header.trips} title={pick(trip.title)} subtitle={`${pick(trip.dates)} · ${trip.people} คน`} onBack={() => router.back()}
      right={<View style={{ flexDirection: 'row', gap: space.sm }}>
        <IconButton icon="pin" label={pick({ th: 'ดูบนแผนที่', en: 'View on map' })} onPress={() => router.push('/map')} onPastelBg />
        <IconButton icon="share" label={pick({ th: 'แชร์ทริป', en: 'Share trip' })} onPress={() => router.push('/share')} onPastelBg />
      </View>}
      footer={<AskBar placeholder={t('it.tell')} onSend={() => toast(t('toast.sent'))} />}>
      <Image source={photos.skyline} style={{ width: '100%', height: 150, borderRadius: radius.lg }} contentFit="cover" accessibilityLabel={pick({ th: 'วิวเมืองโอซาก้า', en: 'Osaka skyline' })} accessible />
      <View style={{ flexDirection: 'row', gap: space.sm }}>
        {[0, 1, 2, 3, 4].map((d) => <Chip key={d} label={d === 0 ? t('it.day', { n: 1 }) : String(d + 1)} selected={d === day} a11y={t('it.dayA11y', { n: d + 1 })} onPress={() => setDay(d)} />)}
      </View>
      {places.length > 0 && (
        <Card tone="done">
          <T v="smallBold" tone="success">{t('it.verified', { n: checked, total: places.length })}</T>
          <T tone="pastel">{t('it.verifiedBody', { at: trip.checkedAt })}</T>
        </Card>
      )}
      {/* shortcut: มีข้อมูลตัวอย่างแค่วันที่ 1, วันอื่นรอข้อมูลจาก generate-itinerary */}
      {places.length === 0 && <T tone="muted">{t('common.sample')}</T>}
      <View>{places.map((p, i) => (
        <View key={p.id} style={{ borderBottomWidth: i === places.length - 1 ? 0 : 1, borderBottomColor: colors.line }}>
          <Row onPress={() => router.push({ pathname: '/place/[id]', params: { id: p.id } })} label={`${i + 1}. ${pick(p.name)}`} last>
            <T v="bodyBold" style={{ width: 48, fontVariant: ['tabular-nums'] }}>{p.time}</T>
            <View>
              <Thumb source={p.photo} size={72} />
              {/* เลขตรงกับหมุดบนแผนที่ */}
              <View style={{ position: 'absolute', top: -6, left: -6, width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, borderWidth: 2, borderColor: colors.bg }}>
                <T v="smallBold" tone="onPrimary">{i + 1}</T>
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <T v="subheading">{pick(p.name)}</T>
              <T v="small" tone={p.checked ? 'success' : 'muted'}>{p.checked ? t('it.open') : t('it.unchecked')}</T>
            </View>
          </Row>
          {legs[p.id] && <T v="small" tone="muted" style={{ paddingLeft: 48 + space.md, paddingBottom: space.sm }}>↓ {pick(legs[p.id])}</T>}
        </View>
      ))}</View>
    </Screen>
  );
}
