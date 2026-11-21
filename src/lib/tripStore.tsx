import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { trip as sample } from '@/data/trip';
import { useAuth } from '@/lib/auth';
import { planStatus, type ChatMessage } from '@/lib/backend';
import type { ChatCard } from '@/lib/chat';
import { planGone, withPlanState, type AppTrip, type GenRequest, type PlanState } from '@/lib/itinerary';
import { supabase } from '@/lib/supabase';

// ทริปของผู้ใช้ เก็บในเครื่องให้เปิดได้แม้ไม่มีเน็ต ทริปแรกในรายการคือทริปที่เปิดอยู่ ทริปเก่ายังอยู่ครบ (R33)
// เข้าสู่ระบบแล้วมีสำเนาในตาราง user_trips ด้วย (supabase/user_trips.sql)
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
  /** ใส่คำตอบสถานะงานจากเซิร์ฟเวอร์ลงทริป id นั้น: สถานะของแผนมาจากเซิร์ฟเวอร์เสมอ ไม่ตั้งเองในเครื่องก่อน */
  applyPlan: (id: string, s: PlanState) => void;
  pending: Pending | null; setPending: (p: Pending | null) => void;
  /** เซิร์ฟเวอร์กำลังวางแผนทริปที่เปิดอยู่ (วันที่ยังไม่มาเป็นวันว่าง) */
  planning: boolean;
};
const TripContext = createContext<Ctx | null>(null);

export function TripProvider({ children }: { children: ReactNode }) {
  const [trips, setTrips] = useState<AppTrip[]>([]);
  const [ready, setReady] = useState(false);
  const [pending, setPending] = useState<Pending | null>(null);
  const uid = useAuth().user?.id;
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
  // เขียนลงเครื่องเฉพาะตอนรายการเปลี่ยน; ใช้ค่าล่าสุดเสมอ เพราะวันใหม่ของแผนมาต่อเนื่องระหว่างเซิร์ฟเวอร์วางแผน
  const update = (fn: (cur: AppTrip[]) => AppTrip[]) => setTrips((cur) => {
    const next = fn(cur);
    if (next !== cur) AsyncStorage.setItem(LIST, JSON.stringify(next)).catch(() => {});
    return next;
  });
  const setTrip = (t: AppTrip) => update((cur) => [t, ...cur.filter((x) => x.id !== t.id)]);
  const applyPlan = (id: string, s: PlanState) => update((cur) => {
    let changed = false;
    const next = cur.map((x) => { if (x.id !== id) return x; const y = withPlanState(x, s); changed ||= y !== x; return y; });
    return changed ? next : cur;
  });
  const openTrip = (id: string) => update((cur) => { const t = cur.find((x) => x.id === id); return t ? [t, ...cur.filter((x) => x.id !== id)] : cur; });
  const removeTrip = () => {
    const id = trips[0]?.id;
    update((cur) => cur.slice(1));
    if (uid && id) supabase.from('user_trips').delete().eq('id', id).then(({ error }) => { if (error) console.warn('trip delete', error.message); });
  };

  // เข้าสู่ระบบแล้ว (R20): ทริปที่อยู่ในบัญชีแต่ไม่อยู่ในเครื่อง (เช่น เครื่องใหม่) ดึงลงมาต่อท้าย ทริปในเครื่องเป็นหลักเสมอ
  useEffect(() => {
    if (!ready || !uid) return;
    let gone = false;
    supabase.from('user_trips').select('id, data').order('updated_at', { ascending: false }).then(({ data, error }) => {
      if (error) console.warn('trip download', error.message);
      if (gone || !data?.length) return;
      update((cur) => {
        const extra = data.map((r) => r.data as AppTrip).filter((t) => !cur.some((x) => x.id === t.id));
        return extra.length ? [...cur, ...extra] : cur;
      });
    });
    return () => { gone = true; };
  }, [ready, uid]);
  // ส่งสำเนาทริปในเครื่องขึ้นบัญชีเมื่อรายการนิ่ง 2 วินาที (ระหว่างสร้างแผน วันใหม่มาถี่) ส่งไม่ได้ก็ไม่เป็นไร ทริปยังอยู่ในเครื่อง
  useEffect(() => {
    if (!ready || !uid || !trips.length) return;
    const timer = setTimeout(() => {
      const at = new Date().toISOString();
      supabase.from('user_trips').upsert(trips.map((t) => ({ user_id: uid, id: t.id, data: t, updated_at: at })))
        .then(({ error }) => { if (error) console.warn('trip upload', error.message); });
    }, 2000);
    return () => clearTimeout(timer);
  }, [ready, uid, trips]);
  // แผนที่เซิร์ฟเวอร์ยังวางไม่เสร็จ: ถามทุก 3 วินาทีระหว่างแอปอยู่บนจอ (หน้าไหนก็ได้) แล้วเติมวันใหม่ลงทริป
  // พับหรือปิดแอปไว้ เซิร์ฟเวอร์ก็ยังทำต่อ เปิดแอปครั้งหน้าก็ถามต่อจนเสร็จ
  const running = trips.filter((t) => t.plan?.status === 'running');
  const runningKey = running.map((t) => `${t.id}:${t.plan!.days.length}`).join();
  useEffect(() => {
    if (!ready || !runningKey) return;
    let gone = false;
    const tick = async () => {
      if (AppState.currentState === 'background') return;
      for (const t of running) {
        // ออฟไลน์: รอบหน้าถามใหม่; 403 = งานไม่อยู่แล้ว (เช่นลบบัญชีแล้ว) จบแผน ไม่ถามต่อไปตลอด
        const s = await planStatus(t.plan!, t.plan!.days.length).catch((e: Error) => (/ 403$/.test(e.message) ? planGone(t) : null));
        if (gone || !s) continue;
        applyPlan(t.id, s);
      }
    };
    tick();
    const timer = setInterval(tick, 3000);
    return () => { gone = true; clearInterval(timer); };
  }, [ready, runningKey]); // eslint-disable-line react-hooks/exhaustive-deps -- key covers which plans and how many days

  const planning = trips[0]?.plan?.status === 'running';
  return (
    <TripContext.Provider value={{ ready, trip: trips[0] ?? sample, trips, setTrip, openTrip, removeTrip, applyPlan, pending, setPending, planning }}>
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
