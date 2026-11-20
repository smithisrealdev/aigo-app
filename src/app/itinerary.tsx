import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { Icon } from '@/components/icon';
import { AskBar, Button, Chip, FadeIn, Glass, IconButton, Mascot, PressScale, RouteList, Screen, Segmented, SketchMap, T, useToast } from '@/components/ui';
import { legs, poses, trip } from '@/data/trip';
import { useSettings } from '@/lib/settings';
import { radius, space } from '@/theme/tokens';

const MAP_H = 330;

// แผนทริปแบบ Polarsteps: แผนที่ด้านบน แผนเป็นแผ่นซ้อนขึ้นมา จุดแวะมีเลขตรงกับหมุด มีป้ายการเดินทางระหว่างจุด และปุ่ม + ขอให้ AiGo เพิ่มที่แวะ
export default function Itinerary() {
  const { colors, t, pick } = useSettings();
  const [day, setDay] = useState(0);
  const toast = useToast();
  const places = trip.days[day] ?? [];
  const checked = places.filter((p) => p.checked).length;
  const date = pick({ th: `${12 + day} ธ.ค.`, en: `${12 + day} Dec` });
  const hours = (m: number) => pick({ th: `ใช้เวลา ${m / 60} ชม.`, en: `${m / 60} hr` });
  const between = (i: number) => {
    const a = places[i - 1], b = places[i];
    if (!a) return pick({ th: `ก่อน${pick(b.name)}`, en: `before ${pick(b.name)}` });
    if (!b) return pick({ th: `หลัง${pick(a.name)}`, en: `after ${pick(a.name)}` });
    return pick({ th: `ระหว่าง${pick(a.name)}กับ${pick(b.name)}`, en: `between ${pick(a.name)} and ${pick(b.name)}` });
  };
  const top = (
    <View style={{ height: MAP_H }}>
      <SketchMap points={(trip.days[0] ?? []).map((p) => ({ key: p.id, lat: p.lat, lon: p.lon, label: pick(p.name) }))} pad={{ top: 0.3, bottom: 0.17, x: 0.12 }} />
      <View style={{ position: 'absolute', right: space.lg, bottom: radius.xl + space.md }}>
        <PressScale onPress={() => router.push('/map')} label={pick({ th: 'ดูแผนที่จริง', en: 'Open the real map' })}>
          <Glass r={radius.pill} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: space.md, minHeight: 40 }}>
            <Icon name="map" color={colors.ink} size={18} />
            <T v="smallBold">{pick({ th: 'แผนที่จริง', en: 'Real map' })}</T>
          </Glass>
        </PressScale>
      </View>
      {/* ขอบบนของแผ่นแผน มีที่จับแบบ bottom sheet */}
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: radius.xl, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, backgroundColor: colors.bg, alignItems: 'center', paddingTop: 10 }}>
        <View style={{ width: 40, height: 5, borderRadius: 3, backgroundColor: colors.line }} />
      </View>
    </View>
  );
  return (
    <Screen top={top} title={pick(trip.title)} subtitle={`${pick(trip.dates)} · ${pick({ th: `${trip.people} คน`, en: `${trip.people} people` })}`} onBack={() => router.back()}
      right={<IconButton icon="share" label={pick({ th: 'แชร์ทริป', en: 'Share trip' })} onPress={() => router.push('/share')} />}
      footer={<AskBar placeholder={t('it.tell')} onSend={() => toast(t('toast.sent'))} />}>
      <FadeIn index={1}>
        <Segmented options={[pick({ th: 'แผนทั้งหมด', en: 'Plan' }), pick({ th: 'วันนี้', en: 'Today' })]} value={0} onChange={() => router.replace('/today')} />
      </FadeIn>
      <FadeIn index={2}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -space.lg }} contentContainerStyle={{ gap: space.sm, paddingHorizontal: space.lg }}>
          {[0, 1, 2, 3, 4].map((d) => <Chip key={d} label={t('it.day', { n: d + 1 })} selected={d === day} a11y={t('it.dayA11y', { n: d + 1 })} onPress={() => setDay(d)} />)}
        </ScrollView>
      </FadeIn>
      {places.length > 0 ? (
        <RouteList key={day}
          start={{
            title: `${t('it.day', { n: day + 1 })} · ${date}`, sub: t('it.verifiedBody', { at: trip.checkedAt }),
            right: (
              <View accessible accessibilityLabel={t('it.verified', { n: checked, total: places.length })} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: space.md, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: colors.done }}>
                <Icon name="check" color={colors.success} size={14} />
                <T v="smallBold" tone="success">{`${checked}/${places.length}`}</T>
              </View>
            ),
          }}
          stops={places.map((p) => ({
            key: p.id, photo: p.photo, name: pick(p.name), time: p.time, meta: hours(p.minutes),
            status: p.checked ? t('it.open') : t('it.unchecked'), statusTone: p.checked ? 'success' : 'muted',
            onPress: () => router.push({ pathname: '/place/[id]', params: { id: p.id } }),
          }))}
          legs={places.map((p) => legs[p.id] && { mode: legs[p.id].mode, text: pick(legs[p.id].text) })}
          onAdd={(i) => toast(t('toast.ask', { x: pick({ th: `หาที่แวะ${between(i)}`, en: `find a stop ${between(i)}` }) }))}
          addLabel={(i) => pick({ th: `ขอให้ AiGo เพิ่มที่แวะ${between(i)}`, en: `Ask AiGo to add a stop ${between(i)}` })}
          end={{ title: pick({ th: 'จบวัน · กลับที่พัก', en: 'End of day · back to the hotel' }), sub: pick({ th: 'โรงแรมย่านนัมบะ', en: 'Hotel in Namba' }) }} />
      ) : (
        // shortcut: มีข้อมูลตัวอย่างแค่วันที่ 1, วันอื่นรอข้อมูลจาก generate-itinerary
        <FadeIn key={day}>
          <View style={{ alignItems: 'center', gap: space.sm, padding: space.xl, borderRadius: radius.lg, borderWidth: 2, borderStyle: 'dashed', borderColor: colors.line }}>
            <Mascot pose={poses.think} size={96} />
            <T v="heading" style={{ textAlign: 'center' }}>{pick({ th: `${t('it.day', { n: day + 1 })} ยังว่างอยู่`, en: `${t('it.day', { n: day + 1 })} is still open` })}</T>
            <T tone="muted" style={{ textAlign: 'center' }}>{t('common.sample')}</T>
            <Button kind="dark" icon="spark" label={pick({ th: 'ให้ AiGo วางแผนวันนี้', en: 'Let AiGo plan this day' })} onPress={() => toast(t('toast.sent'))} style={{ marginTop: space.sm }} />
          </View>
        </FadeIn>
      )}
    </Screen>
  );
}
