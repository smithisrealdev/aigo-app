export type Lang = 'th' | 'en';
/** ข้อความเนื้อหาสองภาษา ใช้กับข้อมูลทริปและคำพูดของ AiGo */
export type L = { th: string; en: string };

const th = {
  'tab.aigo': 'AiGo', 'tab.trips': 'ทริป',
  'home.title': 'ไปไหนดี?', 'home.sub': 'บอกครั้งเดียว AiGo วางแผน หาตั๋ว เช็กวีซ่า และดูแลระหว่างเที่ยวให้เอง',
  'home.label': 'บอกครั้งเดียว ที่เหลือ AiGo จัดการ', 'home.placeholder': 'เช่น ไปโอซาก้า 5 วัน กับแฟน งบ 40,000 บาท',
  'home.go': 'ให้ AiGo จัดการ', 'home.mic': 'พูดแทนพิมพ์', 'home.popular': 'ทริปยอดนิยม', 'home.other': 'หรือสั่งงานอื่น',
  'chat.title': 'วางแผนทริป', 'chat.sub': 'AiGo ถามไม่เกิน 2 ข้อ แล้วสรุปทริปให้', 'chat.ask': 'ไปช่วงไหนดี บอกเดือนคร่าวๆ ก็ได้',
  'chat.ack': 'ได้เลย ช่วงนั้นโอซาก้าหนาว ฉันจะสลับที่เที่ยวในร่มไว้ให้ ดูสรุปนี้ว่าตรงไหม', 'chat.understood': 'AiGo เข้าใจแล้ว {n} จาก {total}',
  'chat.go': 'ให้ AiGo จัดการทั้งหมด', 'chat.placeholder': 'พิมพ์เพิ่มได้ เช่น อยากไปออนเซ็น',
  'work.title': 'AiGo กำลังจัดการ', 'work.intro': 'ฉันจัดการให้ครบเอง ไม่ต้องรอหน้านี้ เสร็จแล้วจะแจ้ง จะถามคุณแค่ตอนที่ต้องจ่ายเงิน',
  'work.waiting': 'รอคุณอนุมัติ {n} รายการ', 'work.see': 'ดูและอนุมัติ', 'work.tell': 'บอก AiGo เพิ่มได้ เช่น ขอที่พักมีอ่างอาบน้ำ',
  'appr.title': 'รอคุณอนุมัติ', 'appr.sub': '{n} รายการ · ที่เหลือ AiGo ทำให้แล้ว', 'appr.paid': 'ต้องจ่ายเงิน จึงรอคุณกดอนุมัติ',
  'appr.why': 'ทำไมเลือกอันนี้: {x}', 'appr.go': 'อนุมัติ ไปจ่าย', 'appr.other': 'ขอตัวเลือกอื่น', 'appr.done': 'AiGo ทำให้แล้ว ไม่ต้องทำอะไร',
  'appr.undo': 'เลิกทำ', 'appr.undone': 'เลิกทำแล้ว', 'appr.approved': 'อนุมัติแล้ว เปิดหน้าจองให้แล้ว', 'appr.none': 'ไม่มีอะไรรออนุมัติ',
  'price.real': 'ราคาจริง · {src} · ดึง {at}', 'price.est': 'AiGo ประมาณ · ยังไม่มีราคาจริง',
  'trips.title': 'ทริปของคุณ', 'trips.sub': '{n} ทริป · เก็บไว้ในเครื่องแล้ว', 'trips.next': 'ทริปถัดไป · อีก {n} วัน', 'trips.open': 'เปิดแผน',
  'trips.offline': 'เปิดได้ไม่ต้องมีเน็ต', 'trips.checklist': 'ก่อนเดินทาง · เสร็จ {n} จาก {total}', 'trips.new': 'วางแผนทริปใหม่',
  'trips.waiting': 'เที่ยวบินกับที่พักรอคุณอนุมัติ {n} รายการ ฉันหาและเทียบราคาให้แล้ว',
  'it.verified': 'ตรวจแล้ว {n} จาก {total} ที่', 'it.verifiedBody': 'ทุกที่เปิดในเวลาที่จัดไว้ ตรวจล่าสุด {at}', 'it.day': 'วันที่ {n}',
  'it.tell': 'บอก AiGo เช่น ขอร้านราเมนเพิ่ม', 'it.open': 'ตรวจแล้ว เปิดอยู่', 'it.unchecked': 'ยังไม่ได้ตรวจ',
  'place.checked': 'ตรวจแล้ววันนี้ {at}', 'place.open': 'ยังเปิดกิจการ และเปิดในเวลาที่คุณจะไป', 'place.source': 'ที่มา: {x}',
  'place.tip': 'AiGo แนะนำ', 'place.duration': 'ใช้เวลา', 'place.askMore': 'ถาม AiGo ต่อ', 'place.navigate': 'นำทางไปที่นี่',
  'toast.sent': 'ส่งให้ AiGo แล้ว จะปรับให้แล้วแจ้งคุณ', 'toast.mic': 'พูดสั่งงานยังใช้ไม่ได้ในรุ่นทดลองนี้ พิมพ์แทนได้เลย',
  'toast.other': 'AiGo กำลังหาตัวเลือกใหม่ให้ เจอแล้วจะแจ้ง', 'toast.share': 'แชร์ทริปยังใช้ไม่ได้ในรุ่นทดลองนี้', 'toast.ask': 'ถาม AiGo แล้ว: {x}',
  'appr.opening': 'กำลังเปิดหน้าจอง…', 'appr.opened': 'เปิดหน้าจองแล้ว', 'chat.thinking': 'AiGo กำลังคิด…', 'it.dayA11y': 'วันที่ {n}',
  'common.back': 'กลับ', 'common.send': 'ส่งข้อความ', 'common.sample': 'ข้อมูลตัวอย่าง ยังไม่ได้ต่อระบบจริง',
} as const;

export type Key = keyof typeof th;

const en: Record<Key, string> = {
  'tab.aigo': 'AiGo', 'tab.trips': 'Trips',
  'home.title': 'Where to?', 'home.sub': 'Say it once. AiGo plans, finds tickets, checks visas and looks after you on the trip.',
  'home.label': 'Say it once, AiGo handles the rest', 'home.placeholder': 'e.g. Osaka for 5 days with my partner, 40,000 baht',
  'home.go': 'Let AiGo handle it', 'home.mic': 'Speak instead of typing', 'home.popular': 'Popular trips', 'home.other': 'Or ask for something else',
  'chat.title': 'Plan a trip', 'chat.sub': 'AiGo asks at most 2 questions, then sums up your trip', 'chat.ask': 'When do you want to go? A rough month is fine',
  'chat.ack': 'Got it. Osaka is cold then, so I will lean on indoor places. Does this summary look right?', 'chat.understood': 'AiGo understood {n} of {total}',
  'chat.go': 'Let AiGo handle everything', 'chat.placeholder': 'Add more, e.g. I want an onsen',
  'work.title': 'AiGo is on it', 'work.intro': 'I will handle everything. No need to wait here; I will let you know. I only ask when you need to pay.',
  'work.waiting': '{n} waiting for your approval', 'work.see': 'Review and approve', 'work.tell': 'Tell AiGo more, e.g. a hotel with a bathtub',
  'appr.title': 'Waiting for you', 'appr.sub': '{n} items · AiGo did the rest', 'appr.paid': 'These cost money, so AiGo waits for you',
  'appr.why': 'Why this one: {x}', 'appr.go': 'Approve & pay', 'appr.other': 'Other options', 'appr.done': 'Done by AiGo, nothing to do',
  'appr.undo': 'Undo', 'appr.undone': 'Undone', 'appr.approved': 'Approved. The booking page is open.', 'appr.none': 'Nothing waiting for approval',
  'price.real': 'Real price · {src} · fetched {at}', 'price.est': 'AiGo estimate · no real price yet',
  'trips.title': 'Your trips', 'trips.sub': '{n} trip · saved on this phone', 'trips.next': 'Next trip · in {n} days', 'trips.open': 'Open plan',
  'trips.offline': 'Works offline', 'trips.checklist': 'Before you go · {n} of {total} done', 'trips.new': 'Plan a new trip',
  'trips.waiting': '{n} flight and hotel items are waiting for you. I found and compared them.',
  'it.verified': '{n} of {total} places checked', 'it.verifiedBody': 'All open at the planned times. Last checked {at}', 'it.day': 'Day {n}',
  'it.tell': 'Tell AiGo, e.g. add a ramen shop', 'it.open': 'Checked, open', 'it.unchecked': 'Not checked yet',
  'place.checked': 'Checked today {at}', 'place.open': 'Still in business and open when you go', 'place.source': 'Source: {x}',
  'place.tip': 'AiGo suggests', 'place.duration': 'Time needed', 'place.askMore': 'Ask AiGo more', 'place.navigate': 'Navigate here',
  'toast.sent': 'Sent to AiGo. It will adjust and let you know', 'toast.mic': 'Voice is not available in this preview yet. Type instead',
  'toast.other': 'AiGo is looking for other options and will tell you', 'toast.share': 'Sharing is not available in this preview yet', 'toast.ask': 'Asked AiGo: {x}',
  'appr.opening': 'Opening booking page…', 'appr.opened': 'Booking page opened', 'chat.thinking': 'AiGo is thinking…', 'it.dayA11y': 'Day {n}',
  'common.back': 'Back', 'common.send': 'Send message', 'common.sample': 'Sample data, not connected yet',
};

const DICT: Record<Lang, Record<Key, string>> = { th, en };

export function translate(lang: Lang, key: Key, vars?: Record<string, string | number>): string {
  let s: string = DICT[lang][key];
  if (vars) for (const k in vars) s = s.split('{' + k + '}').join(String(vars[k]));
  return s;
}
