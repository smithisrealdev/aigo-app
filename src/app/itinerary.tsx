import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { TripCards } from '@/components/cards';
import { Icon } from '@/components/icon';
import { TripMap } from '@/components/tripMap';
import { AiSays, AskBar, Button, Card, Chip, FadeIn, Glass, IconButton, Mascot, PressScale, RouteList, Screen, Segmented, T, Thinking, useToast } from '@/components/ui';
import { poses } from '@/data/trip';
import { askAigo } from '@/lib/ask';
import { replanDay } from '@/lib/backend';
import { shortDate } from '@/lib/chat';
import { addDays, toAppTrip, type AppTrip } from '@/lib/itinerary';
import { dayPoints } from '@/lib/mapPoints';
import { usePhotos } from '@/lib/photos';
import { useSettings } from '@/lib/settings';
import { useTrip } from '@/lib/tripStore';
import { radius, space } from '@/theme/tokens';

const MAP_H = 330;

// แผนทริปแบบ Polarsteps: แผนที่ด้านบน แผนเป็นแผ่นซ้อนขึ้นมา จุดแวะมีเลขตรงกับหมุด มีป้ายการเดินทางระหว่างจุด และปุ่ม + ขอให้ AiGo เพิ่มที่แวะ
export default function Itinerary() {
  const { colors, t, pick, lang, autoEdit } = useSettings();
  const { trip: saved, planning, setTrip } = useTrip();
  const [day, setDay] = useState(0);
  const toast = useToast();
  // "บอก AiGo" แก้แผนของวันนั้นจริง (R13): AiGo วางวันนั้นใหม่ตามที่ขอ แก้แล้วแจ้งพร้อมปุ่มเลิกทำ (RA6)
  // ถ้าปิด "ให้ AiGo แก้แผนเอง" ไว้ จะแสดงเป็นข้อเสนอให้กดรับหรือไว้ก่อน (RA9, RA3); ทริปตัวอย่างยังส่งคำถามไปที่แชต
  const [edit, setEdit] = useState<{ day: number; wish: string; fail?: boolean } | null>(null);
  const [undo, setUndo] = useState<{ day: number; trip: AppTrip } | null>(null);
  const [offer, setOffer] = useState<{ day: number; trip: AppTrip } | null>(null);
  const trip = offer?.day === day ? offer.trip : saved;
  const replan = (wish: string, d = day) => {
    if (planning || (edit && !edit.fail)) { toast(pick({ th: 'รอให้ AiGo ทำงานที่ค้างอยู่เสร็จก่อนนะ', en: 'Let AiGo finish what it is doing first' })); return; }
    const before = saved;
    setEdit({ day: d, wish }); setUndo(null); setOffer(null);
    const current = before.days[d]?.map((p) => p.name.en).join(', ');
    const req = { destination: before.destination.en, startDate: before.startDate, endDate: before.startDate, travelers: `${before.people} people`, language: lang };
    replanDay(req, addDays(before.startDate, d), current ? `Current plan for this day: ${current}. Change it as the traveller asks and keep the rest: ${wish}` : wish,
      before.days.map((ps, i) => ({ places: i === d ? [] : ps.map((x) => ({ name: x.name.en })) })))
      .then((g) => {
        const fresh = toAppTrip({ days: [g] }, req, before.people);
        const next: AppTrip = { ...before, days: before.days.map((ps, i) => (i === d ? fresh.days[0] : ps)), legs: { ...before.legs, ...fresh.legs },
          dayTitles: before.days.map((_, i) => (i === d ? fresh.dayTitles?.[0] : before.dayTitles?.[i]) ?? { th: '', en: '' }) };
        if (autoEdit) { setTrip(next); setUndo({ day: d, trip: before }); } else setOffer({ day: d, trip: next });
        setEdit(null);
      })
      .catch(() => setEdit({ day: d, wish, fail: true }));
  };
  const tell = (q: string) => (saved.sample ? askAigo(q, saved, lang, day) : replan(q));
  const places = trip.days[day] ?? [];
  // ทริปที่ AiGo สร้างไม่มีรูปมาด้วย ค้นรูปจากชื่อสถานที่ (ชื่อภาษาอังกฤษ) ในเมืองของทริป
  const near = trip.destination.en;
  const photo = usePhotos(places.filter((p) => !p.photo).map((p) => ({ name: p.name.en, near })));
  const checked = places.filter((p) => p.checked).length;
  const allChecked = places.length > 0 && checked === places.length;
  const date = shortDate(addDays(trip.startDate, day), lang);
  const hours = (m: number) => pick({ th: `ใช้เวลา ${m / 60} ชม.`, en: `${m / 60} hr` });
  const between = (i: number) => {
    const a = places[i - 1], b = places[i];
    if (!a) return pick({ th: `ก่อน${pick(b.name)}`, en: `before ${pick(b.name)}` });
    if (!b) return pick({ th: `หลัง${pick(a.name)}`, en: `after ${pick(a.name)}` });
    return pick({ th: `ระหว่าง${pick(a.name)}กับ${pick(b.name)}`, en: `between ${pick(a.name)} and ${pick(b.name)}` });
  };
  // แผนที่ของวันที่เลือก (วันที่ยังว่างใช้วันแรก) เป็นภาพหัวหน้า แตะปุ่มแผนที่เพื่อเปิดแผนที่เต็มของวันนั้น
  const mapAt = places.length ? day : 0;
  const { points } = dayPoints(trip.days[mapAt] ?? [], (p) => pick(p.name), trip.sample);
  const top = (
    <View style={{ height: MAP_H }}>
      <TripMap points={points} interactive={false} pad={{ top: 0.3, bottom: 0.17, x: 0.12 }} />
      <View style={{ position: 'absolute', right: space.lg, bottom: radius.xl + space.md }}>
        <PressScale onPress={() => router.push({ pathname: '/map', params: { day: String(mapAt) } })} label={pick({ th: `เปิดแผนที่ของ${t('it.day', { n: mapAt + 1 })}`, en: `Open the map of ${t('it.day', { n: mapAt + 1 })}` })}>
          <Glass r={radius.pill} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: space.md, minHeight: 44 }}>
            <Icon name="map" color={colors.ink} size={18} />
            <T v="smallBold">{pick({ th: 'แผนที่', en: 'Map' })}</T>
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
      footer={<AskBar placeholder={t('it.tell')} onSend={tell} />}>
      <FadeIn index={1}>
        <Segmented options={[pick({ th: 'แผนทั้งหมด', en: 'Plan' }), pick({ th: 'วันนี้', en: 'Today' })]} value={0} onChange={() => router.replace('/today')} />
      </FadeIn>
      <FadeIn index={2}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -space.lg }} contentContainerStyle={{ gap: space.sm, paddingHorizontal: space.lg }}>
          {Array.from({ length: trip.totalDays }, (_, d) => <Chip key={d} label={t('it.day', { n: d + 1 })} selected={d === day} a11y={t('it.dayA11y', { n: d + 1 })} onPress={() => setDay(d)} />)}
        </ScrollView>
      </FadeIn>
      {edit?.day === day && !edit.fail && (
        <FadeIn style={{ gap: space.md }}>
          <AiSays>{pick({ th: `ฉันกำลังแก้${t('it.day', { n: day + 1 })} ตามที่บอก: "${edit.wish}"`, en: `I am changing ${t('it.day', { n: day + 1 })} as you asked: "${edit.wish}"` })}</AiSays>
          <Thinking label={pick({ th: 'AiGo กำลังวางแผนใหม่', en: 'AiGo is replanning' })} />
        </FadeIn>
      )}
      {edit?.day === day && edit.fail && (
        <FadeIn>
          <Card tone="danger" style={{ gap: space.md }}>
            <T>{pick({ th: 'แก้แผนไม่สำเร็จ แผนเดิมยังอยู่ครบ', en: 'Could not change the plan. Your plan is unchanged.' })}</T>
            <View style={{ flexDirection: 'row', gap: space.sm }}>
              <Button label={pick({ th: 'ลองใหม่', en: 'Try again' })} onPress={() => replan(edit.wish, edit.day)} style={{ flex: 1 }} />
              <Button kind="secondary" label={pick({ th: 'ไว้ก่อน', en: 'Not now' })} onPress={() => setEdit(null)} style={{ flex: 1 }} />
            </View>
          </Card>
        </FadeIn>
      )}
      {undo?.day === day && (
        <FadeIn style={{ gap: space.md }}>
          <AiSays>{pick({ th: `แก้${t('it.day', { n: day + 1 })} ตามที่ขอแล้ว ยังไม่ได้ตรวจเวลาเปิดของที่ใหม่`, en: `I changed ${t('it.day', { n: day + 1 })} as you asked. New places are not checked yet.` })}</AiSays>
          <View style={{ flexDirection: 'row', gap: space.sm, paddingLeft: 50 }}>
            <Button label={pick({ th: 'ดีแล้ว', en: 'Keep it' })} onPress={() => setUndo(null)} style={{ flex: 1 }} />
            <Button kind="secondary" label={pick({ th: 'เลิกทำ', en: 'Undo' })} onPress={() => { setTrip(undo.trip); setUndo(null); }} style={{ flex: 1 }} />
          </View>
        </FadeIn>
      )}
      {offer?.day === day && (
        <FadeIn style={{ gap: space.md }}>
          <AiSays>{pick({ th: `นี่คือ${t('it.day', { n: day + 1 })} แบบใหม่ที่ฉันเสนอ ใช้แทนแผนเดิมไหม`, en: `Here is a new ${t('it.day', { n: day + 1 })}. Use it instead?` })}</AiSays>
          <View style={{ flexDirection: 'row', gap: space.sm, paddingLeft: 50 }}>
            <Button label={pick({ th: 'ใช้แผนนี้', en: 'Use this plan' })} onPress={() => { setTrip(offer.trip); setOffer(null); }} style={{ flex: 1 }} />
            <Button kind="secondary" label={pick({ th: 'ไว้ก่อน', en: 'Not now' })} onPress={() => setOffer(null)} style={{ flex: 1 }} />
          </View>
        </FadeIn>
      )}
      {places.length > 0 ? (
        <RouteList key={day}
          start={{
            title: `${t('it.day', { n: day + 1 })} · ${date}`,
            sub: trip.dayTitles?.[day] ? pick(trip.dayTitles[day]) : allChecked && trip.checkedAt ? t('it.verifiedBody', { at: trip.checkedAt }) : undefined,
            right: (
              <View accessible accessibilityLabel={t('it.verified', { n: checked, total: places.length })} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: space.md, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: allChecked ? colors.done : colors.surfaceSoft }}>
                <Icon name="check" color={allChecked ? colors.success : colors.muted} size={14} />
                <T v="smallBold" tone={allChecked ? 'success' : 'muted'}>{`${checked}/${places.length}`}</T>
              </View>
            ),
          }}
          stops={places.map((p) => ({
            key: p.id, photo: p.photo ?? photo({ name: p.name.en, near }), name: pick(p.name), time: p.time, meta: hours(p.minutes),
            status: p.checked ? t('it.open') : t('it.unchecked'), statusTone: p.checked ? 'success' : 'muted',
            onPress: () => router.push({ pathname: '/place/[id]', params: { id: p.id } }),
          }))}
          legs={places.map((p) => trip.legs[p.id] && { mode: trip.legs[p.id].mode, text: pick(trip.legs[p.id].text) })}
          onAdd={(i) => tell(pick({ th: `เพิ่มที่แวะ${between(i)}`, en: `Add a stop ${between(i)}` }))}
          addLabel={(i) => pick({ th: `ขอให้ AiGo เพิ่มที่แวะ${between(i)}`, en: `Ask AiGo to add a stop ${between(i)}` })}
          end={{ title: pick({ th: 'จบวัน · กลับที่พัก', en: 'End of day · back to the hotel' }), sub: trip.hotel && pick(trip.hotel) }} />
      ) : (
        // shortcut: ทริปตัวอย่างมีข้อมูลแค่วันที่ 1; ทริปที่ AiGo สร้างมีวันว่างเฉพาะวันที่ยังสร้างไม่ถึง
        <FadeIn key={day}>
          <View style={{ alignItems: 'center', gap: space.sm, padding: space.xl, borderRadius: radius.lg, borderWidth: 2, borderStyle: 'dashed', borderColor: colors.line }}>
            <Mascot pose={poses.think} size={96} />
            <T v="heading" style={{ textAlign: 'center' }}>{planning
              ? pick({ th: `AiGo กำลังวางแผน${t('it.day', { n: day + 1 })}`, en: `AiGo is planning ${t('it.day', { n: day + 1 })}` })
              : pick({ th: `${t('it.day', { n: day + 1 })} ยังว่างอยู่`, en: `${t('it.day', { n: day + 1 })} is still open` })}</T>
            {trip.sample && <T tone="muted" style={{ textAlign: 'center' }}>{t('common.sample')}</T>}
            {!planning && <Button kind="dark" icon="spark" label={pick({ th: 'ให้ AiGo วางแผนวันนี้', en: 'Let AiGo plan this day' })} onPress={() => tell(pick({ th: `วางแผน${t('it.day', { n: day + 1 })}ให้หน่อย`, en: `Plan ${t('it.day', { n: day + 1 })} for me` }))} style={{ marginTop: space.sm }} />}
          </View>
        </FadeIn>
      )}
      {!!trip.bookings?.length && (
        <FadeIn style={{ gap: space.md, marginTop: space.lg }}>
          <T v="title">{pick({ th: 'การจองที่ AiGo แนะนำ', en: 'Bookings AiGo suggests' })}</T>
          <TripCards cards={trip.bookings} only={['flight', 'hotel', 'food', 'ticket', 'service']}
            trip={{ destination: near, startDate: trip.startDate, endDate: addDays(trip.startDate, trip.totalDays - 1), people: trip.people }} />
        </FadeIn>
      )}
    </Screen>
  );
}
