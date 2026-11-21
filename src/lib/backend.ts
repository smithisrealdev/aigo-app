import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetch } from 'expo/fetch';

import { sseDelta } from '@/lib/chat';
import { addDays, genEvent, plannedText, type GenDay, type GenRequest, type PlanState } from '@/lib/itinerary';
import { PUBLISHABLE_KEY, SUPABASE_URL, supabase } from '@/lib/supabase';

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

/**
 * เรียก edge function แบบ POST ถ้าเซิร์ฟเวอร์ตอบผิดพลาดหรือไม่เริ่มตอบใน connectMs จะโยน error; signal = ผู้ใช้กดหยุด (ตัดทั้งการเชื่อมต่อและสตรีม)
 * asUser = ส่ง token ของบัญชีไปด้วยเมื่อเข้าสู่ระบบแล้ว: generate-itinerary นับโควตาสร้างแผนตามบัญชีแทนตามเครื่อง
 * (แชตยังนับตามเครื่อง เพราะ trip-chat ยังใช้ระบบเครดิตของเว็บเมื่อได้ token)
 */
async function post(fn: string, body: unknown, connectMs: number, signal?: AbortSignal, asUser = false) {
  const ctrl = new AbortController();
  signal?.addEventListener('abort', () => ctrl.abort(), { once: true });
  const token = asUser ? (await supabase.auth.getSession()).data.session?.access_token : undefined;
  const timer = setTimeout(() => ctrl.abort(), connectMs);
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/${fn}`, {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', apikey: PUBLISHABLE_KEY, 'x-device-id': await deviceId(), ...(token && { Authorization: `Bearer ${token}` }) },
      body: JSON.stringify(body),
    });
    if (!res.ok || !res.body) throw new Error(`${fn} ${res.status}`);
    return res.body;
  } finally {
    clearTimeout(timer);
  }
}

/** เรียก edge function ที่ตอบเป็น JSON; asUser = ส่ง token ของบัญชีไปด้วยเมื่อเข้าสู่ระบบแล้ว (เหมือน post) */
export async function postJson<T>(fn: string, body: unknown, asUser = false): Promise<T> {
  const token = asUser ? (await supabase.auth.getSession()).data.session?.access_token : undefined;
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${fn}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: PUBLISHABLE_KEY, 'x-device-id': await deviceId(), ...(token && { Authorization: `Bearer ${token}` }) },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${fn} ${res.status}`);
  return (await res.json()) as T;
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

/** งานวางแผนบนเซิร์ฟเวอร์ (generate-itinerary) ใช้ token แทนการล็อกอิน */
export type PlanRef = { job: string; token: string };

/**
 * ส่งงานวางแผนให้เซิร์ฟเวอร์ ซึ่งทำต่อเองจนครบทุกวันแม้ปิดแอป (supabase/plan_jobs.sql)
 * โควตาหมดได้ error "generate-itinerary 429"
 */
export async function startPlan(req: GenRequest, messages: ChatMessage[]): Promise<PlanRef> {
  // ส่งบทสนทนาล่าสุดไปด้วยให้ AI เห็นความต้องการทั้งหมด (สคีมารับได้ 100 ข้อความ)
  const r = await postJson<{ jobId: string; token: string }>('generate-itinerary', { job: 'start', ...req, conversationMessages: messages.slice(-40) }, true);
  return { job: r.jobId, token: r.token };
}
/** สถานะงาน และวันที่เสร็จแล้วตั้งแต่ลำดับ have (แอปมี have วันแล้ว) */
export const planStatus = (ref: PlanRef, have: number) => postJson<PlanState>('generate-itinerary', { job: 'status', jobId: ref.job, token: ref.token, have });
export const stopPlan = (ref: PlanRef) => postJson('generate-itinerary', { job: 'stop', jobId: ref.job, token: ref.token });
/** ทำต่อจากวันที่มีแล้ว (งานที่หยุดหรือไม่สำเร็จ) */
export const resumePlan = (ref: PlanRef) => postJson('generate-itinerary', { job: 'resume', jobId: ref.job, token: ref.token });

/**
 * แก้แผนวันเดียวตามที่ผู้ใช้บอก (R13) ด้วย generate-itinerary แบบทำต่อ: ให้วันก่อนหน้าเป็นวันที่วางแล้ว จึงได้แผนวันเดียว
 * และไม่นับเป็นทริปใหม่ (การทำต่อมีโควตาของตัวเอง) planned = ที่แวะของวันอื่นในทริป ไม่ให้ซ้ำ
 */
export async function replanDay(req: GenRequest, date: string, wish: string, planned: GenDay[], signal?: AbortSignal): Promise<GenDay> {
  const body = await post('generate-itinerary', {
    ...req, startDate: addDays(date, -1), endDate: date, fromDay: 2, planned: plannedText(planned), specialRequirements: wish.slice(0, 1000),
  }, 30000, signal, true);
  let day: GenDay | undefined;
  let failure: string | null = null;
  await eachLine(body, (line) => {
    const e = genEvent(line);
    if (e?.type === 'day_complete' && e.day) day ??= e.day;
    else if (e?.type === 'complete') day ??= e.itinerary.days?.[0];
    else if (e?.type === 'error') failure = e.error ?? 'replan failed';
  });
  if (!day?.places?.length) throw new Error(failure ?? 'replan returned no places');
  return day;
}
