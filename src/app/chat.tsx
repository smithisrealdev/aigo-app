import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { AiSays, AskBar, Badge, Button, Chip, FadeIn, PhotoStrip, Screen, Section, T, Thinking, Ticket, useToast } from '@/components/ui';
import { baht, logos, photos, trip } from '@/data/trip';
import { useSettings } from '@/lib/settings';
import { radius, space } from '@/theme/tokens';

const MONTHS = [{ th: 'ธ.ค. นี้', en: 'This Dec' }, { th: 'ม.ค.', en: 'Jan' }, { th: 'ยังไม่แน่ใจ', en: 'Not sure yet' }];
const TONES = ['sky', 'sun', 'mint', 'blush', 'lilac'] as const;

// shortcut: บทสนทนาเป็นตัวอย่างคงที่ (ถาม 1 ข้อแล้วสรุป), ต่อ trip-chat ผ่าน SSE เมื่อมี backend
export default function Chat() {
  const { colors, t, pick } = useSettings();
  const { prompt } = useLocalSearchParams<{ prompt?: string }>();
  const [month, setMonth] = useState<number | null>(null);
  const [thinking, setThinking] = useState(false);
  const toast = useToast();
  // shortcut: หน่วง 0.8 วินาทีแทนเวลาตอบจริงของ trip-chat
  useEffect(() => { if (!thinking) return; const id = setTimeout(() => setThinking(false), 800); return () => clearTimeout(id); }, [thinking]);
  const tags = [pick(trip.dates), pick({ th: `${trip.people} คน`, en: `${trip.people} people` }), pick({ th: `งบ ${baht(trip.budget)}`, en: `Budget ${baht(trip.budget)}` }), pick({ th: 'ของกิน', en: 'Food' }), pick({ th: 'เดินเล่น', en: 'Walking' })];
  return (
    <Screen title={t('chat.title')} subtitle={t('chat.sub')} onBack={() => router.back()}
      footer={<AskBar placeholder={t('chat.placeholder')} onSend={() => toast(t('toast.sent'))} />}>
      <FadeIn style={{ alignSelf: 'flex-end', maxWidth: '82%' }}>
        <View style={{ paddingVertical: space.md, paddingHorizontal: space.lg, borderRadius: radius.lg, borderBottomRightRadius: 6, backgroundColor: colors.primary }}>
          <T tone="onPrimary">{prompt || pick(trip.title)}</T>
        </View>
      </FadeIn>
      <FadeIn index={1} style={{ gap: space.md }}>
        <AiSays>{t('chat.ask')}</AiSays>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, paddingLeft: 50 }}>
          {MONTHS.map((m, i) => <Chip key={m.th} label={pick(m)} selected={month === i} onPress={() => { setMonth(i); setThinking(true); }} />)}
        </View>
      </FadeIn>
      {thinking && <FadeIn><Thinking label={t('chat.thinking')} /></FadeIn>}
      {month !== null && !thinking && (
        <FadeIn style={{ gap: space.lg }}>
          <AiSays>{t('chat.ack')}</AiSays>
          {/* สรุปทริปเป็นตั๋ว: ด้านบนคือสิ่งที่ AiGo เข้าใจ ด้านล่างคือที่มาที่จะใช้ และปุ่มไปต่อ */}
          <Ticket
            top={<>
              <T v="smallBold" tone="accent">{t('chat.understood', { n: 6, total: 6 })}</T>
              <Image source={photos.skyline} style={{ width: '100%', height: 132, borderRadius: radius.md }} contentFit="cover" accessible={false} />
              <T v="title">{pick(trip.title)}</T>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.xs }}>
                {tags.map((x, i) => <Badge key={x} label={x} tone={TONES[i % TONES.length]} />)}
              </View>
            </>}
            bottom={<>
              {/* ที่มาที่ AiGo ใช้วางแผน ให้เห็นว่าไม่ได้เดาเอง */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                <T v="smallBold" tone="muted" style={{ flex: 1 }}>{pick({ th: 'AiGo จะดูจาก', en: 'AiGo will check' })}</T>
                {[logos.aviasales, logos.agoda].map((l, i) => <Image key={i} source={l} style={{ width: 20, height: 20 }} contentFit="contain" accessible={false} />)}
                <T v="smallBold" tone="muted">Google Places</T>
              </View>
              <Button label={t('chat.go')} icon="next" big onPress={() => router.replace('/work')} />
            </>} />
          <Section title={pick({ th: 'ที่ฉันคิดว่าคุณน่าจะชอบ', en: 'Places I think you will like' })}>
            <PhotoStrip items={trip.days[0].map((p) => ({ key: p.id, source: p.photo, label: pick(p.name), onPress: () => router.push({ pathname: '/place/[id]', params: { id: p.id } }) }))} />
          </Section>
        </FadeIn>
      )}
    </Screen>
  );
}
