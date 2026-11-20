import Svg, { Circle, Path } from 'react-native-svg';

// ชุดไอคอนเส้นหนา 2.2 ขนาด 24 ชุดเดียวทั้งแอป ไม่ใช้อีโมจิเป็นไอคอน
const PATHS = {
  spark: ['M12 3.5l2.2 5.3 5.3 2.2-5.3 2.2L12 18.5l-2.2-5.3L4.5 11l5.3-2.2z'],
  bag: ['M3.5 9.5a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z', 'M9 7.5V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5v2'],
  user: ['M4.5 20.5a7.5 7.5 0 0 1 15 0'],
  back: ['M15 5l-7 7 7 7'],
  next: ['M9 5l7 7-7 7'],
  check: ['M5 12.5l4.5 4.5L19 7.5'],
  pin: ['M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z'],
  share: ['M12 15V4', 'M8 8l4-4 4 4', 'M5 13v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5'],
  mic: ['M9 6a3 3 0 0 1 6 0v5a3 3 0 0 1-6 0z', 'M5.5 11a6.5 6.5 0 0 0 13 0', 'M12 17.5V21'],
  send: ['M12 19V5', 'M6 11l6-6 6 6'],
  alert: ['M12 4 2.5 20h19z', 'M12 10v4.5', 'M12 17.2v.3'],
} as const;
const CIRCLES: Partial<Record<keyof typeof PATHS, [number, number, number]>> = { user: [12, 8.5, 4], pin: [12, 10, 2.4] };

export type IconName = keyof typeof PATHS;

export function Icon({ name, color, size = 24 }: { name: IconName; color: string; size?: number }) {
  const c = CIRCLES[name];
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" accessible={false}>
      {PATHS[name].map((d) => <Path key={d} d={d} />)}
      {c && <Circle cx={c[0]} cy={c[1]} r={c[2]} />}
    </Svg>
  );
}
