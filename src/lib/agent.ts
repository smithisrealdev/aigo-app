// หลักการ AI Agent (docs/requirements.md หมวด 1a): AiGo ทำเองได้ทุกอย่างที่ไม่เสียเงินและย้อนกลับได้ แล้วแจ้งพร้อมปุ่มเลิกทำ
// ทุกอย่างที่เสียเงิน ย้อนกลับไม่ได้ หรือส่งข้อมูลส่วนตัวให้คนอื่น ต้องรอผู้ใช้อนุมัติ

export type Action = {
  id: string;
  title: string;
  costBaht: number; // 0 = ไม่เสียเงิน
  reversible: boolean;
  sharesPersonalData?: boolean;
};

export type Decision = 'auto' | 'approve';

/** ตัดสินว่า AiGo ทำเองได้เลย หรือต้องรอผู้ใช้กดอนุมัติ; autoEdit = สวิตช์ "ให้ AiGo แก้แผนเองได้" ในบัญชี */
export function decide(a: Action, autoEdit = true): Decision {
  if (a.costBaht > 0 || !a.reversible || a.sharesPersonalData) return 'approve';
  return autoEdit ? 'auto' : 'approve';
}

export type Task = { id: string; label: string; state: 'done' | 'now' | 'wait' };

/** ข้อความสถานะของงาน ต้องมีคำกำกับเสมอ ไม่บอกด้วยสีอย่างเดียว */
export const stateWord = (s: Task['state']) => ({ done: 'เสร็จ', now: 'กำลังทำ', wait: 'รอ' })[s];
