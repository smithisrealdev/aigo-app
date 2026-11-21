import type { IconName } from '@/components/icon';
import type { L } from '@/lib/i18n';

// แอปท้องถิ่นและของที่ช่วยให้เดินทางสะดวก แยกตามประเทศ สำหรับคนไทยที่เที่ยวต่างประเทศ (คัดเองและเช็กกับเว็บเมื่อ พ.ย. 2026)
// shortcut: รายการอยู่ในแอป แอปเปลี่ยนชื่อหรือเลิกให้บริการต้องแก้ไฟล์นี้และออกรุ่นใหม่; ย้ายไปตารางใน Supabase ถ้าต้องแก้บ่อย
export const KIT_CHECKED: L = { th: 'พ.ย. 2026', en: 'Nov 2026' };

export type KitItem = {
  name: L;
  what: L;
  /** before = ทำที่บ้านก่อนบิน (โหลด ผูกบัตร ลงทะเบียน), there = ใช้ตอนอยู่ที่นั่น */
  when: 'before' | 'there';
  icon: IconName;
  /** คำค้นในสโตร์ของมือถือ */
  store?: string;
  /** เว็บทางการ (ลงทะเบียนเข้าเมือง) */
  url?: string;
};
export type Kit = { name: L; items: KitItem[] };

const app = (name: string, what: L, when: KitItem['when'], icon: IconName, store = name): KitItem => ({ name: { th: name, en: name }, what, when, icon, store });
const plug = (type: string, volt: string, what: L): KitItem => ({ name: { th: `ปลั๊กแบบ ${type} ไฟ ${volt}`, en: `Plug type ${type}, ${volt}` }, what, when: 'before', icon: 'bag' });
const FITS: L = { th: 'ปลั๊กของไทยเสียบได้ ไม่ต้องใช้หัวแปลง', en: 'Thai plugs fit, no adapter needed' };
const ROUND: L = { th: 'ปลั๊กขากลมของไทยเสียบได้ ขาแบนต้องใช้หัวแปลง', en: 'Thai round-pin plugs fit; flat pins need an adapter' };
const ADAPTER: L = { th: 'ปลั๊กสามขาเหลี่ยม ต้องพกหัวแปลงไปด้วย', en: 'Three square pins: bring an adapter' };
const LOW_VOLT: L = { th: 'ปลั๊กขาแบนเสียบได้ ไฟแรงดันต่ำ เช็กว่าที่ชาร์จเขียน 100–240V (ส่วนใหญ่ใช่)', en: 'Flat-pin plugs fit; the voltage is low, so check your charger says 100–240V (most do)' };
const GRAB = app('Grab', { th: 'เรียกรถและสั่งอาหาร จ่ายด้วยบัตรในแอปได้', en: 'Rides and food delivery, paid by card in the app' }, 'there', 'car');
const UBER = app('Uber', { th: 'เรียกรถ ราคารู้ก่อนขึ้น', en: 'Rides with the price shown first' }, 'there', 'car');
const BOLT = app('Bolt', { th: 'เรียกรถ หลายเมืองถูกกว่า Uber', en: 'Rides, cheaper than Uber in many cities' }, 'there', 'car');
const CITYMAPPER = app('Citymapper', { th: 'เส้นทางรถไฟใต้ดินและรถเมล์ในเมืองใหญ่', en: 'Subway and bus routes in big cities' }, 'there', 'train');
const TRAINLINE = app('Trainline', { th: 'จองรถไฟระหว่างเมืองและข้ามประเทศ', en: 'Book trains between cities and countries' }, 'before', 'train');
const TAP_CARD: KitItem = { name: { th: 'บัตรเครดิตแบบแตะจ่าย', en: 'Contactless bank card' }, what: { th: 'ร้านส่วนใหญ่รับ และแตะขึ้นรถไฟใต้ดินหรือรถเมล์ได้ในหลายเมือง', en: 'Most shops take it, and many cities let you tap on trains and buses' }, when: 'there', icon: 'bag' };

export const KITS = {
  japan: { name: { th: 'ญี่ปุ่น', en: 'Japan' }, items: [
    { name: { th: 'Visit Japan Web', en: 'Visit Japan Web' }, what: { th: 'กรอกข้อมูลเข้าเมืองและศุลกากรล่วงหน้า ได้ QR โชว์ที่สนามบิน', en: 'Fill in immigration and customs before you fly and show the QR code at the airport' }, when: 'before', icon: 'flag', url: 'https://vjw-lp.digital.go.jp/en/' },
    app('Welcome Suica Mobile', { th: 'บัตรรถไฟและรถเมล์ในไอโฟน เติมเงินด้วย Apple Pay (Android ซื้อบัตร Suica หรือ PASMO ที่สถานี)', en: 'A train and bus card on your iPhone, topped up with Apple Pay (on Android, buy a Suica or PASMO card at a station)' }, 'before', 'train'),
    app('Google Maps', { th: 'เส้นทางรถไฟและเวลารถในญี่ปุ่นแม่น ดาวน์โหลดแผนที่ไว้ใช้ตอนไม่มีเน็ต', en: 'Accurate train routes and times in Japan; download the map for offline use' }, 'before', 'map'),
    app('GO', { th: 'เรียกแท็กซี่ ใช้เป็นภาษาอังกฤษได้', en: 'Call a taxi, in English' }, 'there', 'car', 'GO Taxi Japan'),
    plug('A', '100V', LOW_VOLT),
  ] },
  korea: { name: { th: 'เกาหลีใต้', en: 'South Korea' }, items: [
    { name: { th: 'K-ETA', en: 'K-ETA' }, what: { th: 'เช็กว่าพาสปอร์ตไทยต้องขอ K-ETA ก่อนบินไหม ขอผ่านเว็บทางการเท่านั้น', en: 'Check whether Thai passports need a K-ETA before you fly; apply only on the official site' }, when: 'before', icon: 'flag', url: 'https://www.k-eta.go.kr' },
    app('Naver Map', { th: 'แผนที่และเส้นทางรถไฟใต้ดินที่แม่นที่สุดในเกาหลี (Google Maps นำทางในเกาหลีได้ไม่ครบ)', en: 'The most accurate maps and subway routes in Korea (Google Maps cannot fully navigate there)' }, 'before', 'map'),
    app('Kakao T', { th: 'เรียกแท็กซี่ บัตรต่างประเทศบางใบผูกไม่ได้ ให้เลือกจ่ายคนขับด้วยเงินสดหรือ T-money', en: 'Call a taxi; some foreign cards will not link, so choose to pay the driver in cash or T-money' }, 'there', 'car'),
    app('Papago', { th: 'แปลภาษาเกาหลี ส่องป้ายและเมนูด้วยกล้องได้', en: 'Translate Korean, including signs and menus through the camera' }, 'there', 'spark'),
    { name: { th: 'บัตร T-money หรือ WOWPASS', en: 'T-money or WOWPASS card' }, what: { th: 'แตะขึ้นรถไฟใต้ดินและรถเมล์ ซื้อที่สนามบินหรือร้านสะดวกซื้อ', en: 'Tap for subway and buses; buy at the airport or a convenience store' }, when: 'there', icon: 'train' },
    plug('C/F', '220V', ROUND),
  ] },
  china: { name: { th: 'จีน', en: 'China' }, items: [
    app('Alipay', { th: 'ผูกบัตรเครดิตไทยก่อนบิน จ่ายได้เกือบทุกร้าน เรียก DiDi และสแกนขึ้นรถไฟใต้ดินในแอปได้', en: 'Link a Thai credit card before you fly; pay almost anywhere, call DiDi and scan into the metro inside it' }, 'before', 'bag'),
    app('WeChat', { th: 'แชตกับคนจีน และเป็นอีกทางที่จ่ายเงินได้ ผูกบัตรไว้สำรอง', en: 'Chat with locals and a second way to pay; link a card as a backup' }, 'before', 'send'),
    app('Amap', { th: 'แผนที่ที่ใช้ได้จริงในจีน มีภาษาอังกฤษ (Google Maps ใช้ในจีนไม่ได้)', en: 'Maps that work in China, with English (Google Maps does not work there)' }, 'before', 'map'),
    { name: { th: 'eSIM หรือโรมมิ่งจากไทย', en: 'eSIM or roaming from Thailand' }, what: { th: 'เน็ตที่ต่อผ่านต่างประเทศใช้ LINE, Google และ Instagram ได้ ซิมจีนใช้ไม่ได้', en: 'Data routed through another country keeps LINE, Google and Instagram working; Chinese SIMs block them' }, when: 'before', icon: 'spark' },
    app('Trip.com', { th: 'จองรถไฟความเร็วสูงในจีนเป็นภาษาไทยหรืออังกฤษ', en: 'Book Chinese high-speed trains in Thai or English' }, 'before', 'train'),
    plug('A/C/I', '220V', { th: 'ปลั๊กของไทยส่วนใหญ่เสียบได้', en: 'Most Thai plugs fit' }),
  ] },
  taiwan: { name: { th: 'ไต้หวัน', en: 'Taiwan' }, items: [
    { name: { th: 'บัตร EasyCard', en: 'EasyCard' }, what: { th: 'แตะขึ้นรถไฟใต้ดิน รถเมล์ และจ่ายร้านสะดวกซื้อ ซื้อที่สนามบินหรือ 7-Eleven', en: 'Tap for metro and buses and pay at convenience stores; buy at the airport or 7-Eleven' }, when: 'there', icon: 'train' },
    app('Uber', { th: 'เรียกรถง่ายที่สุดสำหรับนักท่องเที่ยว ส่วนใหญ่เป็นแท็กซี่ท้องถิ่น', en: 'The easiest ride app for visitors; most trips are local taxis' }, 'there', 'car'),
    app('55688 Taiwan Taxi', { th: 'แอปแท็กซี่ที่ใหญ่ที่สุดในไต้หวัน เตรียมที่อยู่ภาษาจีนไว้', en: "Taiwan's biggest taxi app; keep your destination written in Chinese" }, 'there', 'car'),
    plug('A/B', '110V', LOW_VOLT),
  ] },
  hongkong: { name: { th: 'ฮ่องกง', en: 'Hong Kong' }, items: [
    app('Octopus for Tourists', { th: 'บัตร Octopus ในไอโฟน ใช้บัตรต่างประเทศได้ (Android ซื้อบัตรจริงที่สนามบินหรือสถานี MTR)', en: 'An Octopus card on your iPhone with a foreign card (on Android, buy a physical card at the airport or an MTR station)' }, 'before', 'train'),
    app('MTR Mobile', { th: 'เส้นทางและเวลารถไฟฟ้า MTR', en: 'MTR routes and train times' }, 'there', 'train'),
    UBER,
    plug('G', '220V', ADAPTER),
  ] },
  singapore: { name: { th: 'สิงคโปร์', en: 'Singapore' }, items: [
    { name: { th: 'SG Arrival Card', en: 'SG Arrival Card' }, what: { th: 'กรอกออนไลน์ภายใน 3 วันก่อนถึง ฟรี', en: 'Fill it in online within 3 days before you arrive; it is free' }, when: 'before', icon: 'flag', url: 'https://eservices.ica.gov.sg/sgarrivalcard/' },
    GRAB,
    app('Gojek', { th: 'เรียกรถอีกเจ้า ไว้เทียบราคา', en: 'Another ride app to compare prices' }, 'there', 'car'),
    { ...TAP_CARD, what: { th: 'แตะขึ้นรถไฟฟ้า MRT และรถเมล์ได้เลย ไม่ต้องซื้อบัตร', en: 'Tap it on MRT trains and buses; no transit card needed' } },
    plug('G', '230V', ADAPTER),
  ] },
  malaysia: { name: { th: 'มาเลเซีย', en: 'Malaysia' }, items: [
    GRAB,
    { name: { th: "บัตร Touch 'n Go", en: "Touch 'n Go card" }, what: { th: 'ขึ้นรถไฟฟ้าและจ่ายค่าทางด่วน ซื้อที่ร้านสะดวกซื้อ', en: 'For trains and tolls; buy at convenience stores' }, when: 'there', icon: 'train' },
    plug('G', '240V', ADAPTER),
  ] },
  vietnam: { name: { th: 'เวียดนาม', en: 'Vietnam' }, items: [
    GRAB,
    app('Xanh SM', { th: 'แท็กซี่และมอเตอร์ไซค์ไฟฟ้า ราคาชัดเจน', en: 'Electric taxis and motorbikes with clear prices' }, 'there', 'car'),
    app('Be', { th: 'แอปเรียกรถของเวียดนาม ไว้เทียบราคา', en: 'A Vietnamese ride app to compare prices' }, 'there', 'car', 'be Vietnam ride'),
    plug('A/C', '220V', FITS),
  ] },
  indonesia: { name: { th: 'อินโดนีเซีย', en: 'Indonesia' }, items: [
    { name: { th: 'ค่าธรรมเนียมนักท่องเที่ยวบาหลี', en: 'Bali tourist levy' }, what: { th: 'ไปบาหลีต้องจ่าย 150,000 รูเปียห์ จ่ายออนไลน์ล่วงหน้าได้', en: 'Visitors to Bali pay IDR 150,000; you can pay online before you go' }, when: 'before', icon: 'flag', url: 'https://lovebali.baliprov.go.id' },
    app('Gojek', { th: 'เรียกรถ มอเตอร์ไซค์ และสั่งอาหาร ใช้กันมากในบาหลีและจาการ์ตา', en: 'Rides, motorbike taxis and food; widely used in Bali and Jakarta' }, 'there', 'car'),
    GRAB,
    plug('C/F', '230V', ROUND),
  ] },
  philippines: { name: { th: 'ฟิลิปปินส์', en: 'Philippines' }, items: [
    { name: { th: 'eTravel', en: 'eTravel' }, what: { th: 'ลงทะเบียนเข้าประเทศฟรีภายใน 3 วันก่อนบิน ได้ QR โชว์ที่สนามบิน', en: 'Free arrival registration within 3 days before you fly; show the QR code at the airport' }, when: 'before', icon: 'flag', url: 'https://etravel.gov.ph' },
    GRAB,
    app('Angkas', { th: 'มอเตอร์ไซค์รับจ้าง หนีรถติดในมะนิลา', en: 'Motorbike taxis to beat Manila traffic' }, 'there', 'car'),
    plug('A/B/C', '220V', FITS),
  ] },
  cambodia: { name: { th: 'กัมพูชา', en: 'Cambodia' }, items: [
    app('PassApp', { th: 'เรียกตุ๊กตุ๊กและรถ ราคารู้ก่อนขึ้น', en: 'Tuk-tuks and cars with the price shown first' }, 'there', 'car'),
    GRAB,
    plug('A/C', '230V', FITS),
  ] },
  laos: { name: { th: 'ลาว', en: 'Laos' }, items: [
    app('LOCA', { th: 'เรียกรถในเวียงจันทน์', en: 'Rides in Vientiane' }, 'there', 'car', 'LOCA Laos'),
    plug('A/C', '230V', FITS),
  ] },
  europe: { name: { th: 'ยุโรป', en: 'Europe' }, items: [
    TRAINLINE, BOLT, CITYMAPPER, TAP_CARD,
    plug('C/F', '230V', { th: 'ปลั๊กขากลมสองขาของไทยเสียบได้เกือบทุกที่', en: 'Thai two-round-pin plugs fit almost everywhere' }),
  ] },
  uk: { name: { th: 'สหราชอาณาจักร', en: 'United Kingdom' }, items: [
    { ...TAP_CARD, what: { th: 'แตะขึ้นรถไฟใต้ดินและรถเมล์ลอนดอนได้เลย ราคาเท่าบัตร Oyster', en: 'Tap on the London Underground and buses at Oyster prices' } },
    CITYMAPPER, TRAINLINE, UBER,
    plug('G', '230V', ADAPTER),
  ] },
  usa: { name: { th: 'สหรัฐอเมริกา', en: 'United States' }, items: [
    UBER,
    app('Lyft', { th: 'เรียกรถอีกเจ้า ไว้เทียบราคา', en: 'Another ride app to compare prices' }, 'there', 'car'),
    { name: { th: 'ทิป', en: 'Tipping' }, what: { th: 'ร้านอาหารและแท็กซี่มักให้ทิป 15–20%', en: 'Restaurants and taxis usually expect a 15–20% tip' }, when: 'there', icon: 'bag' },
    plug('A/B', '120V', LOW_VOLT),
  ] },
} satisfies Record<string, Kit>;

/** ทุกประเทศ: ใช้เมื่อไม่มีรายการของประเทศนั้น */
export const ANYWHERE: KitItem[] = [
  app('Google Maps', { th: 'ดาวน์โหลดแผนที่เมืองไว้ใช้ตอนไม่มีเน็ต', en: 'Download the city map for offline use' }, 'before', 'map'),
  app('Google Translate', { th: 'ดาวน์โหลดภาษาที่นั่นไว้แปลตอนไม่มีเน็ต ส่องเมนูด้วยกล้องได้', en: 'Download the local language to translate offline, including menus through the camera' }, 'before', 'spark'),
];

type KitKey = keyof typeof KITS;
const COUNTRY: Record<string, KitKey> = {
  japan: 'japan', 'south korea': 'korea', korea: 'korea', china: 'china', tibet: 'china', taiwan: 'taiwan', 'hong kong': 'hongkong',
  singapore: 'singapore', malaysia: 'malaysia', vietnam: 'vietnam', 'viet nam': 'vietnam', indonesia: 'indonesia', philippines: 'philippines',
  cambodia: 'cambodia', laos: 'laos', 'united kingdom': 'uk', uk: 'uk', england: 'uk', scotland: 'uk', 'united states': 'usa', usa: 'usa',
  ...Object.fromEntries(['france', 'italy', 'spain', 'germany', 'switzerland', 'netherlands', 'austria', 'czech republic', 'czechia', 'portugal', 'greece', 'belgium',
    'denmark', 'sweden', 'norway', 'finland', 'iceland', 'hungary', 'poland', 'croatia', 'ireland'].map((c) => [c, 'europe' as const])),
};
// เมืองที่แชตมักเขียนโดยไม่มีชื่อประเทศ
const CITY: Record<KitKey, string[]> = {
  japan: ['tokyo', 'osaka', 'kyoto', 'nara', 'sapporo', 'hokkaido', 'fukuoka', 'okinawa', 'hiroshima', 'kobe', 'nagoya', 'yokohama', 'hakone', 'kanazawa', 'takayama', 'nikko', 'kamakura'],
  korea: ['seoul', 'busan', 'jeju', 'jeju island', 'gyeongju', 'incheon'],
  china: ['beijing', 'shanghai', 'chengdu', 'guilin', "xi'an", 'xian', 'chongqing', 'hangzhou', 'shenzhen', 'guangzhou', 'kunming', 'lijiang', 'zhangjiajie', 'harbin'],
  taiwan: ['taipei', 'taichung', 'tainan', 'kaohsiung', 'hualien', 'jiufen'],
  hongkong: [], singapore: [],
  malaysia: ['kuala lumpur', 'penang', 'langkawi', 'malacca', 'melaka', 'kota kinabalu'],
  vietnam: ['hanoi', 'ho chi minh city', 'saigon', 'da nang', 'hoi an', 'nha trang', 'phu quoc', 'ha long bay', 'sapa', 'hue', 'da lat'],
  indonesia: ['bali', 'ubud', 'jakarta', 'yogyakarta', 'lombok'],
  philippines: ['manila', 'cebu', 'boracay', 'palawan', 'el nido', 'bohol'],
  cambodia: ['siem reap', 'phnom penh'], laos: ['vientiane', 'luang prabang', 'vang vieng'],
  europe: ['paris', 'rome', 'venice', 'florence', 'milan', 'barcelona', 'madrid', 'amsterdam', 'berlin', 'munich', 'vienna', 'prague', 'zurich', 'lucerne', 'interlaken', 'lisbon', 'porto', 'athens', 'santorini'],
  uk: ['london', 'edinburgh'],
  usa: ['new york', 'los angeles', 'san francisco', 'las vegas', 'hawaii', 'honolulu'],
};
const BY_CITY: Record<string, KitKey> = Object.fromEntries(Object.entries(CITY).flatMap(([k, cities]) => cities.map((c) => [c, k as KitKey])));

/** รายการของประเทศปลายทาง จากชื่อที่แชตเขียน ("Osaka, Japan", "Seoul", "Paris & Rome") ไม่รู้จักได้ null */
export function kitFor(destination: string): Kit | null {
  const parts = destination.toLowerCase().split(/,|&|\/|\band\b/).map((s) => s.trim()).filter(Boolean);
  for (const p of [...parts].reverse()) {
    const key = COUNTRY[p] ?? BY_CITY[p];
    if (key) return KITS[key];
  }
  return null;
}

/** ทำก่อนไปขึ้นก่อน แล้วตามด้วยของที่ใช้ตอนอยู่ที่นั่น */
export const ordered = (items: KitItem[]) => [...items.filter((x) => x.when === 'before'), ...items.filter((x) => x.when === 'there')];
