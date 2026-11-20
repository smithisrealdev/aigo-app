import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { ArtCard, Button, Card, CurveHero, FadeIn, IconButton, lift, Mascot, PhotoStrip, Row, Screen, Section, T, useToast } from '@/components/ui';
import { art, photos, poses } from '@/data/trip';
import { useSettings } from '@/lib/settings';
import { fonts, radius, space, type, wide } from '@/theme/tokens';

const POPULAR = [
  { th: 'ญี่ปุ่น 7 วัน', en: 'Japan, 7 days', photo: photos.tokyo },
  { th: 'โอซาก้า 5 วัน', en: 'Osaka, 5 days', photo: photos.dotonbori },
  { th: 'โซล 4 วัน', en: 'Seoul, 4 days', photo: photos.seoul },
  { th: 'ไทเป 4 วัน', en: 'Taipei, 4 days', photo: photos.taipei },
];
const ASKS = [{ th: 'งบ 30,000 บาท ไปไหนได้บ้าง', en: 'Where can I go on 30,000 baht?' }, { th: 'หาเที่ยวบินไปโซล เดือน ม.ค.', en: 'Find flights to Seoul in January' }];

export default function Home() {
  const { colors, t, pick, isDark } = useSettings();
  const insets = useSafeAreaInsets();
  const [wish, setWish] = useState('');
  const toast = useToast();
  const start = (text: string) => router.push({ pathname: '/chat', params: { prompt: text } });
  const hero = (
    <CurveHero color={colors.sticker.sky} height={0}>
      <View style={[wide, { paddingTop: insets.top + space.md, paddingHorizontal: space.lg, paddingBottom: 76, gap: space.md }]}>
        <Image source={isDark ? require('@/assets/brand/logo-white.svg') : require('@/assets/brand/logo-ink.svg')} style={{ width: 76, height: 33 }} contentFit="contain" contentPosition="left" accessibilityLabel="AiGo" />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          <View style={{ flex: 1, gap: space.sm }}>
            <T v="hero" accessibilityRole="header">{t('home.title')}</T>
            <T v="bodyBold" style={{ color: colors.mutedStrong }}>{t('home.sub')}</T>
          </View>
          <Mascot pose={poses.wave} size={132} />
        </View>
      </View>
    </CurveHero>
  );
  return (
    <Screen tabbed top={hero}>
      {/* ช่องบอกความต้องการลอยทับขอบโค้งของหัวจอ */}
      <FadeIn style={{ marginTop: -64 }}>
        <View style={[{ borderRadius: radius.xl, backgroundColor: colors.surface, padding: space.lg, gap: space.md }, lift(isDark, 1.2), isDark && { borderWidth: 1, borderColor: colors.line }]}>
          <T v="subheading" nativeID="wish-label">{t('home.label')}</T>
          <View style={{ borderRadius: radius.md, backgroundColor: colors.surfaceSoft, padding: space.md, paddingRight: space.xs, flexDirection: 'row', alignItems: 'flex-end', gap: space.xs }}>
            <TextInput accessibilityLabelledBy="wish-label" value={wish} onChangeText={setWish} multiline placeholder={t('home.placeholder')} placeholderTextColor={colors.muted}
              style={{ flex: 1, minHeight: 72, color: colors.ink, fontFamily: fonts.body, fontSize: type.md, lineHeight: type.md * 1.5, textAlignVertical: 'top' }} />
            {/* shortcut: ปุ่มไมค์บอกว่ายังใช้ไม่ได้, ต่อ speech-to-text เมื่อทำแชตจริง */}
            <IconButton icon="mic" variant="plain" label={t('home.mic')} onPress={() => toast(t('toast.mic'))} />
          </View>
          <Button label={t('home.go')} icon="next" big onPress={() => start(wish || pick(POPULAR[1]))} />
        </View>
      </FadeIn>

      <FadeIn index={1}>
        <Section title={pick({ th: 'AiGo กำลังทำงานให้คุณ', en: 'AiGo is working for you' })}>
          <ArtCard tone="sun" art={art.flight} onPress={() => router.push('/approvals')}
            title={pick({ th: 'รอคุณอนุมัติ 2 รายการ', en: '2 items waiting for you' })} body={pick({ th: 'โอซาก้า 5 วัน · เที่ยวบินและที่พัก', en: 'Osaka, 5 days · flight and hotel' })} />
          <ArtCard tone="mint" art={art.watch} onPress={() => router.push('/work')}
            title={pick({ th: 'เฝ้าราคา BKK ⇄ KIX', en: 'Watching BKK ⇄ KIX' })} body={pick({ th: '฿19,600 · ยังไม่ลด จะแจ้งถ้าลดเกิน ฿1,000', en: '฿19,600 · no drop yet. I will alert you past ฿1,000' })} />
        </Section>
      </FadeIn>

      <FadeIn index={2}>
        <Section title={t('home.popular')}>
          <PhotoStrip items={POPULAR.map((p) => ({ key: p.th, source: p.photo, label: pick(p), onPress: () => start(pick(p)) }))} />
        </Section>
      </FadeIn>

      <FadeIn index={3}>
        <Section title={t('home.other')}>
          <Card style={{ paddingVertical: space.xs }}>
            {ASKS.map((a, i) => (
              <Row key={a.th} onPress={() => start(pick(a))} label={pick(a)} last={i === ASKS.length - 1}>
                <View style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface }}><Icon name="spark" color={colors.primaryEdge} size={18} /></View>
                <T v="bodyBold" style={{ flex: 1 }}>{pick(a)}</T>
                <Icon name="next" color={colors.muted} />
              </Row>
            ))}
          </Card>
        </Section>
      </FadeIn>
    </Screen>
  );
}
