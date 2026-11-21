import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { TripCards } from '@/components/cards';
import { AiSays, AskBar, Button, Card, FadeIn, PhotoStrip, PhotoStripSkeleton, PressScale, PriceTag, ProgressBar, Screen, Section, T, Ticket, TimelineItem, useToast } from '@/components/ui';
import { agentTasks, baht, offers, poses, trip as sampleTrip } from '@/data/trip';
import { stateWord } from '@/lib/agent';
import { askAigo } from '@/lib/ask';
import { planStatus, resumePlan, startPlan, stopPlan } from '@/lib/backend';
import type { CardKind } from '@/lib/chat';
import { dateRange, dayCount, toAppTrip, type PlanInfo, type PlanStatus } from '@/lib/itinerary';
import { usePhotos } from '@/lib/photos';
import { useSettings } from '@/lib/settings';
import { useTrip, type Pending } from '@/lib/tripStore';
import { radius, space } from '@/theme/tokens';

type Gen = { state: 'run' | 'done' | 'fail' | 'stopped'; quota?: boolean };
const PLAN_GEN: Record<PlanStatus, Gen['state']> = { running: 'run', done: 'done', failed: 'fail', stopped: 'stopped' };
const BOOKING_KINDS: CardKind[] = ['flight', 'hotel', 'food', 'ticket', 'service'];

// หน้างานของ AiGo มีสองแบบ
// - มีสรุปทริปจากแชตจริง (pending): งาน "วางแผน" เรียก generate-itinerary จริง แต่ละวันขึ้นทันทีที่เสร็จ
//   งานหาเที่ยวบิน ที่พัก ร้าน และบริการ แสดงสิ่งที่ AI หาไว้ในแชต (ราคาประมาณ กดดูราคาจริงที่เว็บจอง)
// - ไม่มี: ตัวอย่างทริปโอซาก้า งานเดินด้วยตัวจับเวลา (shortcut: เปลี่ยนเป็นสถานะจริงจากงานเบื้องหลังบน backend (RA5))
export default function Work() {
  const { colors, t, pick, lang } = useSettings();
  const { trip, setTrip, applyPlan, pending, setPending } = useTrip();
  const toast = useToast();
  const [job] = useState<Pending | null>(pending);
  // ทุกแผนได้ id ใหม่ ทริปเก่าที่ที่หมายและวันซ้ำกันจึงไม่ถูกแทนด้วยแผนที่ยังไม่เสร็จ
  const [tripId] = useState(() => `trip-${Date.now()}`);
  // ระหว่างส่งงานให้เซิร์ฟเวอร์หรือส่งไม่สำเร็จ ใช้สถานะนี้; พอมีงานแล้วสถานะมาจากงาน (ตัวเก็บทริปถามให้ทุก 3 วินาที แม้ออกจากหน้านี้)
  const [send, setSend] = useState<Gen>({ state: 'run' });
  const plan = job && trip.id === tripId ? trip.plan : undefined;
  const gen: Gen = plan ? { state: PLAN_GEN[plan.status] } : send;
  const ready = plan ? trip.days.length : 0;
  const [done, setDone] = useState(0);
  const near = job?.request.destination;
  const photo = usePhotos(job ? trip.days.slice(0, ready).flat().filter((p) => !p.photo).map((p) => ({ name: p.name.en, near })) : []);
  // เวลาเริ่มรอบนี้และจำนวนวันที่มีอยู่แล้ว สำหรับนาฬิกาและเวลาที่น่าจะเหลือ
  const [clock, setClock] = useState({ since: 0, base: 0 });
  const [busy, setBusy] = useState(false); // สั่งหยุดหรือทำต่อแล้ว รอเซิร์ฟเวอร์ตอบ
  const start = useCallback((j: Pending) => {
    setSend({ state: 'run' });
    setClock({ since: Date.now(), base: 0 });
    startPlan(j.request, j.messages, tripId)
      .then((ref) => setTrip({
        ...toAppTrip({ days: [] }, j.request, j.people), id: tripId, bookings: j.cards,
        plan: { job: ref.job, token: ref.token, status: 'running', request: j.request, people: j.people, days: [] },
      }))
      .catch((e: Error) => setSend({ state: 'fail', quota: / 429$/.test(e.message) }));
  }, [setTrip, tripId]);

  const started = useRef(false);
  useEffect(() => {
    if (!job || started.current) return;
    started.current = true;
    setPending(null);
    start(job);
  }, [job, start, setPending]);

  // ตัวอย่าง: เดินทีละงานทุก 1.4 วินาที
  useEffect(() => {
    if (job || done >= agentTasks.length) return;
    const id = setTimeout(() => setDone((n) => n + 1), 1400);
    return () => clearTimeout(id);
  }, [done, job]);

  if (job) {
    const days = dayCount(job.request.startDate, job.request.endDate);
    const ok = gen.state === 'done';
    // สถานะของแผนมาจากเซิร์ฟเวอร์: สั่งหยุดหรือทำต่อสำเร็จแล้วจึงถามสถานะมาใส่ ไม่ตั้งเองก่อน
    // (ตั้งเองก่อน ตัวถามสถานะอาจอ่านค่าเก่ามาทับ แผนจึงเด้งกลับเป็น "หยุดแล้ว" ทั้งที่เซิร์ฟเวอร์ทำต่ออยู่)
    const offline = () => toast(pick({ th: 'ต่ออินเทอร์เน็ตไม่ได้ ลองใหม่อีกครั้ง', en: 'No connection. Please try again.' }));
    const settle = (p: PlanInfo) => planStatus(p, p.days.length).then((s) => applyPlan(trip.id, s));
    // ระหว่างรอเซิร์ฟเวอร์ (2-3 วินาที) ปุ่มขึ้นว่ากำลังทำ กดซ้ำไม่ได้
    const act = (call: (p: PlanInfo) => Promise<unknown>, p: PlanInfo) => { setBusy(true); call(p).then(() => settle(p)).catch(offline).finally(() => setBusy(false)); };
    // ลองใหม่: งานที่หยุดหรือไม่สำเร็จทำต่อจากวันที่มีแล้ว; ส่งงานไม่ผ่านตั้งแต่แรกก็ส่งใหม่
    const retry = () => {
      if (!plan) return start(job);
      setClock({ since: Date.now(), base: trip.days.length });
      act(resumePlan, plan);
    };
    const stop = () => { if (plan) act(stopPlan, plan); };
    const cards = job.cards ?? [];
    const found = (...kinds: CardKind[]) => cards.filter((c) => kinds.includes(c.kind)).length;
    const tasks = [
      { id: 'plan', label: pick({ th: `วางแผน ${days} วัน`, en: `Plan ${days} days` }), n: 0 },
      { id: 'flight', label: pick({ th: 'หาเที่ยวบิน', en: 'Find flights' }), n: found('flight') },
      { id: 'hotel', label: pick({ th: 'หาที่พักในงบ', en: 'Find a hotel within budget' }), n: found('hotel') },
      { id: 'food', label: pick({ th: 'หาร้านที่ต้องลอง', en: 'Find must-eats' }), n: found('food') },
      { id: 'service', label: pick({ th: 'ตั๋ว รถ รถไฟ และบริการที่ต้องใช้', en: 'Tickets, car, rail and essentials' }), n: found('ticket', 'service') },
    ];
    return (
      <Screen title={t('work.title')} subtitle={`${job.request.destination} · ${dateRange(job.request.startDate, job.request.endDate, lang)}`} onBack={() => router.back()}
        mascot={ok ? poses.happy : gen.state === 'fail' ? poses.rain : poses.think} follow
        footer={<AskBar placeholder={t('work.tell')} onSend={(q) => (gen.state === 'run'
          ? toast(pick({ th: 'รอฉันวางแผนให้เสร็จก่อนนะ แล้วบอกได้เลยว่าอยากแก้อะไร', en: 'Let me finish the plan first, then tell me what to change' }))
          : askAigo(q, trip, lang))} />}>
        <FadeIn><AiSays>{ok
          ? pick({ th: `แผน ${days} วันเสร็จแล้ว ราคาและเวลาเปิดยังเป็นค่าประมาณ ฉันจะตรวจให้ก่อนเดินทาง`, en: `Your ${days}-day plan is ready. Prices and hours are estimates; I will check them before you go.` })
          : pick({ th: 'ปิดแอปได้เลย ฉันวางแผนต่อบนเซิร์ฟเวอร์ เปิดแอปเมื่อไหร่ก็เห็นแผน', en: 'You can close the app. I keep planning on the server; open the app any time to see the plan.' })}</AiSays></FadeIn>
        <FadeIn index={1}>
          <View accessibilityLiveRegion="polite">
            {tasks.map((task, i) => {
              const state = i === 0 ? (ok ? 'done' : gen.state === 'run' ? 'now' : 'wait') : task.n ? 'done' : 'wait';
              const word = i === 0
                ? (gen.state === 'fail' ? pick({ th: 'ไม่สำเร็จ', en: 'Failed' }) : stateWord(state))
                : task.n ? pick({ th: `เจอ ${task.n} ตัวเลือก`, en: `${task.n} found` }) : pick({ th: 'ยังไม่มี', en: 'None yet' });
              return (
                <TimelineItem key={task.id} state={state} last={i === tasks.length - 1}>
                  <View style={{ minHeight: 56, paddingTop: 16, gap: 2 }}>
                    <View style={{ flexDirection: 'row', gap: space.sm }}>
                      <T v={state === 'now' ? 'bodyBold' : 'body'} tone={state === 'wait' ? 'muted' : 'ink'} style={{ flex: 1 }}>{task.label}</T>
                      <T v="smallBold" tone={gen.state === 'fail' && i === 0 ? 'warn' : state === 'done' ? 'success' : state === 'now' ? 'accent' : 'muted'} style={{ paddingTop: 2 }}>{word}</T>
                    </View>
                    {i === 0 && gen.state === 'run' && (
                      <View style={{ gap: space.sm }}>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: space.sm }}>
                          <T v="small" tone="muted">{pick({ th: `กำลังวางวันที่ ${ready + 1} จาก ${days}`, en: `Planning day ${ready + 1} of ${days}` })}</T>
                          <PlanClock since={clock.since} done={ready - clock.base} left={days - ready} />
                        </View>
                        <ProgressBar value={ready / days} color={colors.success} />
                        <Button kind="secondary" label={pick({ th: 'หยุดสร้างแผน', en: 'Stop planning' })} busy={busy} busyLabel={pick({ th: 'กำลังหยุด…', en: 'Stopping…' })} onPress={stop} style={{ alignSelf: 'flex-start', minHeight: 44 }} />
                      </View>
                    )}
                  </View>
                </TimelineItem>
              );
            })}
          </View>
        </FadeIn>
        {gen.state === 'stopped' && (
          <FadeIn>
            <Card style={{ gap: space.md }}>
              <T v="subheading">{pick({ th: 'หยุดสร้างแผนแล้ว', en: 'Planning stopped' })}</T>
              <T>{ready
                ? pick({ th: `ได้แผน ${ready} จาก ${days} วัน เก็บไว้ในทริปแล้ว วางวันที่เหลือต่อได้ทุกเมื่อจากหน้านี้`, en: `${ready} of ${days} days are planned and saved. You can plan the rest from here.` })
                : pick({ th: 'ยังไม่ได้วันไหนเลย สรุปทริปยังอยู่ครบ', en: 'No days yet. Your trip summary is kept.' })}</T>
              <View style={{ flexDirection: 'row', gap: space.sm }}>
                <Button label={pick({ th: 'วางวันที่เหลือต่อ', en: 'Plan the rest' })} busy={busy} busyLabel={pick({ th: 'กำลังเริ่มต่อ…', en: 'Starting…' })} onPress={retry} style={{ flex: 1 }} />
                {ready > 0 && <Button kind="secondary" label={pick({ th: 'ดูแผน', en: 'See plan' })} onPress={() => router.push('/itinerary')} style={{ flex: 1 }} />}
              </View>
            </Card>
          </FadeIn>
        )}
        {gen.state === 'fail' && (
          <FadeIn>
            <Card tone="danger" style={{ gap: space.md }}>
              <T v="subheading" tone="warn">{pick({ th: 'สร้างแผนไม่สำเร็จ', en: 'Could not make the plan' })}</T>
              <T>{gen.quota
                ? pick({ th: 'ทริปฟรีของสัปดาห์นี้ใช้ไปแล้ว วางแผนทริปใหม่ได้อีกครั้งสัปดาห์หน้า', en: 'This week\'s free trip is used. You can plan a new one next week.' })
                : ready
                  ? pick({ th: `ได้แผน ${ready} จาก ${days} วันแล้ว กดลองใหม่เพื่อวางวันที่เหลือต่อ`, en: `${ready} of ${days} days are planned. Try again to plan the rest.` })
                  : pick({ th: 'ระบบ AI ไม่ตอบ ลองใหม่อีกครั้งได้ สรุปทริปยังอยู่ครบ', en: 'The AI did not answer. You can try again; your trip summary is kept.' })}</T>
              <View style={{ flexDirection: 'row', gap: space.sm }}>
                {gen.quota
                  ? <Button label={pick({ th: 'ดูแพ็กทริป', en: 'See trip packs' })} onPress={() => router.push({ pathname: '/paywall', params: { used: '1' } })} style={{ flex: 1 }} />
                  : <Button label={pick({ th: 'ลองใหม่', en: 'Try again' })} busy={busy} busyLabel={pick({ th: 'กำลังเริ่มต่อ…', en: 'Starting…' })} onPress={retry} style={{ flex: 1 }} />}
                <Button kind="secondary" label={pick({ th: 'ไว้ทีหลัง', en: 'Later' })} onPress={() => router.back()} style={{ flex: 1 }} />
              </View>
            </Card>
          </FadeIn>
        )}
        {/* แต่ละวันขึ้นทันทีที่ AiGo วางเสร็จ ไม่ต้องรอครบทั้งทริป */}
        {trip.days.slice(0, ready).map((places, d) => (
          <FadeIn key={d}>
            <Section title={[t('it.day', { n: d + 1 }), trip.dayTitles?.[d] && pick(trip.dayTitles[d])].filter(Boolean).join(' · ')}
              action={pick({ th: 'ดูแผน', en: 'View plan' })} onAction={() => router.push('/itinerary')}>
              <PhotoStrip items={places.map((p) => ({ key: p.id, source: p.photo ?? photo({ name: p.name.en, near }), label: [p.time, pick(p.name)].filter(Boolean).join(' '), onPress: () => router.push('/itinerary') }))} />
            </Section>
          </FadeIn>
        ))}
        {/* วันถัดไปที่ AiGo กำลังวาง: โครงร่างรูปทรงเดียวกับแถวรูปจริง */}
        {gen.state === 'run' && ready < days && (
          <FadeIn key={`next-${ready}`}>
            <Section title={t('it.day', { n: ready + 1 })}>
              <PhotoStripSkeleton label={pick({ th: `กำลังวางวันที่ ${ready + 1}…`, en: `Planning day ${ready + 1}…` })} />
            </Section>
          </FadeIn>
        )}
        {ok && (
          <FadeIn>
            <Button label={pick({ th: 'เปิดแผนทั้งหมด', en: 'Open the full plan' })} icon="next" onPress={() => router.push('/itinerary')} />
          </FadeIn>
        )}
        {found(...BOOKING_KINDS) > 0 && (
          <FadeIn style={{ gap: space.md }}>
            <T v="title">{pick({ th: 'AiGo หาไว้ให้แล้ว', en: 'AiGo found these' })}</T>
            <TripCards cards={cards} only={BOOKING_KINDS}
              trip={{ destination: job.request.destination, startDate: job.request.startDate, endDate: job.request.endDate, people: job.people }} />
          </FadeIn>
        )}
      </Screen>
    );
  }

  // ตัวอย่างใช้ทริปโอซาก้าเสมอ ให้ตรงกับเที่ยวบินและที่พักตัวอย่าง
  const trip0 = sampleTrip;
  const flightFound = done > agentTasks.findIndex((x) => x.id === 'flight');
  const waiting = offers.filter((o) => flightFound && (o.id === 'flight' || done > agentTasks.findIndex((x) => x.id === 'hotel')));
  const finished = done >= agentTasks.length;
  return (
    <Screen title={t('work.title')} subtitle={`${pick(trip0.title)} · ${pick(trip0.dates)}`} onBack={() => router.back()} mascot={finished ? poses.happy : poses.think}
      footer={<AskBar placeholder={t('work.tell')} onSend={() => toast(t('toast.sent'))} />}>
      <FadeIn><AiSays>{t('work.intro')}</AiSays></FadeIn>

      <FadeIn index={1} style={{ gap: space.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <T v="heading" style={{ flex: 1 }}>{pick({ th: 'งานของ AiGo', en: "AiGo's tasks" })}</T>
          <T v="smallBold" tone="muted">{pick({ th: `เสร็จ ${done} จาก ${agentTasks.length}`, en: `${done} of ${agentTasks.length} done` })}</T>
        </View>
        <ProgressBar value={done / agentTasks.length} color={colors.success} />
        {/* ไทม์ไลน์เส้นประ: ทุกสถานะมีคำกำกับ ไม่บอกด้วยสีอย่างเดียว */}
        <View accessibilityLiveRegion="polite">
          {agentTasks.map((task, i) => {
            const state = i < done ? 'done' : i === done ? 'now' : 'wait';
            return (
              <TimelineItem key={task.id} state={state} last={i === agentTasks.length - 1}>
                <View style={{ minHeight: 56, paddingTop: 16, flexDirection: 'row', gap: space.sm }}>
                  <T v={state === 'now' ? 'bodyBold' : 'body'} tone={state === 'wait' ? 'muted' : 'ink'} style={{ flex: 1 }}>{pick(task)}</T>
                  <T v="smallBold" tone={state === 'done' ? 'success' : state === 'now' ? 'accent' : 'muted'} style={{ paddingTop: 2 }}>{stateWord(state)}</T>
                </View>
              </TimelineItem>
            );
          })}
        </View>
      </FadeIn>

      {done > 0 && (
        <FadeIn>
          <Section title={pick({ th: 'แผนวันที่ 1 พร้อมแล้ว', en: 'Day 1 is ready' })} action={pick({ th: 'ดูแผน', en: 'View plan' })} onAction={() => router.push('/itinerary')}>
            <PhotoStrip items={trip0.days[0].map((p) => ({ key: p.id, source: p.photo, label: `${p.time} ${pick(p.name)}`, onPress: () => router.push('/itinerary') }))} />
          </Section>
        </FadeIn>
      )}

      {waiting.length > 0 && (
        <FadeIn style={{ gap: space.md }}>
          <T v="heading">{t('work.waiting', { n: waiting.length })}</T>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -space.lg }} contentContainerStyle={{ gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.sm }}>
            {waiting.map((o) => (
              <PressScale key={o.id} onPress={() => router.push('/approvals')} label={`${pick(o.name)} ${baht(o.costBaht)}`} style={{ width: 264 }}>
                <Ticket
                  top={o.lead === 'XJ'
                    ? <View style={{ height: 96, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.sticker.sky }}><T v="title">BKK ⇄ KIX</T></View>
                    : <Image source={o.lead} style={{ width: '100%', height: 96, borderRadius: radius.md }} contentFit="cover" accessible={false} />}
                  bottom={<>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                      <T v="bodyBold" numberOfLines={1} style={{ flex: 1 }}>{pick(o.name)}</T>
                      <T v="price">{baht(o.costBaht)}</T>
                    </View>
                    <T v="small" tone="muted" numberOfLines={1}>{pick(o.note)}</T>
                    <PriceTag source={o.source} at={o.at} logo={o.logo} />
                  </>} />
              </PressScale>
            ))}
          </ScrollView>
          <Button label={t('work.see')} icon="next" onPress={() => router.push('/approvals')} />
        </FadeIn>
      )}
    </Screen>
  );
}

/**
 * นาฬิกาเดินทุกวินาทีระหว่างวางแผน ให้เห็นว่ายังทำงานอยู่ (AI ใช้ราววันละนาที ระหว่างนั้นไม่มีอะไรขยับ)
 * และเวลาที่น่าจะเหลือจากความเร็วของวันที่เสร็จในรอบนี้; ซ่อนจากโปรแกรมอ่านหน้าจอ ไม่ให้อ่านออกเสียงทุกวินาที
 */
function PlanClock({ since, done, left }: { since: number; done: number; left: number }) {
  const { pick } = useSettings();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const s = Math.max(0, Math.round((now - since) / 1000));
  const mins = done > 0 ? Math.max(1, Math.round(((s / done) * left) / 60)) : 0;
  return (
    <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden style={{ flexDirection: 'row', columnGap: space.sm }}>
      <T v="small" tone="muted" style={{ fontVariant: ['tabular-nums'] }}>{`${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`}</T>
      {mins > 0 && <T v="small" tone="muted">{pick({ th: `อีกราว ${mins} นาที`, en: `about ${mins} min left` })}</T>}
    </View>
  );
}
