import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { trip as sample } from '@/data/trip';
import type { ChatMessage } from '@/lib/backend';
import type { ChatCard } from '@/lib/chat';
import type { AppTrip, GenRequest } from '@/lib/itinerary';

// ทริปของผู้ใช้ เก็บในเครื่องให้เปิดได้แม้ไม่มีเน็ต ทริปแรกในรายการคือทริปที่เปิดอยู่ ทริปเก่ายังอยู่ครบ (R33)
// ยังไม่มีทริปจริงใช้ทริปตัวอย่าง (โอซาก้า) ซึ่งอยู่ในโค้ด ไม่ได้เก็บลงเครื่อง
const LIST = 'aigo.trips.v1';
const OLD = 'aigo.trip.v1'; // รุ่นแรกเก็บได้ทริปเดียว ย้ายเข้ารายการตอนเปิดแอป

/** งานที่แชตส่งต่อให้หน้างานของ AiGo: สร้างแผนจริงจากสรุปทริป พร้อมเที่ยวบิน ที่พัก ร้าน และบริการที่ AI หาไว้ในแชต */
export type Pending = { request: GenRequest; people: number; messages: ChatMessage[]; cards?: ChatCard[] };

type Ctx = {
  ready: boolean; trip: AppTrip; trips: AppTrip[];
  /** เก็บทริป (แทนทริปเดิมที่ id ตรงกัน) แล้วเปิดเป็นทริปปัจจุบัน */
  setTrip: (t: AppTrip) => void;
  openTrip: (id: string) => void;
  /** ลบทริปที่เปิดอยู่ ทริปถัดไปขึ้นมาแทน */
  removeTrip: () => void;
  pending: Pending | null; setPending: (p: Pending | null) => void;
  /** AiGo กำลังสร้างวันที่เหลือของทริปนี้ (ไม่เก็บลงเครื่อง: ปิดแอปกลางทาง วันที่ยังไม่มาเป็นวันว่าง) */
  planning: boolean; setPlanning: (p: boolean) => void;
};
const TripContext = createContext<Ctx | null>(null);

export function TripProvider({ children }: { children: ReactNode }) {
  const [trips, setTrips] = useState<AppTrip[]>([]);
  const [ready, setReady] = useState(false);
  const [pending, setPending] = useState<Pending | null>(null);
  const [planning, setPlanning] = useState(false);
  useEffect(() => {
    AsyncStorage.multiGet([LIST, OLD])
      .then(([[, list], [, old]]) => {
        if (list) return setTrips(JSON.parse(list));
        if (!old) return;
        const moved = [JSON.parse(old)];
        setTrips(moved);
        AsyncStorage.setItem(LIST, JSON.stringify(moved)).then(() => AsyncStorage.removeItem(OLD)).catch(() => {});
      })
      .catch(() => {}) // อ่านไม่ได้ก็ใช้ทริปตัวอย่าง (ไม่เขียนทับของเดิม)
      .finally(() => setReady(true));
  }, []);
  // เขียนลงเครื่องเฉพาะตอนผู้ใช้เปลี่ยนรายการ; ใช้ค่าล่าสุดเสมอ เพราะหน้างานเรียก setTrip ต่อเนื่องระหว่างสร้างแผน
  const update = (fn: (cur: AppTrip[]) => AppTrip[]) => setTrips((cur) => {
    const next = fn(cur);
    AsyncStorage.setItem(LIST, JSON.stringify(next)).catch(() => {});
    return next;
  });
  const setTrip = (t: AppTrip) => update((cur) => [t, ...cur.filter((x) => x.id !== t.id)]);
  const openTrip = (id: string) => update((cur) => { const t = cur.find((x) => x.id === id); return t ? [t, ...cur.filter((x) => x.id !== id)] : cur; });
  const removeTrip = () => update((cur) => cur.slice(1));
  return (
    <TripContext.Provider value={{ ready, trip: trips[0] ?? sample, trips, setTrip, openTrip, removeTrip, pending, setPending, planning, setPlanning }}>
      {children}
    </TripContext.Provider>
  );
}

export function useTrip() {
  const ctx = useContext(TripContext);
  if (!ctx) throw new Error('useTrip must be used inside TripProvider');
  return ctx;
}

/** อีกกี่วันถึงวันเริ่มทริป (นับเป็นวัน ไม่สนเวลา) ทริปที่เริ่มแล้วได้ 0 */
export function daysUntil(startDate: string, now = new Date()) {
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.max(0, Math.round((Date.parse(startDate + 'T00:00:00Z') - today) / 86400000));
}
