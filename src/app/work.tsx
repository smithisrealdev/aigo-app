import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { AiSays, AskBar, Button, FadeIn, PhotoStrip, PressScale, PriceTag, ProgressBar, Screen, Section, T, Ticket, TimelineItem, useToast } from '@/components/ui';
import { agentTasks, baht, offers, poses, trip } from '@/data/trip';
import { stateWord } from '@/lib/agent';
import { useSettings } from '@/lib/settings';
import { radius, space } from '@/theme/tokens';

// shortcut: งานเดินหน้าด้วยตัวจับเวลาเพื่อให้เห็นการทำงานของ AiGo, เปลี่ยนเป็นสถานะจริงจากงานเบื้องหลังบน backend (RA5)
export default function Work() {
  const { colors, t, pick } = useSettings();
  const [done, setDone] = useState(0);
  const toast = useToast();
  useEffect(() => {
    if (done >= agentTasks.length) return;
    const id = setTimeout(() => setDone((n) => n + 1), 1400);
    return () => clearTimeout(id);
  }, [done]);
  const flightFound = done > agentTasks.findIndex((x) => x.id === 'flight');
  const waiting = offers.filter((o) => flightFound && (o.id === 'flight' || done > agentTasks.findIndex((x) => x.id === 'hotel')));
  const finished = done >= agentTasks.length;
  return (
    <Screen title={t('work.title')} subtitle={`${pick(trip.title)} · ${pick(trip.dates)}`} onBack={() => router.back()} mascot={finished ? poses.happy : poses.think}
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
            <PhotoStrip items={trip.days[0].map((p) => ({ key: p.id, source: p.photo, label: `${p.time} ${pick(p.name)}`, onPress: () => router.push('/itinerary') }))} />
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
