import { Image } from 'expo-image';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { View } from 'react-native';

import { Icon } from '@/components/icon';
import { Button, Card, FadeIn, FlightLeg, PriceTag, Row, Screen, T, tap, useToast } from '@/components/ui';
import { autoDone, baht, offers } from '@/data/trip';
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
      toast('เปิดหน้าจองไม่ได้ รายการยังรอคุณอยู่ ลองใหม่อีกครั้ง');
    } finally {
      setOpening(null);
    }
  };
  return (
    <Screen tint={colors.header.money} title={t('appr.title')} subtitle={t('appr.sub', { n: pending.length })} onBack={() => router.back()}>
      <T v="smallBold" tone="muted">{pending.length ? t('appr.paid') : t('appr.none')}</T>
      {pending.map((o) => (
        <Card key={o.id} style={{ gap: space.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
            {o.lead === 'XJ'
              ? <View style={{ width: 44, height: 44, borderRadius: radius.sm, backgroundColor: colors.header.money, alignItems: 'center', justifyContent: 'center' }} accessible={false}><T v="bodyBold" tone="onTint">XJ</T></View>
              : <Image source={o.lead} style={{ width: 44, height: 44, borderRadius: radius.sm }} contentFit="cover" accessible={false} />}
            <View style={{ flex: 1 }}>
              <T v="subheading">{pick(o.name)}</T>
              <T v="small" tone="muted">{pick(o.note)}</T>
            </View>
            <T v="price">{baht(o.costBaht)}</T>
          </View>
          {o.id === 'flight' && <FlightLeg from="BKK" fromTime="23:55" to="KIX" toTime="07:30" label={pick({ th: 'บินตรง 5 ชม. 35 น.', en: 'Direct, 5h 35m' })} />}
          <PriceTag source={o.source} at={o.at} logo={o.logo} />
          <T v="small">{t('appr.why', { x: pick(o.why) })}</T>
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            <Button label={t('appr.go')} busy={opening === o.id} busyLabel={t('appr.opening')} onPress={() => approve(o.id, o.url)} style={{ flex: 1 }} />
            <Button kind="secondary" label={t('appr.other')} onPress={() => toast(t('toast.other'))} style={{ flex: 1 }} />
          </View>
        </Card>
      ))}
      {approved.length > 0 && <FadeIn><Card tone="done"><T tone="pastel">{t('appr.approved')}</T></Card></FadeIn>}
      <T v="smallBold" tone="muted">{t('appr.done')}</T>
      <View>
        {autoDone.map((a, i) => (
          <Row key={a.id} last={i === autoDone.length - 1}>
            <Icon name="check" color={undone.includes(a.id) ? colors.muted : colors.success} size={20} />
            <T v="small" tone={undone.includes(a.id) ? 'muted' : 'ink'} style={{ flex: 1 }}>{pick(a.text)}</T>
            {undone.includes(a.id)
              ? <T v="smallBold" tone="muted">{t('appr.undone')}</T>
              : <Button kind="secondary" label={t('appr.undo')} onPress={() => { tap(); setUndone((u) => [...u, a.id]); }} style={{ minHeight: 44, paddingHorizontal: space.md }} />}
          </Row>
        ))}
      </View>
    </Screen>
  );
}
