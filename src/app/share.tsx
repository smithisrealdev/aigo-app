import { router } from 'expo-router';
import { useState } from 'react';
import { Share, Switch, View } from 'react-native';

import { AiSays, Badge, Button, Card, FadeIn, PhotoCard, Row, Screen, T, Tape, tap } from '@/components/ui';
import { planText } from '@/lib/itinerary';
import { usePhotos } from '@/lib/photos';
import { useSettings } from '@/lib/settings';
import { useTrip } from '@/lib/tripStore';
import { space } from '@/theme/tokens';

// shortcut: ลิงก์แชร์เป็นลิงก์ตัวอย่าง, สร้าง share token จริงผ่าน get-shared-trip ของ backend เว็บ (R26)
const LINK = 'https://theaigo.co/shared/demo';

export default function ShareTrip() {
  const { trip } = useTrip();
  return trip.sample ? <SampleShare /> : <TextShare />;
}

/** ทริปจริงยังไม่มีลิงก์ให้เพื่อนเปิด (ต้องบันทึกทริปเข้าบัญชีก่อน) จึงส่งแผนเป็นข้อความผ่านแอปไหนก็ได้ */
function TextShare() {
  const { pick, lang } = useSettings();
  const { trip } = useTrip();
  const cover = usePhotos(trip.cover ? [] : [{ name: trip.destination.en }]);
  const text = planText(trip, lang);
  return (
    <Screen title={pick({ th: 'แชร์ทริป', en: 'Share trip' })} subtitle={pick({ th: 'ส่งแผนเป็นข้อความ เพื่อนอ่านได้ทุกแอป', en: 'Send the plan as text, readable in any app' })} onBack={() => router.back()}
      footer={<Button label={pick({ th: 'ส่งแผนให้เพื่อน', en: 'Send the plan' })} icon="share" big onPress={() => Share.share({ message: text }).catch(() => {})} />}>
      <FadeIn style={{ paddingTop: space.sm, paddingHorizontal: space.xs }}>
        <View style={{ transform: [{ rotate: '-2deg' }] }}>
          <PhotoCard source={trip.cover ?? cover({ name: trip.destination.en })} height={200} title={pick(trip.title)} subtitle={pick(trip.dates)} />
          <Tape color="#FFD966" style={{ top: -10, right: 36 }} rotate={8} />
        </View>
      </FadeIn>
      <FadeIn index={1}>
        <Card tone="paper" style={{ gap: space.xs }}>
          <T v="smallBold" tone="muted">{pick({ th: 'ข้อความที่เพื่อนจะได้', en: 'What your friends get' })}</T>
          <T>{text}</T>
        </Card>
      </FadeIn>
      <FadeIn index={2}><AiSays>{pick({ th: 'ตอนนี้ส่งเป็นข้อความก่อน ลิงก์ที่เพื่อนกดเปิดดูแผนได้จะมาเมื่อบันทึกทริปเข้าบัญชีได้', en: 'For now the plan goes as text. A link friends can open comes once trips can be saved to an account.' })}</AiSays></FadeIn>
    </Screen>
  );
}

// ทริปตัวอย่าง: หน้าแชร์ตาม mockup (ลิงก์ตัวอย่าง)
function SampleShare() {
  const { colors, pick } = useSettings();
  const { trip } = useTrip();
  const [hideBudget, setHideBudget] = useState(true);
  const [closed, setClosed] = useState(false);
  const sw = { trackColor: { true: colors.accent, false: colors.line }, thumbColor: '#FFFFFF' };
  return (
    <Screen title={pick({ th: 'แชร์ทริป', en: 'Share trip' })} subtitle={pick({ th: 'เพื่อนเปิดดูได้ ไม่ต้องมีแอป', en: 'Friends can open it without the app' })} onBack={() => router.back()}
      footer={closed ? undefined : <Button label={pick({ th: 'ส่งลิงก์ให้เพื่อน', en: 'Send the link' })} icon="share" big onPress={() => Share.share({ message: `${pick(trip.title)} ${LINK}` }).catch(() => {})} />}>
      {/* ตัวอย่างหน้าที่เพื่อนจะเห็น ทำเป็นโปสการ์ดเอียงติดเทป */}
      <FadeIn style={{ paddingTop: space.sm, paddingHorizontal: space.xs }}>
        <View style={{ transform: [{ rotate: '-2deg' }] }}>
          <PhotoCard source={trip.cover} height={220} title={pick(trip.title)} subtitle={pick({ th: `${pick(trip.dates)} · ตรวจแล้วทุกที่`, en: `${pick(trip.dates)} · every place checked` })}
            badge={<Badge icon="next" label={pick({ th: 'แตะดูหน้าที่เพื่อนจะเห็น', en: 'Tap to see what friends see' })} />}
            onPress={() => router.push({ pathname: '/shared/[token]', params: { token: 'demo' } })} label={pick({ th: 'ดูหน้าที่เพื่อนจะเห็น', en: 'See what friends will see' })} />
          <Tape color="#FFD966" style={{ top: -10, right: 36 }} rotate={8} />
        </View>
      </FadeIn>
      <FadeIn index={1}>
        <Card tone="paper" style={{ paddingVertical: space.xs }}>
          <Row><T style={{ flex: 1 }}>{pick({ th: 'เพื่อนดูได้อย่างเดียว แก้ไม่ได้', en: 'Friends can view, not edit' })}</T><Switch {...sw} value disabled accessibilityLabel={pick({ th: 'ดูได้อย่างเดียว', en: 'View only' })} /></Row>
          <Row last><T style={{ flex: 1 }}>{pick({ th: 'ซ่อนงบและค่าใช้จ่าย', en: 'Hide budget and costs' })}</T><Switch {...sw} value={hideBudget} onValueChange={setHideBudget} accessibilityLabel={pick({ th: 'ซ่อนงบและค่าใช้จ่าย', en: 'Hide budget and costs' })} /></Row>
        </Card>
      </FadeIn>
      <FadeIn index={2}><AiSays>{pick({ th: 'เพื่อนกดเอาแผนนี้ไปปรับเป็นของตัวเองได้ ทริปของคุณไม่เปลี่ยน', en: 'Friends can copy this plan and adjust it. Your trip stays the same.' })}</AiSays></FadeIn>
      {closed
        ? (
          <FadeIn>
            <Card tone="done" style={{ gap: space.md }}>
              <T>{pick({ th: 'ปิดลิงก์แล้ว คนที่เปิดลิงก์เดิมจะเห็นว่าทริปนี้เปิดไม่ได้แล้ว', en: 'Link closed. Anyone opening it will see the trip is no longer available.' })}</T>
              <Button kind="dark" label={pick({ th: 'ดูหน้าที่เพื่อนจะเห็น', en: 'See what friends will see' })} onPress={() => router.push('/shared/closed')} />
            </Card>
          </FadeIn>
        )
        : <Button kind="secondary" label={pick({ th: 'ปิดลิงก์ที่แชร์ไว้', en: 'Turn off the shared link' })} onPress={() => { tap(); setClosed(true); }} />}
    </Screen>
  );
}
