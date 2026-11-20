import { router } from 'expo-router';
import { useState } from 'react';
import { Linking, View } from 'react-native';

import { AiSays, AskBar, Badge, Button, FadeIn, PhotoCard, RouteList, Screen, Segmented, T, tap, useToast } from '@/components/ui';
import { photos, poses } from '@/data/trip';
import { askAigo } from '@/lib/ask';
import { shortDate } from '@/lib/chat';
import { addDays, type Place } from '@/lib/itinerary';
import { usePhotos } from '@/lib/photos';
import { useSettings } from '@/lib/settings';
import { useTrip } from '@/lib/tripStore';
import { space } from '@/theme/tokens';

export default function Today() {
  const { trip } = useTrip();
  return trip.sample ? <SampleToday /> : <TripToday />;
}

/** วันนี้ของทริปจริง (R27): ที่ถัดไป เวลา และปุ่มนำทาง ก่อนวันเดินทางแสดงวันแรกไว้ดูก่อน */
function TripToday() {
  const { t, pick, lang } = useSettings();
  const { trip } = useTrip();
  const now = new Date();
  const today = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  const idx = Math.round((Date.parse(today) - Date.parse(trip.startDate)) / 86400000);
  const during = idx >= 0 && idx < trip.totalDays;
  const day = during ? idx : idx < 0 ? 0 : trip.totalDays - 1;
  const places = trip.days[day] ?? [];
  // ที่ถัดไป: ที่แรกที่ยังไม่ถึงเวลา (นอกช่วงเที่ยวคือที่แรกของวัน)
  // เทียบเป็นนาที เวลาจาก AI อาจเป็น "9:00" หรือ "09:00"
  const mins = (t?: string) => { const m = t?.match(/(\d{1,2}):(\d{2})/); return m ? Number(m[1]) * 60 + Number(m[2]) : -1; };
  const clock = now.getHours() * 60 + now.getMinutes();
  const at = during ? places.findIndex((p) => mins(p.time) < 0 || mins(p.time) >= clock) : 0;
  const next: Place | undefined = places[at];
  const rest = next ? places.slice(at + 1) : [];
  const near = trip.destination.en;
  const photo = usePhotos(places.filter((p) => !p.photo).map((p) => ({ name: p.name.en, near })));
  const navigate = (p: Place) => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${p.lat || p.lon ? `${p.lat},${p.lon}` : encodeURIComponent(p.name.en)}`);
  const note = idx < 0
    ? pick({ th: `อีก ${-idx} วันถึงวันเดินทาง ระหว่างเที่ยวหน้านี้จะบอกที่ถัดไปให้ทุกวัน ตอนนี้ดูวันแรกไว้ก่อนได้`, en: `${-idx} days to go. During the trip this page shows your next stop each day. Here is day 1 for now.` })
    : !during ? pick({ th: 'ทริปนี้จบแล้ว นี่คือวันสุดท้ายของแผน', en: 'This trip is over. Here is its last day.' })
      : !next ? pick({ th: 'วันนี้ไปครบทุกที่แล้ว พักผ่อนได้เลย', en: 'You have been to every stop today. Time to rest.' }) : undefined;
  return (
    <Screen title={during ? pick({ th: `วันนี้ ${t('it.day', { n: day + 1 })}`, en: `Today, ${t('it.day', { n: day + 1 })}` }) : t('it.day', { n: day + 1 })}
      subtitle={`${shortDate(addDays(trip.startDate, day), lang)} · ${pick(trip.destination)} · ${pick({ th: 'เก็บไว้ในเครื่อง', en: 'saved offline' })}`} onBack={() => router.back()}
      footer={<AskBar placeholder={pick({ th: 'ถาม AiGo เช่น แถวนี้มีคาเฟ่ไหม', en: 'Ask AiGo, e.g. any cafes nearby?' })} onSend={(q) => askAigo(q, trip, lang, day)} />}>
      <FadeIn>
        <Segmented options={[pick({ th: 'แผนทั้งหมด', en: 'Plan' }), pick({ th: 'วันนี้', en: 'Today' })]} value={1} onChange={() => router.replace('/itinerary')} />
      </FadeIn>
      {note && <FadeIn index={1}><AiSays>{note}</AiSays></FadeIn>}
      {next && (
        <FadeIn index={2}>
          <PhotoCard source={next.photo ?? photo({ name: next.name.en, near })} height={300} badge={<Badge label={[pick({ th: 'ถัดไป', en: 'Next' }), next.time].filter(Boolean).join(' · ')} />}
            title={pick(next.name)} subtitle={pick(next.tip)}>
            <Button kind="white" label={t('place.navigate')} icon="pin" onPress={() => navigate(next)} style={{ alignSelf: 'flex-start', marginTop: space.sm }} />
          </PhotoCard>
        </FadeIn>
      )}
      {next && rest.length > 0 && (
        <FadeIn index={3} style={{ gap: space.sm }}>
          <T v="heading">{pick({ th: 'ที่เหลือของวันนี้', en: 'Rest of today' })}</T>
          <RouteList start={{ icon: 'pin', title: pick(next.name), sub: next.time }}
            stops={rest.map((p) => ({ key: p.id, photo: p.photo ?? photo({ name: p.name.en, near }), name: pick(p.name), time: p.time, status: p.checked ? t('it.open') : t('it.unchecked'), statusTone: p.checked ? 'success' : 'muted',
              onPress: () => router.push({ pathname: '/place/[id]', params: { id: p.id } }) }))}
            legs={rest.map((p) => trip.legs[p.id] && { mode: trip.legs[p.id].mode, text: pick(trip.legs[p.id].text) })}
            end={{ title: pick({ th: 'จบวัน · กลับที่พัก', en: 'End of day · back to the hotel' }), sub: trip.hotel && pick(trip.hotel) }} />
        </FadeIn>
      )}
    </Screen>
  );
}

// ทริปตัวอย่าง วันที่ 2: AiGo ย้ายแผนเพราะฝนเองแล้วแจ้ง (RA6) ผู้ใช้กดเลิกทำได้
function SampleToday() {
  const { pick } = useSettings();
  const toast = useToast();
  const [kept, setKept] = useState<boolean | null>(null);
  const rest = kept === false
    ? { name: { th: 'สวนเท็นโนจิ', en: 'Tennoji Park' }, note: { th: 'ฝนตกช่วงนี้', en: 'Rain expected' }, warn: true }
    : { name: { th: 'ช้อปปิ้งชินไซบาชิ', en: 'Shinsaibashi shopping' }, note: { th: 'ย้ายมาแทนเพราะฝน · ตรวจแล้ว เปิดอยู่', en: 'Moved here for the rain · checked, open' }, warn: false };
  return (
    <Screen title={pick({ th: 'วันนี้ วันที่ 2', en: 'Today, day 2' })} subtitle={pick({ th: '13 ธ.ค. · โอซาก้า · เก็บไว้ในเครื่อง', en: '13 Dec · Osaka · saved offline' })} onBack={() => router.back()} mascot={poses.rain}
      footer={<AskBar placeholder={pick({ th: 'ถาม AiGo เช่น แถวนี้มีคาเฟ่ไหม', en: 'Ask AiGo, e.g. any cafes nearby?' })} onSend={() => toast(pick({ th: 'ส่งให้ AiGo แล้ว', en: 'Sent to AiGo' }))} />}>
      <FadeIn>
        <Segmented options={[pick({ th: 'แผนทั้งหมด', en: 'Plan' }), pick({ th: 'วันนี้', en: 'Today' })]} value={1} onChange={() => router.replace('/itinerary')} />
      </FadeIn>
      {/* ที่ถัดไปเป็นการ์ดรูปใหญ่ เวลาตัวโต ปุ่มนำทางกดได้ทันที */}
      <FadeIn index={1}>
        <PhotoCard source={photos.kaiyukan} height={300} badge={<Badge label={pick({ th: 'ถัดไป · 10:00', en: 'Next · 10:00' })} />}
          title={pick({ th: 'พิพิธภัณฑ์สัตว์น้ำไคยูกัง', en: 'Kaiyukan Aquarium' })} subtitle={pick({ th: 'ออกจากที่พักอีก 40 นาที · รถไฟ ประมาณ 25 นาที', en: 'Leave in 40 min · about 25 min by train' })}>
          <Button kind="white" label={pick({ th: 'นำทาง', en: 'Navigate' })} icon="pin" onPress={() => toast(pick({ th: 'เปิดแผนที่ในแอปจริงจะพาไปที่นี่', en: 'The real app opens maps here' }))} style={{ alignSelf: 'flex-start', marginTop: space.sm }} />
        </PhotoCard>
      </FadeIn>
      <FadeIn index={2} style={{ gap: space.md }}>
        {kept === null
          ? <AiSays>{pick({ th: 'ฉันย้ายสวนเท็นโนจิไปพรุ่งนี้แล้ว บ่ายนี้ฝนตก เลยใส่ช้อปปิ้งในร่มที่ชินไซบาชิแทน', en: 'I moved Tennoji Park to tomorrow. Rain this afternoon, so I put indoor shopping in Shinsaibashi instead.' })}</AiSays>
          : <T v="bodyBold" tone="muted">{kept ? pick({ th: 'เก็บแผนที่ AiGo ปรับไว้', en: 'Kept AiGo\'s change' }) : pick({ th: 'เลิกทำแล้ว กลับเป็นแผนเดิม', en: 'Undone, back to the original plan' })}</T>}
        {kept === null && (
          <View style={{ flexDirection: 'row', gap: space.sm, paddingLeft: 50 }}>
            <Button label={pick({ th: 'ดีแล้ว', en: 'Keep it' })} onPress={() => { tap(); setKept(true); }} style={{ flex: 1 }} />
            <Button kind="secondary" label={pick({ th: 'เลิกทำ', en: 'Undo' })} onPress={() => { tap(); setKept(false); }} style={{ flex: 1 }} />
          </View>
        )}
      </FadeIn>
      <FadeIn index={3} style={{ gap: space.sm }}>
        <T v="heading">{pick({ th: 'ที่เหลือของวันนี้', en: 'Rest of today' })}</T>
        <RouteList
          start={{ icon: 'pin', title: pick({ th: 'ตอนนี้ · ไคยูกัง', en: 'Now · Kaiyukan' }), sub: pick({ th: '10:00–12:30', en: '10:00–12:30' }) }}
          stops={[{ key: kept === false ? 'park' : 'shop', photo: photos.shinsaibashi, name: pick(rest.name), time: '15:00', status: pick(rest.note), statusTone: rest.warn ? 'warn' : 'success' }]}
          end={{ title: pick({ th: 'กลับที่พัก', en: 'Back to the hotel' }), sub: pick({ th: 'ประมาณ 20:00', en: 'Around 20:00' }) }} />
      </FadeIn>
    </Screen>
  );
}
