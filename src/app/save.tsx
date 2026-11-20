import { router } from 'expo-router';
import { View } from 'react-native';

import { Button, Card, FadeIn, Polaroid, Row, Screen, StatusDot, T, tap } from '@/components/ui';
import { photos, poses, trip } from '@/data/trip';
import { useSettings } from '@/lib/settings';
import { space } from '@/theme/tokens';

// บันทึกทริป = จุดแรกที่ขอให้สมัคร (R14, R19) แล้วกลับไปทำต่อที่เดิม
// shortcut: ปุ่มเข้าสู่ระบบแค่ตั้งค่า signedIn ในเครื่อง, ต่อ Supabase Auth (Apple, Google, อีเมล) และ migrate-guest-trips เมื่อมี backend
const BENEFITS = [
  { th: 'เปิดแผนได้แม้ไม่มีเน็ต', en: 'Open your plan without internet' },
  { th: 'แผนตามไปทุกเครื่องที่คุณเข้าสู่ระบบ', en: 'Your plan follows you to every device' },
  { th: 'AiGo เฝ้าราคาและแจ้งเมื่อแผนมีปัญหา', en: 'AiGo watches prices and tells you when something changes' },
];

export default function Save() {
  const { pick, set } = useSettings();
  const signIn = () => { tap('success'); set({ signedIn: true }); router.back(); };
  return (
    <Screen title={pick({ th: 'เก็บแผนนี้ไว้กับคุณ', en: 'Keep this plan' })} subtitle={`${pick(trip.title)} · ${pick(trip.dates)}`} onBack={() => router.back()} mascot={poses.happy}>
      <FadeIn style={{ alignItems: 'center', paddingVertical: space.sm }}>
        <Polaroid source={photos.skyline} caption={pick(trip.title)} rotate={-4} width={200} tape="#9CD3FF" />
      </FadeIn>
      <FadeIn index={1}>
        <Card tone="paper" style={{ paddingVertical: space.xs }}>
          {BENEFITS.map((x, i) => (
            <Row key={x.th} last={i === BENEFITS.length - 1}>
              <StatusDot state="done" />
              <T style={{ flex: 1 }}>{pick(x)}</T>
            </Row>
          ))}
        </Card>
      </FadeIn>
      <FadeIn index={2} style={{ gap: space.sm }}>
        <Button kind="dark" label={pick({ th: 'ไปต่อด้วย Apple', en: 'Continue with Apple' })} big onPress={signIn} />
        <Button kind="secondary" label={pick({ th: 'ไปต่อด้วย Google', en: 'Continue with Google' })} big onPress={signIn} />
        <Button kind="secondary" label={pick({ th: 'ใช้อีเมล', en: 'Use email' })} big onPress={signIn} />
        <View style={{ paddingTop: space.sm }}>
          <T v="small" tone="muted" style={{ textAlign: 'center' }}>{pick({ th: 'เมื่อไปต่อ ถือว่าคุณยอมรับข้อตกลงและนโยบายความเป็นส่วนตัว', en: 'By continuing you accept the terms and privacy policy' })}</T>
        </View>
      </FadeIn>
    </Screen>
  );
}
