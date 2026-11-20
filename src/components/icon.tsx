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
  plus: ['M12 5v14', 'M5 12h14'],
  close: ['M6 6l12 12', 'M18 6L6 18'],
  plane: ['M10.5 13.5 4 12l-1-2 7 .5 4.5-5.5c.8-.9 2.2-1 3-.2.8.8.7 2.2-.2 3L12 12.5l.5 7-2 -1z'],
  map: ['M3.5 6.5 9 4l6 2.5 5.5-2.5v13L15 19.5 9 17l-5.5 2.5z', 'M9 4v13', 'M15 6.5v13'],
  home: ['M4 11 12 4.5l8 6.5', 'M6.5 9.5V20h11V9.5', 'M10 20v-5h4v5'],
  flag: ['M6 21V4', 'M6 4.5h11l-2.5 4 2.5 4H6'],
  walk: ['M12.5 8.5 10.5 14', 'M10.5 14 8 20.5', 'M10.5 14l3 2.5 1 4', 'M7.5 11.5l3-3 3.5 1 2 3'],
  train: ['M7 4h10a2 2 0 0 1 2 2v9a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3V6a2 2 0 0 1 2-2z', 'M5 11h14', 'M8.5 21 10 18.5', 'M15.5 21 14 18.5', 'M8.5 14.5h.01', 'M15.5 14.5h.01'],
} as const;
const CIRCLES: Partial<Record<keyof typeof PATHS, [number, number, number]>> = { user: [12, 8.5, 4], pin: [12, 10, 2.4], walk: [13.5, 4.8, 1.8] };

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
