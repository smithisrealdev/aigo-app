import { router, useLocalSearchParams } from 'expo-router';
import { Linking, Platform, View } from 'react-native';

import { Icon } from '@/components/icon';
import { AiSays, Button, Card, Chip, FadeIn, PriceTag, Row, Screen, Section, T } from '@/components/ui';
import { baht } from '@/data/trip';
import { askAigo } from '@/lib/ask';
import { NO_PRICE } from '@/lib/itinerary';
import { navLink } from '@/lib/links';
import { usePhotos } from '@/lib/photos';
import { useSettings } from '@/lib/settings';
import { useTrip } from '@/lib/tripStore';
import { space } from '@/theme/tokens';

const ASK = [{ th: 'แถวนี้กินอะไรดี', en: 'What to eat nearby' }, { th: 'หาตั๋วให้หน่อย', en: 'Find tickets' }, { th: 'เปลี่ยนเป็นที่อื่น', en: 'Swap for another place' }];

export default function Place() {
  const { colors, t, pick, lang } = useSettings();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { trip } = useTrip();
  const day = trip.days.findIndex((d) => d.some((x) => x.id === id));
  const p = trip.days[day]?.find((x) => x.id === id);
  const near = trip.destination.en;
  const photo = usePhotos(p && !p.photo ? [{ name: p.name.en, near }] : []);
  if (!p) return <Screen title={t('common.sample')} onBack={() => router.back()}><T>{id}</T></Screen>;
  return (
    <Screen hero={p.photo ?? photo({ name: p.name.en, near })} heroHeight={340} title={pick(p.name)} subtitle={[t('it.day', { n: day + 1 }), p.time].filter(Boolean).join(' · ')} onBack={() => router.back()}
      footer={<Button label={t('place.navigate')} icon="pin" big onPress={() => Linking.openURL(navLink({ name: p.name.en, lat: p.lat, lon: p.lon }, Platform.OS))} />}>
      {!p.checked && (
        <FadeIn index={1}>
          <Card>
            <T v="smallBold" tone="muted">{t('it.unchecked')}</T>
            <T>{pick({ th: 'เวลาเปิดและราคามาจาก AI ยังไม่ได้ตรวจกับแหล่งจริง AiGo จะตรวจให้ก่อนเดินทาง', en: 'Hours and prices come from AI and are not verified yet. AiGo will check them before you go.' })}</T>
          </Card>
        </FadeIn>
      )}
      {p.checked && (
        <FadeIn index={1}>
          <Card tone="done" style={{ flexDirection: 'row', gap: space.md, alignItems: 'flex-start' }}>
            <View style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.success }}><Icon name="check" color={colors.bg} size={20} /></View>
            <View style={{ flex: 1, gap: 2 }}>
              <T v="smallBold" tone="success">{t('place.checked', { at: trip.checkedAt ?? '' })}</T>
              <T v="subheading">{t('place.open')}</T>
              <T v="small" style={{ color: colors.mutedStrong }}>{t('place.source', { x: 'Google Places' })}</T>
            </View>
          </Card>
        </FadeIn>
      )}
      {!!pick(p.tip) && <FadeIn index={2}><AiSays>{pick(p.tip)}</AiSays></FadeIn>}
      <FadeIn index={3}>
        <Card tone="paper" style={{ paddingVertical: space.xs }}>
          <Row><Line label={t('place.duration')} value={`${p.minutes / 60} ${pick({ th: 'ชม.', en: 'hr' })}`} /></Row>
          <Row last={!p.spend}>
            <View style={{ flex: 1, gap: 2 }}>
              <Line label={pick({ th: 'ค่าเข้า', en: 'Admission' })} value={pick(p.entry.text)} />
              {p.entry.text.en !== NO_PRICE.en && <PriceTag source={p.entry.source === 'official' ? pick({ th: 'เว็บทางการ', en: 'official site' }) : p.entry.source} at={p.entry.at} />}
            </View>
          </Row>
          {p.spend && (
            <Row last>
              <View style={{ flex: 1, gap: 2 }}>
                <Line label={pick({ th: 'ค่ากิน 2 คน', en: 'Food for 2' })} value={'~' + baht(p.spend.baht)} />
                <PriceTag source={p.spend.source} />
              </View>
            </Row>
          )}
        </Card>
      </FadeIn>
      <FadeIn index={4}>
        <Section title={t('place.askMore')}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
            {ASK.map((a) => <Chip key={a.th} label={pick(a)} onPress={() => askAigo(`${pick(a)} (${pick(p.name)})`, trip, lang, day)} />)}
          </View>
        </Section>
      </FadeIn>
    </Screen>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-between', gap: space.md }}>
      <T tone="muted">{label}</T>
      <T v="bodyBold">{value}</T>
    </View>
  );
}
