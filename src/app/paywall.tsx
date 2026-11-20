import { router } from 'expo-router';
import { View } from 'react-native';

import { Button, Card, Screen, T, useToast } from '@/components/ui';
import { trip } from '@/data/trip';
import { useSettings } from '@/lib/settings';
import { space } from '@/theme/tokens';

// ทริปที่สอง (R31–R33) ราคายังเป็นช่องว่างจนกว่าจะยืนยันราคากับ Stripe และส่วนแบ่งสโตร์
// shortcut: ปุ่มซื้อแจ้งว่ายังใช้ไม่ได้, ต่อการซื้อในแอปของ App Store / Google Play
export default function Paywall() {
  const { colors, pick } = useSettings();
  const toast = useToast();
  const notYet = () => toast(pick({ th: 'การซื้อในแอปยังใช้ไม่ได้ในรุ่นทดลองนี้', en: 'In-app purchase is not available in this preview yet' }));
  return (
    <Screen tint={colors.header.home} title={pick({ th: 'วางแผนทริปใหม่', en: 'Plan a new trip' })} subtitle={pick({ th: 'แผนแรกฟรีใช้ไปแล้ว', en: 'Your free plan is used' })} onBack={() => router.back()}>
      <Card tone="navy" style={{ gap: space.sm }}>
        <T v="smallBold" tone="onTint" style={{ opacity: 0.85 }}>{pick({ th: 'จ่ายต่อทริป ไม่ผูกรายเดือน', en: 'Pay per trip, no subscription' })}</T>
        <T v="hero" tone="onTint">[ราคาต่อทริป]</T>
        <T tone="onTint" style={{ opacity: 0.85 }}>{pick({ th: 'AiGo จัดการ 1 ทริปจนจบ แก้แผนได้ตลอด ตรวจสถานที่ให้ทุกวัน', en: 'AiGo handles one trip end to end, with daily checks' })}</T>
        <Button kind="onPastelLight" label={pick({ th: 'ซื้อทริปนี้', en: 'Buy this trip' })} big onPress={notYet} />
      </Card>
      <Card style={{ gap: space.sm }}>
        <T v="smallBold" tone="muted">{pick({ th: 'เที่ยวบ่อย', en: 'Travel often' })}</T>
        <T v="heading">Travel Pass</T>
        <T>{pick({ th: '[ราคาต่อเดือน] · [จำนวนทริป] ทริปต่อเดือน ยกเลิกได้ทุกเมื่อในการตั้งค่าของเครื่อง', en: '[price] / month · [n] trips a month · cancel anytime in device settings' })}</T>
        <Button kind="secondary" label={pick({ th: 'สมัคร Travel Pass', en: 'Get Travel Pass' })} onPress={notYet} />
      </Card>
      <Card tone="done"><T v="smallBold" tone="success">{pick({ th: 'ทริปเดิมยังอยู่ครบ', en: 'Your trips stay' })}</T><T>{pick({ th: `${pick(trip.title)} เปิดดูและใช้ระหว่างเที่ยวได้ตามเดิม`, en: `${pick(trip.title)} still works during your trip` })}</T></Card>
      <View><Button kind="secondary" label={pick({ th: 'กู้คืนการซื้อ', en: 'Restore purchases' })} onPress={notYet} /></View>
    </Screen>
  );
}
