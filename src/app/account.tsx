import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Alert, Platform, Pressable, Switch, View } from 'react-native';

import { Icon } from '@/components/icon';

import { ArtCard, Button, Card, Chip, FadeIn, Row, Screen, T, useToast } from '@/components/ui';
import { art } from '@/data/trip';
import { problem, useAuth } from '@/lib/auth';
import { useSettings } from '@/lib/settings';
import { useTrip } from '@/lib/tripStore';
import { space } from '@/theme/tokens';

/** กลุ่มรายการแบบหน้าตั้งค่า: หัวข้อเล็ก แล้วการ์ดขาวมีเงานุ่ม */
function Group({ title, children, index }: { title: string; children: ReactNode; index: number }) {
  return (
    <FadeIn index={index} style={{ gap: space.sm }}>
      <T v="smallBold" tone="muted">{title}</T>
      <Card tone="paper" style={{ paddingVertical: space.xs }}>{children}</Card>
    </FadeIn>
  );
}

export default function Account() {
  const { colors, pick, lang, theme, autoEdit, set } = useSettings();
  const { user, signOut, deleteAccount } = useAuth();
  const [deleting, setDeleting] = useState(false);
  const toast = useToast();
  const { trip, trips, removeTrip } = useTrip();
  const [confirmClear, setConfirmClear] = useState(false);
  return (
    <Screen title={pick({ th: 'บัญชีของฉัน', en: 'My account' })} subtitle={user ? (user.email ?? pick({ th: 'เข้าสู่ระบบแล้ว', en: 'Signed in' })) : pick({ th: 'ยังไม่ได้เข้าสู่ระบบ', en: 'Not signed in' })} onBack={() => router.back()}>
      {!user && (
        <FadeIn>
          <ArtCard tone="sky" art={art.offline} onPress={() => router.push('/login')} title={pick({ th: 'เข้าสู่ระบบ', en: 'Sign in' })}
            body={pick({ th: 'เก็บแผนไว้ทุกเครื่อง เปิดได้แม้ไม่มีเน็ต', en: 'Keep plans on every device, even offline' })} />
        </FadeIn>
      )}
      <Group index={1} title={pick({ th: 'การตั้งค่า', en: 'Settings' })}>
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
          <Switch trackColor={{ true: colors.accent, false: colors.line }} thumbColor="#FFFFFF" value={autoEdit} onValueChange={(v) => set({ autoEdit: v })} accessibilityLabel={pick({ th: 'ให้ AiGo แก้แผนเองได้', en: 'Let AiGo change plans' })} />
        </Row>
      </Group>
      {!trip.sample && (
        <Group index={2} title={pick({ th: 'ทริป', en: 'Trip' })}>
          {/* ลบแล้วสร้างใหม่ไม่ได้ทันที (ผู้เยี่ยมชมได้ทริปฟรีสัปดาห์ละ 1) จึงให้ยืนยันด้วยชื่อทริปก่อน */}
          <Row last onPress={confirmClear ? undefined : () => setConfirmClear(true)} label={pick({ th: 'ลบทริปนี้', en: 'Delete this trip' })}>
            <View style={{ flex: 1, gap: space.sm }}>
              <T>{pick({ th: 'ลบทริปนี้', en: 'Delete this trip' })}</T>
              <T v="small" tone="muted">{trips.length > 1
                ? pick({ th: `${pick(trip.title)} จะถูกลบจากเครื่องนี้ ทริปอื่นยังอยู่`, en: `${pick(trip.title)} is removed from this phone. Your other trips stay` })
                : pick({ th: `${pick(trip.title)} จะถูกลบจากเครื่องนี้`, en: `${pick(trip.title)} is removed from this phone` })}</T>
              {confirmClear && (
                <View style={{ flexDirection: 'row', gap: space.sm }}>
                  <Button kind="dark" label={pick({ th: `ลบ ${pick(trip.title)}`, en: `Delete ${pick(trip.title)}` })} onPress={() => { removeTrip(); setConfirmClear(false); toast(pick({ th: 'ลบทริปแล้ว', en: 'Trip deleted' })); }} style={{ flex: 1, minHeight: 44 }} />
                  <Button kind="secondary" label={pick({ th: 'ยกเลิก', en: 'Cancel' })} onPress={() => setConfirmClear(false)} style={{ minHeight: 44 }} />
                </View>
              )}
            </View>
          </Row>
        </Group>
      )}
      <Group index={2} title={pick({ th: 'การซื้อ', en: 'Purchases' })}>
        <Row onPress={() => router.push('/paywall')} label={pick({ th: 'การซื้อของฉัน', en: 'My purchases' })}>
          <T style={{ flex: 1 }}>{pick({ th: 'การซื้อของฉัน', en: 'My purchases' })}</T>
          <T v="small" tone="muted">{user ? pick({ th: 'ฟรีสัปดาห์ละ 1 ทริป นับตามบัญชี', en: '1 free trip a week, per account' }) : pick({ th: 'ฟรีสัปดาห์ละ 1 ทริปต่อเครื่อง', en: '1 free trip a week on this phone' })}</T>
          <Icon name="next" color={colors.muted} />
        </Row>
        <Row last onPress={() => toast(pick({ th: 'กู้คืนการซื้อยังใช้ไม่ได้ในตัวอย่างนี้', en: 'Restore is not available in this preview' }))} label={pick({ th: 'กู้คืนการซื้อ', en: 'Restore purchases' })}>
          <T style={{ flex: 1 }}>{pick({ th: 'กู้คืนการซื้อ', en: 'Restore purchases' })}</T>
        </Row>
      </Group>
      <Group index={3} title={pick({ th: 'ช่วยเหลือ', en: 'Help' })}>
        <Row onPress={() => toast(pick({ th: 'หน้านโยบายยังไม่มีในตัวอย่างนี้', en: 'Not available in this preview' }))} label={pick({ th: 'ข้อตกลงและความเป็นส่วนตัว', en: 'Terms and privacy' })}>
          <T style={{ flex: 1 }}>{pick({ th: 'ข้อตกลงและความเป็นส่วนตัว', en: 'Terms and privacy' })}</T>
          <Icon name="next" color={colors.muted} />
        </Row>
        <Row last onPress={() => toast(pick({ th: 'ช่องทางติดต่อยังไม่มีในตัวอย่างนี้', en: 'Not available in this preview' }))} label={pick({ th: 'ติดต่อเรา', en: 'Contact us' })}>
          <T style={{ flex: 1 }}>{pick({ th: 'ติดต่อเรา', en: 'Contact us' })}</T>
          <Icon name="next" color={colors.muted} />
        </Row>
      </Group>
      {/* ออกจากระบบ (R36): ทริปยังอยู่ในเครื่องนี้ และยังอยู่ในบัญชีให้เข้ากลับมาเปิดได้ */}
      {user && <Button kind="secondary" label={pick({ th: 'ออกจากระบบ', en: 'Sign out' })} onPress={async () => { await signOut(); toast(pick({ th: 'ออกจากระบบแล้ว ทริปยังอยู่ในเครื่องนี้', en: 'Signed out. Your trips are still on this phone.' })); }} />}
      {/* ลบบัญชี (R35): ถามยืนยันด้วยชื่อบัญชีก่อน ปุ่มยกเลิกเป็นค่าเริ่มต้น แยกห่างจากปุ่มอื่นและใช้สีเตือน */}
      {user && (
        <Pressable accessibilityRole="button" disabled={deleting} onPress={() => {
          const title = pick({ th: `ลบบัญชี ${user.email ?? ''}?`, en: `Delete account ${user.email ?? ''}?` });
          const body = pick({ th: 'บัญชีและทริปที่เก็บไว้ในบัญชีจะถูกลบถาวร กู้คืนไม่ได้ ทริปในเครื่องนี้ยังอยู่ ลบเองได้ที่หน้านี้', en: 'Your account and the trips kept in it are deleted for good and cannot be restored. Trips on this phone stay; you can delete them on this screen.' });
          const run = async () => {
            setDeleting(true);
            try { await deleteAccount(); toast(pick({ th: 'ลบบัญชีแล้ว', en: 'Account deleted' })); } catch (e) { toast(pick(problem(e).text)); } finally { setDeleting(false); }
          };
          // เว็บไม่มี Alert ของระบบ ใช้กล่องยืนยันของเบราว์เซอร์แทน
          if (Platform.OS === 'web') { if ((globalThis as { confirm?: (m: string) => boolean }).confirm?.(`${title}\n\n${body}`)) run(); return; }
          Alert.alert(title, body, [
            { text: pick({ th: 'ยกเลิก', en: 'Cancel' }), style: 'cancel' },
            { text: pick({ th: 'ลบบัญชี', en: 'Delete account' }), style: 'destructive', onPress: run },
          ], { cancelable: true });
        }}
          style={({ pressed }) => ({ minHeight: 44, marginTop: space.xl, alignItems: 'center', justifyContent: 'center', opacity: pressed || deleting ? 0.6 : 1 })}>
          <T v="bodyBold" tone="warn">{deleting ? pick({ th: 'กำลังลบบัญชี...', en: 'Deleting account...' }) : pick({ th: 'ลบบัญชี', en: 'Delete account' })}</T>
        </Pressable>
      )}
    </Screen>
  );
}
