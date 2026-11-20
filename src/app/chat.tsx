import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { AiSays, AskBar, Button, Card, Chip, FadeIn, Screen, T, Thinking, Thumb, useToast } from '@/components/ui';
import { photos, trip } from '@/data/trip';
import { useSettings } from '@/lib/settings';
import { radius, space } from '@/theme/tokens';

const MONTHS = [{ th: 'ธ.ค. นี้', en: 'This Dec' }, { th: 'ม.ค.', en: 'Jan' }, { th: 'ยังไม่แน่ใจ', en: 'Not sure yet' }];

// shortcut: บทสนทนาเป็นตัวอย่างคงที่ (ถาม 1 ข้อแล้วสรุป), ต่อ trip-chat ผ่าน SSE เมื่อมี backend
export default function Chat() {
  const { colors, t, pick } = useSettings();
  const { prompt } = useLocalSearchParams<{ prompt?: string }>();
  const [month, setMonth] = useState<number | null>(null);
  const [thinking, setThinking] = useState(false);
  const toast = useToast();
  // shortcut: หน่วง 0.8 วินาทีแทนเวลาตอบจริงของ trip-chat
  useEffect(() => { if (!thinking) return; const id = setTimeout(() => setThinking(false), 800); return () => clearTimeout(id); }, [thinking]);
  const tags = [pick(trip.dates), `${trip.people} คน`, `งบ ฿${trip.budget.toLocaleString('en-US')}`, 'ของกิน', 'เดินเล่น'];
  return (
    <Screen tint={colors.header.work} title={t('chat.title')} subtitle={t('chat.sub')} onBack={() => router.back()}
      footer={<AskBar placeholder={t('chat.placeholder')} onSend={() => toast(t('toast.sent'))} />}>
      <View style={{ alignSelf: 'flex-end', maxWidth: '80%', padding: space.md, borderRadius: radius.sm, backgroundColor: colors.primary }}>
        <T tone="onPrimary">{prompt || pick(trip.title)}</T>
      </View>
      <AiSays>{t('chat.ask')}</AiSays>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
        {MONTHS.map((m, i) => <Chip key={m.th} label={pick(m)} selected={month === i} onPress={() => { setMonth(i); setThinking(true); }} />)}
      </View>
      {thinking && <Thinking label={t('chat.thinking')} />}
      {month !== null && !thinking && <FadeIn style={{ gap: space.md }}>
        <AiSays>{t('chat.ack')}</AiSays>
        <Card style={{ gap: space.sm }}>
          <T v="smallBold" tone="muted">{t('chat.understood', { n: 6, total: 6 })}</T>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
            <T v="heading" style={{ flex: 1 }}>{pick(trip.title)}</T>
            <Thumb source={photos.skyline} />
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
            {tags.map((x) => <View key={x} style={{ paddingHorizontal: space.md, paddingVertical: 4, borderRadius: radius.pill, backgroundColor: colors.bg }}><T v="smallBold">{x}</T></View>)}
          </View>
          <Button label={t('chat.go')} big onPress={() => router.replace('/work')} />
        </Card>
      </FadeIn>}
    </Screen>
  );
}
