import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { View } from 'react-native';

import { Icon } from '@/components/icon';
import { AiSays, Button, Card, FadeIn, PriceTag, Row, Screen, T, Thumb, tap, useToast } from '@/components/ui';
import { baht, logos, photos, poses } from '@/data/trip';
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
    <Screen tint={colors.header.travel} title={pick({ th: 'AiGo แก้ให้แล้ว', en: 'AiGo fixed it' })} subtitle={pick({ th: 'วันที่ 5 · 16 ธ.ค. · โอซาก้า', en: 'Day 5 · 16 Dec · Osaka' })} onBack={() => router.back()}>
      <Card tone="danger">
        <T v="smallBold" tone="muted">{pick({ th: 'แจ้งจากสายการบิน · 14:05', en: 'From the airline · 14:05' })}</T>
        <T v="heading" tone="warn">{pick({ th: 'เที่ยวบินกลับดีเลย์ 3 ชั่วโมง', en: 'Return flight delayed 3 hours' })}</T>
        <T>{pick({ th: 'ออกใหม่ 02:55 แทน 23:55 คืนนี้', en: 'Now leaving 02:55 instead of 23:55 tonight' })}</T>
      </Card>
      <AiSays pose={poses.rain}>{pick({ th: 'ไม่ต้องห่วง ฉันปรับแผนคืนนี้ให้แล้ว ใช้เวลาที่ได้เพิ่มมาให้คุ้ม', en: 'No worries, I already adjusted tonight to make use of the extra time.' })}</AiSays>
      <T v="smallBold" tone="muted">{t('appr.done')}</T>
      <View>
        {FIXES.map((f, i) => {
          const off = undone.includes(f.id);
          return (
            <Row key={f.id} last={i === FIXES.length - 1}>
              <Icon name="check" color={off ? colors.muted : colors.success} size={20} />
              {f.photo && <Thumb source={f.photo} size={40} />}
              <T v="small" tone={off ? 'muted' : 'ink'} style={{ flex: 1 }}>{pick(f)}</T>
              {off ? <T v="smallBold" tone="muted">{t('appr.undone')}</T>
                : <Button kind="secondary" label={t('appr.undo')} onPress={() => { tap(); setUndone((u) => [...u, f.id]); }} style={{ minHeight: 44, paddingHorizontal: space.md }} />}
            </Row>
          );
        })}
      </View>
      <T v="smallBold" tone="muted">{t('appr.paid')}</T>
      {state === 'paid' || state === 'skip' ? (
        <FadeIn><Card tone={state === 'paid' ? 'done' : 'soft'}><T>{state === 'paid' ? t('appr.approved') : pick({ th: 'ไม่ฝากกระเป๋า AiGo จะไม่ถามซ้ำ', en: 'No luggage storage. AiGo will not ask again' })}</T></Card></FadeIn>
      ) : (
        <Card style={{ gap: space.sm }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space.md }}>
            <T v="subheading" style={{ flex: 1 }}>{pick({ th: 'ฝากกระเป๋าใกล้นัมบะ 2 ใบ', en: 'Store 2 bags near Namba' })}</T>
            <T v="price">{baht(700)}</T>
          </View>
          <PriceTag source="Radical Storage" at="14:07" logo={logos.radical} />
          <T v="small">{t('appr.why', { x: pick({ th: 'เช็กเอาต์ 11:00 จะได้เดินเล่นตัวเปล่าถึงคืนนี้', en: 'Checkout is 11:00, so you can walk around bag-free until tonight' }) })}</T>
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            <Button label={t('appr.go')} busy={state === 'opening'} busyLabel={t('appr.opening')} onPress={pay} style={{ flex: 1 }} />
            <Button kind="secondary" label={pick({ th: 'ไม่ต้อง', en: 'No thanks' })} onPress={() => setState('skip')} style={{ flex: 1 }} />
          </View>
        </Card>
      )}
    </Screen>
  );
}
