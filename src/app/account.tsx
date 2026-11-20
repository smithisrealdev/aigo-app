import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, Switch, View } from 'react-native';

import { Icon } from '@/components/icon';

import { Button, Chip, Row, Screen, T, useToast } from '@/components/ui';
import { useSettings } from '@/lib/settings';
import { radius, space } from '@/theme/tokens';

/** กลุ่มรายการแบบหน้าตั้งค่า: หัวข้อเล็ก แล้วแผงพื้นรองมีเส้นขอบบาง */
function Group({ title, children }: { title: string; children: ReactNode }) {
  const { colors } = useSettings();
  return (
    <View style={{ gap: space.xs }}>
      <T v="smallBold" tone="muted">{title}</T>
      <View style={{ paddingHorizontal: space.lg, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surfaceSoft }}>{children}</View>
    </View>
  );
}

export default function Account() {
  const { colors, pick, lang, theme, autoEdit, signedIn, set } = useSettings();
  const toast = useToast();
  return (
    <Screen tint={colors.header.trips} title={pick({ th: 'บัญชีของฉัน', en: 'My account' })} subtitle={signedIn ? pick({ th: 'เข้าสู่ระบบแล้ว', en: 'Signed in' }) : pick({ th: 'ยังไม่ได้เข้าสู่ระบบ', en: 'Not signed in' })} onBack={() => router.back()}>
      <Group title={pick({ th: 'การตั้งค่า', en: 'Settings' })}>
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
          <Switch trackColor={{ true: colors.accent }} thumbColor="#FFFFFF" value={autoEdit} onValueChange={(v) => set({ autoEdit: v })} accessibilityLabel={pick({ th: 'ให้ AiGo แก้แผนเองได้', en: 'Let AiGo change plans' })} />
        </Row>
      </Group>
      <Group title={pick({ th: 'การซื้อ', en: 'Purchases' })}>
        <Row onPress={() => router.push('/paywall')} label={pick({ th: 'การซื้อของฉัน', en: 'My purchases' })}>
          <T style={{ flex: 1 }}>{pick({ th: 'การซื้อของฉัน', en: 'My purchases' })}</T>
          <T v="small" tone="muted">{pick({ th: 'ใช้ทริปฟรีแล้ว', en: 'Free trip used' })}</T>
          <Icon name="next" color={colors.muted} />
        </Row>
        <Row last onPress={() => toast(pick({ th: 'กู้คืนการซื้อยังใช้ไม่ได้ในตัวอย่างนี้', en: 'Restore is not available in this preview' }))} label={pick({ th: 'กู้คืนการซื้อ', en: 'Restore purchases' })}>
          <T style={{ flex: 1 }}>{pick({ th: 'กู้คืนการซื้อ', en: 'Restore purchases' })}</T>
        </Row>
      </Group>
      <Group title={pick({ th: 'ช่วยเหลือ', en: 'Help' })}>
        <Row onPress={() => toast(pick({ th: 'หน้านโยบายยังไม่มีในตัวอย่างนี้', en: 'Not available in this preview' }))} label={pick({ th: 'ข้อตกลงและความเป็นส่วนตัว', en: 'Terms and privacy' })}>
          <T style={{ flex: 1 }}>{pick({ th: 'ข้อตกลงและความเป็นส่วนตัว', en: 'Terms and privacy' })}</T>
          <Icon name="next" color={colors.muted} />
        </Row>
        <Row last onPress={() => toast(pick({ th: 'ช่องทางติดต่อยังไม่มีในตัวอย่างนี้', en: 'Not available in this preview' }))} label={pick({ th: 'ติดต่อเรา', en: 'Contact us' })}>
          <T style={{ flex: 1 }}>{pick({ th: 'ติดต่อเรา', en: 'Contact us' })}</T>
          <Icon name="next" color={colors.muted} />
        </Row>
      </Group>
      <View style={{ gap: space.sm, marginTop: space.md }}>
        {signedIn
          ? <Button kind="secondary" label={pick({ th: 'ออกจากระบบ', en: 'Sign out' })} onPress={() => set({ signedIn: false })} />
          : <Button label={pick({ th: 'เข้าสู่ระบบ', en: 'Sign in' })} onPress={() => router.push('/save')} />}
      </View>
      {/* shortcut: ลบบัญชียังไม่มีฟังก์ชันบน backend (R35), ปุ่มบอกตรงๆ; แยกห่างจากปุ่มอื่นและใช้สีเตือน */}
      {signedIn && (
        <Pressable accessibilityRole="button" onPress={() => toast(pick({ th: 'การลบบัญชียังใช้ไม่ได้ในตัวอย่างนี้', en: 'Account deletion is not available in this preview' }))}
          style={({ pressed }) => ({ minHeight: 44, marginTop: space.xl, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}>
          <T v="bodyBold" tone="warn">{pick({ th: 'ลบบัญชีและข้อมูลทั้งหมด', en: 'Delete account and all data' })}</T>
        </Pressable>
      )}
    </Screen>
  );
}
