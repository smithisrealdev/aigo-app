import { router } from 'expo-router';
import { Switch, View } from 'react-native';

import { Button, Chip, Row, Screen, T, useToast } from '@/components/ui';
import { useSettings } from '@/lib/settings';
import { space } from '@/theme/tokens';

export default function Account() {
  const { colors, pick, lang, theme, autoEdit, signedIn, set } = useSettings();
  const toast = useToast();
  return (
    <Screen tint={colors.header.trips} title={pick({ th: 'บัญชีของฉัน', en: 'My account' })} subtitle={signedIn ? pick({ th: 'เข้าสู่ระบบแล้ว', en: 'Signed in' }) : pick({ th: 'ยังไม่ได้เข้าสู่ระบบ', en: 'Not signed in' })} onBack={() => router.back()}>
      <View>
        <Row><T style={{ flex: 1 }}>{pick({ th: 'ภาษา', en: 'Language' })}</T>
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            <Chip label="ไทย" selected={lang === 'th'} onPress={() => set({ lang: 'th' })} />
            <Chip label="EN" a11y="English" selected={lang === 'en'} onPress={() => set({ lang: 'en' })} />
          </View>
        </Row>
        <Row><T style={{ flex: 1 }}>{pick({ th: 'ธีม', en: 'Theme' })}</T>
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            {(['system', 'light', 'dark'] as const).map((x) => <Chip key={x} label={pick({ system: { th: 'ตามเครื่อง', en: 'Auto' }, light: { th: 'สว่าง', en: 'Light' }, dark: { th: 'มืด', en: 'Dark' } }[x])} selected={theme === x} onPress={() => set({ theme: x })} />)}
          </View>
        </Row>
        <Row last>
          <View style={{ flex: 1 }}>
            <T>{pick({ th: 'ให้ AiGo แก้แผนเองได้ แล้วแจ้งทีหลัง', en: 'Let AiGo change plans and tell me after' })}</T>
            <T v="small" tone="muted">{pick({ th: 'ปิดแล้ว AiGo จะเสนอก่อนทุกครั้ง การจ่ายเงินต้องรอคุณเสมอ', en: 'When off, AiGo asks first. Payments always wait for you.' })}</T>
          </View>
          <Switch value={autoEdit} onValueChange={(v) => set({ autoEdit: v })} accessibilityLabel={pick({ th: 'ให้ AiGo แก้แผนเองได้', en: 'Let AiGo change plans' })} />
        </Row>
      </View>
      <View style={{ gap: space.sm, marginTop: space.lg }}>
        {signedIn
          ? <Button kind="secondary" label={pick({ th: 'ออกจากระบบ', en: 'Sign out' })} onPress={() => set({ signedIn: false })} />
          : <Button label={pick({ th: 'เข้าสู่ระบบ', en: 'Sign in' })} onPress={() => router.push('/save')} />}
        {/* shortcut: ลบบัญชียังไม่มีฟังก์ชันบน backend (R35), ปุ่มบอกตรงๆ */}
        {signedIn && <Button kind="secondary" label={pick({ th: 'ลบบัญชีและข้อมูลทั้งหมด', en: 'Delete account and all data' })} onPress={() => toast(pick({ th: 'การลบบัญชียังใช้ไม่ได้ในรุ่นทดลองนี้ ไม่มีข้อมูลถูกลบ', en: 'Account deletion is not available in this preview. Nothing was deleted.' }))} />}
      </View>
    </Screen>
  );
}
