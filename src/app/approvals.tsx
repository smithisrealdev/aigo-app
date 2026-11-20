import { Image } from 'expo-image';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { View } from 'react-native';

import { Button, Card, FadeIn, FlightLeg, PriceTag, Screen, Section, Stamp, T, tap, Ticket, UndoRow, useToast } from '@/components/ui';
import { autoDone, baht, offers, poses } from '@/data/trip';
import { decide } from '@/lib/agent';
import { useSettings } from '@/lib/settings';
import { radius, space } from '@/theme/tokens';

export default function Approvals() {
  const { colors, t, pick, autoEdit, signedIn } = useSettings();
  const [approved, setApproved] = useState<string[]>([]);
  const [undone, setUndone] = useState<string[]>([]);
  const [opening, setOpening] = useState<string | null>(null);
  const toast = useToast();
  // ตัดสินด้วยกฎเดียวกับ AiGo: อะไรที่เสียเงินหรือย้อนกลับไม่ได้ต้องอยู่ในหน้านี้เสมอ
  const pending = offers.filter((o) => decide(o, autoEdit) === 'approve' && !approved.includes(o.id));
  // จ่ายเงินไม่ทำแบบ optimistic: ปุ่มหมุนจนหน้าจองของพันธมิตรเปิดได้จริง แล้วค่อยย้ายรายการออก
  const approve = async (id: string, url: string) => {
    // จ่ายเงินต้องมีบัญชีก่อน (R14) กลับมาจากหน้าสมัครแล้วกดอนุมัติต่อได้เลย
    if (!signedIn) { router.push('/save'); return; }
    setOpening(id);
    try {
      await WebBrowser.openBrowserAsync(url);
      tap('success');
      setApproved((a) => [...a, id]);
    } catch {
      toast(pick({ th: 'เปิดหน้าจองไม่ได้ รายการยังรอคุณอยู่ ลองใหม่อีกครั้ง', en: 'Could not open the booking page. It is still waiting for you; try again' }));
    } finally {
      setOpening(null);
    }
  };
  return (
    <Screen mascot={pending.length ? undefined : poses.happy} title={t('appr.title')} subtitle={t('appr.sub', { n: pending.length })} onBack={() => router.back()}>
      <T v="bodyBold" tone="muted">{pending.length ? t('appr.paid') : t('appr.none')}</T>
      {/* รายการที่ต้องจ่ายเงินเป็นตั๋ว ด้านบนคือของ ด้านล่างคือราคา เหตุผล และปุ่ม */}
      {pending.map((o, i) => (
        <FadeIn key={o.id} index={i}>
          <Ticket
            top={<>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
                {o.lead === 'XJ'
                  ? <View style={{ width: 52, height: 52, borderRadius: radius.sm, backgroundColor: colors.sticker.sky, alignItems: 'center', justifyContent: 'center' }} accessible={false}><T v="subheading">XJ</T></View>
                  : <Image source={o.lead} style={{ width: 52, height: 52, borderRadius: radius.sm }} contentFit="cover" accessible={false} />}
                <View style={{ flex: 1 }}>
                  <T v="subheading">{pick(o.name)}</T>
                  <T v="small" tone="muted">{pick(o.note)}</T>
                </View>
              </View>
              {o.id === 'flight' && <FlightLeg from="BKK" fromTime="23:55" to="KIX" toTime="07:30" label={pick({ th: 'บินตรง 5 ชม. 35 น.', en: 'Direct, 5h 35m' })} />}
            </>}
            bottom={<>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: space.md }}>
                <PriceTag source={o.source} at={o.at} logo={o.logo} />
                <T v="price">{baht(o.costBaht)}</T>
              </View>
              <T v="small">{t('appr.why', { x: pick(o.why) })}</T>
              <View style={{ flexDirection: 'row', gap: space.sm, marginTop: space.xs }}>
                <Button label={t('appr.go')} busy={opening === o.id} busyLabel={t('appr.opening')} onPress={() => approve(o.id, o.url)} style={{ flex: 1 }} />
                <Button kind="secondary" label={t('appr.other')} onPress={() => toast(t('toast.other'))} style={{ flex: 1 }} />
              </View>
            </>} />
        </FadeIn>
      ))}
      {approved.length > 0 && (
        <FadeIn>
          <Card tone="done" style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
            <T v="bodyBold" style={{ flex: 1 }}>{t('appr.approved')}</T>
            <Stamp label={pick({ th: 'อนุมัติ', en: 'OK' })} color={colors.success} size={64} />
          </Card>
        </FadeIn>
      )}
      <Section title={t('appr.done')}>
        <Card tone="paper" style={{ paddingVertical: space.xs }}>
          {autoDone.map((a, i) => (
            <UndoRow key={a.id} text={pick(a.text)} undone={undone.includes(a.id)} onUndo={() => setUndone((u) => [...u, a.id])} last={i === autoDone.length - 1} />
          ))}
        </Card>
      </Section>
    </Screen>
  );
}
