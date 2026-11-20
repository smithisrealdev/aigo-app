import { router } from 'expo-router';
import { View } from 'react-native';

import { Button, Card, Screen, T, tap } from '@/components/ui';
import { poses, trip } from '@/data/trip';
import { useSettings } from '@/lib/settings';
import { space } from '@/theme/tokens';

// บันทึกทริป = จุดแรกที่ขอให้สมัคร (R14, R19) แล้วกลับไปทำต่อที่เดิม
// shortcut: ปุ่มเข้าสู่ระบบแค่ตั้งค่า signedIn ในเครื่อง, ต่อ Supabase Auth (Apple, Google, อีเมล) และ migrate-guest-trips เมื่อมี backend
export default function Save() {
  const { colors, pick, set } = useSettings();
  const signIn = () => { tap('success'); set({ signedIn: true }); router.back(); };
  return (
    <Screen tint={colors.header.trips} title={pick({ th: 'เก็บแผนนี้ไว้กับคุณ', en: 'Keep this plan' })} subtitle={`${pick(trip.title)} · ${pick(trip.dates)}`} onBack={() => router.back()} mascot={poses.happy}>
      <Card tone="done" style={{ alignItems: 'center', gap: space.sm }}>
        <T v="heading">{pick({ th: 'เปิดแผนได้แม้ไม่มีเน็ต', en: 'Your plan works offline' })}</T>
        <T style={{ textAlign: 'center' }}>{pick({ th: 'สมัครก่อนจ่ายเงิน แผนจะเก็บไว้ในเครื่อง และตามไปทุกเครื่องที่คุณเข้าสู่ระบบ', en: 'Sign in before paying. The plan stays on this phone and follows you to every device.' })}</T>
      </Card>
      <View style={{ gap: space.sm }}>
        <Button label={pick({ th: 'ไปต่อด้วย Apple', en: 'Continue with Apple' })} big onPress={signIn} />
        <Button kind="secondary" label={pick({ th: 'ไปต่อด้วย Google', en: 'Continue with Google' })} big onPress={signIn} />
        <Button kind="secondary" label={pick({ th: 'ใช้อีเมล', en: 'Use email' })} big onPress={signIn} />
      </View>
      <T v="small" tone="muted" style={{ textAlign: 'center' }}>{pick({ th: 'เมื่อไปต่อ ถือว่าคุณยอมรับข้อตกลงและนโยบายความเป็นส่วนตัว', en: 'By continuing you accept the terms and privacy policy' })}</T>
    </Screen>
  );
}
