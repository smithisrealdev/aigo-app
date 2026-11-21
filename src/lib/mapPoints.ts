// หมุดบนแผนที่ของหนึ่งวัน (สเปก R12 และ docs/superpowers/specs/2026-11-21-in-app-map-design.md)
// ใช้ทั้งแผนที่ Mapbox (src/components/tripMap.native.tsx) และแผนที่วาดบนเว็บ (src/components/tripMap.tsx)
import type { StyleProp, ViewStyle } from 'react-native';

export type MapPoint = { key: string; lat: number; lon: number; n: number; label: string; approx: boolean };

export type TripMapProps = {
  points: MapPoint[];
  /** key ของหมุดที่เลือก: ใหญ่กว่าและสีต่าง */
  selected?: string;
  onSelect?: (key: string) => void;
  /** false = ภาพแผนที่เฉยๆ (หัวหน้าแผน) เลื่อนหรือซูมไม่ได้ */
  interactive?: boolean;
  /** แสดงตำแหน่งของเรา (ขอสิทธิ์เฉพาะตอนเปิดแอป) */
  showUser?: boolean;
  /** ระยะเว้นขอบเป็นสัดส่วนของกรอบ ให้หมุดไม่ไปอยู่ใต้ปุ่มหรือแผ่นข้อมูล (โลโก้และเครดิตแผนที่อยู่เหนือขอบล่างนี้) */
  pad: { top: number; bottom: number; x: number };
  style?: StyleProp<ViewStyle>;
};

const FAR_KM = 50;
/** พิกัดที่ตรวจแล้ว (บทความ Wikipedia) ใช้แทนของ AI เมื่อห่างกันไม่เกินนี้ เกินนี้อาจเป็นที่ชื่อเดียวกันในเมืองอื่น */
const CHECK_KM = 5;
const median = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const km = (a: { lat: number; lon: number }, b: { lat: number; lon: number }) => {
  const r = Math.PI / 180;
  const h = Math.sin(((b.lat - a.lat) * r) / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(((b.lon - a.lon) * r) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
};

/**
 * หมุดของหนึ่งวัน: เลขตามลำดับในแผน (ที่ที่ไม่ได้ปักยังนับเลข) ที่ที่ไม่มีพิกัด หรือห่างจากกลางกลุ่มของวันเกิน 50 กม.
 * ไม่ปัก (missing) เพราะพิกัดจาก AI เดาเอง ผิดแบบนี้บนแผนที่จริงจะเห็นชัด
 * checked = พิกัดที่ตรวจแล้วของที่นั้น (ทริปตัวอย่างใช้พิกัดของตัวเอง ทริปอื่นใช้พิกัดของบทความ Wikipedia จาก place-photos):
 * ห่างจากของ AI ไม่เกิน 5 กม. ปักที่พิกัดที่ตรวจแล้ว ที่เหลือปักที่พิกัดของ AI เป็น "ตำแหน่งโดยประมาณ"
 */
export function dayPoints<P extends { id: string; lat: number; lon: number }>(places: P[], label: (p: P) => string, checked: (p: P) => { lat: number; lon: number } | undefined): { points: MapPoint[]; missing: string[] } {
  // พิกัดนอกช่วงของโลก (AI สลับละติจูดกับลองจิจูด) ห้ามส่งให้ Mapbox: ถือว่าไม่มีพิกัด
  const located = places.filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lon) && (p.lat || p.lon) && Math.abs(p.lat) <= 90 && Math.abs(p.lon) <= 180);
  const centre = { lat: median(located.map((p) => p.lat)), lon: median(located.map((p) => p.lon)) };
  const points: MapPoint[] = [];
  const missing: string[] = [];
  places.forEach((p, i) => {
    if (!located.includes(p) || km(p, centre) > FAR_KM) missing.push(p.id);
    else {
      const c = checked(p);
      const ok = !!c && km(p, c) <= CHECK_KM;
      points.push({ key: p.id, lat: ok ? c.lat : p.lat, lon: ok ? c.lon : p.lon, n: i + 1, label: label(p), approx: !ok });
    }
  });
  return { points, missing };
}

/** ที่ที่ "นำทาง" พาไป: หมุดของที่นั้น (ตำแหน่งที่ตรวจแล้วถ้ามี); ไม่ได้ปักหมุด (ไม่มีพิกัด หรือพิกัดไกลผิดเมือง) ใช้ชื่อกับเมือง ไม่ใช้พิกัดของ AI */
export function navTarget(p: { id: string; name: string }, points: MapPoint[], city: string): { name: string; lat?: number; lon?: number } {
  const pin = points.find((x) => x.key === p.id);
  return pin ? { name: p.name, lat: pin.lat, lon: pin.lon } : { name: `${p.name}, ${city}` };
}

/**
 * แผนที่โหลดไม่ขึ้นจริง (ใช้แผนที่วาดแทน) เฉพาะเมื่อสไตล์โหลดไม่ได้หรือไม่บอกชนิด; ไทล์ รูป หรือแหล่งข้อมูลบางชิ้นพลาด
 * (เน็ตหลุดสั้นๆ บนรถไฟใต้ดิน) แผนที่ยังใช้ได้ และ Mapbox โหลดใหม่เอง
 */
export const mapLoadFailed = (e?: { error?: string; type?: string }) => !e?.type || e.type === 'style';
