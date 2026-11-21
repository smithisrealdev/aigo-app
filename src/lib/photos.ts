import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ImageSource } from 'expo-image';
import { useEffect, useSyncExternalStore } from 'react';
import { Platform } from 'react-native';

import { postJson } from '@/lib/backend';

// รูปสถานที่จากชื่อ ผ่าน edge function place-photos (Wikipedia / Wikimedia Commons ฟรี แคชบนเซิร์ฟเวอร์ให้ทุกคน)
// เก็บในเครื่องอีกชั้น เปิดซ้ำไม่ต้องถามใหม่; ไม่มีรูปก็ไม่เป็นไร การ์ดใช้ช่องสีแทน

export type PhotoQuery = { name: string; near?: string };
// เซิร์ฟเวอร์รูปของ Wikimedia ตอบ 403 ให้ user agent ปกติของตัวโหลดรูปบน Android (okhttp) และคำขอที่ไม่มี user agent
// จึงบอกชื่อแอปตามนโยบายของ Wikimedia เฉพาะบนมือถือ (บนเว็บเบราว์เซอร์ส่ง user agent ของตัวเองซึ่งผ่านอยู่แล้ว)
const WIKIMEDIA_UA = { 'User-Agent': 'AiGoTravel/1.0 (https://theaigo.co)' };
const keyOf = (q: PhotoQuery) => `${q.name}|${q.near ?? ''}`.trim().toLowerCase();
const STORE = 'aigo.photos.v1';
const MAX_KEPT = 600;

const known = new Map<string, string | null>(); // null = ค้นแล้วไม่มีรูป
const asking = new Set<string>();
const tries = new Map<string, number>(); // ถามไม่สำเร็จไปแล้วกี่ครั้ง
const listeners = new Set<() => void>();
let version = 0;
const changed = () => { version++; listeners.forEach((l) => l()); };

let loaded: Promise<void> | null = null;
const load = () => (loaded ??= AsyncStorage.getItem(STORE)
  .then((raw) => { if (raw) for (const [k, v] of Object.entries(JSON.parse(raw) as Record<string, string | null>)) if (!known.has(k)) known.set(k, v); changed(); })
  .catch(() => {}));
const save = () => {
  const rows = [...known.entries()].slice(-MAX_KEPT);
  AsyncStorage.setItem(STORE, JSON.stringify(Object.fromEntries(rows))).catch(() => {});
};

async function fetchMissing(qs: PhotoQuery[]) {
  await load();
  const todo = [...new Map(qs.filter((q) => q.name && !known.has(keyOf(q)) && !asking.has(keyOf(q))).map((q) => [keyOf(q), q])).values()];
  for (let i = 0; i < todo.length; i += 24) {
    const batch = todo.slice(i, i + 24);
    batch.forEach((q) => asking.add(keyOf(q)));
    try {
      const { photos } = await postJson<{ photos: ({ url: string | null } | null)[] }>('place-photos', { places: batch });
      // ไม่ได้คำตอบ (null) ไม่จำ จะถามใหม่ครั้งหน้า; ได้คำตอบว่าไม่มีรูปจำไว้ว่าไม่มี
      batch.forEach((q, j) => { if (photos[j]) known.set(keyOf(q), photos[j]!.url); });
      save();
      changed();
    } catch {
      // ออฟไลน์ พับแอปไว้ (iOS ตัดสาย) หรือโดนจำกัดครั้ง: การ์ดใช้ช่องสีไปก่อน แล้วถามใหม่อีกไม่เกิน 3 ครั้ง
      // (ตัวจับเวลาหยุดตอนพับแอป จึงถามใหม่หลังผู้ใช้กลับมา)
      const again = batch.filter((q) => { const n = (tries.get(keyOf(q)) ?? 0) + 1; tries.set(keyOf(q), n); return n <= 3; });
      if (again.length) setTimeout(() => fetchMissing(again), 5000);
    } finally {
      batch.forEach((q) => asking.delete(keyOf(q)));
    }
  }
}

const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
const snapshot = () => version;

/** รูปของสถานที่ที่ส่งมา (ถามทีเดียวทั้งชุด) คืนฟังก์ชันหาเป็นรายที่; ยังไม่มาหรือไม่มีรูปได้ undefined */
export function usePhotos(qs: PhotoQuery[]): (q: PhotoQuery) => ImageSource | undefined {
  const seen = useSyncExternalStore(subscribe, snapshot, snapshot);
  const wanted = qs.filter((q) => q.name).map((q) => `${q.name}\u0000${q.near ?? ''}`).join('\u0001');
  useEffect(() => {
    if (!wanted) return;
    fetchMissing(wanted.split('\u0001').map((s) => { const [name, near] = s.split('\u0000'); return { name, near: near || undefined }; }));
  }, [wanted]);
  // อ้าง seen ในฟังก์ชัน ให้ React Compiler สร้างฟังก์ชันใหม่เมื่อมีรูปเพิ่ม (ไม่อย่างนั้นการ์ดที่จำค่าไว้จะไม่เห็นรูปใหม่)
  return (q) => {
    const url = seen >= 0 ? known.get(keyOf(q)) : undefined;
    return url ? (Platform.OS === 'web' ? { uri: url } : { uri: url, headers: WIKIMEDIA_UA }) : undefined;
  };
}
