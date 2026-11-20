import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { AiSays, AskBar, Badge, Button, FadeIn, PhotoCard, RouteList, Screen, Segmented, T, tap, useToast } from '@/components/ui';
import { photos, poses } from '@/data/trip';
import { useSettings } from '@/lib/settings';
import { space } from '@/theme/tokens';

// ระหว่างเที่ยว วันที่ 2: AiGo ย้ายแผนเพราะฝนเองแล้วแจ้ง (RA6) ผู้ใช้กดเลิกทำได้
export default function Today() {
  const { pick } = useSettings();
  const toast = useToast();
  const [kept, setKept] = useState<boolean | null>(null);
  const rest = kept === false
    ? { name: { th: 'สวนเท็นโนจิ', en: 'Tennoji Park' }, note: { th: 'ฝนตกช่วงนี้', en: 'Rain expected' }, warn: true }
    : { name: { th: 'ช้อปปิ้งชินไซบาชิ', en: 'Shinsaibashi shopping' }, note: { th: 'ย้ายมาแทนเพราะฝน · ตรวจแล้ว เปิดอยู่', en: 'Moved here for the rain · checked, open' }, warn: false };
  return (
    <Screen title={pick({ th: 'วันนี้ วันที่ 2', en: 'Today, day 2' })} subtitle={pick({ th: '13 ธ.ค. · โอซาก้า · เก็บไว้ในเครื่อง', en: '13 Dec · Osaka · saved offline' })} onBack={() => router.back()} mascot={poses.rain}
      footer={<AskBar placeholder={pick({ th: 'ถาม AiGo เช่น แถวนี้มีคาเฟ่ไหม', en: 'Ask AiGo, e.g. any cafes nearby?' })} onSend={() => toast(pick({ th: 'ส่งให้ AiGo แล้ว', en: 'Sent to AiGo' }))} />}>
      <FadeIn>
        <Segmented options={[pick({ th: 'แผนทั้งหมด', en: 'Plan' }), pick({ th: 'วันนี้', en: 'Today' })]} value={1} onChange={() => router.replace('/itinerary')} />
      </FadeIn>
      {/* ที่ถัดไปเป็นการ์ดรูปใหญ่ เวลาตัวโต ปุ่มนำทางกดได้ทันที */}
      <FadeIn index={1}>
        <PhotoCard source={photos.kaiyukan} height={300} badge={<Badge label={pick({ th: 'ถัดไป · 10:00', en: 'Next · 10:00' })} />}
          title={pick({ th: 'พิพิธภัณฑ์สัตว์น้ำไคยูกัง', en: 'Kaiyukan Aquarium' })} subtitle={pick({ th: 'ออกจากที่พักอีก 40 นาที · รถไฟ ประมาณ 25 นาที', en: 'Leave in 40 min · about 25 min by train' })}>
          <Button kind="white" label={pick({ th: 'นำทาง', en: 'Navigate' })} icon="pin" onPress={() => toast(pick({ th: 'เปิดแผนที่ในแอปจริงจะพาไปที่นี่', en: 'The real app opens maps here' }))} style={{ alignSelf: 'flex-start', marginTop: space.sm }} />
        </PhotoCard>
      </FadeIn>
      <FadeIn index={2} style={{ gap: space.md }}>
        {kept === null
          ? <AiSays>{pick({ th: 'ฉันย้ายสวนเท็นโนจิไปพรุ่งนี้แล้ว บ่ายนี้ฝนตก เลยใส่ช้อปปิ้งในร่มที่ชินไซบาชิแทน', en: 'I moved Tennoji Park to tomorrow. Rain this afternoon, so I put indoor shopping in Shinsaibashi instead.' })}</AiSays>
          : <T v="bodyBold" tone="muted">{kept ? pick({ th: 'เก็บแผนที่ AiGo ปรับไว้', en: 'Kept AiGo\'s change' }) : pick({ th: 'เลิกทำแล้ว กลับเป็นแผนเดิม', en: 'Undone, back to the original plan' })}</T>}
        {kept === null && (
          <View style={{ flexDirection: 'row', gap: space.sm, paddingLeft: 50 }}>
            <Button label={pick({ th: 'ดีแล้ว', en: 'Keep it' })} onPress={() => { tap(); setKept(true); }} style={{ flex: 1 }} />
            <Button kind="secondary" label={pick({ th: 'เลิกทำ', en: 'Undo' })} onPress={() => { tap(); setKept(false); }} style={{ flex: 1 }} />
          </View>
        )}
      </FadeIn>
      <FadeIn index={3} style={{ gap: space.sm }}>
        <T v="heading">{pick({ th: 'ที่เหลือของวันนี้', en: 'Rest of today' })}</T>
        <RouteList
          start={{ icon: 'pin', title: pick({ th: 'ตอนนี้ · ไคยูกัง', en: 'Now · Kaiyukan' }), sub: pick({ th: '10:00–12:30', en: '10:00–12:30' }) }}
          stops={[{ key: kept === false ? 'park' : 'shop', photo: photos.shinsaibashi, name: pick(rest.name), time: '15:00', status: pick(rest.note), statusTone: rest.warn ? 'warn' : 'success' }]}
          end={{ title: pick({ th: 'กลับที่พัก', en: 'Back to the hotel' }), sub: pick({ th: 'ประมาณ 20:00', en: 'Around 20:00' }) }} />
      </FadeIn>
    </Screen>
  );
}
