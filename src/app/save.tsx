import * as AppleAuthentication from 'expo-apple-authentication';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';

import { Button, Card, FadeIn, Polaroid, Row, Screen, StatusDot, T, useToast } from '@/components/ui';
import { poses } from '@/data/trip';
import { problem, useAuth, type Provider } from '@/lib/auth';
import { useSettings } from '@/lib/settings';
import { useTrip } from '@/lib/tripStore';
import { radius, space } from '@/theme/tokens';

// บันทึกทริป = จุดแรกที่ขอให้สมัคร (R14, R19) เข้าแล้วทริปในเครื่องย้ายเข้าบัญชีเอง (R20) หรือกด "ยังไม่บันทึก" กลับไปดูแผน (R21)
const BENEFITS = [
  { th: 'เปิดแผนได้แม้ไม่มีเน็ต', en: 'Open your plan without internet' },
  { th: 'แผนตามไปทุกเครื่องที่คุณเข้าสู่ระบบ', en: 'Your plan follows you to every phone you sign in on' },
  { th: 'เปลี่ยนหรือทำมือถือหาย ทริปก็ไม่หาย', en: 'A new or lost phone does not lose your trips' },
];

export default function Save() {
  const { pick, isDark } = useSettings();
  const toast = useToast();
  const { trip } = useTrip();
  const { user, signInWith } = useAuth();
  const [busy, setBusy] = useState<Provider | null>(null);
  const [apple, setApple] = useState(false);
  useEffect(() => { if (Platform.OS === 'ios') AppleAuthentication.isAvailableAsync().then(setApple).catch(() => {}); }, []);
  const go = async (p: Provider) => {
    setBusy(p);
    try {
      if (await signInWith(p)) toast(pick({ th: 'เก็บทริปไว้กับบัญชีแล้ว', en: 'Your trip is kept with your account' }));
    } catch (e) {
      toast(pick(problem(e).text));
    } finally {
      setBusy(null);
    }
  };
  return (
    <Screen title={pick({ th: 'เก็บแผนนี้ไว้กับคุณ', en: 'Keep this plan' })} subtitle={`${pick(trip.title)} · ${pick(trip.dates)}`} onBack={() => router.back()} mascot={poses.happy}>
      <FadeIn style={{ alignItems: 'center', paddingVertical: space.sm }}>
        <Polaroid source={trip.cover} caption={pick(trip.title)} rotate={-4} width={200} tape="#9CD3FF" />
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
      {user ? (
        <FadeIn index={2} style={{ gap: space.sm }}>
          <Card tone="done">
            <T v="bodyBold">{pick({ th: 'ทริปนี้อยู่ในบัญชีของคุณแล้ว', en: 'This trip is in your account' })}</T>
            {!!user.email && <T tone="muted">{user.email}</T>}
          </Card>
          <Button kind="dark" label={pick({ th: 'กลับไปที่แผน', en: 'Back to the plan' })} big onPress={() => router.back()} />
        </FadeIn>
      ) : (
        <FadeIn index={2} style={{ gap: space.sm }}>
          {/* ปุ่ม Apple ของระบบ ตามแนวทางของ Apple */}
          {apple && (
            <AppleAuthentication.AppleAuthenticationButton buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
              buttonStyle={isDark ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
              cornerRadius={radius.pill} style={{ height: 56 }} onPress={() => go('apple')} />
          )}
          <Button kind="secondary" label={pick({ th: 'ไปต่อด้วย Google', en: 'Continue with Google' })} big busy={busy === 'google'} onPress={() => go('google')} />
          <Button kind="secondary" label={pick({ th: 'ใช้อีเมล', en: 'Use email' })} big onPress={() => router.push('/login')} />
          <Button kind="ghost" label={pick({ th: 'ยังไม่บันทึก', en: 'Not now' })} onPress={() => router.back()} />
          <View style={{ paddingTop: space.sm }}>
            <T v="small" tone="muted" style={{ textAlign: 'center' }}>{pick({ th: 'เมื่อไปต่อ ถือว่าคุณยอมรับข้อตกลงและนโยบายความเป็นส่วนตัว', en: 'By continuing you accept the terms and privacy policy' })}</T>
          </View>
        </FadeIn>
      )}
    </Screen>
  );
}
