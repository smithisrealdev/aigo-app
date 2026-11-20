import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { Linking, View } from 'react-native';

import { AiSays, Button, Card, Chip, PriceTag, Screen, T } from '@/components/ui';
import { allPlaces, baht, trip } from '@/data/trip';
import { useSettings } from '@/lib/settings';
import { radius, space } from '@/theme/tokens';

const ASK = [{ th: 'แถวนี้กินอะไรดี', en: 'What to eat nearby' }, { th: 'หาตั๋วให้หน่อย', en: 'Find tickets' }, { th: 'เปลี่ยนเป็นที่อื่น', en: 'Swap for another place' }];

export default function Place() {
  const { colors, t, pick } = useSettings();
  const { id } = useLocalSearchParams<{ id: string }>();
  const p = allPlaces().find((x) => x.id === id);
  if (!p) return <Screen tint={colors.header.place} title={t('common.sample')} onBack={() => router.back()}><T>{id}</T></Screen>;
  return (
    <Screen tint={colors.header.place} title={pick(p.name)} subtitle={`${t('it.day', { n: 1 })} · ${p.time}`} onBack={() => router.back()}
      footer={<Button label={t('place.navigate')} icon="pin" big onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lon}`)} />}>
      <Image source={p.photo} style={{ width: '100%', height: 170, borderRadius: radius.lg }} contentFit="cover" accessibilityLabel={pick(p.name)} accessible />
      {p.checked && (
        <Card tone="done">
          <T v="smallBold" tone="success">{t('place.checked', { at: trip.checkedAt })}</T>
          <T v="subheading" tone="pastel">{t('place.open')}</T>
          <T v="small" tone="pastelMuted">{t('place.source', { x: 'Google Places' })}</T>
        </Card>
      )}
      <AiSays>{pick(p.tip)}</AiSays>
      <Card style={{ gap: space.sm }}>
        <Row label={t('place.duration')} value={`${p.minutes / 60} ชม.`} />
        <View style={{ height: 1, backgroundColor: colors.line }} />
        <Row label="ค่าเข้า" value={pick(p.entry.text)} />
        <PriceTag source={p.entry.source} at={p.entry.at} />
        {p.spend && <>
          <View style={{ height: 1, backgroundColor: colors.line }} />
          <Row label="ค่ากิน 2 คน" value={'~' + baht(p.spend.baht)} />
          <PriceTag source={p.spend.source} />
        </>}
      </Card>
      <T v="smallBold" tone="muted">{t('place.askMore')}</T>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
        {ASK.map((a) => <Chip key={a.th} label={pick(a)} onPress={() => {}} />)}
      </View>
    </Screen>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space.md }}>
      <T tone="muted">{label}</T>
      <T v="bodyBold">{value}</T>
    </View>
  );
}
