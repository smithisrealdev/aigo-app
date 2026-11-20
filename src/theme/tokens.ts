// โทเคนดีไซน์ AiGo ชุดที่ 3: แนว Headspace (พื้นขาวอุ่น การ์ดพื้นอ่อน ภาพประกอบแบนสีสดล้นขอบการ์ด ตัวการ์ตูนกลมไม่มีเส้นขอบ)
// ผสมลูกเล่นเที่ยว (ตั๋วมีรอยเจาะ โพลารอยด์ติดเทป ตราประทับ) และแถบเมนูกระจกลอยแบบแอปใหม่ (Apple Music, TIDE, Luma) อ้างอิงทั้งหมดจาก Mobbin
// หน้าจอห้ามใส่รหัสสีเอง ให้ใช้จากที่นี่
export type Palette = {
  bg: string; surface: string; surfaceSoft: string; line: string;
  ink: string; muted: string; mutedStrong: string;
  primary: string; onPrimary: string; primaryEdge: string;
  accent: string; accentSoft: string; accentText: string;
  note: string; done: string; danger: string;
  success: string; warn: string;
  // สีพาสเทลสำหรับการ์ดเล่นสี ตัวหนังสือบนสีเหล่านี้ใช้ ink ได้ทุกสี
  sticker: { sky: string; sun: string; mint: string; blush: string; lilac: string; sea: string };
  glass: string; glassEdge: string;
};

// คอนทราสต์ (ตรวจแล้ว): ink บน bg 14:1, muted บน bg 4.5:1, ink บนปุ่มส้ม 5.8:1, ink บนฟ้าทะเล 4.9:1
export const light: Palette = {
  bg: '#FBF8F4', surface: '#FFFFFF', surfaceSoft: '#F3EDE6', line: '#E8E0D6',
  ink: '#2A2622', muted: '#7A7066', mutedStrong: '#544B43',
  primary: '#FF7A45', onPrimary: '#2A2622', primaryEdge: '#D95C2B',
  accent: '#0FA3B1', accentSoft: '#D6F2F3', accentText: '#0A7682',
  note: '#FFF1CC', done: '#E1F5EA', danger: '#FFE4DA',
  success: '#23784A', warn: '#B23A12',
  sticker: { sky: '#D4ECFF', sun: '#FFE9A8', mint: '#D2F3E4', blush: '#FFDCE1', lilac: '#E7DEFF', sea: '#CDEFF1' },
  glass: 'rgba(255,253,248,0.82)', glassEdge: 'rgba(59,47,42,0.12)',
};

export const dark: Palette = {
  bg: '#1A1714', surface: '#25211C', surfaceSoft: '#2F2A24', line: '#3D362E',
  ink: '#F6EFE6', muted: '#B5AA9C', mutedStrong: '#D9CFC3',
  primary: '#FF8A5B', onPrimary: '#1A1714', primaryEdge: '#C4592C',
  accent: '#5CCFD8', accentSoft: '#1E3A3D', accentText: '#5CCFD8',
  note: '#3A321C', done: '#1D3527', danger: '#40261E',
  success: '#7FD9A0', warn: '#FFAA85',
  sticker: { sky: '#22344A', sun: '#3D3420', mint: '#1F3A30', blush: '#3E2830', lilac: '#2E2840', sea: '#1E3A3D' },
  glass: 'rgba(37,33,28,0.82)', glassEdge: 'rgba(246,239,230,0.14)',
};

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 14, md: 18, lg: 24, xl: 28, pill: 999 } as const;
export const type = { sm: 13, md: 15, lg: 17, xl: 20, xxl: 28, hero: 34 } as const;
// เนื้อหาไม่ยืดเต็มจอบนแท็บเล็ตหรือจอแนวนอน
export const wide = { width: '100%', maxWidth: 600, alignSelf: 'center' } as const;
export const touch = { min: 44, big: 56 } as const;

// ฟอนต์ชุดเดียว Anuphan: หัวข้อตัวหนาเรียบแบบ Headspace ความน่ารักอยู่ที่ภาพประกอบและตัวการ์ตูน
export const fonts = {
  display: 'Anuphan_700Bold',
  displaySemi: 'Anuphan_600SemiBold',
  body: 'Anuphan_400Regular',
  bodySemi: 'Anuphan_600SemiBold',
  bodyBold: 'Anuphan_700Bold',
} as const;
