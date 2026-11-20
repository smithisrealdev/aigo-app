import { Image } from 'expo-image';
import { router } from 'expo-router';
import { View } from 'react-native';

import { Icon } from '@/components/icon';
import { Button, Row, Screen, T, tap } from '@/components/ui';
import { photos, trip } from '@/data/trip';
import { useSettings } from '@/lib/settings';
import { radius, space } from '@/theme/tokens';

// บันทึกทริป = จุดแรกที่ขอให้สมัคร (R14, R19) แล้วกลับไปทำต่อที่เดิม
// shortcut: ปุ่มเข้าสู่ระบบแค่ตั้งค่า signedIn ในเครื่อง, ต่อ Supabase Auth (Apple, Google, อีเมล) และ migrate-guest-trips เมื่อมี backend
const BENEFITS = [
  { th: 'เปิดแผนได้แม้ไม่มีเน็ต', en: 'Open your plan without internet' },
  { th: 'แผนตามไปทุกเครื่องที่คุณเข้าสู่ระบบ', en: 'Your plan follows you to every device' },
  { th: 'AiGo เฝ้าราคาและแจ้งเมื่อแผนมีปัญหา', en: 'AiGo watches prices and tells you when something changes' },
];

export default function Save() {
  const { colors, pick, set } = useSettings();
  const signIn = () => { tap('success'); set({ signedIn: true }); router.back(); };
  return (
    <Screen tint={colors.header.trips} title={pick({ th: 'เก็บแผนนี้ไว้กับคุณ', en: 'Keep this plan' })} subtitle={`${pick(trip.title)} · ${pick(trip.dates)}`} onBack={() => router.back()}>
      <Image source={photos.skyline} style={{ width: '100%', height: 130, borderRadius: radius.lg }} contentFit="cover" accessible={false} />
      <View>
        {BENEFITS.map((x, i) => (
          <Row key={x.th} last={i === BENEFITS.length - 1}>
            <Icon name="check" color={colors.success} />
            <T style={{ flex: 1 }}>{pick(x)}</T>
          </Row>
        ))}
      </View>
      <View style={{ gap: space.sm }}>
        <Button label={pick({ th: 'ไปต่อด้วย Apple', en: 'Continue with Apple' })} big onPress={signIn} />
        <Button kind="secondary" label={pick({ th: 'ไปต่อด้วย Google', en: 'Continue with Google' })} big onPress={signIn} />
        <Button kind="secondary" label={pick({ th: 'ใช้อีเมล', en: 'Use email' })} big onPress={signIn} />
      </View>
      <T v="small" tone="muted" style={{ textAlign: 'center' }}>{pick({ th: 'เมื่อไปต่อ ถือว่าคุณยอมรับข้อตกลงและนโยบายความเป็นส่วนตัว', en: 'By continuing you accept the terms and privacy policy' })}</T>
    </Screen>
  );
}
