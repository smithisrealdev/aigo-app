import { router } from 'expo-router';
import { View } from 'react-native';

import { Image } from 'expo-image';

import { Icon } from '@/components/icon';
import { AiSays, Button, Card, IconButton, Row, Screen, T } from '@/components/ui';
import { offers, photos, trip } from '@/data/trip';
import { useSettings } from '@/lib/settings';
import { radius, space } from '@/theme/tokens';

export default function Trips() {
  const { colors, t, pick } = useSettings();
  return (
    <Screen tint={colors.header.trips} title={t('trips.title')} subtitle={t('trips.sub', { n: 1 })}
      right={<IconButton icon="user" label={pick({ th: 'บัญชีของฉัน', en: 'My account' })} onPress={() => router.push('/account')} onPastelBg />}>
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
      <Button kind="accent" label={t('trips.new')} onPress={() => router.push('/paywall')} />
      {/* shortcut: ทางเข้าหน้าตัวอย่างระหว่างเที่ยว ในแอปจริงหน้าเหล่านี้เปิดจาก push notification และลิงก์แชร์ */}
      <T v="smallBold" tone="muted" style={{ marginTop: space.lg }}>{pick({ th: 'ตัวอย่างหน้าจอระหว่างเที่ยว', en: 'Preview: during the trip' })}</T>
      <View>
        {([['/today', { th: 'วันนี้ วันที่ 2 (AiGo ย้ายแผนเพราะฝน)', en: 'Today, day 2 (AiGo moved a stop for rain)' }], ['/disruption', { th: 'เที่ยวบินกลับดีเลย์', en: 'Return flight delayed' }], ['/shared/demo', { th: 'ทริปที่เพื่อนแชร์มา', en: 'A trip a friend shared' }]] as const).map(([href, label], i) => (
          <Row key={href} last={i === 2} onPress={() => router.push(href)} label={pick(label)}><T style={{ flex: 1 }}>{pick(label)}</T><Icon name="next" color={colors.muted} /></Row>
        ))}
      </View>
    </Screen>
  );
}
