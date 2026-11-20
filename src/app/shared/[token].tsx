import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AiSays, Button, Card, CurveHero, FadeIn, Mascot, RouteList, Screen, Section, T } from '@/components/ui';
import { photos, poses, trip } from '@/data/trip';
import { useSettings } from '@/lib/settings';
import { space, wide } from '@/theme/tokens';

// หน้าที่เพื่อนเห็นจากลิงก์แชร์ (R26c–e) token "closed" แสดงกรณีเจ้าของปิดลิงก์แล้ว
// shortcut: ไม่ได้ตรวจ token กับ backend, แสดงทริปตัวอย่างเสมอยกเว้น "closed"
export default function SharedTrip() {
  const { colors, pick } = useSettings();
  const insets = useSafeAreaInsets();
  const { token } = useLocalSearchParams<{ token: string }>();
  const closed = token === 'closed';
  const places = trip.days[0];
  // เปิดจากลิงก์ตรงจะไม่มีหน้าก่อนหน้าให้กลับ
  const onBack = router.canGoBack() ? () => router.back() : undefined;
  const logo = <Image source={require('@/assets/brand/logo-white.svg')} style={{ width: 76, height: 33 }} contentFit="contain" contentPosition="left" accessibilityLabel="AiGo" />;

  if (closed) {
    return (
      <Screen onBack={onBack} top={
        <CurveHero color={colors.sticker.blush} height={0}>
          <View style={[wide, { paddingTop: insets.top + 64, paddingHorizontal: space.lg, paddingBottom: 56, flexDirection: 'row', alignItems: 'center', gap: space.md }]}>
            <View style={{ flex: 1, gap: space.xs }}>
              <T v="smallBold" style={{ color: colors.mutedStrong }}>{pick({ th: 'ลิงก์ที่คุณได้รับถูกปิด', en: 'This link has been turned off' })}</T>
              <T v="title" accessibilityRole="header">{pick({ th: 'เปิดทริปนี้ไม่ได้แล้ว', en: 'This trip is no longer available' })}</T>
            </View>
            <Mascot pose={poses.rain} size={112} />
          </View>
        </CurveHero>
      }>
        <FadeIn>
          <Card tone="danger">
            <T v="subheading" tone="warn">{pick({ th: 'เจ้าของทริปหยุดแชร์แผนนี้', en: 'The owner stopped sharing this plan' })}</T>
            <T>{pick({ th: 'ถ้ายังอยากดู ขอลิงก์ใหม่จากเพื่อนที่ส่งมาได้', en: 'Ask your friend for a new link if you still want to see it' })}</T>
          </Card>
        </FadeIn>
        <FadeIn index={1}><AiSays>{pick({ th: 'หรือบอกฉันได้เลยว่าอยากไปไหน ฉันจัดแผนเที่ยวให้คุณเองได้ แผนแรกฟรี ไม่ต้องสมัคร', en: 'Or tell me where you want to go. I will plan it for you. The first plan is free, no sign-up.' })}</AiSays></FadeIn>
        <FadeIn index={2}><Button label={pick({ th: 'วางแผนทริปของฉัน', en: 'Plan my trip' })} icon="next" big onPress={() => router.replace('/')} /></FadeIn>
      </Screen>
    );
  }

  return (
    <Screen onBack={onBack} hero={photos.skyline} heroHeight={360}
      heroContent={<View style={{ gap: space.xs }}>
        <View style={{ marginBottom: space.sm }}>{logo}</View>
        <T v="smallBold" tone="white">{pick({ th: 'เพื่อนแชร์ทริปนี้ให้คุณ', en: 'A friend shared this trip with you' })}</T>
        <T v="hero" tone="white" accessibilityRole="header">{pick(trip.title)}</T>
        <T v="bodyBold" tone="white">{pick({ th: `${pick(trip.dates)} · ดูได้อย่างเดียว`, en: `${pick(trip.dates)} · view only` })}</T>
      </View>}>
      <FadeIn>
        <Card tone="done">
          <T v="smallBold" tone="success">{pick({ th: 'ตรวจแล้วทุกที่', en: 'Every place checked' })}</T>
          <T>{pick({ th: `AiGo ตรวจให้แล้วว่ายังเปิด ล่าสุดวันนี้ ${trip.checkedAt}`, en: `AiGo checked they are open, last at ${trip.checkedAt} today` })}</T>
        </Card>
      </FadeIn>
      <FadeIn index={1}>
        <Section title={pick({ th: 'วันที่ 1', en: 'Day 1' })}>
          <RouteList
            start={{ title: pick({ th: 'เริ่มวัน · 12 ธ.ค.', en: 'Day starts · 12 Dec' }), sub: pick({ th: 'ออกจากที่พักย่านนัมบะ', en: 'From the hotel in Namba' }) }}
            stops={places.map((p) => ({ key: p.id, photo: p.photo, name: pick(p.name), time: p.time }))}
            legs={places.map((p) => trip.legs[p.id] && { mode: trip.legs[p.id].mode, text: pick(trip.legs[p.id].text) })}
            end={{ title: pick({ th: 'จบวัน', en: 'End of day' }), sub: pick({ th: 'กลับที่พัก', en: 'Back to the hotel' }) }} />
        </Section>
      </FadeIn>
      <FadeIn index={2}><AiSays>{pick({ th: 'ชอบแผนนี้ไหม เอาไปปรับวันที่ จำนวนคน หรืองบเป็นของคุณได้', en: 'Like this plan? Copy it and change the dates, people or budget.' })}</AiSays></FadeIn>
      <FadeIn index={3} style={{ gap: space.sm }}>
        <Button label={pick({ th: 'เอาแผนนี้ไปปรับเป็นของฉัน', en: 'Make this plan mine' })} icon="next" big onPress={() => router.push({ pathname: '/chat', params: { prompt: pick(trip.title) } })} />
        <Button kind="secondary" label={pick({ th: 'วางแผนทริปใหม่ของฉันเอง', en: 'Plan my own trip' })} onPress={() => router.replace('/')} />
      </FadeIn>
    </Screen>
  );
}
