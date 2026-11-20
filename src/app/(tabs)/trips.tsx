import { router } from 'expo-router';
import { View } from 'react-native';

import { AiSays, Button, Card, Screen, T, Thumb } from '@/components/ui';
import { offers, photos, trip } from '@/data/trip';
import { useSettings } from '@/lib/settings';
import { radius, space } from '@/theme/tokens';

export default function Trips() {
  const { colors, t, pick } = useSettings();
  return (
    <Screen tint={colors.header.trips} title={t('trips.title')} subtitle={t('trips.sub', { n: 1 })}>
      <Card tone="coral" style={{ gap: space.sm }}>
        <T v="smallBold" tone="pastelMuted">{t('trips.next', { n: trip.daysAway })}</T>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          <T v="title" tone="pastel" style={{ flex: 1 }}>{pick(trip.title)}</T>
          <Thumb source={photos.skyline} size={64} label="Osaka" />
        </View>
        <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
          {[pick(trip.dates), t('trips.offline')].map((x) => <View key={x} style={{ paddingHorizontal: space.md, paddingVertical: 4, borderRadius: radius.pill, backgroundColor: '#FFFFFF' }}><T v="smallBold" tone="pastel">{x}</T></View>)}
        </View>
        <Button kind="onPastel" label={t('trips.open')} onPress={() => router.push('/itinerary')} />
      </Card>
      <AiSays>{t('trips.waiting', { n: offers.length })}</AiSays>
      <Button label={t('work.see')} onPress={() => router.push('/approvals')} />
      <Button kind="accent" label={t('trips.new')} onPress={() => router.push('/')} />
    </Screen>
  );
}
