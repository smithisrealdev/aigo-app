import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { View } from 'react-native';

import { AiSays, Button, Card, FadeIn, FlightLeg, PriceTag, Screen, Section, Stamp, T, tap, Ticket, UndoRow, useToast } from '@/components/ui';
import { baht, photos, poses } from '@/data/trip';
import { useSettings } from '@/lib/settings';
import { space } from '@/theme/tokens';

const FIXES = [
  { id: 'dinner', th: 'เพิ่มมื้อดึกที่โดทงโบริ 20:30 ตรวจแล้วว่ายังเปิด', en: 'Added a late dinner at Dotonbori, 20:30, checked open', photo: photos.dotonbori },
  { id: 'leave', th: 'เลื่อนเวลาออกไปสนามบินเป็น 23:30', en: 'Moved airport departure to 23:30' },
  { id: 'remind', th: 'ตั้งเตือนให้ออกเดินทาง 23:15', en: 'Set a reminder to leave at 23:15' },
];

// shortcut: สถานะเที่ยวบินเป็นตัวอย่าง, ต้องมี API สถานะเที่ยวบินและ push จาก backend (RA11)
export default function Disruption() {
  const { colors, pick, t } = useSettings();
  const toast = useToast();
  const [undone, setUndone] = useState<string[]>([]);
  const [state, setState] = useState<'wait' | 'opening' | 'paid' | 'skip'>('wait');
  const pay = async () => {
    setState('opening');
    try { await WebBrowser.openBrowserAsync('https://radicalstorage.com'); tap('success'); setState('paid'); }
    catch { setState('wait'); toast(pick({ th: 'เปิดหน้าจองไม่ได้ ลองใหม่อีกครั้ง', en: 'Could not open the booking page. Try again' })); }
  };
  return (
    <Screen title={pick({ th: 'AiGo แก้ให้แล้ว', en: 'AiGo fixed it' })} subtitle={pick({ th: 'วันที่ 5 · 16 ธ.ค. · โอซาก้า', en: 'Day 5 · 16 Dec · Osaka' })} onBack={() => router.back()} mascot={poses.rain}>
      {/* แจ้งเตือนเที่ยวบินเป็นบัตรขึ้นเครื่องสีเตือน เวลาเดิมขีดฆ่า */}
      <FadeIn>
        <Ticket tone="danger"
          top={<>
            <T v="smallBold" style={{ color: colors.mutedStrong }}>{pick({ th: 'แจ้งจากสายการบิน · 14:05', en: 'From the airline · 14:05' })}</T>
            <T v="heading" tone="warn">{pick({ th: 'เที่ยวบินกลับดีเลย์ 3 ชั่วโมง', en: 'Return flight delayed 3 hours' })}</T>
          </>}
          bottom={<FlightLeg from="KIX" fromTime="02:55" was="23:55" to="BKK" toTime="06:55" label="XJ 611" />} />
      </FadeIn>
      <FadeIn index={1}><AiSays>{pick({ th: 'ไม่ต้องห่วง ฉันปรับแผนคืนนี้ให้แล้ว ใช้เวลาที่ได้เพิ่มมาให้คุ้ม', en: 'No worries, I already adjusted tonight to make use of the extra time.' })}</AiSays></FadeIn>
      <FadeIn index={2}>
        <Section title={t('appr.done')}>
          <Card tone="paper" style={{ paddingVertical: space.xs }}>
            {FIXES.map((f, i) => (
              <UndoRow key={f.id} text={pick(f)} photo={f.photo} undone={undone.includes(f.id)} onUndo={() => setUndone((u) => [...u, f.id])} last={i === FIXES.length - 1} />
            ))}
          </Card>
        </Section>
      </FadeIn>
      <FadeIn index={3}>
        <Section title={t('appr.paid')}>
          {state === 'paid' || state === 'skip' ? (
            <FadeIn>
              <Card tone={state === 'paid' ? 'done' : 'soft'} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
                <T v="bodyBold" style={{ flex: 1 }}>{state === 'paid' ? t('appr.approved') : pick({ th: 'ไม่ฝากกระเป๋า AiGo จะไม่ถามซ้ำ', en: 'No luggage storage. AiGo will not ask again' })}</T>
                {state === 'paid' && <Stamp label={pick({ th: 'อนุมัติ', en: 'OK' })} color={colors.success} size={64} />}
              </Card>
            </FadeIn>
          ) : (
            <Ticket
              top={<View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
                <T v="subheading" style={{ flex: 1 }}>{pick({ th: 'ฝากกระเป๋าใกล้นัมบะ 2 ใบ', en: 'Store 2 bags near Namba' })}</T>
                <T v="price">{baht(700)}</T>
              </View>}
              bottom={<>
                <PriceTag source="Radical Storage" at="14:07" />
                <T v="small">{t('appr.why', { x: pick({ th: 'เช็กเอาต์ 11:00 จะได้เดินเล่นตัวเปล่าถึงคืนนี้', en: 'Checkout is 11:00, so you can walk around bag-free until tonight' }) })}</T>
                <View style={{ flexDirection: 'row', gap: space.sm, marginTop: space.xs }}>
                  <Button label={t('appr.go')} busy={state === 'opening'} busyLabel={t('appr.opening')} onPress={pay} style={{ flex: 1 }} />
                  <Button kind="secondary" label={pick({ th: 'ไม่ต้อง', en: 'No thanks' })} onPress={() => setState('skip')} style={{ flex: 1 }} />
                </View>
              </>} />
          )}
        </Section>
      </FadeIn>
    </Screen>
  );
}
