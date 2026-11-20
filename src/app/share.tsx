import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { Share, Switch, View } from 'react-native';

import { AiSays, Button, Card, Row, Screen, T, tap } from '@/components/ui';
import { photos, trip } from '@/data/trip';
import { useSettings } from '@/lib/settings';
import { space } from '@/theme/tokens';

// shortcut: ลิงก์แชร์เป็นลิงก์ตัวอย่าง, สร้าง share token จริงผ่าน get-shared-trip ของ backend เว็บ (R26)
const LINK = 'https://theaigo.co/shared/demo';

export default function ShareTrip() {
  const { colors, pick } = useSettings();
  const [hideBudget, setHideBudget] = useState(true);
  const [closed, setClosed] = useState(false);
  return (
    <Screen tint={colors.header.trips} title={pick({ th: 'แชร์ทริป', en: 'Share trip' })} subtitle={pick({ th: 'เพื่อนเปิดดูได้ ไม่ต้องมีแอป', en: 'Friends can open it without the app' })} onBack={() => router.back()}
      footer={closed ? undefined : <Button label={pick({ th: 'ส่งลิงก์ให้เพื่อน', en: 'Send the link' })} icon="share" big onPress={() => Share.share({ message: `${pick(trip.title)} ${LINK}` }).catch(() => {})} />}>
      <Card onPress={() => router.push({ pathname: '/shared/[token]', params: { token: 'demo' } })} label={pick({ th: 'ดูหน้าที่เพื่อนจะเห็น', en: 'See what friends will see' })} style={{ padding: 0, overflow: 'hidden' }}>
        <Image source={photos.skyline} style={{ width: '100%', height: 110 }} contentFit="cover" accessible={false} />
        <View style={{ padding: space.lg, gap: space.xs }}>
          <T v="smallBold" tone="muted">{pick({ th: 'แตะเพื่อดูหน้าที่เพื่อนจะเห็น', en: 'Tap to see what friends will see' })}</T>
          <T v="title">{pick(trip.title)}</T>
          <T v="small" tone="success">{pick({ th: `${pick(trip.dates)} · ตรวจแล้วทุกที่`, en: `${pick(trip.dates)} · every place checked` })}</T>
        </View>
      </Card>
      <View>
        <Row><T style={{ flex: 1 }}>{pick({ th: 'เพื่อนดูได้อย่างเดียว แก้ไม่ได้', en: 'Friends can view, not edit' })}</T><Switch value disabled accessibilityLabel={pick({ th: 'ดูได้อย่างเดียว', en: 'View only' })} /></Row>
        <Row last><T style={{ flex: 1 }}>{pick({ th: 'ซ่อนงบและค่าใช้จ่าย', en: 'Hide budget and costs' })}</T><Switch value={hideBudget} onValueChange={setHideBudget} accessibilityLabel={pick({ th: 'ซ่อนงบและค่าใช้จ่าย', en: 'Hide budget and costs' })} /></Row>
      </View>
      <AiSays>{pick({ th: 'เพื่อนกดเอาแผนนี้ไปปรับเป็นของตัวเองได้ ทริปของคุณไม่เปลี่ยน', en: 'Friends can copy this plan and adjust it. Your trip stays the same.' })}</AiSays>
      {closed
        ? <Card tone="done"><T>{pick({ th: 'ปิดลิงก์แล้ว คนที่เปิดลิงก์เดิมจะเห็นว่าทริปนี้เปิดไม่ได้แล้ว', en: 'Link closed. Anyone opening it will see the trip is no longer available.' })}</T>
            <Button kind="onPastel" label={pick({ th: 'ดูหน้าที่เพื่อนจะเห็น', en: 'See what friends will see' })} onPress={() => router.push('/shared/closed')} /></Card>
        : <Button kind="secondary" label={pick({ th: 'ปิดลิงก์ที่แชร์ไว้', en: 'Turn off the shared link' })} onPress={() => { tap(); setClosed(true); }} />}
    </Screen>
  );
}
