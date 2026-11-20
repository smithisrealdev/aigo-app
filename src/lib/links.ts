import type { ChatCard } from './chat.ts';

// ลิงก์ดูราคาจริงหรือจองของการ์ดแต่ละแบบ ใช้รหัสพาร์ตเนอร์ชุดเดียวกับเว็บ (ai-travel-buddy-13/src/config/affiliates.ts)
// เที่ยวบิน: ค้นใน Aviasales พร้อม marker, ตั๋วและบัตรรถไฟ: ค้นใน Klook ผ่านลิงก์ affiliate, ที่พัก: ค้นใน Booking.com ตามวันที่,
// ร้านและสถานที่: Google Maps, บริการอื่น: ลิงก์ติดตามของ Travelpayouts (พาไปหน้าแรกของพาร์ตเนอร์)

const MARKER = '692842';
const KLOOK = { aid: '115623', adid: '1235530' };
const TRACKING: Record<string, string> = {
  car_rental: 'https://localrent.tpm.lv/lrzvZSNx',
  transfer: 'https://kiwitaxi.tpm.lv/rRdN2l7b',
  esim: 'https://airalo.tpm.lv/6ucqqvZX',
  insurance: 'https://ektatraveling.tpm.lv/qOUDItNu',
};

export type LinkTrip = { destination?: string; startDate?: string; endDate?: string; people?: number };

const isoDate = (d?: string) => (d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : undefined);
const iata = (s?: string) => (s && /^[A-Z]{3}$/.test(s.trim().toUpperCase()) ? s.trim().toUpperCase() : undefined);

/** นำทางด้วยแอปแผนที่ของเครื่อง (R16): iOS เปิด Apple Maps, ที่อื่นเปิดเส้นทางของ Google Maps; ไม่มีพิกัดใช้ชื่อ */
export function navLink(p: { name: string; lat?: number; lon?: number }, os: string): string {
  const to = p.lat || p.lon ? `${p.lat},${p.lon}` : encodeURIComponent(p.name.trim());
  return os === 'ios' ? `https://maps.apple.com/?daddr=${to}` : `https://www.google.com/maps/dir/?api=1&destination=${to}`;
}
export const mapsLink = (query: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query.trim())}`;
export const klookLink = (query: string) =>
  `https://affiliate.klook.com/redirect?aid=${KLOOK.aid}&aff_adid=${KLOOK.adid}&k_site=${encodeURIComponent(`https://www.klook.com/search/?query=${encodeURIComponent(query.trim())}`)}`;

/** Aviasales: /search/{FROM}{DDMM}{TO}{DDMM กลับ}{จำนวนคน} เที่ยวขาไปของทริปค้นแบบไปกลับ; ไม่มีรหัสสนามบินใช้ Google Flights */
export function flightLink(c: ChatCard, t: LinkTrip): string {
  const from = iata(c.from), to = iata(c.to), date = isoDate(c.date) ?? isoDate(t.startDate);
  if (!from || !to || !date) return `https://www.google.com/travel/flights?q=${encodeURIComponent(`Flights from ${c.from ?? ''} to ${c.to ?? ''} ${date ?? ''}`.trim())}`;
  const ddmm = (d: string) => d.slice(8, 10) + d.slice(5, 7);
  const back = isoDate(t.endDate);
  const ret = date === isoDate(t.startDate) && back && back > date ? ddmm(back) : '';
  const people = Math.min(9, Math.max(1, t.people ?? 1));
  return `https://www.aviasales.com/search/${from}${ddmm(date)}${to}${ret}${people}?marker=${MARKER}`;
}

/** Booking.com ค้นตามชื่อที่พักกับวันเข้าออกของทริป (ลิงก์ค้นของ Agoda เด้งกลับหน้าแรก ทดสอบแล้ว 20 พ.ย. 2026) */
export function hotelLink(c: ChatCard, t: LinkTrip): string {
  const q = new URLSearchParams({ ss: [c.name, t.destination].filter(Boolean).join(', ') });
  const checkIn = isoDate(t.startDate), checkOut = isoDate(t.endDate);
  if (checkIn) q.set('checkin', checkIn);
  if (checkOut) q.set('checkout', checkOut);
  q.set('group_adults', String(Math.max(1, t.people ?? 2)));
  q.set('no_rooms', '1');
  return `https://www.booking.com/searchresults.html?${q.toString()}`;
}

/** ลิงก์ของการ์ดหนึ่งใบ */
export function cardLink(c: ChatCard, t: LinkTrip): string {
  const near = c.area ?? t.destination ?? '';
  switch (c.kind) {
    case 'flight': return flightLink(c, t);
    case 'hotel': return hotelLink(c, t);
    case 'ticket': return klookLink(`${c.name} ${t.destination ?? ''}`);
    case 'service': return TRACKING[c.type ?? ''] ?? klookLink(c.name);
    default: return mapsLink(`${c.name} ${near}`);
  }
}
