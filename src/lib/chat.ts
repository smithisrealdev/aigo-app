// แยกคำตอบของ trip-chat (Markdown + โทเคนควบคุมตาม system prompt ของเว็บ) เป็นส่วนที่แอปแสดง
// โทเคน: [QUICK_REPLIES] "- ป้าย|ข้อความที่ส่ง" ต่อบรรทัด, [TRIP_SUMMARY] "key: value" ต่อบรรทัด, [READY_TO_GENERATE]
// บล็อกวิดเจ็ตอื่น ([FLIGHTS] [HOTELS] [TICKETS] [SERVICES] …) ไม่แสดงในแชต เพราะแอปให้ AiGo หาเที่ยวบินและที่พักในหน้างานของ AiGo แทน

export type QuickReply = { label: string; message: string };
export type TripSummary = Partial<Record<'destination' | 'startDate' | 'endDate' | 'duration' | 'budget' | 'travelers' | 'tripStyle', string>>;
export type Reply = { text: string; quickReplies: QuickReply[]; summary: TripSummary | null; ready: boolean };

const block = (raw: string, tag: string) => raw.match(new RegExp(`\\[${tag}\\]([\\s\\S]*?)\\[\\/${tag}\\]`))?.[1] ?? null;

/** แปลงข้อความดิบเป็นส่วนที่แสดง; streaming = ยังรับไม่ครบ จึงซ่อนบล็อกที่เปิดแล้วยังไม่ปิดและแท็กที่ขาดครึ่ง */
export function parseReply(raw: string, streaming = false): Reply {
  const qr = block(raw, 'QUICK_REPLIES');
  const quickReplies = (qr ?? '').split('\n').map((l) => l.trim().replace(/^[-*•]\s*/, '')).filter(Boolean).map((l) => {
    const [label, ...rest] = l.split('|');
    return { label: label.trim(), message: (rest.join('|') || label).trim() };
  });
  const ts = block(raw, 'TRIP_SUMMARY');
  let summary: TripSummary | null = null;
  if (ts) {
    summary = {};
    for (const line of ts.split('\n')) {
      const m = line.match(/^\s*(destination|startDate|endDate|duration|budget|travelers|tripStyle)\s*:\s*(.+?)\s*$/);
      if (m) summary[m[1] as keyof TripSummary] = m[2];
    }
  }
  let text = raw.replace(/\[([A-Z_]{3,})\][\s\S]*?\[\/\1\]/g, '');
  // [READY_TO_GENERATE] ไม่มีแท็กปิดอยู่แล้ว จึงไม่นับเป็นบล็อกที่ยังรับไม่ครบ
  if (streaming) text = text.replace(/\[(?!READY_TO_GENERATE\])([A-Z_]{3,})\](?![\s\S]*\[\/\1\])[\s\S]*$/, '').replace(/\[[A-Z_/]*$/, '');
  text = text
    .replace(/\[\/?[A-Z_]{3,}\]/g, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/^>\s?/gm, '')
    .replace(/^\s*[-*]\s+/gm, '• ')
    .replace(/^-{3,}\s*$/gm, '')
    // ตาราง Markdown: ตัดแถวเส้นคั่น แถวอื่นเหลือเป็นข้อความคั่นด้วย ·
    .replace(/^[ \t]*\|?[ \t]*:?-{2,}:?[ \t]*(\|[ \t]*:?-{2,}:?[ \t]*)*\|?[ \t]*$/gm, '')
    .replace(/^[ \t]*\|(.+)\|[ \t]*$/gm, (_m, row: string) => row.split('|').map((c) => c.trim()).filter(Boolean).join(' · '))
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return { text, quickReplies, summary, ready: raw.includes('[READY_TO_GENERATE]') };
}

/** ข้อความที่เพิ่มมาจากหนึ่งบรรทัดของ SSE แบบ OpenRouter; บรรทัดอื่น (ความเห็น ": …", [DONE]) ได้สตริงว่าง */
export function sseDelta(line: string): string {
  if (!line.startsWith('data:')) return '';
  const data = line.slice(5).trim();
  if (!data || data === '[DONE]') return '';
  let json: { choices?: { delta?: { content?: string } }[]; error?: { message?: string } };
  try { json = JSON.parse(data); } catch { return ''; }
  if (json.error) throw new Error(json.error.message ?? 'stream error');
  return json.choices?.[0]?.delta?.content ?? '';
}

const MONTHS = { th: ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'], en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] };
/** "2026-12-12" → "12 ธ.ค." หรือ "12 Dec"; รูปแบบอื่นคืนตามเดิม */
export function shortDate(iso: string, lang: 'th' | 'en') {
  const m = iso.match(/^\d{4}-(\d{2})-(\d{2})$/);
  return m ? `${Number(m[2])} ${MONTHS[lang][Number(m[1]) - 1] ?? ''}`.trim() : iso;
}
