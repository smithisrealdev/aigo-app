import { router } from 'expo-router';
import { View } from 'react-native';

import { Icon, type IconName } from '@/components/icon';
import { AiSays, ArtCard, Badge, Button, Card, FadeIn, IconButton, PhotoCard, Row, Screen, Section, Stamp, T } from '@/components/ui';
import { art, offers } from '@/data/trip';
import type { L } from '@/lib/i18n';
import { useSettings } from '@/lib/settings';
import { daysUntil, useTrip } from '@/lib/tripStore';
import { space } from '@/theme/tokens';

// shortcut: ทางเข้าหน้าตัวอย่างระหว่างเที่ยว ในแอปจริงหน้าเหล่านี้เปิดจาก push notification และลิงก์แชร์
const PREVIEWS: { href: '/today' | '/disruption' | '/shared/demo'; icon: IconName; tone: 'sky' | 'blush' | 'lilac'; label: L }[] = [
  { href: '/today', icon: 'pin', tone: 'sky', label: { th: 'วันนี้ วันที่ 2 (AiGo ย้ายแผนเพราะฝน)', en: 'Today, day 2 (AiGo moved a stop for rain)' } },
  { href: '/disruption', icon: 'alert', tone: 'blush', label: { th: 'เที่ยวบินกลับดีเลย์', en: 'Return flight delayed' } },
  { href: '/shared/demo', icon: 'share', tone: 'lilac', label: { th: 'ทริปที่เพื่อนแชร์มา', en: 'A trip a friend shared' } },
];

export default function Trips() {
  const { colors, t, pick } = useSettings();
  const { trip } = useTrip();
  const places = trip.days.flat().length;
  const away = daysUntil(trip.startDate);
  return (
    <Screen tabbed title={t('trips.title')} subtitle={t('trips.sub', { n: 1 })}
      right={<IconButton icon="user" label={pick({ th: 'บัญชีของฉัน', en: 'My account' })} onPress={() => router.push('/account')} />}>
      <FadeIn>
        <View>
          <PhotoCard source={trip.cover} height={260} title={pick(trip.title)} subtitle={`${pick(trip.dates)} · ${t('trips.offline')}`}
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

      {/* เที่ยวบินและที่พักที่รออนุมัติเป็นตัวอย่างของทริปโอซาก้า ทริปที่ AiGo สร้างยังไม่มีระบบค้นหา */}
      <FadeIn index={1} style={{ gap: space.md }}>
        {trip.sample ? <>
          <AiSays>{t('trips.waiting', { n: offers.length })}</AiSays>
          <Button label={t('work.see')} icon="next" onPress={() => router.push('/approvals')} />
        </> : <>
          <AiSays>{pick({ th: 'แผนเที่ยวพร้อมแล้ว ส่วนการหาเที่ยวบินและที่พักยังไม่เปิดในรุ่นทดลองนี้', en: 'Your plan is ready. Flight and hotel search is not open in this preview yet.' })}</AiSays>
          <Button label={t('trips.open')} icon="next" onPress={() => router.push('/itinerary')} />
        </>}
      </FadeIn>

      <FadeIn index={2}>
        <ArtCard tone="lilac" art={art.plan} title={t('trips.new')} body={pick({ th: 'บอกที่อยากไป AiGo จัดให้ครบ', en: 'Say where, AiGo sorts out the rest' })} onPress={() => router.push('/paywall')} />
      </FadeIn>

      <FadeIn index={3}>
        <Section title={pick({ th: 'ตัวอย่างหน้าจอระหว่างเที่ยว', en: 'Preview: during the trip' })}>
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
      </FadeIn>
    </Screen>
  );
}
