import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';

import { AiSays, AskBar, Badge, Button, Chip, FadeIn, PhotoStrip, Screen, Section, T, Thinking, Ticket, useToast } from '@/components/ui';
import { baht, logos, photos, trip } from '@/data/trip';
import { streamTripChat, type ChatMessage } from '@/lib/backend';
import { parseReply, shortDate, type TripSummary } from '@/lib/chat';
import { peopleOf, requestFromSummary } from '@/lib/itinerary';
import { useSettings } from '@/lib/settings';
import { useTrip } from '@/lib/tripStore';
import { radius, space } from '@/theme/tokens';

const MONTHS = [{ th: 'ธ.ค. นี้', en: 'This Dec' }, { th: 'ม.ค.', en: 'Jan' }, { th: 'ยังไม่แน่ใจ', en: 'Not sure yet' }];
const TONES = ['sky', 'sun', 'mint', 'blush', 'lilac'] as const;

// คุยกับ trip-chat จริงแบบสตรีม ถ้าต่อไม่ได้ตั้งแต่ข้อความแรก (เช่น backend ยังไม่มี key) ใช้บทสนทนาตัวอย่างแทน
export default function Chat() {
  const { t, pick, lang } = useSettings();
  const { setPending } = useTrip();
  const { prompt } = useLocalSearchParams<{ prompt?: string }>();
  const first = prompt || pick(trip.title);
  const toast = useToast();
  const [mode, setMode] = useState<'connecting' | 'live' | 'demo'>('connecting');
  const [msgs, setMsgs] = useState<ChatMessage[]>([{ role: 'user', content: first }]);
  const [draft, setDraft] = useState<string | null>(''); // คำตอบที่กำลังมา: '' = รอคำแรก, null = ไม่มี
  const [failed, setFailed] = useState<ChatMessage[] | null>(null);

  const run = useCallback((history: ChatMessage[]) =>
    streamTripChat(history, lang, setDraft)
      .then((full) => { setMsgs([...history, { role: 'assistant', content: full }]); setMode('live'); })
      // ยังไม่เคยตอบได้เลย = ต่อ backend ไม่ได้ จึงใช้ตัวอย่าง; ถ้าคุยกันอยู่แล้วให้กดส่งใหม่
      .catch(() => { if (history.length === 1) setMode('demo'); else setFailed(history); })
      .finally(() => setDraft(null)), [lang]);

  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    run([{ role: 'user', content: first }]);
  }, [run, first]);

  const say = (text: string) => {
    if (mode !== 'live') { toast(t('toast.sent')); return; }
    if (draft !== null) return;
    const h: ChatMessage[] = [...msgs, { role: 'user', content: text }];
    setMsgs(h); setDraft(''); setFailed(null);
    run(h);
  };
  const retry = () => {
    if (!failed) return;
    setDraft(''); setFailed(null);
    run(failed);
  };

  const last = msgs[msgs.length - 1];
  const reply = mode === 'live' && draft === null && last.role === 'assistant' ? parseReply(last.content) : null;
  // ส่งสรุปทริปต่อให้หน้างานของ AiGo สร้างแผนจริง ถ้าสรุปยังไม่พอ (ไม่มีที่หมายหรือวันที่) ใช้ตัวอย่าง
  const go = () => {
    const req = reply?.summary && requestFromSummary(reply.summary, lang, new Date().toISOString().slice(0, 10));
    if (req) setPending({ request: req, people: peopleOf(reply?.summary?.travelers), messages: msgs });
    router.replace('/work');
  };
  return (
    <Screen follow title={t('chat.title')} subtitle={t('chat.sub')} onBack={() => router.back()}
      footer={<AskBar placeholder={t('chat.placeholder')} onSend={say} />}>
      {mode === 'demo' ? <Demo first={first} /> : <>
        {msgs.map((m, i) => (
          <FadeIn key={i}>{m.role === 'user' ? <UserBubble text={m.content} /> : <AiSays>{parseReply(m.content).text}</AiSays>}</FadeIn>
        ))}
        {draft === '' && <FadeIn><Thinking label={t('chat.thinking')} /></FadeIn>}
        {!!draft && <AiSays>{parseReply(draft, true).text || '…'}</AiSays>}
        {failed && (
          <FadeIn style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingLeft: 50 }}>
            <T v="smallBold" tone="warn" style={{ flex: 1 }}>{pick({ th: 'ส่งไม่สำเร็จ ข้อความยังอยู่', en: 'Not sent. Your message is kept' })}</T>
            <Button kind="secondary" label={pick({ th: 'ส่งใหม่', en: 'Retry' })} onPress={retry} style={{ minHeight: 44 }} />
          </FadeIn>
        )}
        {reply && reply.quickReplies.length > 0 && (
          <FadeIn style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, paddingLeft: 50 }}>
            {/* หลัง [READY_TO_GENERATE] ปุ่ม 🚀 (ตาม system prompt คือ "สร้างแผน") ส่งต่อให้ AiGo จัดการเลย ไม่ต้องถามซ้ำ */}
            {reply.quickReplies.map((q) => <Chip key={q.label} label={q.label} onPress={() => (reply.ready && q.label.startsWith('🚀') ? go() : say(q.message))} />)}
          </FadeIn>
        )}
        {reply?.summary && <FadeIn><Summary s={reply.summary} onGo={go} /></FadeIn>}
        {reply && reply.ready && !reply.summary && <FadeIn><Button label={t('chat.go')} icon="next" big onPress={go} /></FadeIn>}
      </>}
    </Screen>
  );
}

function UserBubble({ text }: { text: string }) {
  const { colors } = useSettings();
  return (
    <View style={{ alignSelf: 'flex-end', maxWidth: '82%', paddingVertical: space.md, paddingHorizontal: space.lg, borderRadius: radius.lg, borderBottomRightRadius: 6, backgroundColor: colors.primary }}>
      <T tone="onPrimary">{text}</T>
    </View>
  );
}

/** สรุปทริปจาก [TRIP_SUMMARY] เป็นตั๋ว ปุ่มด้านล่างส่งต่อให้ AiGo จัดการ */
function Summary({ s, onGo }: { s: TripSummary; onGo: () => void }) {
  const { t, pick, lang } = useSettings();
  const tags = [
    s.startDate && s.endDate ? `${shortDate(s.startDate, lang)} – ${shortDate(s.endDate, lang)}` : undefined,
    s.duration && pick({ th: `${s.duration} วัน`, en: `${s.duration} days` }), s.travelers, s.budget, s.tripStyle,
  ].filter((x): x is string => !!x);
  return (
    <Ticket
      top={<>
        <T v="smallBold" tone="accent">{pick({ th: 'AiGo สรุปทริปให้แล้ว', en: 'AiGo summed up your trip' })}</T>
        <T v="title">{s.destination ?? pick({ th: 'ทริปของคุณ', en: 'Your trip' })}</T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.xs }}>
          {tags.map((x, i) => <Badge key={x} label={x} tone={TONES[i % TONES.length]} />)}
        </View>
      </>}
      bottom={<Button label={t('chat.go')} icon="next" big onPress={onGo} />} />
  );
}

// shortcut: บทสนทนาตัวอย่างคงที่ (ถาม 1 ข้อแล้วสรุป) ใช้ตอนต่อ trip-chat ไม่ได้
function Demo({ first }: { first: string }) {
  const { t, pick } = useSettings();
  const [month, setMonth] = useState<number | null>(null);
  const [thinking, setThinking] = useState(false);
  // shortcut: หน่วง 0.8 วินาทีแทนเวลาตอบจริง
  useEffect(() => { if (!thinking) return; const id = setTimeout(() => setThinking(false), 800); return () => clearTimeout(id); }, [thinking]);
  const tags = [pick(trip.dates), pick({ th: `${trip.people} คน`, en: `${trip.people} people` }), pick({ th: `งบ ${baht(trip.budget)}`, en: `Budget ${baht(trip.budget)}` }), pick({ th: 'ของกิน', en: 'Food' }), pick({ th: 'เดินเล่น', en: 'Walking' })];
  return <>
    <FadeIn style={{ alignItems: 'flex-end', gap: space.xs }}>
      <UserBubble text={first} />
      <T v="small" tone="muted">{t('common.sample')}</T>
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
  </>;
}
