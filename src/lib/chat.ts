// แยกคำตอบของ trip-chat (Markdown + โทเคนควบคุมตาม system prompt) เป็นส่วนที่แอปแสดง
// โทเคน: [QUICK_REPLIES] "- ป้าย|ข้อความที่ส่ง" ต่อบรรทัด, [TRIP_SUMMARY] "key: value" ต่อบรรทัด, [READY_TO_GENERATE]
// การ์ด (DIRECTIVE 12): [PLACE] [FLIGHT] [HOTEL] [RESTAURANT] [TICKET] [SERVICE] "key: value | key: value" แอปแสดงเป็นการ์ดมีรูปและลิงก์จอง

/** go = ปุ่มสร้างแผน (ป้ายขึ้นต้นด้วย 🚀 ตาม system prompt) */
export type QuickReply = { label: string; message: string; go?: boolean };
export type TripSummary = Partial<Record<'destination' | 'startDate' | 'endDate' | 'duration' | 'budget' | 'travelers' | 'tripStyle', string>>;
export type CardKind = 'place' | 'flight' | 'hotel' | 'food' | 'ticket' | 'service';
/** การ์ดหนึ่งใบจากคำตอบของ AI: ชื่อเป็นภาษาอังกฤษ (ใช้ค้นรูปและแผนที่) ราคาเป็นค่าประมาณของ AI */
export type ChatCard = {
  kind: CardKind; name: string; area?: string; why?: string; price?: string; rating?: string; cuisine?: string;
  airline?: string; from?: string; to?: string; date?: string; departure?: string; type?: string; provider?: string;
};
export type Reply = { text: string; quickReplies: QuickReply[]; summary: TripSummary | null; ready: boolean; cards: ChatCard[] };

const CARD_KIND: Record<string, CardKind> = { PLACE: 'place', FLIGHT: 'flight', HOTEL: 'hotel', RESTAURANT: 'food', TICKET: 'ticket', SERVICE: 'service' };
const FIELDS = ['name', 'area', 'city', 'why', 'highlights', 'description', 'price', 'rating', 'cuisine', 'category', 'airline', 'iata', 'from', 'to', 'date', 'departure', 'type', 'provider'];
const FIELD = new RegExp(`(?:^|[\\s|])(${FIELDS.join('|')})\\s*:\\s*`, 'gi');

/** "name: X | area: Y" หรือ "name: X area: Y" (รูปแบบเดิมใน DIRECTIVE 7) เป็น { name, area } */
function fields(body: string): Record<string, string> {
  const marks = [...body.matchAll(FIELD)];
  const out: Record<string, string> = {};
  marks.forEach((m, i) => {
    const value = body.slice(m.index + m[0].length, i + 1 < marks.length ? marks[i + 1].index : body.length).replace(/^[\s|]+|[\s|]+$/g, '');
    if (value) out[m[1].toLowerCase()] = value;
  });
  return out;
}

/** การ์ดที่ได้รับครบแล้วในคำตอบ ตามลำดับที่ AI เขียน; ใบที่ไม่มีชื่อข้ามไป */
export function cardsOf(raw: string): ChatCard[] {
  return [...raw.matchAll(/\[(PLACE|FLIGHT|HOTEL|RESTAURANT|TICKET|SERVICE)\]([\s\S]*?)\[\/\1\]/g)].flatMap((m) => {
    const f = fields(m[2]);
    const kind = CARD_KIND[m[1]];
    const name = f.name ?? (kind === 'flight' ? f.airline : undefined);
    if (!name) return [];
    return [{
      kind, name, area: f.area ?? f.city, why: f.why ?? f.highlights ?? f.description, price: f.price, rating: f.rating, cuisine: f.cuisine ?? f.category,
      airline: f.airline, from: f.from, to: f.to, date: f.date, departure: f.departure, type: f.type, provider: f.provider,
    }];
  });
}

// ดีไซน์ไม่ใช้อีโมจิ: ตัดอีโมจิและสัญลักษณ์ภาพที่ AI ใส่มาออกจากข้อความและปุ่ม (ช่วงอักขระชัดเจน ไม่พึ่ง \p{} ของ regex)
const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}\u{20E3}]/gu;
const noEmoji = (s: string) => s.replace(EMOJI, '').replace(/[ \t]{2,}/g, ' ').replace(/^[ \t]+/gm, '');

const block = (raw: string, tag: string) => raw.match(new RegExp(`\\[${tag}\\]([\\s\\S]*?)\\[\\/${tag}\\]`))?.[1] ?? null;

/** แปลงข้อความดิบเป็นส่วนที่แสดง; streaming = ยังรับไม่ครบ จึงซ่อนบล็อกที่เปิดแล้วยังไม่ปิดและแท็กที่ขาดครึ่ง */
export function parseReply(raw: string, streaming = false): Reply {
  const qr = block(raw, 'QUICK_REPLIES');
  const quickReplies = (qr ?? '').split('\n').map((l) => l.trim().replace(/^[-*•]\s*/, '')).filter(Boolean).map((l) => {
    const [label, ...rest] = l.split('|');
    return { label: noEmoji(label).trim(), message: noEmoji(rest.join('|') || label).trim(), go: /^\s*🚀/u.test(label) };
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
  text = noEmoji(text).trim();
  return { text, quickReplies, summary, ready: raw.includes('[READY_TO_GENERATE]'), cards: cardsOf(raw) };
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
