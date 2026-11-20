import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { AiSays, AskBar, Button, Card, Chip, FadeIn, PhotoStrip, Screen, T, Thinking, useToast } from '@/components/ui';
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
          <Image source={photos.skyline} style={{ width: '100%', height: 120, borderRadius: radius.sm }} contentFit="cover" accessible={false} />
          <T v="heading">{pick(trip.title)}</T>
          <T v="small" tone="muted">{tags.join(' · ')}</T>
          <Button label={t('chat.go')} big onPress={() => router.replace('/work')} />
        </Card>
        <T v="smallBold" tone="muted">{pick({ th: 'ที่ฉันคิดว่าคุณน่าจะชอบ', en: 'Places I think you will like' })}</T>
        <PhotoStrip items={trip.days[0].map((p) => ({ key: p.id, source: p.photo, label: pick(p.name) }))} />
      </FadeIn>}
    </Screen>
  );
}
