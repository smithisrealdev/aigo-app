import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import { Easing, useReducedMotion } from 'react-native-reanimated';

import { liveSetting } from '@/lib/liveSetting';

// ค่าการเคลื่อนไหวชุดเดียวของแอป ตามค่าของ Animate UI (.claude/skills/animate-ui/references/tokens.md) แปลงเป็นของ Reanimated
// สปริงเป็นคู่ stiffness/damping (mass 1) แบบเดียวกับ Motion จึงได้จังหวะเดียวกัน; ขยับเฉพาะ transform กับ opacity
export const spring = {
  /** กดปุ่ม: ถึงที่ในราว 120 ms */
  press: { stiffness: 550, damping: 30, mass: 1 },
  /** เนื้อหาเข้ามา */
  entrance: { stiffness: 200, damping: 20, mass: 1 },
  /** ของที่ขยับหลบให้ของที่เพิ่มหรือหายไป ไม่เลยเป้า */
  reflow: { stiffness: 500, damping: 40, mass: 1 },
  /** ตัวเลือกที่เลื่อนไปมา (แท็บ แคปซูล) */
  selection: { stiffness: 300, damping: 30, mass: 1 },
  /** แถบคืบหน้า: ไม่เลยเป้า */
  progress: { stiffness: 300, damping: 35, mass: 1 },
  /** toast ขึ้นจากขอบ */
  toast: { stiffness: 280, damping: 24, mass: 1 },
  /** เครื่องหมายสำเร็จเด้ง */
  checkPop: { stiffness: 500, damping: 24, mass: 1 },
} as const;

export const ease = {
  /** ของที่เข้าหรือออก: เริ่มเร็ว ตอบตั้งแต่เฟรมแรก */
  out: Easing.bezier(0.23, 1, 0.32, 1),
  /** ของที่ตาจ้องดูมันเปลี่ยน (แผ่นเลื่อนเข้า) */
  soft: Easing.bezier(0.215, 0.61, 0.355, 1),
  /** ลิ้นชัก: ตอบทันทีและเลยไปนิดเดียว */
  drawer: Easing.bezier(0.34, 1.2, 0.64, 1),
};

export const tween = {
  reveal: { duration: 300, easing: ease.out },
  sheet: { duration: 400, easing: ease.soft },
  drawer: { duration: 400, easing: ease.drawer },
  /** ของที่ปิดทิ้ง: ไปทันที เร็วกว่าตอนมา */
  dismiss: { duration: 200, easing: Easing.bezier(0.33, 0.17, 0.67, 0.5) },
};

/** กดแล้วยุบเท่านี้: ปุ่มและชิป / ทั้งการ์ดหรือแถว (ใหญ่กว่า จึงยุบน้อยกว่า) / toast เข้ามาจากขนาดนี้ */
export const scale = { press: 0.97, choice: 0.985, toast: 0.96 } as const;

// "ลดการเคลื่อนไหว" ของเครื่องตอนนี้: useReducedMotion ของ Reanimated เป็นค่าตอนเปิดแอป เปิดในตั้งค่าทีหลังจึงไม่มีผล
export const reduceMotionNow = liveSetting(() => AccessibilityInfo.isReduceMotionEnabled(), (f) => AccessibilityInfo.addEventListener('reduceMotionChanged', f));

/** "ลดการเคลื่อนไหว" ล่าสุด หน้าจอวาดใหม่เมื่อผู้ใช้เปลี่ยน: เนื้อหาจางเข้าโดยไม่ขยับ แอนิเมชันวนหยุด */
export function useReduceMotion(): boolean {
  const startup = useReducedMotion();
  const [on, setOn] = useState(() => reduceMotionNow() ?? startup);
  useEffect(() => {
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setOn);
    return () => sub.remove();
  }, []);
  return on;
}
