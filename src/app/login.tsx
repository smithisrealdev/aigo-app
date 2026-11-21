import * as AppleAuthentication from 'expo-apple-authentication';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, TextInput } from 'react-native';

import { Button, Card, FadeIn, Screen, T, useToast } from '@/components/ui';
import { problem, useAuth, type Provider } from '@/lib/auth';
import { useSettings } from '@/lib/settings';
import { fonts, radius, space } from '@/theme/tokens';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const leave = () => (router.canGoBack() ? router.back() : router.replace('/'));

// เข้าสู่ระบบ (R19): Apple (iPhone), Google หรืออีเมลพร้อมรหัส 6 หลัก เข้าแล้วกลับไปหน้าที่มา ทริปในเครื่องย้ายเข้าบัญชีเอง (R20)
export default function Login() {
  const { colors, pick, isDark } = useSettings();
  const { user, sendCode, verifyCode, signInWith } = useAuth();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [sentTo, setSentTo] = useState(''); // ส่งรหัสไปที่อีเมลนี้แล้ว รอผู้ใช้กรอก
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState<'send' | 'verify' | Provider | null>(null);
  const [error, setError] = useState('');
  const [apple, setApple] = useState(false);
  useEffect(() => { if (Platform.OS === 'ios') AppleAuthentication.isAvailableAsync().then(setApple).catch(() => {}); }, []);
  // เข้าได้แล้วด้วยวิธีไหนก็ตาม: บอกแล้วกลับไปหน้าที่มา
  useEffect(() => {
    if (!user) return;
    toast(pick({ th: 'เข้าสู่ระบบแล้ว ทริปของคุณเก็บไว้กับบัญชี', en: 'Signed in. Your trips are kept with your account.' }));
    leave();
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const attempt = async (what: NonNullable<typeof busy>, fn: () => Promise<unknown>) => {
    setBusy(what);
    setError('');
    try { await fn(); } catch (e) { setError(pick(problem(e).text)); } finally { setBusy(null); }
  };
  const send = () => {
    if (!EMAIL.test(email.trim())) { setError(pick({ th: 'กรอกอีเมลให้ครบก่อน เช่น name@gmail.com', en: 'Enter a full email address, like name@gmail.com' })); return; }
    attempt('send', async () => { await sendCode(email); setSentTo(email.trim()); setCode(''); });
  };
  const verify = () => {
    if (code.length !== 6) { setError(pick({ th: 'รหัสมี 6 หลัก', en: 'The code has 6 digits' })); return; }
    attempt('verify', () => verifyCode(sentTo, code));
  };
  const input = { minHeight: 52, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, paddingHorizontal: space.lg, color: colors.ink, fontFamily: fonts.body, fontSize: 17 } as const;

  return (
    <Screen title={pick({ th: 'เข้าสู่ระบบ', en: 'Sign in' })} subtitle={pick({ th: 'เก็บทริปไว้กับบัญชี เปิดได้ทุกเครื่อง', en: 'Keep your trips with your account, on any phone' })} onBack={leave}>
      <FadeIn style={{ gap: space.sm }}>
        {apple && (
          <AppleAuthentication.AppleAuthenticationButton buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
            buttonStyle={isDark ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
            cornerRadius={radius.pill} style={{ height: 56 }} onPress={() => attempt('apple', () => signInWith('apple'))} />
        )}
        <Button kind="secondary" label={pick({ th: 'ไปต่อด้วย Google', en: 'Continue with Google' })} big busy={busy === 'google'} onPress={() => attempt('google', () => signInWith('google'))} />
      </FadeIn>
      <FadeIn index={1}>
        <Card tone="paper" style={{ gap: space.md }}>
          {!sentTo ? (
            <>
              <T v="bodyBold">{pick({ th: 'หรือใช้อีเมล', en: 'Or use email' })}</T>
              <T tone="muted">{pick({ th: 'ฉันจะส่งรหัส 6 หลักไปให้ ไม่ต้องตั้งรหัสผ่าน ยังไม่มีบัญชีก็สมัครให้เลย', en: 'I will send you a 6-digit code. No password needed, and a new account is made for you.' })}</T>
              <TextInput value={email} onChangeText={setEmail} placeholder="name@gmail.com" placeholderTextColor={colors.muted} keyboardType="email-address" autoCapitalize="none" autoCorrect={false}
                autoComplete="email" textContentType="emailAddress" returnKeyType="send" onSubmitEditing={send} accessibilityLabel={pick({ th: 'อีเมล', en: 'Email' })} style={input} />
              <Button kind="primary" label={pick({ th: 'ส่งรหัสเข้าอีเมล', en: 'Email me a code' })} busy={busy === 'send'} onPress={send} />
            </>
          ) : (
            <>
              <T v="bodyBold">{pick({ th: 'กรอกรหัส 6 หลักจากอีเมล', en: 'Enter the 6-digit code from your email' })}</T>
              <T tone="muted">{pick({ th: `ส่งไปที่ ${sentTo} แล้ว ไม่เห็นอีเมลลองดูในจดหมายขยะ`, en: `Sent to ${sentTo}. If you do not see it, check your spam folder.` })}</T>
              <TextInput value={code} onChangeText={(v) => setCode(v.replace(/[^0-9]/g, '').slice(0, 6))} placeholder="000000" placeholderTextColor={colors.muted} keyboardType="number-pad"
                autoComplete="one-time-code" textContentType="oneTimeCode" maxLength={6} returnKeyType="done" onSubmitEditing={verify} accessibilityLabel={pick({ th: 'รหัส 6 หลัก', en: '6-digit code' })}
                style={[input, { fontSize: 26, letterSpacing: 10, textAlign: 'center' }]} />
              <Button kind="primary" label={pick({ th: 'เข้าสู่ระบบ', en: 'Sign in' })} busy={busy === 'verify'} onPress={verify} />
              <Button kind="ghost" label={pick({ th: 'ส่งรหัสใหม่ หรือเปลี่ยนอีเมล', en: 'Send a new code or change email' })} onPress={() => { setSentTo(''); setCode(''); setError(''); }} />
            </>
          )}
          {!!error && <T tone="warn" accessibilityLiveRegion="polite">{error}</T>}
        </Card>
      </FadeIn>
      <T v="small" tone="muted" style={{ textAlign: 'center' }}>{pick({ th: 'เมื่อเข้าสู่ระบบ ถือว่าคุณยอมรับข้อตกลงและนโยบายความเป็นส่วนตัว', en: 'By signing in you accept the terms and privacy policy' })}</T>
    </Screen>
  );
}
