import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { AiSays, AskBar, Button, Card, FadeIn, PhotoStrip, PressScale, PriceTag, ProgressBar, Screen, Section, T, Ticket, TimelineItem, useToast } from '@/components/ui';
import { agentTasks, baht, offers, poses, trip as sampleTrip } from '@/data/trip';
import { stateWord } from '@/lib/agent';
import { generateItinerary } from '@/lib/backend';
import { dateRange, dayCount, toAppTrip, type GenDay } from '@/lib/itinerary';
import { useSettings } from '@/lib/settings';
import { useTrip, type Pending } from '@/lib/tripStore';
import { radius, space } from '@/theme/tokens';

type Gen = { state: 'run' | 'done' | 'fail'; quota?: boolean };

// หน้างานของ AiGo มีสองแบบ
// - มีสรุปทริปจากแชตจริง (pending): งาน "วางแผน" เรียก generate-itinerary จริง แต่ละวันขึ้นทันทีที่เสร็จ งานอื่นยังไม่เปิดในรุ่นทดลอง
// - ไม่มี: ตัวอย่างทริปโอซาก้า งานเดินด้วยตัวจับเวลา (shortcut: เปลี่ยนเป็นสถานะจริงจากงานเบื้องหลังบน backend (RA5))
export default function Work() {
  const { colors, t, pick, lang } = useSettings();
  const { trip, setTrip, pending, setPending, setPlanning } = useTrip();
  const toast = useToast();
  const [job] = useState<Pending | null>(pending);
  const [gen, setGen] = useState<Gen>({ state: 'run' });
  const [done, setDone] = useState(0);
  // วันที่ได้แล้ว: เก็บเป็นทริปทันทีที่มาถึง (หน้าแผนเปิดดูได้เลย) และใช้ทำต่อเมื่อกดลองใหม่
  const got = useRef<GenDay[]>([]);
  const [ready, setReady] = useState(0);

  const run = useCallback((j: Pending) => {
    setPlanning(true);
    return generateItinerary(j.request, j.messages, (i, d) => {
      got.current[i] = d;
      setTrip(toAppTrip({ days: got.current }, j.request, j.people));
      setReady(got.current.length);
    }, got.current)
      .then((g) => { setTrip(toAppTrip(g, j.request, j.people)); setGen({ state: 'done' }); })
      .catch((e: Error) => setGen({ state: 'fail', quota: / 429$/.test(e.message) }))
      .finally(() => setPlanning(false));
  }, [setTrip, setPlanning]);

  const started = useRef(false);
  useEffect(() => {
    if (!job || started.current) return;
    started.current = true;
    setPending(null);
    run(job);
  }, [job, run, setPending]);

  // ตัวอย่าง: เดินทีละงานทุก 1.4 วินาที
  useEffect(() => {
    if (job || done >= agentTasks.length) return;
    const id = setTimeout(() => setDone((n) => n + 1), 1400);
    return () => clearTimeout(id);
  }, [done, job]);

  if (job) {
    const days = dayCount(job.request.startDate, job.request.endDate);
    const ok = gen.state === 'done';
    const retry = () => { setGen({ state: 'run' }); run(job); };
    return (
      <Screen title={t('work.title')} subtitle={`${job.request.destination} · ${dateRange(job.request.startDate, job.request.endDate, lang)}`} onBack={() => router.back()}
        mascot={ok ? poses.happy : gen.state === 'fail' ? poses.rain : poses.think} follow
        footer={<AskBar placeholder={t('work.tell')} onSend={() => toast(t('toast.sent'))} />}>
        <FadeIn><AiSays>{ok
          ? pick({ th: `แผน ${days} วันเสร็จแล้ว ราคาและเวลาเปิดยังเป็นค่าประมาณ ฉันจะตรวจให้ก่อนเดินทาง`, en: `Your ${days}-day plan is ready. Prices and hours are estimates; I will check them before you go.` })
          : t('work.intro')}</AiSays></FadeIn>
        <FadeIn index={1}>
          <View accessibilityLiveRegion="polite">
            {agentTasks.map((task, i) => {
              const state = i === 0 ? (ok ? 'done' : gen.state === 'run' ? 'now' : 'wait') : 'wait';
              const word = i === 0
                ? (gen.state === 'fail' ? pick({ th: 'ไม่สำเร็จ', en: 'Failed' }) : stateWord(state))
                : pick({ th: 'ยังไม่เปิด', en: 'Not yet' });
              return (
                <TimelineItem key={task.id} state={state} last={i === agentTasks.length - 1}>
                  <View style={{ minHeight: 56, paddingTop: 16, gap: 2 }}>
                    <View style={{ flexDirection: 'row', gap: space.sm }}>
                      <T v={state === 'now' ? 'bodyBold' : 'body'} tone={state === 'wait' ? 'muted' : 'ink'} style={{ flex: 1 }}>
                        {i === 0 ? pick({ th: `วางแผน ${days} วัน`, en: `Plan ${days} days` }) : task.id === 'hotel' ? pick({ th: 'หาที่พักในงบ', en: 'Find a hotel within budget' }) : pick(task)}
                      </T>
                      <T v="smallBold" tone={gen.state === 'fail' && i === 0 ? 'warn' : state === 'done' ? 'success' : state === 'now' ? 'accent' : 'muted'} style={{ paddingTop: 2 }}>{word}</T>
                    </View>
                    {i === 0 && gen.state === 'run' && (
                      <View style={{ gap: space.sm }}>
                        <T v="small" tone="muted">{pick({ th: `เสร็จ ${ready} จาก ${days} วัน`, en: `${ready} of ${days} days done` })}</T>
                        <ProgressBar value={ready / days} color={colors.success} />
                      </View>
                    )}
                  </View>
                </TimelineItem>
              );
            })}
          </View>
        </FadeIn>
        {gen.state === 'fail' && (
          <FadeIn>
            <Card tone="danger" style={{ gap: space.md }}>
              <T v="subheading" tone="warn">{pick({ th: 'สร้างแผนไม่สำเร็จ', en: 'Could not make the plan' })}</T>
              <T>{gen.quota
                ? pick({ th: 'ทริปฟรีของสัปดาห์นี้ใช้ไปแล้ว เข้าสู่ระบบหรือซื้อทริปเพื่อวางแผนต่อ', en: 'This week\'s free trip is used. Sign in or buy a trip to plan more.' })
                : ready
                  ? pick({ th: `ได้แผน ${ready} จาก ${days} วันแล้ว กดลองใหม่เพื่อวางวันที่เหลือต่อ`, en: `${ready} of ${days} days are planned. Try again to plan the rest.` })
                  : pick({ th: 'ระบบ AI ไม่ตอบ ลองใหม่อีกครั้งได้ สรุปทริปยังอยู่ครบ', en: 'The AI did not answer. You can try again; your trip summary is kept.' })}</T>
              <View style={{ flexDirection: 'row', gap: space.sm }}>
                {gen.quota
                  ? <Button label={pick({ th: 'ดูแพ็กทริป', en: 'See trip packs' })} onPress={() => router.push('/paywall')} style={{ flex: 1 }} />
                  : <Button label={pick({ th: 'ลองใหม่', en: 'Try again' })} onPress={retry} style={{ flex: 1 }} />}
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
              <PhotoStrip items={places.map((p) => ({ key: p.id, source: p.photo, label: [p.time, pick(p.name)].filter(Boolean).join(' '), onPress: () => router.push('/itinerary') }))} />
            </Section>
          </FadeIn>
        ))}
        {ok && (
          <FadeIn>
            <Button label={pick({ th: 'เปิดแผนทั้งหมด', en: 'Open the full plan' })} icon="next" onPress={() => router.push('/itinerary')} />
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
