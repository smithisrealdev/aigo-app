import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { Icon, type IconName } from '@/components/icon';
import { AiSays, ArtCard, Badge, Button, Card, FadeIn, IconButton, PhotoCard, Row, Screen, Section, Stamp, StatusDot, T } from '@/components/ui';
import { art } from '@/data/trip';
import { askAigo } from '@/lib/ask';
import type { L } from '@/lib/i18n';
import type { AppTrip } from '@/lib/itinerary';
import { usePhotos } from '@/lib/photos';
import { useSettings } from '@/lib/settings';
import { daysUntil, useTrip } from '@/lib/tripStore';
import { space } from '@/theme/tokens';

// shortcut: ทางเข้าหน้าตัวอย่างระหว่างเที่ยว ในแอปจริงหน้าเหล่านี้เปิดจาก push notification และลิงก์แชร์
const PREVIEWS: { href: '/itinerary' | '/today' | '/disruption' | '/shared/demo'; icon: IconName; tone: 'sky' | 'blush' | 'lilac' | 'sun'; label: L }[] = [
  { href: '/itinerary', icon: 'map', tone: 'sun', label: { th: 'แผนตัวอย่าง โอซาก้า 5 วัน', en: 'Sample plan: Osaka, 5 days' } },
  { href: '/today', icon: 'pin', tone: 'sky', label: { th: 'วันนี้ วันที่ 2 (AiGo ย้ายแผนเพราะฝน)', en: 'Today, day 2 (AiGo moved a stop for rain)' } },
  { href: '/disruption', icon: 'alert', tone: 'blush', label: { th: 'เที่ยวบินกลับดีเลย์', en: 'Return flight delayed' } },
  { href: '/shared/demo', icon: 'share', tone: 'lilac', label: { th: 'ทริปที่เพื่อนแชร์มา', en: 'A trip a friend shared' } },
];

export default function Trips() {
  const { colors, t, pick } = useSettings();
  const { trip, trips, openTrip } = useTrip();
  const places = trip.days.flat().length;
  const away = daysUntil(trip.startDate);
  // ทริปที่ AiGo สร้างไม่มีรูปปก ใช้รูปของเมืองปลายทาง
  const cover = usePhotos(trip.cover ? [] : [{ name: trip.destination.en }]);
  return (
    <Screen tabbed title={t('trips.title')} subtitle={t('trips.sub', { n: trips.length })}
      right={<IconButton icon="user" label={pick({ th: 'บัญชีของฉัน', en: 'My account' })} onPress={() => router.push('/account')} />}>
      {trip.sample ? (
        <FadeIn style={{ gap: space.md }}>
          <AiSays>{pick({ th: 'ยังไม่มีทริป บอกฉันว่าอยากไปไหน เดี๋ยวฉันวางแผนให้ทั้งทริป', en: 'No trips yet. Tell me where you want to go and I will plan the whole trip.' })}</AiSays>
          <Button label={pick({ th: 'เริ่มวางแผน', en: 'Start planning' })} icon="next" big onPress={() => router.navigate('/')} />
        </FadeIn>
      ) : <>
        <FadeIn>
          <View>
            <PhotoCard source={trip.cover ?? cover({ name: trip.destination.en })} height={260} title={pick(trip.title)} subtitle={`${pick(trip.dates)} · ${t('trips.offline')}`}
              badge={<Badge label={pick({ th: 'ทริปถัดไป', en: 'Next trip' })} />} onPress={() => router.push('/itinerary')} label={`${pick(trip.title)}, ${t('trips.open')}`}>
              <View style={{ flexDirection: 'row', gap: space.sm, marginTop: space.sm }}>
                {[pick({ th: `${trip.totalDays} วัน`, en: `${trip.totalDays} days` }), pick({ th: `${places} ที่`, en: `${places} places` }), pick({ th: `${trip.people} คน`, en: `${trip.people} people` })].map((s) => (
                  <View key={s} style={{ paddingHorizontal: space.md, paddingVertical: 4, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.22)' }}><T v="smallBold" tone="white">{s}</T></View>
                ))}
              </View>
            </PhotoCard>
            {/* นับถอยหลังเป็นตราประทับบนรูป แบบตราในพาสปอร์ต */}
            <View pointerEvents="none" style={{ position: 'absolute', bottom: space.lg, right: space.lg }}>
              <Stamp label={pick({ th: `อีก ${away} วัน`, en: `${away} days to go` })} color="#FFFFFF" size={84} rotate={-12} />
            </View>
          </View>
        </FadeIn>

        <FadeIn index={1} style={{ gap: space.md }}>
          <AiSays>{trip.bookings?.length
            ? pick({ th: `แผนเที่ยวพร้อมแล้ว และฉันหาเที่ยวบิน ที่พัก ร้าน และบริการไว้ให้ ${trip.bookings.length} รายการ ดูได้ท้ายแผน`, en: `Your plan is ready, and I found ${trip.bookings.length} flights, hotels, places to eat and services. They are at the end of the plan.` })
            : pick({ th: 'แผนเที่ยวพร้อมแล้ว เปิดดูได้แม้ไม่มีเน็ต', en: 'Your plan is ready and works offline.' })}</AiSays>
          <Button label={t('trips.open')} icon="next" onPress={() => router.push('/itinerary')} />
        </FadeIn>
        <FadeIn index={2}><Checklist trip={trip} /></FadeIn>
        <FadeIn index={2}>
          <ArtCard tone="lilac" art={art.plan} title={t('trips.new')} body={pick({ th: 'บอกที่อยากไป AiGo จัดให้ครบ', en: 'Say where, AiGo sorts out the rest' })} onPress={() => router.push('/paywall')} />
        </FadeIn>
        {trips.length > 1 && (
          <FadeIn index={3}>
            <Section title={pick({ th: 'ทริปอื่นของคุณ', en: 'Your other trips' })}>
              <Card style={{ paddingVertical: space.xs }}>
                {trips.slice(1).map((x, i, rest) => (
                  <Row key={x.id} last={i === rest.length - 1} onPress={() => openTrip(x.id)} label={`${pick(x.title)}, ${pick(x.dates)}`}>
                    <View style={{ flex: 1 }}>
                      <T v="bodyBold">{pick(x.title)}</T>
                      <T v="small" tone="muted">{pick(x.dates)}</T>
                    </View>
                    <Icon name="next" color={colors.muted} />
                  </Row>
                ))}
              </Card>
            </Section>
          </FadeIn>
        )}
      </>}

      {trip.sample && <FadeIn index={3}>
        <Section title={pick({ th: 'ดูตัวอย่างก่อนได้', en: 'See examples first' })}>
          <Card style={{ paddingVertical: space.xs }}>
            {PREVIEWS.map((p, i) => (
              <Row key={p.href} last={i === PREVIEWS.length - 1} onPress={() => router.push(p.href)} label={pick(p.label)}>
                <View style={{ width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.sticker[p.tone] }}><Icon name={p.icon} color={colors.ink} size={20} /></View>
                <T v="bodyBold" style={{ flex: 1 }}>{pick(p.label)}</T>
                <Icon name="next" color={colors.muted} />
              </Row>
            ))}
          </Card>
        </Section>
      </FadeIn>}
    </Screen>
  );
}

// เช็กลิสต์ก่อนเดินทาง (R24) รวมข้อเฉพาะคนไทย ติ๊กแล้วจำไว้ในเครื่องแยกตามทริป
const CHECKS: { id: string; label: (country: string) => L }[] = [
  { id: 'passport', label: () => ({ th: 'พาสปอร์ตเหลืออายุอย่างน้อย 6 เดือนนับจากวันเดินทาง', en: 'Passport valid for at least 6 months from departure' }) },
  { id: 'visa', label: (c) => ({ th: `เช็กวีซ่า ${c} สำหรับพาสปอร์ตไทย`, en: `Check ${c} visa rules for Thai passports` }) },
  { id: 'flight', label: () => ({ th: 'จองเที่ยวบินไปกลับ', en: 'Book return flights' }) },
  { id: 'hotel', label: () => ({ th: 'จองที่พักครบทุกคืน', en: 'Book a place for every night' }) },
  { id: 'insurance', label: () => ({ th: 'ทำประกันการเดินทาง', en: 'Get travel insurance' }) },
  { id: 'sim', label: () => ({ th: 'ซิมหรือ eSIM สำหรับต่างประเทศ', en: 'SIM or eSIM for abroad' }) },
  { id: 'money', label: () => ({ th: 'เงินสดหรือบัตรที่ใช้ต่างประเทศได้', en: 'Cash or a card that works abroad' }) },
];

function Checklist({ trip }: { trip: AppTrip }) {
  const { t, pick, lang } = useSettings();
  const key = `aigo.check.${trip.id}`;
  const country = trip.destination.en.split(',').pop()?.trim() || trip.destination.en;
  const [done, setDone] = useState<string[]>([]);
  useEffect(() => {
    AsyncStorage.getItem(key).then((v) => setDone(v ? JSON.parse(v) : [])).catch(() => {});
  }, [key]);
  const toggle = (id: string) => {
    const next = done.includes(id) ? done.filter((x) => x !== id) : [...done, id];
    setDone(next);
    AsyncStorage.setItem(key, JSON.stringify(next)).catch(() => {});
  };
  return (
    <Section title={t('trips.checklist', { n: done.length, total: CHECKS.length })}>
      <Card style={{ paddingVertical: space.xs }}>
        {CHECKS.map((c, i) => {
          const on = done.includes(c.id);
          return (
            <Row key={c.id} last={i === CHECKS.length - 1} onPress={() => toggle(c.id)}
              label={`${pick(c.label(country))}, ${on ? pick({ th: 'เสร็จแล้ว', en: 'done' }) : pick({ th: 'ยังไม่เสร็จ', en: 'not done' })}`}>
              <StatusDot state={on ? 'done' : 'wait'} />
              <T style={{ flex: 1 }} tone={on ? 'muted' : 'ink'}>{pick(c.label(country))}</T>
            </Row>
          );
        })}
      </Card>
      <Button kind="secondary" label={pick({ th: `ถาม AiGo เรื่องวีซ่า ${country}`, en: `Ask AiGo about ${country} visas` })}
        onPress={() => askAigo(pick({ th: `พาสปอร์ตไทยต้องใช้วีซ่าไป ${country} ไหม ต้องเตรียมอะไรบ้าง`, en: `Do Thai passport holders need a visa for ${country}? What should I prepare?` }), trip, lang)} />
    </Section>
  );
}
