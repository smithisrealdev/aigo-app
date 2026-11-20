import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetch } from 'expo/fetch';

import { sseDelta } from '@/lib/chat';
import { dayCount, genEvent, plannedText, type GenDay, type GenItinerary, type GenRequest } from '@/lib/itinerary';

// โปรเจกต์ Supabase ของแอป (docs/backend.md) publishable key ออกแบบมาให้ฝังในแอปได้
export const SUPABASE_URL = 'https://vjblrglalptgdxabteqm.supabase.co';
const PUBLISHABLE_KEY = 'sb_publishable_ThF183z7kk5KPpjGxBggFQ_Op7La_La';

let device: string | null = null;
/** เลขประจำเครื่องสำหรับโหมดผู้เยี่ยมชม (edge function อ่านจาก header x-device-id) */
async function deviceId() {
  if (device) return device;
  const saved = await AsyncStorage.getItem('aigo.device').catch(() => null);
  if (saved) return (device = saved);
  // shortcut: สุ่มด้วย Math.random ใช้แยกเครื่องเพื่อโควตาผู้เยี่ยมชมเท่านั้น ไม่ใช่ความลับ, เปลี่ยนเป็น expo-crypto ถ้าจะใช้ยืนยันตัวตน
  const id = Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  AsyncStorage.setItem('aigo.device', id).catch(() => {});
  return (device = id);
}

/** เรียก edge function แบบ POST ถ้าเซิร์ฟเวอร์ตอบผิดพลาดหรือไม่เริ่มตอบใน connectMs จะโยน error */
async function post(fn: string, body: unknown, connectMs: number) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), connectMs);
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/${fn}`, {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', apikey: PUBLISHABLE_KEY, 'x-device-id': await deviceId() },
      body: JSON.stringify(body),
    });
    if (!res.ok || !res.body) throw new Error(`${fn} ${res.status}`);
    return res.body;
  } finally {
    clearTimeout(timer);
  }
}

/** อ่านคำตอบแบบสตรีมทีละบรรทัด (SSE) */
async function eachLine(body: ReadableStream<Uint8Array>, onLine: (line: string) => void) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop() ?? '';
    lines.forEach(onLine);
  }
  if (buf) onLine(buf);
}

export type ChatMessage = { role: 'user' | 'assistant'; content: string };

/** ส่งบทสนทนาให้ trip-chat (ส่ง SSE ของ OpenRouter ต่อมาตรงๆ) onText ได้ข้อความสะสมทุกครั้งที่มีเพิ่ม คืนข้อความเต็มเมื่อจบ */
export async function streamTripChat(messages: ChatMessage[], lang: string, onText: (full: string) => void): Promise<string> {
  const body = await post('trip-chat', { messages, userLanguage: lang, userTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone }, 20000);
  let full = '';
  await eachLine(body, (line) => {
    const d = sseDelta(line);
    if (d) { full += d; onText(full); }
  });
  if (!full) throw new Error('trip-chat empty reply');
  return full;
}

/**
 * สร้างแผนด้วย generate-itinerary และส่งแต่ละวันให้ onDay ทันทีที่เสร็จ ผู้ใช้จึงเห็นแผนทีละวัน
 * Supabase ให้ฟังก์ชันทำงานได้ราว 150 วินาทีต่อครั้ง เซิร์ฟเวอร์จึงหยุดเองก่อนหมดเวลา ถ้าครั้งไหนได้ไม่ครบ
 * (หยุดก่อน ถูกตัด หรือ AI ตอบไม่ครบ) จะขอวันที่เหลือในครั้งใหม่ พร้อมรายการที่วางแล้วไม่ให้ซ้ำ
 * have = วันที่ได้มาแล้วจากครั้งก่อน (กดลองใหม่แล้วทำต่อจากเดิม)
 */
export async function generateItinerary(req: GenRequest, messages: ChatMessage[], onDay: (index: number, day: GenDay) => void, have: GenDay[] = []): Promise<GenItinerary> {
  const total = dayCount(req.startDate, req.endDate);
  const days = [...have];
  let title: string | undefined;
  let failure: string | null = null;
  // วันมาตามลำดับ: complete ส่งวันที่ day_complete ส่งไปแล้วซ้ำอีก จึงรับเฉพาะวันถัดไป
  const add = (i: number, d: GenDay) => { if (i === days.length && i < total) { days.push(d); onDay(i, d); } };
  let stalls = 0;
  while (days.length < total) {
    const fromDay = days.length + 1, before = days.length;
    // ส่งบทสนทนาล่าสุดไปด้วยให้ AI เห็นความต้องการทั้งหมด (สคีมารับได้ 100 ข้อความ)
    const body = await post('generate-itinerary', {
      ...req, conversationMessages: messages.slice(-40), ...(fromDay > 1 && { fromDay, planned: plannedText(days) }),
    }, 30000);
    try {
      await eachLine(body, (line) => {
        const e = genEvent(line);
        if (e?.type === 'day_complete' && e.day) add(e.dayIndex ?? days.length, e.day);
        else if (e?.type === 'complete') { title ??= e.itinerary.title; (e.itinerary.days ?? []).forEach((d, i) => add(fromDay - 1 + i, d)); }
        else if (e?.type === 'error') failure = e.error ?? 'generation failed';
      });
    } catch (err) {
      failure = (err as Error).message; // การเชื่อมต่อขาดกลางทาง: วันที่ได้แล้วยังอยู่ ขอต่อรอบหน้า
    }
    // ไม่ได้วันเพิ่มเลย: ลองอีกครั้งเดียว (งานอาจไปตกเครื่องของ Supabase ที่ใกล้หมดเวลา) ถ้ายังไม่ได้ก็หยุด ไม่วนไม่จบ
    if (days.length > before) stalls = 0;
    else if (++stalls > 1) break;
  }
  if (days.length < total) throw new Error(failure ?? `generate-itinerary stopped at day ${days.length} of ${total}`);
  return { title, destination: req.destination, startDate: req.startDate, endDate: req.endDate, days };
}
