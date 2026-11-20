import { Image, type ImageSource } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, ActivityIndicator, Animated, Easing, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type StyleProp, type TextProps, type TextStyle, type ViewStyle } from 'react-native';
import { usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/components/icon';
import { useSettings } from '@/lib/settings';
import { fonts, onPastel, onTint, radius, space, touch, type, vivid, wide } from '@/theme/tokens';

// ยืมโครงจาก src/components/ui.tsx ของ ChefJiw: ตัดหน้าทำอาหารออก เพิ่ม PriceTag, TaskRow, AskBar สำหรับ AiGo

// จังหวะการขยับชุดเดียวทั้งแอป: ขยับเฉพาะ opacity กับ transform ไม่ขยับขนาดหรือตำแหน่งที่ทำให้ layout เลื่อน
export const motion = { fast: 150, base: 200, toast: 4000 } as const;
const native = Platform.OS !== 'web';

/** จริงเมื่อเครื่องตั้งค่าลดการเคลื่อนไหว: ทุกอย่างขึ้นทันทีโดยไม่ขยับ */
function useReducedMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduce).catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
    return () => sub.remove();
  }, []);
  return reduce;
}

/** ค่อยๆ ขึ้นมา (จางเข้า + เลื่อนขึ้น 8 จุด) ใช้กับของที่เพิ่งปรากฏเพราะผลของการกระทำ เช่น คำตอบของ AiGo การ์ดรออนุมัติ */
export function FadeIn({ children, delay = 0, style }: { children: ReactNode; delay?: number; style?: StyleProp<ViewStyle> }) {
  const reduce = useReducedMotion();
  const [v] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (reduce) { v.setValue(1); return; }
    const a = Animated.timing(v, { toValue: 1, duration: motion.base, delay, easing: Easing.out(Easing.cubic), useNativeDriver: native });
    a.start();
    return () => a.stop();
  }, [v, delay, reduce]);
  return <Animated.View style={[{ opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] }, style]}>{children}</Animated.View>;
}

/** แตะเบาๆ ตอนยืนยันสิ่งสำคัญ (อนุมัติ เลิกทำ) เว็บไม่มี haptics จึงข้าม */
export const tap = (kind: 'light' | 'success' = 'light') => {
  if (!native) return;
  (kind === 'success' ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success) : Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)).catch(() => {});
};

// ป้ายแจ้งผลชั่วคราวด้านล่างจอ: บอกสิ่งที่จอไม่ได้แสดงเอง หายเองใน 4 วินาที ไม่ขโมยโฟกัส มีได้ทีละ 3 อัน
type ToastItem = { id: number; text: string; path: string };
const ToastCtx = createContext<(text: string) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const next = useRef(0);
  const path = usePathname();
  const show = useCallback((text: string) => {
    const id = ++next.current;
    setItems((xs) => [...xs.slice(-2), { id, text, path }]);
    setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), motion.toast);
  }, [path]);
  const insets = useSafeAreaInsets();
  return (
    <ToastCtx.Provider value={show}>
      {children}
      <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: insets.bottom + 92, alignItems: 'center', gap: space.sm, paddingHorizontal: space.lg }}>
        {items.filter((x) => x.path === path).map((x) => /* เปลี่ยนจอแล้วซ่อนป้ายของจอเก่า */ <FadeIn key={x.id}><ToastView text={x.text} /></FadeIn>)}
      </View>
    </ToastCtx.Provider>
  );
}
function ToastView({ text }: { text: string }) {
  const { colors } = useSettings();
  return (
    <View accessibilityLiveRegion="polite" accessibilityRole="alert" style={{ maxWidth: 560, paddingHorizontal: space.lg, paddingVertical: space.md, borderRadius: radius.lg, backgroundColor: colors.primary }}>
      <Text style={{ fontFamily: fonts.bodySemi, fontSize: type.md, lineHeight: type.md * 1.5, color: colors.onPrimary }}>{text}</Text>
    </View>
  );
}

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

export function Button({ label, onPress, kind = 'primary', icon, big, style, busy, busyLabel, done, doneLabel }: { label: string; onPress: () => void; kind?: 'primary' | 'secondary' | 'accent' | 'onPastel' | 'onPastelLight'; icon?: IconName; big?: boolean; style?: StyleProp<ViewStyle>; busy?: boolean; busyLabel?: string; done?: boolean; doneLabel?: string }) {
  const { colors } = useSettings();
  const themed = useContext(OnThemed);
  const bg = { primary: colors.primary, secondary: colors.surfaceSoft, accent: colors.accent, onPastel: themed ? colors.primary : onPastel.ink, onPastelLight: themed ? colors.surface : '#FFFFFF' }[kind];
  const fg = { primary: colors.onPrimary, secondary: colors.ink, accent: colors.onAccent, onPastel: themed ? colors.onPrimary : '#FFFFFF', onPastelLight: themed ? colors.ink : onPastel.ink }[kind];
  // ระหว่างทำงานปุ่มยังสีเต็ม (ไม่จางเหมือนปิดใช้งาน) แสดงวงหมุนกับคำกริยา -ing และกันกดซ้ำ
  const text = busy ? busyLabel ?? label : done ? doneLabel ?? label : label;
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ busy: !!busy }} accessibilityLabel={text} onPress={busy ? undefined : onPress}
      style={({ pressed }) => [s.button, { backgroundColor: bg, minHeight: big ? touch.big : 48, transform: [{ scale: pressed && !busy ? 0.97 : 1 }] }, style]}>
      {busy ? <ActivityIndicator color={fg} /> : done ? <Icon name="check" color={fg} /> : icon && <Icon name={icon} color={fg} />}
      <Text style={{ flexShrink: 1, textAlign: 'center', fontFamily: fonts.heading, fontSize: big ? type.lg : type.md, color: fg }}>{text}</Text>
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

export function Chip({ label, selected = false, onPress, a11y }: { label: string; selected?: boolean; onPress: () => void; a11y?: string }) {
  const { colors } = useSettings();
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected }} accessibilityLabel={a11y} onPress={onPress}
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

/** ตัวละคร AiGo บนหัวจอ: ลอยขึ้นลงช้าๆ จอหนึ่งมีตัวที่ขยับได้ตัวเดียว (ลดการเคลื่อนไหวแล้วอยู่นิ่ง) */
export function Mascot({ pose, size = 64 }: { pose: ImageSource; size?: number }) {
  const reduce = useReducedMotion();
  const [v] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (reduce) { v.setValue(0); return; }
    const ease = Easing.inOut(Easing.sin);
    const a = Animated.loop(Animated.sequence([Animated.timing(v, { toValue: 1, duration: 1400, easing: ease, useNativeDriver: native }), Animated.timing(v, { toValue: 0, duration: 1400, easing: ease, useNativeDriver: native })]));
    a.start();
    return () => a.stop();
  }, [v, reduce]);
  return (
    <Animated.View style={{ transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -5] }) }, { rotate: v.interpolate({ inputRange: [0, 1], outputRange: ['-2deg', '2deg'] }) }] }}>
      <Image source={pose} style={{ width: size, height: size }} contentFit="contain" accessible={false} />
    </Animated.View>
  );
}

/** การ์ดคำพูดของ AiGo พร้อมตัวละครถ้าท่านั้นมีความหมาย */
export function AiSays({ children, pose }: { children: ReactNode; pose?: ImageSource }) {
  return (
    <Card tone="ai" style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
      {pose && <Image source={pose} style={{ width: 64, height: 64 }} contentFit="contain" accessible={false} />}
      <View style={{ flex: 1, gap: space.xs }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          {!pose && <View style={{ width: 28, height: 28, borderRadius: 14, overflow: 'hidden', alignItems: 'center', backgroundColor: '#FFFFFF' }}><Image source={require('@/assets/character/aigo-wave.svg')} style={{ width: 40, height: 40 }} contentFit="contain" accessible={false} /></View>}
          <T v="smallBold" tone="pastelMuted">AiGo</T>
        </View>
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
        style={{ flex: 1, minHeight: 48, borderRadius: radius.pill, paddingHorizontal: space.lg, backgroundColor: colors.surfaceSoft, color: colors.ink, fontFamily: fonts.body, fontSize: 16 }} />
      <IconButton icon="send" label={t('common.send')} filled onPress={send} />
    </View>
  );
}

/** หัวจอสีประจำหน้า ต่อด้วยแผ่นเนื้อหามุมบนโค้ง (ธีมมืดหัวจอเป็นสีพื้น) */
export function Screen({ tint, title, subtitle, onBack, right, mascot, children, footer, scroll = true }: { tint: string; title: string; subtitle?: string; onBack?: () => void; right?: ReactNode; mascot?: ImageSource; children: ReactNode; footer?: ReactNode; scroll?: boolean }) {
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
        {mascot && <Mascot pose={mascot} size={56} />}
        {right}
      </View>
      <View style={[s.sheet, { backgroundColor: colors.bg }]}>
        {scroll ? <ScrollView contentContainerStyle={[content, wide]} keyboardShouldPersistTaps="handled">{children}</ScrollView> : <View style={[content, wide, { flex: 1 }]}>{children}</View>}
        {footer && <View style={[wide, { paddingHorizontal: space.lg, paddingTop: space.sm, paddingBottom: Math.max(insets.bottom, space.md), borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.bg }]}>{footer}</View>}
      </View>
    </View>
  );
}

/** AiGo กำลังคิด: แสดงทันทีระหว่างรอคำตอบ จุดสามจุดจางเข้าออก (ลดการเคลื่อนไหวแล้วเหลือข้อความนิ่ง) */
export function Thinking({ label }: { label: string }) {
  const { colors } = useSettings();
  const reduce = useReducedMotion();
  const [v] = useState(() => new Animated.Value(0.3));
  useEffect(() => {
    if (reduce) return;
    const a = Animated.loop(Animated.sequence([Animated.timing(v, { toValue: 1, duration: 500, useNativeDriver: native }), Animated.timing(v, { toValue: 0.3, duration: 500, useNativeDriver: native })]));
    a.start();
    return () => a.stop();
  }, [v, reduce]);
  return (
    <Card tone="ai" style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
      <View accessible accessibilityRole="progressbar" accessibilityLabel={label} style={{ flexDirection: 'row', gap: 4 }}>
        {[0, 1, 2].map((i) => <Animated.View key={i} style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.muted, opacity: reduce ? 1 : v }} />)}
      </View>
      <T v="smallBold" tone="pastelMuted">{label}</T>
    </Card>
  );
}

/** แถวของรายการบนพื้นจอ คั่นด้วยเส้นบาง ไม่ใส่กล่องให้ทุกแถว (ระบบดีไซน์ ChefJiw รุ่นล่าสุด) */
export function Row({ children, onPress, label, last }: { children: ReactNode; onPress?: () => void; label?: string; last?: boolean }) {
  const { colors } = useSettings();
  const style = { minHeight: 52, flexDirection: 'row' as const, alignItems: 'center' as const, gap: space.md, paddingVertical: space.sm, borderBottomWidth: last ? 0 : 1, borderBottomColor: colors.line };
  if (!onPress) return <View style={style}>{children}</View>;
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [style, { opacity: pressed ? 0.7 : 1 }]}>{children}</Pressable>;
}

export function Thumb({ source, size = 56, label }: { source: ImageSource; size?: number; label?: string }) {
  return <Image source={source} style={{ width: size, height: size, borderRadius: radius.sm }} contentFit="cover" accessibilityLabel={label} accessible={!!label} />;
}

/** แถวรูปสถานที่เลื่อนแนวนอน: ให้เห็นว่าทริปพาไปไหน แตะรูปเพื่อดูสถานที่ */
export function PhotoStrip({ items }: { items: { key: string; source: ImageSource; label: string; onPress?: () => void }[] }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
      {items.map((x) => (
        <Pressable key={x.key} accessibilityRole={x.onPress ? 'button' : 'image'} accessibilityLabel={x.label} onPress={x.onPress} style={{ width: 132, gap: space.xs }}>
          <Image source={x.source} style={{ width: 132, height: 96, borderRadius: radius.sm }} contentFit="cover" accessible={false} />
          <T v="smallBold" numberOfLines={1}>{x.label}</T>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  button: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm, paddingHorizontal: space.xl, borderRadius: radius.pill },
  iconButton: { width: touch.min, height: touch.min, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  chip: { minHeight: touch.min, paddingHorizontal: space.lg, borderRadius: radius.pill, justifyContent: 'center' },
  card: { borderRadius: radius.lg, padding: space.lg, gap: space.xs },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.lg, paddingBottom: space.lg, gap: space.md },
  sheet: { flex: 1, borderTopLeftRadius: 32, borderTopRightRadius: 32, overflow: 'hidden' },
});
