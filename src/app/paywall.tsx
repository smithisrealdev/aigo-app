import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { AiSays, Button, Card, FadeIn, Peek, Screen, T, Ticket, useToast } from '@/components/ui';
import { useSettings } from '@/lib/settings';
import { useTrip } from '@/lib/tripStore';
import { space } from '@/theme/tokens';

// ทริปที่สอง (R31–R33) ราคายังไม่ประกาศ (แสดง "เร็วๆ นี้") จนกว่าจะยืนยันราคากับ Stripe และส่วนแบ่งสโตร์
// shortcut: ปุ่มซื้อแจ้งว่ายังใช้ไม่ได้, ต่อการซื้อในแอปของ App Store / Google Play
export default function Paywall() {
  const { pick } = useSettings();
  // used = มาจากหน้างานเพราะทริปฟรีของสัปดาห์นี้หมดแล้ว จึงไม่ชวนวางแผนฟรีซ้ำ
  const { used } = useLocalSearchParams<{ used?: string }>();
  const { trip } = useTrip();
  const toast = useToast();
  const notYet = () => toast(pick({ th: 'การซื้อในแอปยังใช้ไม่ได้ในรุ่นทดลองนี้', en: 'In-app purchase is not available in this preview yet' }));
  return (
    <Screen title={pick({ th: 'วางแผนทริปใหม่', en: 'Plan a new trip' })} subtitle={pick({ th: 'ตอนนี้วางแผนฟรีได้สัปดาห์ละ 1 ทริป', en: 'For now you can plan 1 free trip a week' })} onBack={() => router.back()}>
      {/* แพ็กหลักเป็นตั๋ว AiGo โผล่หัวจากขอบบน */}
      <FadeIn style={{ marginTop: 56 }}>
        <View>
          <Ticket tone="sun"
            top={<>
              <T v="smallBold" style={{ maxWidth: '60%' }}>{pick({ th: 'จ่ายต่อทริป ไม่ผูกรายเดือน', en: 'Pay per trip, no subscription' })}</T>
              <T v="hero">{pick({ th: 'เร็วๆ นี้', en: 'Coming soon' })}</T>
              <T>{pick({ th: 'AiGo จัดการ 1 ทริปจนจบ แก้แผนได้ตลอด ตรวจสถานที่ให้ทุกวัน', en: 'AiGo handles one trip end to end, with daily checks' })}</T>
            </>}
            bottom={<Button label={pick({ th: 'ซื้อทริปนี้', en: 'Buy this trip' })} big onPress={notYet} />} />
          <Peek size={112} />
        </View>
      </FadeIn>
      {/* ยังขายไม่ได้: ให้ไปวางแผนฟรีต่อได้ (เซิร์ฟเวอร์จำกัดสัปดาห์ละ 1 ทริปต่อเครื่อง) ไม่ให้หน้านี้เป็นทางตัน */}
      <FadeIn index={1} style={{ gap: space.md }}>
        <AiSays>{used
          ? pick({ th: 'ทริปฟรีของสัปดาห์นี้ใช้ไปแล้ว ระหว่างที่ยังไม่เปิดขาย วางแผนทริปใหม่ได้อีกครั้งสัปดาห์หน้า ทริปเดิมยังอยู่ครบ', en: 'This week\'s free trip is used. Until sales open, you can plan another next week. Your trips stay.' })
          : pick({ th: 'ระหว่างที่ยังไม่เปิดขาย วางแผนฟรีได้สัปดาห์ละ 1 ทริป ทริปเดิมยังอยู่ครบ', en: 'Until sales open, you can plan 1 free trip a week. Your trips stay.' })}</AiSays>
        {!used && <Button label={pick({ th: 'วางแผนทริปใหม่ฟรี', en: 'Plan a new trip for free' })} icon="next" onPress={() => router.navigate('/')} />}
      </FadeIn>
      <FadeIn index={1}>
        <Card tone="paper" style={{ gap: space.sm }}>
          <T v="smallBold" tone="muted">{pick({ th: 'เที่ยวบ่อย', en: 'Travel often' })}</T>
          <T v="heading">Travel Pass</T>
          <T>{pick({ th: 'ราคาจะแจ้งเร็วๆ นี้ · ยกเลิกได้ทุกเมื่อในการตั้งค่าของเครื่อง', en: 'Price coming soon · cancel anytime in device settings' })}</T>
          <Button kind="secondary" label={pick({ th: 'สมัคร Travel Pass', en: 'Get Travel Pass' })} onPress={notYet} />
        </Card>
      </FadeIn>
      {!trip.sample && <FadeIn index={2}>
        <Card tone="done">
          <T v="smallBold" tone="success">{pick({ th: 'ทริปเดิมยังอยู่ครบ', en: 'Your trips stay' })}</T>
          <T>{pick({ th: `${pick(trip.title)} เปิดดูและใช้ระหว่างเที่ยวได้ตามเดิม`, en: `${pick(trip.title)} still works during your trip` })}</T>
        </Card>
      </FadeIn>}
      <Button kind="ghost" label={pick({ th: 'กู้คืนการซื้อ', en: 'Restore purchases' })} onPress={notYet} />
    </Screen>
  );
}
