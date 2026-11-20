import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AiSays, Button, Card, Row, T, Thumb } from '@/components/ui';
import { poses, trip } from '@/data/trip';
import { useSettings } from '@/lib/settings';
import { space, wide } from '@/theme/tokens';

// หน้าที่เพื่อนเห็นจากลิงก์แชร์ (R26c–e) token "closed" แสดงกรณีเจ้าของปิดลิงก์แล้ว
// shortcut: ไม่ได้ตรวจ token กับ backend, แสดงทริปตัวอย่างเสมอยกเว้น "closed"
export default function SharedTrip() {
  const { colors, pick, isDark } = useSettings();
  const insets = useSafeAreaInsets();
  const { token } = useLocalSearchParams<{ token: string }>();
  const closed = token === 'closed';
  const places = trip.days[0];
  const fg = isDark ? 'ink' : 'onTint';
  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.header.home }} contentContainerStyle={{ flexGrow: 1 }}>
      <View style={[wide, { paddingTop: insets.top + space.md, paddingHorizontal: space.lg, paddingBottom: space.lg, gap: space.xs }]}>
        <Image source={require('@/assets/brand/logo-white.svg')} style={{ width: 84, height: 36 }} contentFit="contain" contentPosition="left" accessibilityLabel="AiGo" />
        <T v="smallBold" tone={fg}>{closed ? pick({ th: 'ลิงก์ที่คุณได้รับถูกปิด', en: 'This link has been turned off' }) : pick({ th: '[ชื่อเพื่อน] แชร์ทริปนี้ให้คุณ', en: '[Friend] shared this trip with you' })}</T>
        <T v="title" tone={fg} accessibilityRole="header">{closed ? pick({ th: 'เปิดทริปนี้ไม่ได้แล้ว', en: 'This trip is no longer available' }) : pick(trip.title)}</T>
        {!closed && <T v="smallBold" tone={fg}>{pick({ th: `${pick(trip.dates)} · ดูได้อย่างเดียว`, en: `${pick(trip.dates)} · view only` })}</T>}
      </View>
      <View style={{ flex: 1, borderTopLeftRadius: 32, borderTopRightRadius: 32, backgroundColor: colors.bg }}>
        <View style={[wide, { padding: space.lg, gap: space.md, paddingBottom: insets.bottom + space.xl }]}>
          {closed ? <>
            <Card tone="danger"><T v="subheading" tone="warn">{pick({ th: 'เจ้าของทริปหยุดแชร์แผนนี้', en: 'The owner stopped sharing this plan' })}</T><T>{pick({ th: 'ถ้ายังอยากดู ขอลิงก์ใหม่จากเพื่อนที่ส่งมาได้', en: 'Ask your friend for a new link if you still want to see it' })}</T></Card>
            <AiSays pose={poses.wave}>{pick({ th: 'หรือบอกฉันได้เลยว่าอยากไปไหน ฉันจัดแผนเที่ยวให้คุณเองได้ แผนแรกฟรี ไม่ต้องสมัคร', en: 'Or tell me where you want to go. I will plan it for you. The first plan is free, no sign-up.' })}</AiSays>
            <Button label={pick({ th: 'วางแผนทริปของฉัน', en: 'Plan my trip' })} big onPress={() => router.replace('/')} />
          </> : <>
            <Card tone="done"><T v="smallBold" tone="success">{pick({ th: 'ตรวจแล้วทุกที่', en: 'Every place checked' })}</T><T>{pick({ th: `AiGo ตรวจให้แล้วว่ายังเปิด ล่าสุดวันนี้ ${trip.checkedAt}`, en: `AiGo checked they are open, last at ${trip.checkedAt} today` })}</T></Card>
            <T v="smallBold" tone="muted">{pick({ th: 'วันที่ 1', en: 'Day 1' })}</T>
            <View>{places.map((p, i) => (
              <Row key={p.id} last={i === places.length - 1}>
                <T v="bodyBold" style={{ width: 48 }}>{p.time}</T>
                <Thumb source={p.photo} />
                <T v="subheading" style={{ flex: 1 }}>{pick(p.name)}</T>
              </Row>
            ))}</View>
            <AiSays pose={poses.wave}>{pick({ th: 'ชอบแผนนี้ไหม เอาไปปรับวันที่ จำนวนคน หรืองบเป็นของคุณได้', en: 'Like this plan? Copy it and change the dates, people or budget.' })}</AiSays>
            <Button label={pick({ th: 'เอาแผนนี้ไปปรับเป็นของฉัน', en: 'Make this plan mine' })} big onPress={() => router.push({ pathname: '/chat', params: { prompt: pick(trip.title) } })} />
            <Button kind="secondary" label={pick({ th: 'วางแผนทริปใหม่ของฉันเอง', en: 'Plan my own trip' })} onPress={() => router.replace('/')} />
          </>}
        </View>
      </View>
    </ScrollView>
  );
}
