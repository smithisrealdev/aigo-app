import { BlurView } from 'expo-blur';
import { Image, type ImageSource } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { usePathname } from 'expo-router';
import { createContext, useCallback, useContext, useEffect, useId, useRef, useState, type ComponentRef, type ReactNode } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type StyleProp, type TextProps, type TextStyle, type ViewStyle } from 'react-native';
import Animated, { Easing, FadeInUp, LinearTransition, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withSequence, withSpring, withTiming, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { Icon, type IconName } from '@/components/icon';
import { useSettings } from '@/lib/settings';
import { fonts, radius, space, touch, type, wide, type Palette } from '@/theme/tokens';

// ชุดคอมโพเนนต์ AiGo แนว Headspace: การ์ดพื้นอ่อนมุมมน ภาพประกอบล้นขอบการ์ด ไทม์ไลน์เส้นประ หัวจอโค้ง ตัว AiGo โผล่ขอบการ์ด
// ลูกเล่นเที่ยว: ตั๋วมีรอยเจาะ โพลารอยด์ติดเทป ตราประทับ
// การเคลื่อนไหวใช้ Reanimated (สปริง ค่อยๆ ขึ้นตามลำดับ) ขยับเฉพาะ transform กับ opacity และนิ่งเองเมื่อเครื่องตั้งค่าลดการเคลื่อนไหว

export const motion = { fast: 150, base: 220, toast: 4000 } as const;
const native = Platform.OS !== 'web';
const SPRING = { damping: 16, stiffness: 220, mass: 0.9 };
const PEEK = require('@/assets/character/aigo-peek.svg');
const APressable = Animated.createAnimatedComponent(Pressable);

/** เงานุ่มสำหรับของที่ลอย (การ์ดขาว แถบเมนู ช่องพิมพ์ โพลารอยด์) ธีมมืดไม่ใช้เงา */
export function lift(isDark: boolean, k = 1): ViewStyle {
  return isDark ? {} : { shadowColor: '#5A4636', shadowOpacity: 0.1 * k, shadowRadius: 18 * k, shadowOffset: { width: 0, height: 6 * k }, elevation: 3 * k };
}

/** แตะเบาๆ ตอนยืนยันสิ่งสำคัญ (อนุมัติ เลิกทำ) เว็บไม่มี haptics จึงข้าม */
export const tap = (kind: 'light' | 'success' = 'light') => {
  if (!native) return;
  (kind === 'success' ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success) : Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)).catch(() => {});
};

/** ค่อยๆ ลอยขึ้นมาทีละชิ้นตามลำดับ (index) แบบสปริง เมื่อรายการเปลี่ยน ที่เหลือเลื่อนเข้าที่แบบสปริง */
export function FadeIn({ children, index = 0, style }: { children: ReactNode; index?: number; style?: StyleProp<ViewStyle> }) {
  return <Animated.View entering={FadeInUp.delay(Math.min(index, 8) * 60).springify().damping(18).stiffness(170)} layout={LinearTransition.springify().damping(20)} style={style}>{children}</Animated.View>;
}

/** กดแล้วยุบเล็กน้อยแบบสปริง ปล่อยแล้วเด้งกลับ */
function usePress(to = 0.97) {
  const s = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return { style, onPressIn: () => { s.set(withSpring(to, SPRING)); }, onPressOut: () => { s.set(withSpring(1, SPRING)); } };
}

export function PressScale({ onPress, children, style, label, to = 0.97 }: { onPress?: () => void; children: ReactNode; style?: StyleProp<ViewStyle>; label?: string; to?: number }) {
  const p = usePress(to);
  return <APressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} onPressIn={p.onPressIn} onPressOut={p.onPressOut} style={[style, p.style]}>{children}</APressable>;
}

// ป้ายแจ้งผลชั่วคราว: บอกสิ่งที่จอไม่ได้แสดงเอง หายเองใน 4 วินาที ไม่ขโมยโฟกัส มีได้ทีละ 3 อัน เปลี่ยนจอแล้วป้ายของจอเก่าหาย
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
      <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: insets.bottom + 120, alignItems: 'center', gap: space.sm, paddingHorizontal: space.lg }}>
        {items.filter((x) => x.path === path).map((x) => <FadeIn key={x.id}><ToastView text={x.text} /></FadeIn>)}
      </View>
    </ToastCtx.Provider>
  );
}
function ToastView({ text }: { text: string }) {
  const { colors } = useSettings();
  return (
    <View accessibilityLiveRegion="polite" accessibilityRole="alert" style={{ maxWidth: 560, paddingHorizontal: space.lg, paddingVertical: space.md, borderRadius: radius.pill, backgroundColor: colors.ink }}>
      <Text style={{ fontFamily: fonts.bodySemi, fontSize: type.md, lineHeight: type.md * 1.5, color: colors.bg }}>{text}</Text>
    </View>
  );
}

type TextVariant = 'hero' | 'title' | 'heading' | 'subheading' | 'body' | 'bodyBold' | 'small' | 'smallBold' | 'price';
const VARIANT: Record<TextVariant, TextStyle> = {
  hero: { fontFamily: fonts.display, fontSize: type.hero, lineHeight: type.hero * 1.3 },
  title: { fontFamily: fonts.display, fontSize: type.xxl, lineHeight: type.xxl * 1.35 },
  heading: { fontFamily: fonts.display, fontSize: type.xl, lineHeight: type.xl * 1.4 },
  subheading: { fontFamily: fonts.bodyBold, fontSize: type.lg, lineHeight: type.lg * 1.4 },
  body: { fontFamily: fonts.body, fontSize: type.md, lineHeight: type.md * 1.6 },
  bodyBold: { fontFamily: fonts.bodySemi, fontSize: type.md, lineHeight: type.md * 1.6 },
  small: { fontFamily: fonts.body, fontSize: type.sm, lineHeight: type.sm * 1.5 },
  smallBold: { fontFamily: fonts.bodySemi, fontSize: type.sm, lineHeight: type.sm * 1.5 },
  price: { fontFamily: fonts.display, fontSize: type.xl, lineHeight: type.xl * 1.35, fontVariant: ['tabular-nums'] },
};
type Tone = 'ink' | 'muted' | 'success' | 'warn' | 'accent' | 'white' | 'onPrimary';

/** ข้อความทั้งแอป ขยายตามขนาดตัวอักษรของเครื่องอัตโนมัติ */
export function T({ v = 'body', tone = 'ink', style, children, ...rest }: { v?: TextVariant; tone?: Tone; style?: StyleProp<TextStyle>; children: ReactNode } & Omit<TextProps, 'style' | 'children'>) {
  const { colors } = useSettings();
  const color = { ink: colors.ink, muted: colors.muted, success: colors.success, warn: colors.warn, accent: colors.accentText, white: '#FFFFFF', onPrimary: colors.onPrimary }[tone];
  return <Text style={[VARIANT[v], { color }, style]} {...rest}>{children}</Text>;
}

/** ปุ่มแคปซูล กดแล้วยุบแบบสปริง ระหว่างทำงานยังสีเต็ม (ไม่จางเหมือนปิดใช้งาน) แสดงวงหมุนกับคำกริยา -ing และกันกดซ้ำ */
type ButtonKind = 'primary' | 'dark' | 'secondary' | 'white' | 'ghost';
export function Button({ label, onPress, kind = 'primary', icon, big, style, busy, busyLabel, done, doneLabel }: { label: string; onPress: () => void; kind?: ButtonKind; icon?: IconName; big?: boolean; style?: StyleProp<ViewStyle>; busy?: boolean; busyLabel?: string; done?: boolean; doneLabel?: string }) {
  const { colors } = useSettings();
  const p = usePress(0.96);
  const bg = { primary: colors.primary, dark: colors.ink, secondary: colors.surfaceSoft, white: '#FFFFFF', ghost: 'transparent' }[kind];
  const fg = { primary: colors.onPrimary, dark: colors.bg, secondary: colors.ink, white: '#2A2622', ghost: colors.ink }[kind];
  const text = busy ? busyLabel ?? label : done ? doneLabel ?? label : label;
  return (
    <APressable accessibilityRole="button" accessibilityState={{ busy: !!busy }} accessibilityLabel={text} onPress={busy ? undefined : onPress} onPressIn={p.onPressIn} onPressOut={p.onPressOut}
      style={[{ minHeight: big ? touch.big : 50, borderRadius: radius.pill, backgroundColor: bg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm, paddingHorizontal: space.xl }, style, p.style]}>
      {busy ? <ActivityIndicator color={fg} /> : done ? <Icon name="check" color={fg} /> : icon && <Icon name={icon} color={fg} size={20} />}
      <Text numberOfLines={1} style={{ flexShrink: 1, textAlign: 'center', fontFamily: fonts.bodyBold, fontSize: big ? type.lg : 16, color: fg }}>{text}</Text>
    </APressable>
  );
}

/** กระจกฝ้า: ใช้กับของที่ลอยเหนือเนื้อหาหรือรูป (แถบเมนู ช่องพิมพ์ ปุ่มบนรูป) มีเส้นขอบบางและพื้นทึบพอให้อ่านออกเสมอ */
export function Glass({ style, r = radius.lg, children }: { style?: StyleProp<ViewStyle>; r?: number; children?: ReactNode }) {
  const { colors, isDark } = useSettings();
  return (
    <View style={[{ borderRadius: r, overflow: 'hidden', borderWidth: 1, borderColor: colors.glassEdge, zIndex: 0 }, style]}>
      {/* zIndex -1: บนเว็บชั้นที่วางแบบ absolute จะทับลูกที่วางปกติ จึงต้องดันพื้นกระจกลงไปข้างหลังเอง */}
      <BlurView intensity={40} tint={isDark ? 'dark' : 'light'} style={[StyleSheet.absoluteFill, { zIndex: -1 }]} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.glass, zIndex: -1 }]} />
      {children}
    </View>
  );
}

type IconVariant = 'soft' | 'glass' | 'dark' | 'primary' | 'plain';
export function IconButton({ icon, label, onPress, variant = 'soft', size = 44 }: { icon: IconName; label: string; onPress: () => void; variant?: IconVariant; size?: number }) {
  const { colors, isDark } = useSettings();
  const p = usePress(0.9);
  const bg = { soft: colors.surface, glass: 'transparent', dark: colors.ink, primary: colors.primary, plain: 'transparent' }[variant];
  const fg = { soft: colors.ink, glass: colors.ink, dark: colors.bg, primary: colors.onPrimary, plain: colors.ink }[variant];
  return (
    <APressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} onPressIn={p.onPressIn} onPressOut={p.onPressOut} hitSlop={6}
      style={[{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: bg, zIndex: 0 }, variant === 'soft' && lift(isDark, 0.5), variant === 'soft' && isDark && { borderWidth: 1, borderColor: colors.line }, p.style]}>
      {variant === 'glass' && <Glass r={size / 2} style={[StyleSheet.absoluteFill, { zIndex: -1 }]} />}
      <Icon name={icon} color={fg} size={size > 40 ? 22 : 20} />
    </APressable>
  );
}

export function Chip({ label, selected = false, onPress, a11y }: { label: string; selected?: boolean; onPress: () => void; a11y?: string }) {
  const { colors } = useSettings();
  const p = usePress(0.94);
  return (
    <APressable accessibilityRole="button" accessibilityState={{ selected }} accessibilityLabel={a11y ?? label} onPress={onPress} onPressIn={p.onPressIn} onPressOut={p.onPressOut}
      style={[{ minHeight: touch.min, paddingHorizontal: space.lg, borderRadius: radius.pill, justifyContent: 'center', backgroundColor: selected ? colors.ink : colors.surfaceSoft }, p.style]}>
      <Text style={{ fontFamily: fonts.bodySemi, fontSize: type.md, color: selected ? colors.bg : colors.ink }}>{label}</Text>
    </APressable>
  );
}

/** การ์ดพื้นอ่อนแบบ Headspace: soft = พื้นอุ่นไม่มีขอบ, paper = ขาวมีเงานุ่ม, สีพาสเทลจาก colors.sticker */
export type CardTone = 'paper' | 'soft' | 'note' | 'done' | 'danger' | keyof Palette['sticker'];
function cardFill(colors: Palette, tone: CardTone) {
  const fills: Record<string, string> = { paper: colors.surface, soft: colors.surfaceSoft, note: colors.note, done: colors.done, danger: colors.danger, ...colors.sticker };
  return fills[tone];
}
export function Card({ tone = 'soft', children, style, onPress, label }: { tone?: CardTone; children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void; label?: string }) {
  const { colors, isDark } = useSettings();
  const box: StyleProp<ViewStyle> = [{ backgroundColor: cardFill(colors, tone), borderRadius: radius.lg, padding: space.lg, gap: space.sm }, tone === 'paper' && lift(isDark, 0.8), tone === 'paper' && isDark && { borderWidth: 1, borderColor: colors.line }];
  return onPress ? <PressScale onPress={onPress} label={label} style={[box, style]}>{children}</PressScale> : <View style={[box, style]}>{children}</View>;
}

/** การ์ดภาพประกอบแบบ Headspace: ข้อความซ้าย ภาพประกอบล้นขอบขวาล่างของการ์ด */
export function ArtCard({ title, body, art, onPress, tone = 'soft', children, label }: { title: string; body?: string; art: ImageSource; onPress?: () => void; tone?: CardTone; children?: ReactNode; label?: string }) {
  const { colors } = useSettings();
  const inner = (
    <View style={{ minHeight: 116, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: cardFill(colors, tone), padding: space.lg, paddingRight: 136, justifyContent: 'center', gap: 4 }}>
      <T v="subheading">{title}</T>
      {body && <T v="small" tone="muted">{body}</T>}
      {children}
      <Image source={art} style={{ position: 'absolute', right: -14, bottom: -14, width: 150, height: 120 }} contentFit="contain" accessible={false} />
    </View>
  );
  return onPress ? <PressScale onPress={onPress} label={label ?? title}>{inner}</PressScale> : inner;
}

/** ป้ายเล็กบนรูปหรือการ์ด (พื้นทึบ อ่านออกบนทุกรูป) */
export function Badge({ label, icon, tone = 'white' }: { label: string; icon?: IconName; tone?: 'white' | keyof Palette['sticker'] }) {
  const { colors } = useSettings();
  const bg = tone === 'white' ? '#FFFFFF' : colors.sticker[tone];
  const fg = tone === 'white' ? '#2A2622' : colors.ink;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingHorizontal: space.md, paddingVertical: 5, borderRadius: radius.pill, backgroundColor: bg }}>
      {icon && <Icon name={icon} color={fg} size={14} />}
      <Text style={{ fontFamily: fonts.bodyBold, fontSize: type.sm, color: fg }}>{label}</Text>
    </View>
  );
}

/** ตราประทับวงกลม ขอบประ เอียงเล็กน้อย ประทับลงมาแบบสปริงตอนปรากฏ */
export function Stamp({ label, color, rotate = -10, size = 72 }: { label: string; color: string; rotate?: number; size?: number }) {
  return (
    <Animated.View entering={ZoomIn.springify().damping(11)} accessible accessibilityLabel={label}
      style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 3, borderColor: color, alignItems: 'center', justifyContent: 'center', padding: 8, transform: [{ rotate: `${rotate}deg` }] }}>
      <View style={{ position: 'absolute', top: 4, left: 4, right: 4, bottom: 4, borderRadius: size, borderWidth: 1.5, borderColor: color, borderStyle: 'dashed' }} />
      <Text numberOfLines={2} style={{ fontFamily: fonts.display, fontSize: size * 0.17, lineHeight: size * 0.22, color, textAlign: 'center' }}>{label}</Text>
    </Animated.View>
  );
}

/** เทปกระดาษติดมุมรูป */
export function Tape({ color, style, rotate = -8 }: { color: string; style?: StyleProp<ViewStyle>; rotate?: number }) {
  return <View pointerEvents="none" style={[{ position: 'absolute', width: 58, height: 20, borderRadius: 3, backgroundColor: color, opacity: 0.9, transform: [{ rotate: `${rotate}deg` }] }, style]} />;
}

/** รูป ถ้าไม่มีรูป (ทริปที่ AiGo สร้างยังไม่มีภาพ) ใช้ช่องสีพาสเทลมีหมุด สีเลือกจากชื่อให้คงที่ */
export function PhotoBox({ source, seed = '', style }: { source?: ImageSource; seed?: string; style: StyleProp<ViewStyle> & { width: number; height: number } }) {
  const { colors } = useSettings();
  if (source) return <Image source={source} style={style as StyleProp<import('react-native').ImageStyle>} contentFit="cover" accessible={false} transition={200} />;
  const tones = Object.values(colors.sticker);
  const tone = tones[[...seed].reduce((n, c) => n + c.charCodeAt(0), 0) % tones.length];
  return <View style={[style, { backgroundColor: tone, alignItems: 'center', justifyContent: 'center' }]}><Icon name="pin" color={colors.ink} size={Math.min(style.width, style.height) * 0.36} /></View>;
}

/** รูปโพลารอยด์ กรอบขาว เอียงได้ ติดเทปได้ */
export function Polaroid({ source, caption, rotate = 0, width = 148, onPress, tape }: { source?: ImageSource; caption: string; rotate?: number; width?: number; onPress?: () => void; tape?: string }) {
  const { isDark } = useSettings();
  const inner = (
    <View style={[{ width, padding: 8, paddingBottom: 10, borderRadius: 8, backgroundColor: '#FFFFFF' }, lift(isDark, 0.7)]}>
      <PhotoBox source={source} seed={caption} style={{ width: width - 16, height: (width - 16) * 1.04, borderRadius: 4 }} />
      <Text numberOfLines={1} style={{ marginTop: 8, fontFamily: fonts.bodyBold, fontSize: 14, lineHeight: 20, color: '#2A2622', textAlign: 'center' }}>{caption}</Text>
    </View>
  );
  return (
    <View style={{ transform: [{ rotate: `${rotate}deg` }], paddingTop: tape ? 8 : 0 }}>
      {onPress ? <PressScale onPress={onPress} label={caption}>{inner}</PressScale> : inner}
      {tape && <Tape color={tape} style={{ top: 0, left: width / 2 - 29 }} rotate={rotate > 0 ? 6 : -6} />}
    </View>
  );
}

/** แถวโพลารอยด์เลื่อนแนวนอน เอียงสลับซ้ายขวา */
export function PhotoStrip({ items }: { items: { key: string; source?: ImageSource; label: string; onPress?: () => void }[] }) {
  const { colors } = useSettings();
  const tapes = ['#FFD966', '#9CD3FF', '#FFB3C4', '#9EE6C6'];
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -space.lg }} contentContainerStyle={{ gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.md }}>
      {items.map((x, i) => <Polaroid key={x.key} source={x.source} caption={x.label} onPress={x.onPress} rotate={i % 2 ? 2.5 : -2.5} tape={tapes[i % tapes.length] ?? colors.sticker.sun} />)}
    </ScrollView>
  );
}

/** ไล่สีดำโปร่งบนรูป ให้ตัวหนังสือขาวอ่านออก (id ไม่ซ้ำกันเพราะบนเว็บ SVG หลายอันอยู่หน้าเดียวกัน) */
function Scrim({ from = 0.2, to = 0.8, top }: { from?: number; to?: number; top?: boolean }) {
  const id = 'g' + useId().replace(/[^a-zA-Z0-9]/g, '');
  return (
    <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" viewBox="0 0 1 1" preserveAspectRatio="none" pointerEvents="none">
      <Defs><LinearGradient id={id} x1="0" y1={top ? '1' : '0'} x2="0" y2={top ? '0' : '1'}><Stop offset={from} stopColor="#000" stopOpacity="0" /><Stop offset="1" stopColor="#000" stopOpacity={to} /></LinearGradient></Defs>
      <Rect width="1" height="1" fill={`url(#${id})`} />
    </Svg>
  );
}

/** การ์ดรูปใหญ่ มุมมนมาก ตัวหนังสือขาววางบนรูป ป้ายมุมซ้ายบน */
export function PhotoCard({ source, height = 220, title, subtitle, badge, onPress, label, children, style }: { source?: ImageSource; height?: number; title?: string; subtitle?: string; badge?: ReactNode; onPress?: () => void; label?: string; children?: ReactNode; style?: StyleProp<ViewStyle> }) {
  const body = (
    <View style={[{ height, borderRadius: radius.xl, overflow: 'hidden', backgroundColor: source ? '#C9C2B8' : '#2F6BFF' }, style]}>
      {source && <Image source={source} style={StyleSheet.absoluteFill} contentFit="cover" accessible={false} transition={250} />}
      <Scrim />
      {badge && <View style={{ position: 'absolute', top: space.md, left: space.md }}>{badge}</View>}
      <View style={{ position: 'absolute', left: space.lg, right: space.lg, bottom: space.lg, gap: 2 }}>
        {title && <Text style={{ fontFamily: fonts.display, fontSize: 24, lineHeight: 32, color: '#FFFFFF' }}>{title}</Text>}
        {subtitle && <Text style={{ fontFamily: fonts.bodySemi, fontSize: type.sm, lineHeight: 20, color: 'rgba(255,255,255,0.92)' }}>{subtitle}</Text>}
        {children}
      </View>
    </View>
  );
  return onPress ? <PressScale onPress={onPress} label={label ?? title}>{body}</PressScale> : body;
}

/** ตัว AiGo ลอยขึ้นลงช้าๆ (ลดการเคลื่อนไหวแล้วอยู่นิ่ง) */
export function Mascot({ pose, size = 72, bob = true }: { pose: ImageSource; size?: number; bob?: boolean }) {
  const reduce = useReducedMotion();
  const v = useSharedValue(0);
  useEffect(() => {
    if (reduce || !bob) return;
    v.set(withRepeat(withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.sin) }), -1, true));
  }, [reduce, bob, v]);
  const st = useAnimatedStyle(() => ({ transform: [{ translateY: -6 * v.value }, { rotate: `${-3 + 6 * v.value}deg` }] }));
  return <Animated.View style={st}><Image source={pose} style={{ width: size, height: size }} contentFit="contain" accessible={false} /></Animated.View>;
}

/** AiGo โผล่หัวเกาะขอบบนของการ์ด วางไว้ในการ์ดที่ไม่ตัดขอบ (overflow visible) และเว้นที่ด้านบนให้ด้วย */
export function Peek({ size = 104, right = space.xl }: { size?: number; right?: number }) {
  const h = (size * 136) / 240;
  return (
    <Animated.View entering={FadeInUp.delay(250).springify().damping(12)} pointerEvents="none" style={{ position: 'absolute', top: -h * 0.94, right }}>
      <Image source={PEEK} style={{ width: size, height: h }} contentFit="contain" accessible={false} />
    </Animated.View>
  );
}

/** คำพูดของ AiGo: รูปหน้าโมจิในวงกลมฟ้า กับฟองคำพูดขาว */
export function AiSays({ children }: { children: ReactNode }) {
  const { colors, isDark } = useSettings();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: space.sm }}>
      <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: '#2F6BFF', overflow: 'hidden', alignItems: 'center', justifyContent: 'flex-end' }}>
        <Image source={PEEK} style={{ width: 58, height: 33, marginBottom: -2 }} contentFit="contain" accessible={false} />
      </View>
      <View style={[{ flex: 1, paddingVertical: space.md, paddingHorizontal: space.lg, borderRadius: radius.lg, borderBottomLeftRadius: 6, backgroundColor: colors.surface }, lift(isDark, 0.6), isDark && { borderWidth: 1, borderColor: colors.line }]}>
        <T v="smallBold" tone="accent">AiGo</T>
        <T>{children}</T>
      </View>
    </View>
  );
}

/** หัวข้อส่วนตัวหนา พร้อมลิงก์ด้านขวา */
export function Section({ title, action, onAction, children, style }: { title: string; action?: string; onAction?: () => void; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ gap: space.md }, style]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
        <T v="heading" style={{ flex: 1 }} accessibilityRole="header">{title}</T>
        {action && <Pressable accessibilityRole="button" onPress={onAction} hitSlop={10}><T v="smallBold" tone="accent">{action}</T></Pressable>}
      </View>
      {children}
    </View>
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

/** วงสถานะแบบ Headspace: เสร็จ = วงเขียวติ๊ก (เด้งขึ้น), กำลังทำ = จุดส้ม, รอ = วงว่าง */
export function StatusDot({ state }: { state: 'done' | 'now' | 'wait' }) {
  const { colors } = useSettings();
  if (state === 'done') return <Animated.View entering={ZoomIn.springify().damping(10)} style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: colors.success, alignItems: 'center', justifyContent: 'center' }}><Icon name="check" color={colors.bg} size={15} /></Animated.View>;
  if (state === 'now') return <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}><View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#FFFFFF' }} /></View>;
  return <View style={{ width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: colors.line, backgroundColor: colors.bg }} />;
}

/** ช่องหนึ่งของไทม์ไลน์: วงสถานะทางซ้าย เส้นประเชื่อมลงไปช่องถัดไป เนื้อหาทางขวา */
export function TimelineItem({ state = 'wait', last, children }: { state?: 'done' | 'now' | 'wait'; last?: boolean; children: ReactNode }) {
  const { colors } = useSettings();
  return (
    <View style={{ flexDirection: 'row', gap: space.md }}>
      <View style={{ width: 26, alignItems: 'center' }}>
        <View style={{ paddingTop: 18 }}><StatusDot state={state} /></View>
        {!last && <View style={{ flex: 1, marginTop: 4, borderLeftWidth: 2, borderStyle: 'dashed', borderColor: colors.line }} />}
      </View>
      <View style={{ flex: 1, paddingBottom: last ? 0 : space.md }}>{children}</View>
    </View>
  );
}

/** แถบความคืบหน้า ขยับด้วย scaleX (ไม่เปลี่ยนความกว้างจริง จึงไม่ทำให้ layout ขยับ) */
export function ProgressBar({ value, color, track }: { value: number; color?: string; track?: string }) {
  const { colors } = useSettings();
  const w = useSharedValue(value);
  useEffect(() => { w.set(withTiming(value, { duration: 600, easing: Easing.out(Easing.cubic) })); }, [value, w]);
  const st = useAnimatedStyle(() => ({ transform: [{ scaleX: Math.max(0.02, w.value) }] }));
  return (
    <View accessible accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(value * 100) }} style={{ height: 12, borderRadius: 6, backgroundColor: track ?? colors.surfaceSoft, overflow: 'hidden' }}>
      <Animated.View style={[{ flex: 1, borderRadius: 6, backgroundColor: color ?? colors.primary, transformOrigin: 'left' }, st]} />
    </View>
  );
}

/** ช่องพิมพ์ "บอก AiGo" ลอยเป็นแคปซูลกระจก ปุ่มส่งสีส้ม */
export function AskBar({ placeholder, onSend }: { placeholder: string; onSend: (text: string) => void }) {
  const { colors, isDark, t } = useSettings();
  const [text, setText] = useState('');
  const send = () => { if (text.trim()) { onSend(text.trim()); setText(''); } };
  return (
    <View style={[{ borderRadius: radius.pill }, lift(isDark, 1)]}>
      <Glass r={radius.pill} style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: 6, paddingLeft: space.lg }}>
        <TextInput accessibilityLabel={placeholder} placeholder={placeholder} placeholderTextColor={colors.muted} value={text} onChangeText={setText} onSubmitEditing={send}
          style={{ flex: 1, minHeight: 44, color: colors.ink, fontFamily: fonts.body, fontSize: 16 }} />
        <IconButton icon="send" label={t('common.send')} variant="primary" onPress={send} size={44} />
      </Glass>
    </View>
  );
}

/** ไล่จากโปร่งเป็นสีพื้น ใต้ช่องลอยด้านล่าง ให้เนื้อหาจางหายใต้ปุ่มแทนที่จะถูกตัดตรงๆ */
function BottomFade({ color }: { color: string }) {
  const id = 'f' + useId().replace(/[^a-zA-Z0-9]/g, '');
  return (
    <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" viewBox="0 0 1 1" preserveAspectRatio="none" pointerEvents="none">
      <Defs><LinearGradient id={id} x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor={color} stopOpacity="0" /><Stop offset="0.45" stopColor={color} stopOpacity="1" /></LinearGradient></Defs>
      <Rect width="1" height="1" fill={`url(#${id})`} />
    </Svg>
  );
}

/** ขอบล่างโค้งแบบ Headspace: วางทับด้านล่างของบล็อกสี ให้พื้นจอโค้งขึ้นมา */
function Curve({ color }: { color: string }) {
  return (
    <Svg width="100%" height={36} viewBox="0 0 100 36" preserveAspectRatio="none" style={{ position: 'absolute', left: 0, right: 0, bottom: -1 }} pointerEvents="none">
      <Path d="M0 36 L0 18 Q50 -14 100 18 L100 36 Z" fill={color} />
    </Svg>
  );
}

/** บล็อกสีหัวจอพร้อมภาพประกอบหรือตัว AiGo ขอบล่างโค้ง (Headspace) */
export function CurveHero({ color, children, height = 260 }: { color: string; children: ReactNode; height?: number }) {
  const { colors } = useSettings();
  return (
    <View style={{ minHeight: height, backgroundColor: color, overflow: 'hidden' }}>
      {children}
      <Curve color={colors.bg} />
    </View>
  );
}

/**
 * โครงจอ: แถบบน (ปุ่มกลับ ปุ่มขวา) หัวข้อตัวใหญ่ AiGo ลอยข้างหัวข้อได้
 * hero = รูปเต็มความกว้างด้านบน เนื้อหาเป็นแผ่นมุมโค้งซ้อนขึ้นมาบนรูป ปุ่มบนรูปเป็นกระจก
 * top = บล็อกสีโค้ง (CurveHero) แทนรูป
 * footer ลอยเหนือเนื้อหา tabbed = จอที่มีแถบเมนูลอยด้านล่าง
 */
export function Screen({ title, subtitle, onBack, left, right, footer, hero, heroHeight = 300, heroContent, top, mascot, children, scroll = true, tabbed = false, follow = false }: {
  title?: string; subtitle?: string; onBack?: () => void; left?: ReactNode; right?: ReactNode; footer?: ReactNode; hero?: ImageSource; heroHeight?: number; heroContent?: ReactNode; top?: ReactNode;
  mascot?: ImageSource; children: ReactNode; scroll?: boolean; tabbed?: boolean;
  /** แบบแชต: เนื้อหาใหม่มาแล้วเลื่อนลงล่างสุดให้เอง เฉพาะตอนที่ผู้ใช้อยู่ใกล้ล่างสุดอยู่แล้ว (เลื่อนขึ้นไปอ่านอยู่จะไม่ดึงลง) */
  follow?: boolean;
}) {
  const sv = useRef<ComponentRef<typeof ScrollView>>(null);
  const atEnd = useRef(true);
  const { colors, t } = useSettings();
  const insets = useSafeAreaInsets();
  const tabSpace = tabbed ? 88 : 0;
  const bottom = space.xxl + (footer ? 92 : 0) + tabSpace + insets.bottom;
  const overlay = !!hero || !!top;
  const bar = (onBack || left || right) ? (
    <View style={[wide, { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.lg, paddingTop: insets.top + space.sm, paddingBottom: space.sm }]}>
      {onBack ? <IconButton icon="back" label={t('common.back')} onPress={onBack} variant={overlay ? 'glass' : 'soft'} /> : left}
      <View style={{ flex: 1 }} />
      {right}
    </View>
  ) : <View style={{ height: insets.top + space.md }} />;
  const head = title ? (
    <FadeIn style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
      <View style={{ flex: 1, gap: 2 }}>
        <T v="title" accessibilityRole="header">{title}</T>
        {subtitle && <T v="bodyBold" tone="muted">{subtitle}</T>}
      </View>
      {mascot && <Mascot pose={mascot} size={84} />}
    </FadeIn>
  ) : null;
  const content = <View style={[wide, { paddingHorizontal: space.lg, gap: space.xl, paddingBottom: bottom, paddingTop: hero ? space.xl : space.xs }]}>{head}{children}</View>;
  const body = hero ? (
    <>
      <View style={{ height: heroHeight }}>
        <Image source={hero} style={StyleSheet.absoluteFill} contentFit="cover" accessible={false} transition={250} />
        <Scrim top from={0.6} to={0.35} />
        {heroContent && <><Scrim from={0.15} to={0.8} /><View style={[wide, { position: 'absolute', left: 0, right: 0, bottom: radius.xl + space.lg, paddingHorizontal: space.lg }]}>{heroContent}</View></>}
      </View>
      <View style={{ marginTop: -radius.xl, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, backgroundColor: colors.bg }}>{content}</View>
    </>
  ) : top ? <>{top}{content}</> : content;
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {!overlay && bar}
      {scroll ? (
        <ScrollView ref={sv} style={{ flex: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}
          scrollEventThrottle={follow ? 100 : undefined}
          onScroll={follow ? (e) => { const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent; atEnd.current = contentSize.height - contentOffset.y - layoutMeasurement.height < 160; } : undefined}
          onContentSizeChange={follow ? () => { if (atEnd.current) sv.current?.scrollToEnd({ animated: true }); } : undefined}>
          {body}
        </ScrollView>
      ) : <View style={{ flex: 1 }}>{body}</View>}
      {overlay && <View style={{ position: 'absolute', top: 0, left: 0, right: 0 }} pointerEvents="box-none">{bar}</View>}
      {footer && (
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: space.xl }} pointerEvents="box-none">
          <BottomFade color={colors.bg} />
          <View style={[wide, { paddingHorizontal: space.lg, paddingBottom: Math.max(insets.bottom, space.md) + tabSpace }]}>{footer}</View>
        </View>
      )}
    </View>
  );
}

/** AiGo กำลังคิด: จุดสามจุดเด้งตามกัน (ลดการเคลื่อนไหวแล้วเหลือจุดนิ่ง) */
export function Thinking({ label }: { label: string }) {
  const { colors } = useSettings();
  return (
    <View accessible accessibilityRole="progressbar" accessibilityLabel={label} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingLeft: 50 }}>
      <View style={{ flexDirection: 'row', gap: 5, paddingHorizontal: space.md, paddingVertical: space.md, borderRadius: radius.pill, backgroundColor: colors.surface }}>
        {[0, 1, 2].map((i) => <Dot key={i} i={i} color={colors.primary} />)}
      </View>
      <T v="smallBold" tone="muted">{label}</T>
    </View>
  );
}
function Dot({ i, color }: { i: number; color: string }) {
  const reduce = useReducedMotion();
  const v = useSharedValue(0);
  useEffect(() => {
    if (reduce) return;
    v.set(withDelay(i * 140, withRepeat(withSequence(withTiming(1, { duration: 280 }), withTiming(0, { duration: 280 }), withTiming(0, { duration: 260 })), -1)));
  }, [i, reduce, v]);
  const st = useAnimatedStyle(() => ({ transform: [{ translateY: -5 * v.value }] }));
  return <Animated.View style={[{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }, st]} />;
}

/** แถวของรายการในการ์ด คั่นด้วยเส้นบาง */
export function Row({ children, onPress, label, last }: { children: ReactNode; onPress?: () => void; label?: string; last?: boolean }) {
  const { colors } = useSettings();
  const style: ViewStyle = { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm, borderBottomWidth: last ? 0 : 1, borderBottomColor: colors.line };
  if (!onPress) return <View style={style}>{children}</View>;
  return <PressScale onPress={onPress} label={label} to={0.98} style={style}>{children}</PressScale>;
}

export function Thumb({ source, size = 56, label }: { source: ImageSource; size?: number; label?: string }) {
  return <Image source={source} style={{ width: size, height: size, borderRadius: radius.sm }} contentFit="cover" accessibilityLabel={label} accessible={!!label} />;
}

/** เส้นทางบินแบบบัตรขึ้นเครื่อง: เวลาตัวใหญ่ คั่นด้วยเส้นประกับรูปเครื่องบิน ถ้าเวลาเปลี่ยนแสดงเวลาเดิมขีดฆ่า */
export function FlightLeg({ from, fromTime, to, toTime, was, label }: { from: string; fromTime: string; to: string; toTime: string; was?: string; label?: string }) {
  const { colors } = useSettings();
  const time = { fontFamily: fonts.display, fontSize: type.xxl, lineHeight: type.xxl * 1.25, color: colors.ink, fontVariant: ['tabular-nums'] as const };
  return (
    <View accessible accessibilityLabel={`${from} ${fromTime} → ${to} ${toTime}${was ? ` (${was})` : ''}`} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
      <View>
        <Text style={time}>{fromTime}</Text>
        <View style={{ flexDirection: 'row', gap: space.xs }}>
          <T v="smallBold" tone="muted">{from}</T>
          {was && <T v="small" tone="muted" style={{ textDecorationLine: 'line-through' }}>{was}</T>}
        </View>
      </View>
      <View style={{ flex: 1, alignItems: 'center', gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch', gap: space.xs }}>
          <View style={{ flex: 1, borderTopWidth: 2, borderStyle: 'dashed', borderColor: colors.line }} />
          <Icon name="plane" color={colors.accentText} size={20} />
          <View style={{ flex: 1, borderTopWidth: 2, borderStyle: 'dashed', borderColor: colors.line }} />
        </View>
        {label && <T v="small" tone="muted">{label}</T>}
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={time}>{toTime}</Text>
        <T v="smallBold" tone="muted">{to}</T>
      </View>
    </View>
  );
}

/** ตั๋ว: การ์ดสองส่วนคั่นด้วยเส้นประ มีรอยเจาะครึ่งวงกลมที่ขอบทั้งสองข้าง (สีเดียวกับพื้นจอ) ใช้กับรายการที่ต้องจ่ายเงิน */
export function Ticket({ top, bottom, tone = 'paper' }: { top: ReactNode; bottom: ReactNode; tone?: CardTone }) {
  const { colors, isDark } = useSettings();
  const notch: ViewStyle = { position: 'absolute', width: 26, height: 26, borderRadius: 13, backgroundColor: colors.bg, top: -13 };
  return (
    <View style={[{ borderRadius: radius.lg, backgroundColor: cardFill(colors, tone) }, tone === 'paper' && lift(isDark, 0.8), isDark && { borderWidth: 1, borderColor: colors.line }]}>
      <View style={{ padding: space.lg, gap: space.sm }}>{top}</View>
      <View>
        <View style={{ marginHorizontal: space.lg + 6, borderTopWidth: 2, borderStyle: 'dashed', borderColor: colors.line }} />
        <View style={[notch, { left: -13 }]} />
        <View style={[notch, { right: -13 }]} />
      </View>
      <View style={{ padding: space.lg, gap: space.sm }}>{bottom}</View>
    </View>
  );
}

/** ปุ่มสลับแบบแคปซูล แถบสีเข้มเลื่อนตามตัวเลือกแบบสปริง (แบบ Plan/Track ของ Polarsteps) */
export function Segmented({ options, value, onChange }: { options: string[]; value: number; onChange: (i: number) => void }) {
  const { colors } = useSettings();
  const [w, setW] = useState(0);
  const x = useSharedValue(0);
  const first = useRef(true);
  useEffect(() => {
    if (!w) return;
    x.set(first.current ? value * w : withSpring(value * w, SPRING));
    first.current = false;
  }, [value, w, x]);
  const pill = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  return (
    <View accessibilityRole="tablist" onLayout={(e) => setW((e.nativeEvent.layout.width - 8) / options.length)} style={{ flexDirection: 'row', padding: 4, borderRadius: radius.pill, backgroundColor: colors.surfaceSoft }}>
      {w > 0 && <Animated.View style={[{ position: 'absolute', top: 4, bottom: 4, left: 4, width: w, borderRadius: radius.pill, backgroundColor: colors.ink }, pill]} />}
      {options.map((o, i) => (
        <Pressable key={o} accessibilityRole="tab" accessibilityState={{ selected: i === value }} onPress={() => { if (i !== value) { tap(); onChange(i); } }}
          style={{ flex: 1, minHeight: touch.min, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontFamily: fonts.bodyBold, fontSize: type.md, color: i === value ? colors.bg : colors.ink }}>{o}</Text>
        </Pressable>
      ))}
    </View>
  );
}

/** การ์ดจุดแวะแบบ Polarsteps: รูปมีเลขตรงกับหมุดบนแผนที่ ชื่อ รายละเอียด สถานะ และเวลาตัวใหญ่ทางขวา */
export function StopCard({ n, photo, name, time, meta, status, statusTone = 'success', onPress, label }: {
  n: number; photo?: ImageSource; name: string; time?: string; meta?: string; status?: string; statusTone?: Tone; onPress?: () => void; label?: string;
}) {
  const { colors, isDark } = useSettings();
  const inner = (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.sm, paddingRight: space.lg, borderRadius: radius.lg, backgroundColor: colors.surface }, lift(isDark, 0.8), isDark && { borderWidth: 1, borderColor: colors.line }]}>
      <View>
        <PhotoBox source={photo} seed={name} style={{ width: 64, height: 64, borderRadius: radius.sm }} />
        <View style={{ position: 'absolute', left: -4, bottom: -4, width: 26, height: 26, borderRadius: 13, backgroundColor: colors.ink, borderWidth: 2, borderColor: colors.surface, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontFamily: fonts.bodyBold, fontSize: 13, color: colors.bg }}>{n}</Text>
        </View>
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
          <T v="subheading" numberOfLines={1} style={{ flexShrink: 1 }}>{name}</T>
          {onPress && <Icon name="next" color={colors.muted} size={16} />}
        </View>
        {meta && <T v="small" tone="muted">{meta}</T>}
        {status && <T v="smallBold" tone={statusTone}>{status}</T>}
      </View>
      {time && <Text style={{ fontFamily: fonts.display, fontSize: type.xl, color: colors.ink, fontVariant: ['tabular-nums'] }}>{time}</Text>}
    </View>
  );
  return onPress ? <PressScale onPress={onPress} label={label ?? name} to={0.98}>{inner}</PressScale> : inner;
}

export type Leg = { mode: 'train' | 'walk' | 'car'; text: string };
export type RouteStop = { key: string; photo?: ImageSource; name: string; time?: string; meta?: string; status?: string; statusTone?: Tone; onPress?: () => void };

/**
 * แผนรายวันแบบ Polarsteps: แถวเริ่ม (บ้าน) → จุดแวะ → ป้ายการเดินทางระหว่างจุด → แถวจบ (ธง)
 * เส้นประเชื่อมทางซ้าย ปุ่ม + บนเส้นสำหรับขอให้ AiGo เพิ่มที่แวะตรงนั้น (ไม่ส่ง onAdd = ดูอย่างเดียว)
 */
export function RouteList({ start, end, stops, legs = [], onAdd, addLabel }: {
  start: { title: string; sub?: string; right?: ReactNode; icon?: IconName }; end?: { title: string; sub?: string }; stops: RouteStop[];
  legs?: (Leg | undefined)[]; onAdd?: (i: number) => void; addLabel?: (i: number) => string;
}) {
  const { colors } = useSettings();
  const col = 44;
  const between = (i: number) => {
    const leg = i > 0 ? legs[i - 1] : undefined;
    if (!onAdd && !leg) return <View style={{ height: space.md }} />;
    return (
      <View style={{ minHeight: col, flexDirection: 'row', alignItems: 'center', gap: space.md }}>
        <View style={{ width: col, alignItems: 'center' }}>
          {onAdd && (
            <PressScale onPress={() => onAdd(i)} label={addLabel?.(i)} to={0.88} style={{ width: col, height: col, alignItems: 'center', justifyContent: 'center' }}>
              <View style={{ width: 30, height: 30, borderRadius: 15, borderWidth: 1.5, borderColor: colors.line, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}><Icon name="plus" color={colors.ink} size={16} /></View>
            </PressScale>
          )}
        </View>
        {leg && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 4, paddingRight: space.md, paddingVertical: 4, borderRadius: radius.pill, backgroundColor: colors.surfaceSoft }}>
            <View style={{ width: 24, height: 24, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: { train: colors.sticker.blush, walk: colors.sticker.mint, car: colors.sticker.sun }[leg.mode] }}><Icon name={leg.mode} color={colors.ink} size={15} /></View>
            <T v="smallBold" style={{ color: colors.mutedStrong }}>{leg.text}</T>
          </View>
        )}
      </View>
    );
  };
  const edge = (icon: IconName, filled: boolean, title: string, sub?: string, right?: ReactNode) => (
    <View style={{ minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: space.md }}>
      <View style={{ width: col, alignItems: 'center' }}>
        <View style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: filled ? colors.ink : colors.surfaceSoft }}><Icon name={icon} color={filled ? colors.bg : colors.ink} size={20} /></View>
      </View>
      <View style={{ flex: 1 }}>
        <T v="bodyBold">{title}</T>
        {sub && <T v="small" tone="muted">{sub}</T>}
      </View>
      {right}
    </View>
  );
  return (
    <View>
      <View style={{ position: 'absolute', left: col / 2 - 1, top: 28, bottom: end ? 28 : 0, borderLeftWidth: 2, borderStyle: 'dashed', borderColor: colors.line }} />
      {edge(start.icon ?? 'home', true, start.title, start.sub, start.right)}
      {stops.map((s, i) => (
        <View key={s.key}>
          {between(i)}
          <FadeIn index={i}><StopCard n={i + 1} photo={s.photo} name={s.name} time={s.time} meta={s.meta} status={s.status} statusTone={s.statusTone} onPress={s.onPress} /></FadeIn>
        </View>
      ))}
      {between(stops.length)}
      {end && edge('flag', false, end.title, end.sub)}
    </View>
  );
}

/** สิ่งที่ AiGo ทำเองแล้ว (ไม่เสียเงิน ย้อนกลับได้) พร้อมปุ่มเลิกทำ (RA6) */
export function UndoRow({ text, photo, undone, onUndo, last }: { text: string; photo?: ImageSource; undone: boolean; onUndo: () => void; last?: boolean }) {
  const { t } = useSettings();
  return (
    <Row last={last}>
      <StatusDot state={undone ? 'wait' : 'done'} />
      {photo && <Thumb source={photo} size={40} />}
      <T v="small" tone={undone ? 'muted' : 'ink'} style={[{ flex: 1 }, undone && { textDecorationLine: 'line-through' }]}>{text}</T>
      {undone
        ? <T v="smallBold" tone="muted">{t('appr.undone')}</T>
        : <Button kind="secondary" label={t('appr.undo')} onPress={() => { tap(); onUndo(); }} style={{ minHeight: touch.min, paddingHorizontal: space.md }} />}
    </Row>
  );
}

/**
 * แผนที่วาดแบบแบนสำหรับหัวจอแผน: ตำแหน่งหมุดคำนวณจากพิกัดจริงแล้วย่อให้พอดีกรอบ เส้นทางจุดประเชื่อมตามลำดับ
 * shortcut: เป็นภาพร่างไม่ใช่แผนที่จริง (แผนที่จริงอยู่ที่ /map), เปลี่ยนเป็น react-native-maps เมื่อต่อข้อมูลจริง
 */
export function SketchMap({ points, pad }: { points: { key: string; lat: number; lon: number; label: string }[]; pad: { top: number; bottom: number; x: number } }) {
  const { colors } = useSettings();
  const lats = points.map((p) => p.lat), lons = points.map((p) => p.lon);
  const [la0, la1, lo0, lo1] = [Math.min(...lats), Math.max(...lats), Math.min(...lons), Math.max(...lons)];
  const at = (p: { lat: number; lon: number }) => ({
    x: pad.x + ((p.lon - lo0) / (lo1 - lo0 || 1)) * (1 - 2 * pad.x),
    y: pad.top + ((la1 - p.lat) / (la1 - la0 || 1)) * (1 - pad.top - pad.bottom),
  });
  const xy = points.map(at);
  const route = xy.map((q, i) => `${i ? 'L' : 'M'}${(q.x * 100).toFixed(2)} ${(q.y * 100).toFixed(2)}`).join(' ');
  const blocks = [[6, 14, 20, 12], [58, 6, 22, 13], [10, 70, 18, 13], [70, 66, 22, 15], [38, 28, 13, 10], [80, 34, 14, 12], [40, 74, 14, 10]];
  return (
    <View style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]} accessible={false}>
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
        <Rect width="100" height="100" fill={colors.sticker.mint} />
        {blocks.map(([x, y, w, h], i) => <Rect key={i} x={x} y={y} width={w} height={h} rx={2.5} fill={colors.surface} opacity={0.55} />)}
        <Path d="M-5 56 C 20 47, 34 66, 56 57 S 86 46, 105 52" stroke={colors.sticker.sky} strokeWidth={14} vectorEffect="non-scaling-stroke" fill="none" />
        <Path d="M28 -5 C 33 18, 24 34, 31 54" stroke={colors.sticker.sky} strokeWidth={7} vectorEffect="non-scaling-stroke" fill="none" />
        <Path d={route} stroke={colors.ink} strokeOpacity={0.75} strokeWidth={3} strokeDasharray="0.5 8" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" fill="none" />
      </Svg>
      {points.map((p, i) => {
        const q = xy[i];
        const leftSide = q.x > 0.6;
        return (
          <View key={p.key} style={{ position: 'absolute', left: `${q.x * 100}%`, top: `${q.y * 100}%`, width: 0, height: 0 }}>
            <View style={{ position: 'absolute', left: -14, top: -14, width: 28, height: 28, borderRadius: 14, backgroundColor: colors.ink, borderWidth: 2.5, borderColor: colors.surface, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontFamily: fonts.bodyBold, fontSize: 13, color: colors.bg }}>{i + 1}</Text>
            </View>
            <View style={[{ position: 'absolute', top: -13, paddingHorizontal: space.sm, paddingVertical: 2, borderRadius: radius.pill, backgroundColor: colors.surface }, leftSide ? { right: 20 } : { left: 20 }]}>
              <Text numberOfLines={1} style={{ fontFamily: fonts.bodyBold, fontSize: 12, lineHeight: 18, color: colors.ink }}>{p.label}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}
