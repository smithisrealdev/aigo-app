import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { AiSays, AskBar, Button, Card, FadeIn, PhotoStrip, Screen, T, TaskRow, useToast } from '@/components/ui';
import { agentTasks, offers, poses, trip } from '@/data/trip';
import { stateWord } from '@/lib/agent';
import { useSettings } from '@/lib/settings';
import { space } from '@/theme/tokens';

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
  return (
    <Screen tint={colors.header.work} title={t('work.title')} subtitle={`${pick(trip.title)} · ${pick(trip.dates)}`} onBack={() => router.back()} mascot={poses.think}
      footer={<AskBar placeholder={t('work.tell')} onSend={() => toast(t('toast.sent'))} />}>
      <AiSays>{t('work.intro')}</AiSays>
      <View accessibilityLiveRegion="polite">
          {agentTasks.map((task, i) => {
            const state = i < done ? 'done' : i === done ? 'now' : 'wait';
            return <TaskRow key={task.id} label={pick(task)} state={state} word={stateWord(state)} />;
          })}
      </View>
      {done > 0 && (
        <FadeIn style={{ gap: space.sm }}>
          <T v="smallBold" tone="muted">{pick({ th: 'แผนวันที่ 1 พร้อมแล้ว แตะเพื่อดู', en: 'Day 1 is ready. Tap to view' })}</T>
          <PhotoStrip items={trip.days[0].map((p) => ({ key: p.id, source: p.photo, label: `${p.time} ${pick(p.name)}`, onPress: () => router.push('/itinerary') }))} />
        </FadeIn>
      )}
      {waiting.length > 0 && (
        <FadeIn><Card tone="note" style={{ gap: space.sm }}>
          <T v="smallBold" tone="pastelMuted">{t('work.waiting', { n: waiting.length })}</T>
          <Button kind="onPastel" label={t('work.see')} onPress={() => router.push('/approvals')} />
        </Card></FadeIn>
      )}
    </Screen>
  );
}
