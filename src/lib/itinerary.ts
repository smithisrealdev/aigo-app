import type { ImageSource } from 'expo-image';

import { shortDate, type ChatCard, type TripSummary } from './chat.ts';
import type { L } from './i18n.ts';

// รูปแบบทริปที่แอปใช้ และตัวแปลงผลจาก generate-itinerary (JSON ตาม prompt ของเว็บ) มาเป็นรูปแบบนี้

export type LegMode = 'train' | 'walk' | 'car';
export type Leg = { mode: LegMode; text: L };
export type Place = {
  id: string; time: string; name: L; photo?: ImageSource; minutes: number; checked: boolean;
  tip: L; entry: { text: L; source?: string; at?: string }; spend?: { baht: number; source?: string };
  lat: number; lon: number;
};
export type AppTrip = {
  id: string; title: L; dates: L; destination: L; startDate: string; totalDays: number; people: number; budget?: number;
  checkedAt?: string; days: Place[][]; dayTitles?: L[]; legs: Record<string, Leg>; cover?: ImageSource; hotel?: L;
  /** เที่ยวบิน ที่พัก ร้าน ตั๋ว และบริการที่ AI หาไว้ในแชต (ราคาประมาณ กดดูราคาจริงที่เว็บจอง) */
  bookings?: ChatCard[];
  /** ทริปตัวอย่าง (โอซาก้า) ไม่ใช่ทริปที่ AiGo สร้างจริง */
  sample: boolean;
  /** แผนที่เซิร์ฟเวอร์กำลังวาง (งานของ generate-itinerary) */
  plan?: PlanInfo;
};

export type PlanStatus = 'running' | 'done' | 'failed' | 'stopped';
/** งานวางแผนบนเซิร์ฟเวอร์: เก็บวันดิบไว้สร้างทริปใหม่เมื่อมีวันเพิ่ม จนกว่าจะเสร็จ; token ใช้ถามสถานะแทนการล็อกอิน */
export type PlanInfo = { job: string; token: string; status: PlanStatus; request: GenRequest; people: number; days: GenDay[]; title?: string; error?: string };
/** คำตอบสถานะงาน: days = วันตั้งแต่ลำดับ from (0 = วันแรก) */
export type PlanState = { status: PlanStatus; totalDays: number; title?: string | null; error?: string | null; from: number; days: GenDay[] };

type GenPlace = {
  id?: string; name?: string; description?: string; coordinates?: { lat?: number; lng?: number }; startTime?: string; duration?: string;
  cost?: { amount?: number; currency?: string }; tips?: string[]; whyVisit?: string[]; travelToNext?: { mode?: string; time?: number };
};
export type GenDay = { title?: string; places?: GenPlace[] };
export type GenItinerary = { id?: string; title?: string; destination?: string; startDate?: string; endDate?: string; days?: GenDay[] };
export type GenRequest = { destination: string; startDate: string; endDate: string; budget?: string; travelers?: string; tripStyle?: string; language: string };

const both = (s: string): L => ({ th: s, en: s });
export const NO_PRICE: L = { th: 'ยังไม่มีราคา', en: 'No price yet' };
const DAY = 86400000;
export const addDays = (iso: string, n: number) => new Date(Date.parse(iso + 'T00:00:00Z') + n * DAY).toISOString().slice(0, 10);
/** จำนวนวันของทริป นับทั้งวันแรกและวันสุดท้าย */
export const dayCount = (start: string, end: string) => Math.max(1, Math.round((Date.parse(end) - Date.parse(start)) / DAY) + 1);

/** วันที่วางแล้ว ส่งให้ generate-itinerary รอบถัดไปไม่วางที่ซ้ำ: "Day 1 (ชื่อวัน): ที่ A, ที่ B" ทีละบรรทัด */
export function plannedText(days: GenDay[]): string {
  return days.map((d, i) => `Day ${i + 1}${d.title ? ` (${d.title})` : ''}: ${(d.places ?? []).map((p) => p.name).filter(Boolean).join(', ')}`).join('\n').slice(0, 4000);
}

/** "2 hours" → 120, "1.5 ชม." → 90, "45 minutes" → 45; อ่านไม่ออกถือว่า 60 นาที */
export function minutesOf(duration = ''): number {
  const n = parseFloat(duration.replace(',', '.'));
  if (!Number.isFinite(n)) return 60;
  return /min|นาที/i.test(duration) && !/hour|hr|ชม|ชั่วโมง/i.test(duration) ? Math.round(n) : Math.round(n * 60);
}

const SYMBOL: Record<string, string> = { JPY: '¥', THB: '฿', USD: '$', EUR: '€', GBP: '£', KRW: '₩', CNY: '¥', TWD: 'NT$', SGD: 'S$' };
const MODE_TEXT: Record<string, L> = {
  walk: { th: 'เดิน', en: 'Walk' }, car: { th: 'รถ', en: 'Car' }, taxi: { th: 'แท็กซี่', en: 'Taxi' }, train: { th: 'รถไฟ', en: 'Train' },
  subway: { th: 'รถไฟใต้ดิน', en: 'Subway' }, metro: { th: 'รถไฟใต้ดิน', en: 'Metro' }, bus: { th: 'รถบัส', en: 'Bus' }, ferry: { th: 'เรือ', en: 'Ferry' },
};

export function legOf(t?: { mode?: string; time?: number }): Leg | undefined {
  if (!t?.time) return undefined;
  const raw = (t.mode ?? '').toLowerCase();
  const key = Object.keys(MODE_TEXT).find((k) => raw.includes(k)) ?? (/driv/.test(raw) ? 'car' : '');
  const mode: LegMode = /walk/.test(raw) ? 'walk' : /car|taxi|driv/.test(raw) ? 'car' : 'train';
  const word = MODE_TEXT[key] ?? { th: 'เดินทาง', en: 'Travel' };
  return { mode, text: { th: `${word.th} · ~${t.time} นาที`, en: `${word.en} · ~${t.time} min` } };
}

/** "12–16 ธ.ค." หรือ "28 ธ.ค. – 2 ม.ค." */
export function dateRange(start: string, end: string, lang: 'th' | 'en') {
  const [a, b] = [shortDate(start, lang), shortDate(end, lang)];
  const [d1, m1] = a.split(' '), [d2, m2] = b.split(' ');
  return m1 && m1 === m2 ? `${d1}–${d2} ${m1}` : `${a} – ${b}`;
}

/**
 * แปลงผลของ generate-itinerary เป็นทริปของแอป; ราคาเป็นค่าประมาณของ AI และยังไม่ได้ตรวจเวลาเปิด
 * ใช้กับทริปที่ยังสร้างไม่ครบได้ด้วย: จำนวนวันมาจากวันที่ของทริป วันที่ยังไม่มีที่แวะเป็นวันว่างตามลำดับเดิม
 */
export function toAppTrip(gen: GenItinerary, req: GenRequest, people = 2): AppTrip {
  const days = (gen.days ?? []).map((d, di) => (d?.places ?? []).map((p, pi): Place => {
    const amount = p.cost?.amount ?? 0, cur = (p.cost?.currency ?? '').toUpperCase();
    const price = amount > 0 ? `~${SYMBOL[cur] ?? ''}${amount.toLocaleString('en-US')}${SYMBOL[cur] ? '' : ` ${cur}`}`.trim() : '';
    return {
      id: p.id ?? `d${di}p${pi}`, time: p.startTime ?? '', name: both(p.name ?? '?'), minutes: minutesOf(p.duration), checked: false,
      tip: both(p.tips?.[0] ?? p.whyVisit?.[0] ?? p.description ?? ''),
      // ห้ามแต่งราคา (R15c): AI ไม่ให้ราคามา = ยังไม่มีราคา ไม่ใช่ฟรี
      entry: { text: amount > 0 ? both(price) : p.cost?.amount === 0 ? { th: 'ฟรี', en: 'Free' } : NO_PRICE },
      lat: p.coordinates?.lat ?? 0, lon: p.coordinates?.lng ?? 0,
    };
  }));
  const legs: Record<string, Leg> = {};
  (gen.days ?? []).forEach((d, di) => (d?.places ?? []).forEach((p, pi) => {
    const leg = pi < (d.places?.length ?? 0) - 1 ? legOf(p.travelToNext) : undefined;
    if (leg) legs[p.id ?? `d${di}p${pi}`] = leg;
  }));
  const start = gen.startDate ?? req.startDate, end = gen.endDate ?? req.endDate;
  const dest = gen.destination ?? req.destination;
  const total = Math.max(dayCount(start, end), days.length);
  return {
    id: gen.id ?? `trip-${start}`, destination: both(dest),
    title: gen.title ? both(gen.title) : { th: `${dest} ${total} วัน`, en: `${dest}, ${total} days` },
    dates: { th: dateRange(start, end, 'th'), en: dateRange(start, end, 'en') },
    startDate: start, totalDays: total, people, days, legs, sample: false,
    dayTitles: (gen.days ?? []).map((d) => both(d?.title ?? '')),
  };
}

/**
 * เติมวันที่เซิร์ฟเวอร์วางเสร็จลงทริปเดิม (id ของที่หาไว้ในแชต และรูปปกยังอยู่) วันที่มีแล้วไม่ซ้ำ วันที่มาขาดช่วงรอรอบหน้า
 * ไม่มีอะไรเปลี่ยนได้ทริปเดิมกลับมา (ไม่เขียนลงเครื่องซ้ำ) เสร็จแล้วทิ้งวันดิบที่เก็บไว้
 */
export function withPlanState(trip: AppTrip, s: PlanState): AppTrip {
  const plan = trip.plan;
  if (!plan) return trip;
  const known = plan.days.length;
  const fresh = s.from <= known ? s.days.slice(known - s.from) : [];
  const title = s.title ?? plan.title;
  const error = s.error ?? undefined;
  if (!fresh.length && s.status === plan.status && title === plan.title && error === plan.error) return trip;
  const days = [...plan.days, ...fresh];
  return {
    ...trip,
    ...toAppTrip({ title, days }, plan.request, plan.people),
    id: trip.id,
    plan: { ...plan, status: s.status, title, error, days: s.status === 'done' ? [] : days },
  };
}

/** งานไม่อยู่บนเซิร์ฟเวอร์แล้ว (ตอบ 403 เช่นลบบัญชีแล้ว แต่ทริปยังอยู่ในเครื่อง): จบแผนแบบไม่สำเร็จ ไม่ถามซ้ำไปตลอด */
/** แผนเพิ่งเสร็จตอนนี้: เปลี่ยนจากกำลังวางเป็นเสร็จ ไม่ใช่เปิดหน้ามาเจอแผนที่เสร็จแล้ว */
export const finishedNow = (before?: PlanStatus, now?: PlanStatus) => before === 'running' && now === 'done';
export const planGone = (trip: AppTrip): PlanState => ({ status: 'failed', error: 'gone', totalDays: trip.totalDays, from: trip.plan?.days.length ?? 0, days: [] });

/** ที่แวะของแต่ละวันเป็นบรรทัด ข้ามวันที่ยังว่าง */
const dayLines = (trip: AppTrip, th: boolean, sep: string, time: boolean) => trip.days
  .map((d, i) => (d.length ? `${th ? 'วันที่' : 'Day'} ${i + 1}: ${d.map((p) => (time && p.time ? `${p.time} ` : '') + p.name.en).join(sep)}` : ''))
  .filter(Boolean);

/** แผนของทริปเป็นข้อความสั้น แนบไปกับคำถามจากหน้าแผน สถานที่ วันนี้ และหน้างาน ให้ trip-chat ตอบเรื่องทริปนี้ */
export function tripContext(trip: AppTrip, lang: 'th' | 'en', day?: number): string {
  const th = lang === 'th';
  return [
    `${th ? 'ทริปของฉันที่ AiGo วางไว้' : 'My trip planned by AiGo'}: ${trip.destination.en}, ${th ? trip.dates.th : trip.dates.en}, ${trip.people} ${th ? 'คน' : 'people'}`,
    ...dayLines(trip, th, ', ', false),
    ...(day === undefined ? [] : [th ? `ตอนนี้ฉันดูวันที่ ${day + 1}` : `I am looking at day ${day + 1}`]),
  ].join('\n');
}

/** แผนเป็นข้อความสำหรับส่งให้เพื่อน (ยังไม่มีลิงก์แชร์จริง) */
export function planText(trip: AppTrip, lang: 'th' | 'en'): string {
  const th = lang === 'th';
  return [`${th ? trip.title.th : trip.title.en} (${th ? trip.dates.th : trip.dates.en})`, ...dayLines(trip, th, ' → ', true), th ? 'วางแผนด้วย AiGo' : 'Planned with AiGo'].join('\n');
}

/**
 * คำขอ generate-itinerary จากสรุปทริปในแชต; ไม่มีวันที่แต่รู้จำนวนวัน ให้เริ่มอีก 14 วันจากวันนี้
 * shortcut: เดาวันเริ่มแบบง่าย ไม่ดูฤดูที่ผู้ใช้พูดถึง, ให้ trip-chat ส่ง startDate มาเสมอหรือถามผู้ใช้ก่อนส่ง
 */
export function requestFromSummary(s: TripSummary, lang: string, today: string): GenRequest | null {
  if (!s.destination) return null;
  const days = Math.max(1, parseInt(s.duration ?? '', 10) || 0);
  const iso = /^\d{4}-\d{2}-\d{2}$/;
  const startDate = s.startDate && iso.test(s.startDate) ? s.startDate : s.duration ? addDays(today, 14) : null;
  if (!startDate) return null;
  const endDate = s.endDate && iso.test(s.endDate) ? s.endDate : addDays(startDate, days - 1);
  return { destination: s.destination, startDate, endDate, budget: s.budget, travelers: s.travelers, tripStyle: s.tripStyle, language: lang };
}

/** จำนวนคนจากคำในสรุปทริป เช่น "2 adults", "คู่รัก", "Solo"; ไม่รู้ถือว่า 2 */
export function peopleOf(travelers = ''): number {
  const n = parseInt(travelers, 10);
  if (n > 0) return n;
  if (/solo|alone|คนเดียว/i.test(travelers)) return 1;
  if (/family|ครอบครัว/i.test(travelers)) return 4;
  return 2;
}

export type GenEvent =
  | { type: 'progress'; day?: number; message?: string; dayTitle?: string }
  | { type: 'day_complete'; dayIndex?: number; totalDays?: number; day?: NonNullable<GenItinerary['days']>[number] }
  | { type: 'complete'; itinerary: GenItinerary }
  | { type: 'error'; error?: string };

/** หนึ่งบรรทัด "data: {...}" ของ SSE จาก generate-itinerary; บรรทัดอื่นได้ null */
export function genEvent(line: string): GenEvent | null {
  if (!line.startsWith('data:')) return null;
  try { return JSON.parse(line.slice(5).trim()) as GenEvent; } catch { return null; }
}
