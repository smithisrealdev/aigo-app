import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { trip as sample } from '@/data/trip';
import type { ChatMessage } from '@/lib/backend';
import type { AppTrip, GenRequest } from '@/lib/itinerary';

// ทริปปัจจุบันของผู้ใช้: เริ่มจากทริปตัวอย่าง พอ AiGo สร้างทริปจริงได้ก็แทนที่ และเก็บในเครื่องให้เปิดได้แม้ไม่มีเน็ต
const KEY = 'aigo.trip.v1';

/** งานที่แชตส่งต่อให้หน้างานของ AiGo: สร้างแผนจริงจากสรุปทริป */
export type Pending = { request: GenRequest; people: number; messages: ChatMessage[] };

type Ctx = {
  ready: boolean; trip: AppTrip; setTrip: (t: AppTrip) => void; resetTrip: () => void;
  pending: Pending | null; setPending: (p: Pending | null) => void;
  /** AiGo กำลังสร้างวันที่เหลือของทริปนี้ (ไม่เก็บลงเครื่อง: ปิดแอปกลางทาง วันที่ยังไม่มาเป็นวันว่าง) */
  planning: boolean; setPlanning: (p: boolean) => void;
};
const TripContext = createContext<Ctx | null>(null);

export function TripProvider({ children }: { children: ReactNode }) {
  const [trip, setState] = useState<AppTrip>(sample);
  const [ready, setReady] = useState(false);
  const [pending, setPending] = useState<Pending | null>(null);
  const [planning, setPlanning] = useState(false);
  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => { if (raw) setState(JSON.parse(raw)); })
      .catch(() => {}) // อ่านไม่ได้ก็ใช้ทริปตัวอย่าง
      .finally(() => setReady(true));
  }, []);
  // เก็บเฉพาะทริปที่ AiGo สร้าง (ไม่มีรูปในเครื่องที่อ้างด้วย require) ทริปตัวอย่างอยู่ในโค้ดอยู่แล้ว
  const setTrip = (t: AppTrip) => { setState(t); AsyncStorage.setItem(KEY, JSON.stringify(t)).catch(() => {}); };
  const resetTrip = () => { setState(sample); AsyncStorage.removeItem(KEY).catch(() => {}); };
  return <TripContext.Provider value={{ ready, trip, setTrip, resetTrip, pending, setPending, planning, setPlanning }}>{children}</TripContext.Provider>;
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
