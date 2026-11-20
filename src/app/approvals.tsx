import { Image } from 'expo-image';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { View } from 'react-native';

import { Icon } from '@/components/icon';
import { Button, Card, PriceTag, Screen, T } from '@/components/ui';
import { autoDone, baht, offers } from '@/data/trip';
import { decide } from '@/lib/agent';
import { useSettings } from '@/lib/settings';
import { radius, space, vivid } from '@/theme/tokens';

export default function Approvals() {
  const { colors, t, pick, autoEdit } = useSettings();
  const [approved, setApproved] = useState<string[]>([]);
  const [undone, setUndone] = useState<string[]>([]);
  // ตัดสินด้วยกฎเดียวกับ AiGo: อะไรที่เสียเงินหรือย้อนกลับไม่ได้ต้องอยู่ในหน้านี้เสมอ
  const pending = offers.filter((o) => decide(o, autoEdit) === 'approve' && !approved.includes(o.id));
  const approve = (id: string, url: string) => { setApproved((a) => [...a, id]); WebBrowser.openBrowserAsync(url).catch(() => {}); };
  return (
    <Screen tint={colors.header.trips} title={t('appr.title')} subtitle={t('appr.sub', { n: pending.length })} onBack={() => router.back()}>
      <T v="smallBold" tone="muted">{pending.length ? t('appr.paid') : t('appr.none')}</T>
      {pending.map((o) => (
        <Card key={o.id} style={{ gap: space.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
            {o.lead === 'XJ'
              ? <View style={{ width: 44, height: 44, borderRadius: radius.pill, backgroundColor: vivid.coral, alignItems: 'center', justifyContent: 'center' }} accessible={false}><T v="bodyBold" tone="pastel">XJ</T></View>
              : <Image source={o.lead} style={{ width: 44, height: 44, borderRadius: 12 }} contentFit="cover" accessible={false} />}
            <View style={{ flex: 1 }}>
              <T v="subheading">{o.title}</T>
              <T v="small" tone="muted">{pick(o.note)}</T>
            </View>
            <T v="price">{baht(o.costBaht)}</T>
          </View>
          <PriceTag source={o.source} at={o.at} logo={o.logo} />
          <T v="small">{t('appr.why', { x: pick(o.why) })}</T>
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            <Button label={t('appr.go')} onPress={() => approve(o.id, o.url)} style={{ flex: 1 }} />
            <Button kind="secondary" label={t('appr.other')} onPress={() => {}} style={{ flex: 1 }} />
          </View>
        </Card>
      ))}
      {approved.length > 0 && <Card tone="done"><T tone="pastel">{t('appr.approved')}</T></Card>}
      <T v="smallBold" tone="muted">{t('appr.done')}</T>
      <Card style={{ paddingVertical: space.xs }}>
        {autoDone.map((a) => (
          <View key={a.id} style={{ minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: space.md }}>
            <Icon name="check" color={undone.includes(a.id) ? colors.muted : colors.success} size={20} />
            <T v="small" tone={undone.includes(a.id) ? 'muted' : 'ink'} style={{ flex: 1 }}>{pick(a.text)}</T>
            {undone.includes(a.id)
              ? <T v="smallBold" tone="muted">{t('appr.undone')}</T>
              : <Button kind="secondary" label={t('appr.undo')} onPress={() => setUndone((u) => [...u, a.id])} style={{ minHeight: 44, paddingHorizontal: space.md }} />}
          </View>
        ))}
      </Card>
    </Screen>
  );
}
