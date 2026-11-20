import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';

import { TripCards } from '@/components/cards';
import { AiSays, AskBar, Badge, Button, Chip, FadeIn, Screen, T, Thinking, Ticket, useToast } from '@/components/ui';
import { streamTripChat, type ChatMessage } from '@/lib/backend';
import { parseReply, type Reply, type TripSummary } from '@/lib/chat';
import { dateRange, peopleOf, requestFromSummary } from '@/lib/itinerary';
import type { LinkTrip } from '@/lib/links';
import { useSettings } from '@/lib/settings';
import { useTrip } from '@/lib/tripStore';
import { radius, space } from '@/theme/tokens';

const TONES = ['sky', 'sun', 'mint', 'blush', 'lilac'] as const;

// คุยกับ trip-chat จริงแบบสตรีม ส่งไม่สำเร็จ (เน็ตหลุด เซิร์ฟเวอร์ไม่ตอบ ส่งถี่เกิน) บอกตรงๆ และให้กดส่งใหม่ ข้อความไม่หาย
export default function Chat() {
  const { t, pick, lang } = useSettings();
  const { setPending } = useTrip();
  // about = แผนของทริปที่ถามมาจากหน้าแผน ส่งให้ AI แต่ไม่แสดงในฟองข้อความ
  const { prompt, about } = useLocalSearchParams<{ prompt?: string; about?: string }>();
  const first = prompt || pick({ th: 'ช่วยวางแผนทริปให้หน่อย', en: 'Help me plan a trip' });
  const opening = about ? `${first}\n\n${about}` : first;
  const toast = useToast();
  const [msgs, setMsgs] = useState<ChatMessage[]>([{ role: 'user', content: opening }]);
  const [draft, setDraft] = useState<string | null>(''); // คำตอบที่กำลังมา: '' = รอคำแรก, null = ไม่มี
  const [failed, setFailed] = useState<{ history: ChatMessage[]; busy: boolean } | null>(null);

  const run = useCallback((history: ChatMessage[]) =>
    streamTripChat(history, lang, setDraft)
      .then((full) => setMsgs([...history, { role: 'assistant', content: full }]))
      .catch((e: Error) => setFailed({ history, busy: / 429$/.test(e.message) }))
      .finally(() => setDraft(null)), [lang]);

  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    run([{ role: 'user', content: opening }]);
  }, [run, opening]);

  const say = (text: string) => {
    if (draft !== null) { toast(pick({ th: 'รอ AiGo ตอบข้อความก่อนหน้าก่อนนะ', en: 'Wait for AiGo to finish replying' })); return; }
    if (failed) { toast(pick({ th: 'ข้อความก่อนหน้ายังไม่ถึง AiGo กดส่งใหม่ก่อนนะ', en: 'Your last message has not reached AiGo yet. Tap Retry first' })); return; }
    const h: ChatMessage[] = [...msgs, { role: 'user', content: text }];
    setMsgs(h); setDraft('');
    run(h);
  };
  const retry = () => {
    if (!failed) return;
    setDraft(''); setFailed(null);
    run(failed.history);
  };

  const parsed: (Reply | null)[] = msgs.map((m) => (m.role === 'assistant' ? parseReply(m.content) : null));
  const last = msgs[msgs.length - 1];
  const reply = draft === null && last.role === 'assistant' ? parsed[parsed.length - 1] : null;
  // ที่หมาย วันที่ และจำนวนคนจากสรุปทริปล่าสุดถึงข้อความนั้น ใช้ทำลิงก์จองและค้นรูปของการ์ด
  const tripAt = (i: number): LinkTrip => {
    const s = parsed.slice(0, i + 1).reverse().find((r) => r?.summary)?.summary;
    return s ? { destination: s.destination, startDate: s.startDate, endDate: s.endDate, people: peopleOf(s.travelers) } : {};
  };
  // ส่งสรุปทริปต่อให้หน้างานของ AiGo สร้างแผนจริง พร้อมเที่ยวบิน ที่พัก ร้าน และบริการที่ AI หาไว้ในแชต
  const go = () => {
    const req = reply?.summary && requestFromSummary(reply.summary, lang, new Date().toISOString().slice(0, 10));
    const picks = [...parsed].reverse().find((r) => r?.cards.some((c) => c.kind !== 'place'))?.cards ?? [];
    if (!req) { say(pick({ th: 'ช่วยสรุปทริปให้หน่อย', en: 'Please sum up my trip' })); return; }
    // ทริปเดิม (ที่หมายและวันเดียวกัน) ที่วางใหม่จะแทนของเก่า ทริปอื่นยังอยู่
    setPending({ id: `trip-${req.destination}-${req.startDate}-${req.endDate}`, request: req, people: peopleOf(reply?.summary?.travelers), messages: msgs, cards: picks });
    router.replace('/work');
  };
  return (
    <Screen follow title={t('chat.title')} subtitle={about ? pick({ th: 'ถามเรื่องทริปของคุณ', en: 'About your trip' }) : t('chat.sub')} onBack={() => router.back()}
      footer={<AskBar placeholder={t('chat.placeholder')} onSend={say} />}>
      <>
        {msgs.map((m, i) => {
          const r = parsed[i];
          if (!r) return <FadeIn key={i}><UserBubble text={i === 0 ? first : m.content} /></FadeIn>;
          return (
            <FadeIn key={i} style={{ gap: space.lg }}>
              <AiSays>{r.text}</AiSays>
              <TripCards cards={r.cards} trip={tripAt(i)} />
            </FadeIn>
          );
        })}
        {draft === '' && <FadeIn><Thinking label={t('chat.thinking')} /></FadeIn>}
        {!!draft && <AiSays>{parseReply(draft, true).text || '…'}</AiSays>}
        {failed && (
          <FadeIn style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingLeft: 50 }}>
            <T v="smallBold" tone="warn" style={{ flex: 1 }}>{failed.busy
              ? pick({ th: 'ส่งข้อความถี่เกินไป รอสักครู่แล้วกดส่งใหม่', en: 'Too many messages. Wait a moment, then retry' })
              : pick({ th: 'ต่อ AiGo ไม่ได้ ตรวจอินเทอร์เน็ตแล้วกดส่งใหม่ ข้อความยังอยู่', en: 'Cannot reach AiGo. Check your internet and retry. Your message is kept' })}</T>
            <Button kind="secondary" label={pick({ th: 'ส่งใหม่', en: 'Retry' })} onPress={retry} style={{ minHeight: 44 }} />
          </FadeIn>
        )}
        {reply && reply.quickReplies.some((q) => !(reply.ready && q.go)) && (
          <FadeIn style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, paddingLeft: 50 }}>
            {/* หลัง [READY_TO_GENERATE] ปุ่มสร้างแผนอยู่ในตั๋วสรุปแล้ว จึงไม่แสดงชิปสร้างแผนซ้ำ (ป้ายของ AI บางทีเป็นภาษาอังกฤษ) */}
            {reply.quickReplies.filter((q) => !(reply.ready && q.go)).map((q) => <Chip key={q.label} label={q.label} onPress={() => say(q.message)} />)}
          </FadeIn>
        )}
        {reply?.summary && <FadeIn><Summary s={reply.summary} onGo={go} /></FadeIn>}
        {reply && reply.ready && !reply.summary && <FadeIn><Button label={t('chat.go')} icon="next" big onPress={go} /></FadeIn>}
      </>
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
  // สิ่งที่ AiGo เข้าใจแล้ว 6 อย่าง (R7): ที่หมาย วันที่ จำนวนวัน ใครไป งบ และความชอบ
  const known = [s.destination, s.startDate && s.endDate, s.duration, s.travelers, s.budget, s.tripStyle].filter(Boolean).length;
  const tags = [
    s.startDate && s.endDate ? dateRange(s.startDate, s.endDate, lang) : undefined,
    s.duration && pick({ th: `${s.duration} วัน`, en: `${s.duration} days` }), s.travelers, s.budget, s.tripStyle,
  ].filter((x): x is string => !!x);
  return (
    <Ticket
      top={<>
        <T v="smallBold" tone="accent">{`${pick({ th: 'สรุปทริป', en: 'Trip summary' })} · ${t('chat.understood', { n: known, total: 6 })}`}</T>
        <T v="title">{s.destination ?? pick({ th: 'ทริปของคุณ', en: 'Your trip' })}</T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.xs }}>
          {tags.map((x, i) => <Badge key={x} label={x} tone={TONES[i % TONES.length]} />)}
        </View>
      </>}
      bottom={<Button label={t('chat.go')} icon="next" big onPress={onGo} />} />
  );
}
