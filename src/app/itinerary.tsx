import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { AskBar, Card, Chip, IconButton, Screen, T, Thumb } from '@/components/ui';
import { trip } from '@/data/trip';
import { useSettings } from '@/lib/settings';
import { space } from '@/theme/tokens';

export default function Itinerary() {
  const { colors, t, pick } = useSettings();
  const [day, setDay] = useState(0);
  const places = trip.days[day] ?? [];
  const checked = places.filter((p) => p.checked).length;
  return (
    <Screen tint={colors.header.trips} title={pick(trip.title)} subtitle={`${pick(trip.dates)} · ${trip.people} คน`} onBack={() => router.back()}
      right={<IconButton icon="share" label="แชร์ทริป" onPress={() => {}} onPastelBg />}
      footer={<AskBar placeholder={t('it.tell')} onSend={() => {}} />}>
      <View style={{ flexDirection: 'row', gap: space.sm }}>
        {[0, 1, 2, 3, 4].map((d) => <Chip key={d} label={d === 0 ? t('it.day', { n: 1 }) : String(d + 1)} selected={d === day} onPress={() => setDay(d)} />)}
      </View>
      {places.length > 0 && (
        <Card tone="done">
          <T v="smallBold" tone="success">{t('it.verified', { n: checked, total: places.length })}</T>
          <T tone="pastel">{t('it.verifiedBody', { at: trip.checkedAt })}</T>
        </Card>
      )}
      {/* shortcut: มีข้อมูลตัวอย่างแค่วันที่ 1, วันอื่นรอข้อมูลจาก generate-itinerary */}
      {places.length === 0 && <T tone="muted">{t('common.sample')}</T>}
      {places.map((p) => (
        <Card key={p.id} onPress={() => router.push({ pathname: '/place/[id]', params: { id: p.id } })} label={pick(p.name)} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          <T v="bodyBold" style={{ width: 48, fontVariant: ['tabular-nums'] }}>{p.time}</T>
          <Thumb source={p.photo} />
          <View style={{ flex: 1 }}>
            <T v="subheading">{pick(p.name)}</T>
            <T v="small" tone={p.checked ? 'success' : 'muted'}>{p.checked ? t('it.open') : t('it.unchecked')}</T>
          </View>
        </Card>
      ))}
    </Screen>
  );
}
