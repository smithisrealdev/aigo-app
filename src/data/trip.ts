import type { ImageSource } from 'expo-image';

import type { Action, Task } from '@/lib/agent';
import type { L } from '@/lib/i18n';

// shortcut: ข้อมูลตัวอย่างของทริปเดียว (โอซาก้า) ตามที่ใช้ใน mockup แทนผลจาก backend, เปลี่ยนเป็นข้อมูลจาก Supabase เมื่อต่อ trip-chat และ generate-itinerary
// ราคา เวลา และชื่อโรงแรมเป็นตัวอย่าง ภาพมาจาก Wikimedia Commons (assets/photos/CREDITS.md)

export const photos = {
  castle: require('@/assets/photos/osaka-castle.jpg'),
  kuromon: require('@/assets/photos/kuromon.jpg'),
  shinsaibashi: require('@/assets/photos/shinsaibashi.jpg'),
  dotonbori: require('@/assets/photos/dotonbori.jpg'),
  skyline: require('@/assets/photos/osaka-skyline.jpg'),
  tokyo: require('@/assets/photos/tokyo.jpg'),
  seoul: require('@/assets/photos/seoul.jpg'),
  taipei: require('@/assets/photos/taipei.jpg'),
  hotel: require('@/assets/photos/hotel-room.jpg'),
  kaiyukan: require('@/assets/photos/kaiyukan.jpg'),
  map: require('@/assets/photos/map-day1.jpg'),
} satisfies Record<string, ImageSource>;

export const logos = {
  aviasales: require('@/assets/partners/aviasales.svg'),
  agoda: require('@/assets/partners/agoda.svg'),
  radical: require('@/assets/partners/radicalstorage.svg'),
} satisfies Record<string, ImageSource>;

export const poses = {
  wave: require('@/assets/character/aigo-wave.svg'),
  think: require('@/assets/character/aigo-think.svg'),
  happy: require('@/assets/character/aigo-happy.svg'),
  rain: require('@/assets/character/aigo-rain.svg'),
} satisfies Record<string, ImageSource>;

export type Place = {
  id: string; time: string; name: L; photo: ImageSource; minutes: number; checked: boolean;
  tip: L; entry: { text: L; source?: string; at?: string }; spend?: { baht: number; source?: string };
  lat: number; lon: number;
};

export const trip = {
  id: 'osaka', title: { th: 'โอซาก้า 5 วัน', en: 'Osaka, 5 days' } as L, dates: { th: '12–16 ธ.ค.', en: '12–16 Dec' } as L,
  people: 2, budget: 40000, daysAway: 22, checkedAt: '09:10',
  days: [[
    { id: 'castle', time: '10:00', name: { th: 'ปราสาทโอซาก้า', en: 'Osaka Castle' }, photo: photos.castle, minutes: 120, checked: true,
      tip: { th: 'ขึ้นลิฟต์ไปชั้นบนก่อนแล้วเดินลง คนน้อยกว่า', en: 'Take the lift up first and walk down; it is quieter' }, entry: { text: { th: '~¥1,200', en: '~¥1,200' } }, lat: 34.6873, lon: 135.5262 },
    { id: 'kuromon', time: '12:30', name: { th: 'ตลาดคุโรมง', en: 'Kuromon Market' }, photo: photos.kuromon, minutes: 120, checked: true,
      tip: { th: 'มาถึงก่อนเที่ยงจะเดินสบายกว่า เตรียมเงินสดไว้ด้วย', en: 'Arrive before noon for an easier walk, and bring cash' },
      entry: { text: { th: 'ฟรี', en: 'Free' }, source: 'official', at: '09:12' }, spend: { baht: 1200 }, lat: 34.6654, lon: 135.5066 },
    { id: 'shinsaibashi', time: '15:00', name: { th: 'ชินไซบาชิ', en: 'Shinsaibashi' }, photo: photos.shinsaibashi, minutes: 150, checked: true,
      tip: { th: 'ถนนช้อปปิ้งมีหลังคา เดินได้แม้ฝนตก', en: 'Covered shopping street, fine in the rain' }, entry: { text: { th: 'ฟรี', en: 'Free' } }, lat: 34.6722, lon: 135.5016 },
    { id: 'dotonbori', time: '18:00', name: { th: 'โดทงโบริ', en: 'Dotonbori' }, photo: photos.dotonbori, minutes: 120, checked: true,
      tip: { th: 'ป้ายไฟสวยสุดหลังหนึ่งทุ่ม', en: 'The signs look best after 7 pm' }, entry: { text: { th: 'ฟรี', en: 'Free' } }, lat: 34.6687, lon: 135.5013 },
  ] satisfies Place[]],
};

export const allPlaces = (): Place[] => trip.days.flat();

/** งานที่ AiGo ทำตามลำดับหลังผู้ใช้กด "ให้ AiGo จัดการทั้งหมด" */
export const agentTasks: (Omit<Task, 'state'> & { th: string; en: string })[] = [
  { id: 'plan', label: '', th: 'วางแผน 5 วัน ตรวจทุกสถานที่', en: 'Plan 5 days and check every place' },
  { id: 'visa', label: '', th: 'เช็กวีซ่าสำหรับพาสปอร์ตไทย', en: 'Check visa rules for a Thai passport' },
  { id: 'flight', label: '', th: 'หาเที่ยวบินและเทียบราคาหลายสายการบิน', en: 'Find flights and compare airlines' },
  { id: 'hotel', label: '', th: 'หาที่พักใกล้นัมบะในงบ', en: 'Find a hotel near Namba within budget' },
  { id: 'checklist', label: '', th: 'ทำเช็กลิสต์ก่อนเดินทาง', en: 'Make the pre-trip checklist' },
  { id: 'watch', label: '', th: 'ตั้งเฝ้าราคาเที่ยวบินและอากาศ', en: 'Watch flight prices and weather' },
];

export type Offer = Action & { name: L; lead: 'XJ' | ImageSource; note: L; why: L; source: string; at: string; logo: ImageSource; url: string };

/** สิ่งที่ต้องจ่ายเงิน จึงต้องรออนุมัติ (RA7) ลิงก์เป็นหน้าแรกของพันธมิตร ยังไม่ใช่ลิงก์จองจริง */
export const offers: Offer[] = [
  { id: 'flight', title: 'flight', name: { th: 'Thai AirAsia X', en: 'Thai AirAsia X' } as L, costBaht: 19600, reversible: false, lead: 'XJ', note: { th: 'BKK ⇄ KIX · บินตรง · 2 คน', en: 'BKK ⇄ KIX · direct · 2 people' },
    why: { th: 'บินตรงและถูกสุด ขาไปถึงเช้า ไม่เสียค่าที่พักคืนแรก', en: 'Direct and cheapest; arrives in the morning, so no first-night hotel' },
    source: 'Aviasales', at: '09:12', logo: logos.aviasales, url: 'https://www.aviasales.com' },
  { id: 'hotel', title: 'hotel', name: { th: 'โรงแรม 3 ดาว ย่านนัมบะ', en: '3-star hotel in Namba' } as L, costBaht: 9800, reversible: true, lead: photos.hotel, note: { th: '4 คืน · เดิน 4 นาทีถึงนัมบะ', en: '4 nights · 4 min walk to Namba' },
    why: { th: 'ใกล้ที่เที่ยววันที่ 1–2 และยกเลิกฟรี', en: 'Close to days 1–2, free cancellation' },
    source: 'Agoda', at: '09:12', logo: logos.agoda, url: 'https://www.agoda.com' },
];

/** สิ่งที่ AiGo ทำเองแล้ว (ไม่เสียเงิน ย้อนกลับได้) แสดงพร้อมปุ่มเลิกทำ (RA6) */
export const autoDone: (Action & { text: L })[] = [
  { id: 'rain', title: 'move-park', costBaht: 0, reversible: true, text: { th: 'ย้ายสวนเท็นโนจิไปวันที่ 3 เพราะบ่ายวันที่ 2 ฝนตก', en: 'Moved Tennoji Park to day 3 because of rain on day 2' } },
  { id: 'watch', title: 'watch-price', costBaht: 0, reversible: true, text: { th: 'ตั้งเฝ้าราคาเที่ยวบิน แจ้งถ้าลดเกิน ฿1,000', en: 'Watching flight prices; will alert if they drop over ฿1,000' } },
];

/** ตำแหน่งหมุดบนภาพแผนที่วันที่ 1 (map-day1.jpg) เป็นสัดส่วนของภาพ คำนวณจากพิกัดจริงของแต่ละที่บน tile OpenStreetMap ซูม 15 */
export const mapPins: Record<string, [number, number]> = { castle: [0.866, 0.081], kuromon: [0.251, 0.919], shinsaibashi: [0.092, 0.659], dotonbori: [0.084, 0.793] };

export const baht = (n: number) => '฿' + n.toLocaleString('en-US');
