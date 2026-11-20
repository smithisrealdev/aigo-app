// โทเคนดีไซน์ของ AiGo: เริ่มจากระบบ ChefJiw แล้วปรับให้นิ่งและเป็นผู้ใหญ่ขึ้นสำหรับแอปที่เกี่ยวกับเงิน (หัวจอสีเดียว พื้นการ์ดเป็นกลาง มุมโค้งน้อยลง) หน้าจอห้ามใส่รหัสสีเอง ให้ใช้จากที่นี่
export type Palette = {
  bg: string; surface: string; surfaceSoft: string; line: string;
  ink: string; muted: string; mutedStrong: string;
  primary: string; onPrimary: string;
  accent: string; onAccent: string; note: string; ai: string; done: string; danger: string;
  success: string; warn: string; flame: string;
  header: { home: string; work: string; trips: string; place: string; travel: string; money: string };
};

// ทุกคู่ข้อความ/พื้นผ่าน 4.5:1 สีการ์ดตามความหมาย (note ai done danger) สว่างในธีมสว่าง เข้มในธีมมืด ตัวอักษรในการ์ดตามธีม (ดู Card กับ T ใน ui.tsx)
// 60-30-10: พื้นขาว 60, การ์ดเทากลาง 30, สีเน้นคราม 10 สีอื่นใช้เฉพาะสถานะที่มีความหมาย (เขียว = ตรวจแล้ว, ส้ม = เตือน)
export const light: Palette = {
  bg: '#FFFFFF', surface: '#FFFFFF', surfaceSoft: '#F5F5F7', line: '#E4E4EA',
  ink: '#1C1C24', muted: '#666672', mutedStrong: '#4A4A56',
  primary: '#1C1C24', onPrimary: '#FFFFFF',
  accent: '#4350D9', onAccent: '#FFFFFF', note: '#FAF6E8', ai: '#F5F5F7', done: '#EDF6EF', danger: '#FBEFEA',
  success: '#1E7A45', warn: '#8A3B12', flame: '#C2512E',
  // หัวจอสีเดียวทั้งแอป (กรมท่า) ให้รูปถ่ายเป็นตัวให้สี คีย์แยกตามจอยังเก็บไว้เผื่อปรับทีหลัง
  header: { home: '#1B1D36', work: '#1B1D36', trips: '#1B1D36', place: '#1B1D36', travel: '#1B1D36', money: '#1B1D36' },
};

export const dark: Palette = {
  bg: '#17151D', surface: '#23212C', surfaceSoft: '#2F2C3B', line: '#3D394B',
  ink: '#F3F1FA', muted: '#B9B4C9', mutedStrong: '#CFCADC',
  primary: '#F3F1FA', onPrimary: '#24212B',
  accent: '#8F9AFF', onAccent: '#17151D', note: '#322E22', ai: '#2F2C3B', done: '#1F3527', danger: '#40291F',
  success: '#7FD9A0', warn: '#FFB38A', flame: '#FF9A6B',
  header: { home: '#17151D', work: '#17151D', trips: '#17151D', place: '#17151D', travel: '#17151D', money: '#17151D' },
};

// สีสดประจำแอป ไม่เปลี่ยนตามธีม ใช้กับการ์ดเด่นของแต่ละจอ (จอละใบ) ตัวอักษรบนสีเหล่านี้เลือกด้วย onTint
export const vivid = { indigo: '#4B5BEF', navy: '#1E1B3A', coral: '#FF7A59', yellow: '#FFD84D', mint: '#7BE0B5', onNavyMuted: '#C9C6E8' } as const;

/** สีตัวอักษรบนพื้นสีสด: ขาวถ้าคอนทราสต์กับขาวถึง 4.5:1 ไม่อย่างนั้นใช้สีหมึก */
export function onTint(hex: string): string {
  const [r, g, b] = [1, 3, 5].map((i) => { const c = parseInt(hex.slice(i, i + 2), 16) / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });
  return 1.05 / (0.2126 * r + 0.7152 * g + 0.0722 * b + 0.05) >= 4.5 ? '#FFFFFF' : '#24212B';
}

// สีข้อความบนพื้นพาสเทลที่ไม่เปลี่ยนตามธีม
export const onPastel = { ink: '#24212B', muted: '#4F4A5C', success: '#1E7A45', warn: '#8A3B12' };

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 10, lg: 16, sheet: 24, pill: 999 } as const;
// ขนาดตัวอักษรแน่นแบบแอปผู้ช่วย
export const type = { sm: 13, md: 15, lg: 16, xl: 18, xxl: 24, hero: 36 } as const;
// เนื้อหาไม่ยืดเต็มจอบนแท็บเล็ตหรือจอแนวนอน
export const wide = { width: '100%', maxWidth: 600, alignSelf: 'center' } as const;
export const touch = { min: 44, big: 56 } as const;

// ฟอนต์ชุดเดียวทั้งแอป (Anuphan ไทยไม่มีหัว) ตัว UI เรียบ ความน่ารักอยู่ที่ตัวละคร ไม่ใช่ตัวอักษร
export const fonts = {
  heading: 'Anuphan_600SemiBold',
  body: 'Anuphan_400Regular',
  bodySemi: 'Anuphan_600SemiBold',
  bodyBold: 'Anuphan_700Bold',
} as const;
