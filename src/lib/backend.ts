import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetch } from 'expo/fetch';

import { sseDelta } from '@/lib/chat';

// โปรเจกต์ Supabase ของแอป (docs/backend.md) publishable key ออกแบบมาให้ฝังในแอปได้
export const SUPABASE_URL = 'https://vjblrglalptgdxabteqm.supabase.co';
const PUBLISHABLE_KEY = 'sb_publishable_ThF183z7kk5KPpjGxBggFQ_Op7La_La';

let device: string | null = null;
/** เลขประจำเครื่องสำหรับโหมดผู้เยี่ยมชม (trip-chat ใช้ header x-device-id) */
async function deviceId() {
  if (device) return device;
  const saved = await AsyncStorage.getItem('aigo.device').catch(() => null);
  if (saved) return (device = saved);
  // shortcut: สุ่มด้วย Math.random ใช้แยกเครื่องเพื่อโควตาผู้เยี่ยมชมเท่านั้น ไม่ใช่ความลับ, เปลี่ยนเป็น expo-crypto ถ้าจะใช้ยืนยันตัวตน
  const id = Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  AsyncStorage.setItem('aigo.device', id).catch(() => {});
  return (device = id);
}

export type ChatMessage = { role: 'user' | 'assistant'; content: string };

/**
 * ส่งบทสนทนาให้ trip-chat แล้วอ่านคำตอบแบบสตรีม (trip-chat ส่ง SSE ของ OpenRouter ต่อมาตรงๆ)
 * onText ได้ข้อความสะสมทั้งหมดทุกครั้งที่มีเพิ่ม คืนข้อความเต็มเมื่อจบ ถ้าเซิร์ฟเวอร์ตอบผิดพลาดหรือไม่ตอบใน 20 วินาทีจะโยน error
 */
export async function streamTripChat(messages: ChatMessage[], lang: string, onText: (full: string) => void): Promise<string> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20000);
  let res: Awaited<ReturnType<typeof fetch>>;
  try {
    res = await fetch(`${SUPABASE_URL}/functions/v1/trip-chat`, {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', apikey: PUBLISHABLE_KEY, 'x-device-id': await deviceId() },
      body: JSON.stringify({ messages, userLanguage: lang, userTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone }),
    });
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok || !res.body) throw new Error(`trip-chat ${res.status}`);
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '', full = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop() ?? '';
    for (const line of lines) {
      const d = sseDelta(line);
      if (d) { full += d; onText(full); }
    }
  }
  if (!full) throw new Error('trip-chat empty reply');
  return full;
}
