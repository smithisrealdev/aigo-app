import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { Button, Card, IconButton, Row, T, useToast } from '@/components/ui';
import { photos, poses } from '@/data/trip';
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
  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.header.home }} contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
      <View style={[wide, { paddingTop: insets.top + space.md, paddingHorizontal: space.lg, paddingBottom: space.lg, gap: space.sm }]}>
        <Image source={require('@/assets/brand/logo-white.svg')} style={{ width: 84, height: 36 }} contentFit="contain" contentPosition="left" accessibilityLabel="AiGo" />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          <T v="hero" tone={isDark ? 'ink' : 'onTint'} style={{ flex: 1 }} accessibilityRole="header">{t('home.title')}</T>
          <View style={{ width: 72, height: 72, borderRadius: radius.pill, backgroundColor: colors.ai, overflow: 'hidden', alignItems: 'center', justifyContent: 'flex-end' }}>
            <Image source={poses.wave} style={{ width: 84, height: 84, marginBottom: -14 }} contentFit="contain" accessible={false} />
          </View>
        </View>
        <T v="bodyBold" tone={isDark ? 'muted' : 'onTint'}>{t('home.sub')}</T>
      </View>
      <View style={{ flex: 1, borderTopLeftRadius: 32, borderTopRightRadius: 32, backgroundColor: colors.bg }}>
        <View style={[wide, { padding: space.lg, gap: space.md }]}>
          <Card tone="ai" style={{ gap: space.md }}>
            <T v="smallBold" tone="pastelMuted" nativeID="wish-label">{t('home.label')}</T>
            <TextInput accessibilityLabelledBy="wish-label" value={wish} onChangeText={setWish} multiline placeholder={t('home.placeholder')} placeholderTextColor={colors.muted}
              style={{ minHeight: 72, borderRadius: radius.sm, padding: space.md, backgroundColor: colors.bg, color: colors.ink, fontFamily: fonts.body, fontSize: type.md, textAlignVertical: 'top' }} />
            <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'center' }}>
              {/* shortcut: ปุ่มไมค์บอกว่ายังใช้ไม่ได้, ต่อ speech-to-text เมื่อทำแชตจริง */}
              <IconButton icon="mic" label={t('home.mic')} onPress={() => toast(t('toast.mic'))} />
              <Button label={t('home.go')} icon="next" big onPress={() => start(wish || pick(POPULAR[1]))} style={{ flex: 1 }} />
            </View>
          </Card>
          <T v="smallBold" tone="muted">{t('home.popular')}</T>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }} style={{ marginHorizontal: -space.lg }}>
            <View style={{ width: space.sm }} />
            {POPULAR.map((p) => (
              <Pressable key={p.th} accessibilityRole="button" onPress={() => start(pick(p))} style={({ pressed }) => ({ width: 132, borderRadius: radius.sm, overflow: 'hidden', backgroundColor: colors.surfaceSoft, transform: [{ scale: pressed ? 0.97 : 1 }] })}>
                <Image source={p.photo} style={{ width: 132, height: 84 }} contentFit="cover" accessible={false} />
                <T v="bodyBold" style={{ padding: space.sm }}>{pick(p)}</T>
              </Pressable>
            ))}
            <View style={{ width: space.sm }} />
          </ScrollView>
          <T v="smallBold" tone="muted">{t('home.other')}</T>
          <View>{ASKS.map((a, i) => <Row key={a.th} onPress={() => start(pick(a))} label={pick(a)} last={i === ASKS.length - 1}><T v="bodyBold" style={{ flex: 1 }}>{pick(a)}</T><Icon name="next" color={colors.muted} /></Row>)}</View>
        </View>
      </View>
    </ScrollView>
  );
}
