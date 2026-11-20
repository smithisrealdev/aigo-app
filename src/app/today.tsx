import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { AiSays, AskBar, Button, Card, FadeIn, Row, Screen, T, Thumb, tap, useToast } from '@/components/ui';
import { photos, poses } from '@/data/trip';
import { useSettings } from '@/lib/settings';
import { space } from '@/theme/tokens';

// ระหว่างเที่ยว วันที่ 2: AiGo ย้ายแผนเพราะฝนเองแล้วแจ้ง (RA6) ผู้ใช้กดเลิกทำได้
export default function Today() {
  const { colors, pick } = useSettings();
  const toast = useToast();
  const [kept, setKept] = useState<boolean | null>(null);
  const rest = kept === false
    ? { name: { th: 'สวนเท็นโนจิ', en: 'Tennoji Park' }, note: { th: 'ฝนตกช่วงนี้', en: 'Rain expected' }, warn: true }
    : { name: { th: 'ช้อปปิ้งชินไซบาชิ', en: 'Shinsaibashi shopping' }, note: { th: 'ย้ายมาแทนเพราะฝน · ตรวจแล้ว เปิดอยู่', en: 'Moved here for the rain · checked, open' }, warn: false };
  return (
    <Screen tint={colors.header.travel} title={pick({ th: 'วันนี้ วันที่ 2', en: 'Today, day 2' })} subtitle={pick({ th: '13 ธ.ค. · โอซาก้า · เก็บไว้ในเครื่อง', en: '13 Dec · Osaka · saved offline' })} onBack={() => router.back()} mascot={poses.rain}
      footer={<AskBar placeholder={pick({ th: 'ถาม AiGo เช่น แถวนี้มีคาเฟ่ไหม', en: 'Ask AiGo, e.g. any cafes nearby?' })} onSend={() => toast(pick({ th: 'ส่งให้ AiGo แล้ว', en: 'Sent to AiGo' }))} />}>
      <Card tone="navy" style={{ gap: space.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          <Thumb source={photos.kaiyukan} size={48} />
          <T v="smallBold" tone="onTint" style={{ flex: 1, opacity: 0.85 }}>{pick({ th: 'ถัดไป · พิพิธภัณฑ์สัตว์น้ำไคยูกัง', en: 'Next · Kaiyukan Aquarium' })}</T>
        </View>
        <T v="hero" tone="onTint" style={{ fontVariant: ['tabular-nums'] }}>10:00</T>
        <T tone="onTint" style={{ opacity: 0.85 }}>{pick({ th: 'ออกจากที่พักอีก 40 นาที · รถไฟ ประมาณ 25 นาที', en: 'Leave in 40 min · about 25 min by train' })}</T>
        <Button kind="onPastelLight" label={pick({ th: 'นำทาง', en: 'Navigate' })} icon="pin" onPress={() => toast(pick({ th: 'เปิดแผนที่ในแอปจริงจะพาไปที่นี่', en: 'The real app opens maps here' }))} />
      </Card>
      {kept === null ? (
        <AiSays>{pick({ th: 'ฉันย้ายสวนเท็นโนจิไปพรุ่งนี้แล้ว บ่ายนี้ฝนตก เลยใส่ช้อปปิ้งในร่มที่ชินไซบาชิแทน', en: 'I moved Tennoji Park to tomorrow. Rain this afternoon, so I put indoor shopping in Shinsaibashi instead.' })}</AiSays>
      ) : <FadeIn><T v="smallBold" tone="muted">{kept ? pick({ th: 'เก็บแผนที่ AiGo ปรับไว้', en: 'Kept AiGo\'s change' }) : pick({ th: 'เลิกทำแล้ว กลับเป็นแผนเดิม', en: 'Undone, back to the original plan' })}</T></FadeIn>}
      {kept === null && (
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          <Button label={pick({ th: 'ดีแล้ว', en: 'Keep it' })} onPress={() => { tap(); setKept(true); }} style={{ flex: 1 }} />
          <Button kind="secondary" label={pick({ th: 'เลิกทำ', en: 'Undo' })} onPress={() => { tap(); setKept(false); }} style={{ flex: 1 }} />
        </View>
      )}
      <T v="smallBold" tone="muted">{pick({ th: 'ที่เหลือของวันนี้', en: 'Rest of today' })}</T>
      <View>
        <Row last>
          <T v="bodyBold" style={{ width: 48 }}>15:00</T>
          <Thumb source={photos.shinsaibashi} />
          <View style={{ flex: 1 }}>
            <T v="subheading">{pick(rest.name)}</T>
            <T v="small" tone={rest.warn ? 'warn' : 'success'}>{pick(rest.note)}</T>
          </View>
        </Row>
      </View>
    </Screen>
  );
}
