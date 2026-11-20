import { router } from 'expo-router';
import { View } from 'react-native';

import { Image } from 'expo-image';

import { AiSays, Button, Card, Screen, T } from '@/components/ui';
import { offers, photos, trip } from '@/data/trip';
import { useSettings } from '@/lib/settings';
import { radius, space } from '@/theme/tokens';

export default function Trips() {
  const { colors, t, pick } = useSettings();
  return (
    <Screen tint={colors.header.trips} title={t('trips.title')} subtitle={t('trips.sub', { n: 1 })}>
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <Image source={photos.skyline} style={{ width: '100%', height: 140 }} contentFit="cover" accessibilityLabel="Osaka" accessible />
        <View style={{ padding: space.lg, gap: space.sm }}>
          <T v="smallBold" tone="muted">{t('trips.next', { n: trip.daysAway })}</T>
          <T v="title">{pick(trip.title)}</T>
          <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
            {[pick(trip.dates), t('trips.offline')].map((x) => <View key={x} style={{ paddingHorizontal: space.md, paddingVertical: 4, borderRadius: radius.pill, backgroundColor: colors.bg }}><T v="smallBold">{x}</T></View>)}
          </View>
          <Button label={t('trips.open')} onPress={() => router.push('/itinerary')} />
        </View>
      </Card>
      <AiSays>{t('trips.waiting', { n: offers.length })}</AiSays>
      <Button label={t('work.see')} onPress={() => router.push('/approvals')} />
      <Button kind="accent" label={t('trips.new')} onPress={() => router.push('/')} />
    </Screen>
  );
}
