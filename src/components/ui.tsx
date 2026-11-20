import { Image, type ImageSource } from 'expo-image';
import { createContext, useContext, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View, type StyleProp, type TextProps, type TextStyle, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/components/icon';
import { useSettings } from '@/lib/settings';
import { fonts, onPastel, onTint, radius, space, touch, type, vivid, wide } from '@/theme/tokens';

// ยืมโครงจาก src/components/ui.tsx ของ ChefJiw: ตัด Mascot แบบขยับได้กับหน้าทำอาหารออก เพิ่ม PriceTag, TaskRow, AskBar สำหรับ AiGo

// จริงเมื่ออยู่ในการ์ดสีอ่อนตอนธีมมืด: ตัวอักษรกับปุ่มแบบ pastel ต้องเปลี่ยนตามธีม
const OnThemed = createContext(false);

type TextVariant = 'hero' | 'price' | 'title' | 'heading' | 'subheading' | 'body' | 'bodyBold' | 'small' | 'smallBold';
const VARIANT: Record<TextVariant, TextStyle> = {
  hero: { fontFamily: fonts.heading, fontSize: type.hero, lineHeight: type.hero * 1.2 },
  price: { fontFamily: fonts.bodyBold, fontSize: type.xl, lineHeight: type.xl * 1.35, fontVariant: ['tabular-nums'] },
  title: { fontFamily: fonts.heading, fontSize: type.xxl, lineHeight: type.xxl * 1.3 },
  heading: { fontFamily: fonts.heading, fontSize: type.xl, lineHeight: type.xl * 1.35 },
  subheading: { fontFamily: fonts.heading, fontSize: type.lg, lineHeight: type.lg * 1.4 },
  body: { fontFamily: fonts.body, fontSize: type.md, lineHeight: type.md * 1.6 },
  bodyBold: { fontFamily: fonts.bodySemi, fontSize: type.md, lineHeight: type.md * 1.6 },
  small: { fontFamily: fonts.body, fontSize: type.sm, lineHeight: type.sm * 1.5 },
  smallBold: { fontFamily: fonts.bodySemi, fontSize: type.sm, lineHeight: type.sm * 1.5 },
};

type Tone = 'ink' | 'muted' | 'success' | 'warn' | 'pastel' | 'pastelMuted' | 'onPrimary' | 'onTint';
/** ข้อความทั้งแอป ขยายตามขนาดตัวอักษรของเครื่องอัตโนมัติ */
export function T({ v = 'body', tone = 'ink', style, children, ...rest }: { v?: TextVariant; tone?: Tone; style?: StyleProp<TextStyle>; children: ReactNode } & Omit<TextProps, 'style' | 'children'>) {
  const { colors } = useSettings();
  const themed = useContext(OnThemed);
  const color = { ink: colors.ink, muted: colors.muted, success: colors.success, warn: colors.warn, pastel: themed ? colors.ink : onPastel.ink, pastelMuted: themed ? colors.muted : onPastel.muted, onPrimary: colors.onPrimary, onTint: '#FFFFFF' }[tone];
  return <Text style={[VARIANT[v], { color }, style]} {...rest}>{children}</Text>;
}

export function Button({ label, onPress, kind = 'primary', icon, big, style }: { label: string; onPress: () => void; kind?: 'primary' | 'secondary' | 'accent' | 'onPastel' | 'onPastelLight'; icon?: IconName; big?: boolean; style?: StyleProp<ViewStyle> }) {
  const { colors } = useSettings();
  const themed = useContext(OnThemed);
  const bg = { primary: colors.primary, secondary: colors.surfaceSoft, accent: colors.accent, onPastel: themed ? colors.primary : onPastel.ink, onPastelLight: themed ? colors.surface : '#FFFFFF' }[kind];
  const fg = { primary: colors.onPrimary, secondary: colors.ink, accent: colors.onAccent, onPastel: themed ? colors.onPrimary : '#FFFFFF', onPastelLight: themed ? colors.ink : onPastel.ink }[kind];
  return (
    <Pressable accessibilityRole="button" onPress={onPress}
      style={({ pressed }) => [s.button, { backgroundColor: bg, minHeight: big ? touch.big : 48, transform: [{ scale: pressed ? 0.97 : 1 }] }, style]}>
      {icon && <Icon name={icon} color={fg} />}
      <Text style={{ fontFamily: fonts.heading, fontSize: big ? type.lg : type.md, color: fg }}>{label}</Text>
    </Pressable>
  );
}

export function IconButton({ icon, label, onPress, onPastelBg, filled }: { icon: IconName; label: string; onPress: () => void; onPastelBg?: boolean; filled?: boolean }) {
  const { colors, isDark } = useSettings();
  const bg = filled ? colors.primary : onPastelBg && !isDark ? '#FFFFFF' : colors.surface;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} hitSlop={4}
      style={({ pressed }) => [s.iconButton, { backgroundColor: bg, transform: [{ scale: pressed ? 0.94 : 1 }] }]}>
      <Icon name={icon} color={filled ? colors.onPrimary : onPastelBg && !isDark ? onPastel.ink : colors.ink} />
    </Pressable>
  );
}

export function Chip({ label, selected = false, onPress }: { label: string; selected?: boolean; onPress: () => void }) {
  const { colors } = useSettings();
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress}
      style={({ pressed }) => [s.chip, { backgroundColor: selected ? colors.primary : colors.surfaceSoft, transform: [{ scale: pressed ? 0.96 : 1 }] }]}>
      <Text style={{ fontFamily: fonts.bodySemi, fontSize: type.md, color: selected ? colors.onPrimary : colors.ink }}>{label}</Text>
    </Pressable>
  );
}

/** การ์ด: soft = พื้นรองตามธีม; note/ai/done/danger = สีอ่อนตามความหมาย; coral/navy = การ์ดเด่นสีสด จอละใบเดียว */
export function Card({ tone = 'soft', children, style, onPress, label }: { tone?: 'soft' | 'note' | 'ai' | 'done' | 'danger' | 'navy' | 'coral'; children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void; label?: string }) {
  const { colors, isDark } = useSettings();
  const bg = { soft: colors.surfaceSoft, note: colors.note, ai: colors.ai, done: colors.done, danger: colors.danger, navy: vivid.navy, coral: vivid.coral }[tone];
  const themed = isDark && tone !== 'navy' && tone !== 'coral';
  const body = onPress
    ? <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [s.card, { backgroundColor: bg, transform: [{ scale: pressed ? 0.98 : 1 }] }, style]}>{children}</Pressable>
    : <View style={[s.card, { backgroundColor: bg }, style]}>{children}</View>;
  return <OnThemed.Provider value={themed}>{body}</OnThemed.Provider>;
}

/** การ์ดคำพูดของ AiGo พร้อมตัวละครถ้าท่านั้นมีความหมาย */
export function AiSays({ children, pose }: { children: ReactNode; pose?: ImageSource }) {
  return (
    <Card tone="ai" style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
      {pose && <Image source={pose} style={{ width: 64, height: 64 }} contentFit="contain" accessible={false} />}
      <View style={{ flex: 1, gap: space.xs }}>
        <T v="smallBold" tone="pastelMuted">AiGo</T>
        <T tone="pastel">{children}</T>
      </View>
    </Card>
  );
}

/** ป้ายที่มาของราคา (R15b): ราคาจริงมีแหล่งและเวลา ราคาประมาณบอกว่าประมาณ ต่างกันทั้งคำและสี */
export function PriceTag({ source, at, logo }: { source?: string; at?: string; logo?: ImageSource }) {
  const { t } = useSettings();
  if (!source) return <T v="smallBold" tone="muted">{t('price.est')}</T>;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      {logo && <Image source={logo} style={{ width: 16, height: 16 }} contentFit="contain" accessible={false} />}
      <T v="smallBold" tone="success">{t('price.real', { src: source, at: at ?? '' })}</T>
    </View>
  );
}

/** แถวงานของ AiGo: สถานะมีทั้งไอคอนและคำ */
export function TaskRow({ label, state, word }: { label: string; state: 'done' | 'now' | 'wait'; word: string }) {
  const { colors } = useSettings();
  const color = state === 'done' ? colors.success : state === 'now' ? colors.ink : colors.muted;
  return (
    <View style={{ minHeight: touch.min, flexDirection: 'row', alignItems: 'center', gap: space.md }}>
      {state === 'done' ? <Icon name="check" color={color} /> : <View style={{ width: 20, height: 20, marginHorizontal: 2, borderRadius: 10, borderWidth: 2.2, borderColor: color, alignItems: 'center', justifyContent: 'center' }}>{state === 'now' && <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color }} />}</View>}
      <T v={state === 'now' ? 'bodyBold' : 'body'} tone={state === 'wait' ? 'muted' : 'ink'} style={{ flex: 1 }}>{label}</T>
      <T v="smallBold" style={{ color }}>{word}</T>
    </View>
  );
}

/** ช่อง "บอก AiGo" ท้ายจอ */
export function AskBar({ placeholder, onSend }: { placeholder: string; onSend: (text: string) => void }) {
  const { colors, t } = useSettings();
  const [text, setText] = useState('');
  const send = () => { if (text.trim()) { onSend(text.trim()); setText(''); } };
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
      <TextInput accessibilityLabel={placeholder} placeholder={placeholder} placeholderTextColor={colors.muted} value={text} onChangeText={setText} onSubmitEditing={send}
        style={{ flex: 1, minHeight: 48, borderRadius: radius.pill, paddingHorizontal: space.lg, backgroundColor: colors.surfaceSoft, color: colors.ink, fontFamily: fonts.body, fontSize: type.md }} />
      <IconButton icon="send" label={t('common.send')} filled onPress={send} />
    </View>
  );
}

/** หัวจอสีประจำหน้า ต่อด้วยแผ่นเนื้อหามุมบนโค้ง (ธีมมืดหัวจอเป็นสีพื้น) */
export function Screen({ tint, title, subtitle, onBack, right, children, footer, scroll = true }: { tint: string; title: string; subtitle?: string; onBack?: () => void; right?: ReactNode; children: ReactNode; footer?: ReactNode; scroll?: boolean }) {
  const { colors, isDark, t } = useSettings();
  const insets = useSafeAreaInsets();
  const fg = isDark ? undefined : { color: onTint(tint) };
  const content = { padding: space.lg, gap: space.md, paddingBottom: space.xxl };
  return (
    <View style={{ flex: 1, backgroundColor: tint }}>
      <View style={[s.header, wide, { paddingTop: insets.top + space.md }]}>
        {onBack && <IconButton icon="back" label={t('common.back')} onPress={onBack} onPastelBg />}
        <View style={{ flex: 1 }}>
          <T v="title" style={fg} accessibilityRole="header">{title}</T>
          {subtitle && <T v="smallBold" tone="muted" style={fg}>{subtitle}</T>}
        </View>
        {right}
      </View>
      <View style={[s.sheet, { backgroundColor: colors.bg }]}>
        {scroll ? <ScrollView contentContainerStyle={[content, wide]} keyboardShouldPersistTaps="handled">{children}</ScrollView> : <View style={[content, wide, { flex: 1 }]}>{children}</View>}
        {footer && <View style={[wide, { paddingHorizontal: space.lg, paddingTop: space.sm, paddingBottom: Math.max(insets.bottom, space.md), borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.bg }]}>{footer}</View>}
      </View>
    </View>
  );
}

export function Thumb({ source, size = 56, label }: { source: ImageSource; size?: number; label?: string }) {
  return <Image source={source} style={{ width: size, height: size, borderRadius: radius.sm }} contentFit="cover" accessibilityLabel={label} accessible={!!label} />;
}

const s = StyleSheet.create({
  button: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm, paddingHorizontal: space.xl, borderRadius: radius.pill },
  iconButton: { width: touch.min, height: touch.min, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  chip: { minHeight: touch.min, paddingHorizontal: space.lg, borderRadius: radius.pill, justifyContent: 'center' },
  card: { borderRadius: radius.lg, padding: space.lg, gap: space.xs },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.lg, paddingBottom: space.lg, gap: space.md },
  sheet: { flex: 1, borderTopLeftRadius: 32, borderTopRightRadius: 32, overflow: 'hidden' },
});
