/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { dateRange, dayCount, finishedNow, genEvent, legOf, minutesOf, peopleOf, plannedText, planText, requestFromSummary, stayNights, toAppTrip, planGone, tripContext, withPlanState, type AppTrip } from './itinerary.ts';

const REQ = { destination: 'Tokyo', startDate: '2026-12-28', endDate: '2027-01-01', language: 'th' };

test('แปลงผล generate-itinerary เป็นทริปของแอป', () => {
  const trip = toAppTrip({
    title: 'Tokyo Winter Lights',
    days: [
      { title: 'Asakusa–Ueno', places: [
        { id: 'a', name: 'Senso-ji', startTime: '09:00', duration: '1.5 hours', cost: { amount: 0, currency: 'JPY' }, tips: ['Go early'], coordinates: { lat: 35.71, lng: 139.79 }, travelToNext: { mode: 'walk', time: 5 } },
        { id: 'b', name: 'Tokyo National Museum', startTime: '11:00', duration: '2 hours', cost: { amount: 1000, currency: 'JPY' }, travelToNext: { mode: 'subway', time: 20 } },
      ] },
      { title: 'Empty', places: [] },
    ],
  }, REQ);
  assert.equal(trip.title.th, 'Tokyo Winter Lights');
  assert.equal(trip.dates.th, '28 ธ.ค. – 1 ม.ค.');
  assert.equal(trip.totalDays, 5, 'จำนวนวันมาจากวันที่ของทริป');
  assert.deepEqual(trip.days[1], [], 'วันที่ไม่มีที่แวะยังอยู่ในลำดับเดิม วันถัดไปจึงตรงกับวันที่');
  assert.equal(trip.days[0][0].minutes, 90);
  assert.equal(trip.days[0][0].entry.text.en, 'Free');
  assert.equal(trip.days[0][1].entry.text.th, '~¥1,000');
  assert.equal(trip.days[0][0].checked, false);
  assert.deepEqual(trip.legs.a, { mode: 'walk', text: { th: 'เดิน · ~5 นาที', en: 'Walk · ~5 min' } });
  assert.equal(trip.legs.b, undefined, 'จุดสุดท้ายของวันไม่มีการเดินทางต่อ');
  assert.deepEqual(trip.dayTitles?.map((d) => d.en), ['Asakusa–Ueno', 'Empty']);
  assert.equal(trip.sample, false);
});

test('ทริปที่ยังสร้างไม่ครบ: มีวันที่ได้แล้ว ที่เหลือรอ', () => {
  const trip = toAppTrip({ days: [{ title: 'Day one', places: [{ id: 'a', name: 'Senso-ji' }] }] }, REQ);
  assert.equal(trip.totalDays, 5);
  assert.equal(trip.days.length, 1);
  assert.equal(trip.title.th, 'Tokyo 5 วัน', 'ยังไม่มีชื่อทริปจาก AI ใช้จำนวนวันทั้งทริป ไม่ใช่วันที่ได้แล้ว');
  assert.equal(dayCount('2026-12-28', '2027-01-01'), 5);
  assert.equal(dayCount('2026-12-28', '2026-12-28'), 1);
});

test('รายการวันที่วางแล้วสำหรับขอวันที่เหลือ', () => {
  assert.equal(plannedText([
    { title: 'Namba', places: [{ name: 'Dotonbori' }, { name: 'Hozenji Temple' }] },
    { places: [{ name: 'Osaka Castle' }, {}] },
  ]), 'Day 1 (Namba): Dotonbori, Hozenji Temple\nDay 2: Osaka Castle');
  assert.equal(plannedText([]), '');
});

test('อ่านระยะเวลาและการเดินทาง', () => {
  assert.equal(minutesOf('2 hours'), 120);
  assert.equal(minutesOf('45 minutes'), 45);
  assert.equal(minutesOf('ประมาณ'), 60);
  assert.equal(legOf({ mode: 'taxi', time: 15 })?.mode, 'car');
  assert.equal(legOf({ mode: 'Metro', time: 12 })?.text.th, 'รถไฟใต้ดิน · ~12 นาที');
  assert.equal(legOf({ mode: 'walk' }), undefined);
});

test('ช่วงวันที่ เดือนเดียวกันย่อเหลือเดือนเดียว', () => {
  assert.equal(dateRange('2026-12-12', '2026-12-16', 'th'), '12–16 ธ.ค.');
  assert.equal(dateRange('2026-12-12', '2026-12-16', 'en'), '12–16 Dec');
});

test('สร้างคำขอจากสรุปทริป เติมวันที่เมื่อมีแค่จำนวนวัน', () => {
  assert.deepEqual(requestFromSummary({ destination: 'Osaka', startDate: '2026-12-12', endDate: '2026-12-16', budget: '40000 THB' }, 'th', '2026-11-20'),
    { destination: 'Osaka', startDate: '2026-12-12', endDate: '2026-12-16', budget: '40000 THB', travelers: undefined, tripStyle: undefined, language: 'th' });
  const r = requestFromSummary({ destination: 'Seoul', duration: '4' }, 'en', '2026-11-20');
  assert.equal(r?.startDate, '2026-12-04');
  assert.equal(r?.endDate, '2026-12-07');
  assert.equal(requestFromSummary({ destination: 'Seoul' }, 'en', '2026-11-20'), null);
  assert.equal(requestFromSummary({ startDate: '2026-12-12' }, 'en', '2026-11-20'), null);
});

test('จำนวนคนและเหตุการณ์ SSE', () => {
  assert.equal(peopleOf('Solo'), 1);
  assert.equal(peopleOf('3 adults'), 3);
  assert.equal(peopleOf('คู่รัก'), 2);
  assert.deepEqual(genEvent('data: {"type":"progress","day":2,"message":"Planning Day 2"}'), { type: 'progress', day: 2, message: 'Planning Day 2' });
  assert.equal(genEvent(': keep-alive'), null);
});

test('แผนเป็นข้อความ: บริบทที่แนบให้ AI และข้อความที่ส่งให้เพื่อน', () => {
  const trip = toAppTrip({ days: [{ places: [{ name: 'Nijo Market', startTime: '08:00' }, { name: 'Odori Park', startTime: '10:00' }] }, { places: [] }] },
    { destination: 'Sapporo, Japan', startDate: '2027-01-24', endDate: '2027-01-25', language: 'th' }, 2);
  assert.equal(tripContext(trip, 'th', 0), 'ทริปของฉันที่ AiGo วางไว้: Sapporo, Japan, 24–25 ม.ค., 2 คน\nวันที่ 1: Nijo Market, Odori Park\nตอนนี้ฉันดูวันที่ 1');
  assert.equal(trip.days[0][0].entry.text.th, 'ยังไม่มีราคา', 'AI ไม่ให้ราคา = ยังไม่มีราคา ไม่ใช่ฟรี');
  assert.equal(planText(trip, 'en'), 'Sapporo, Japan, 2 days (24–25 Jan)\nDay 1: 08:00 Nijo Market → 10:00 Odori Park\nPlanned with AiGo');
});

test('เติมวันที่เซิร์ฟเวอร์วางเสร็จลงทริป', () => {
  const plan = { job: 'j', token: 't', status: 'running' as const, request: REQ, people: 2, days: [] };
  const base = { ...toAppTrip({ days: [] }, REQ), id: 'trip-1', bookings: [], plan };
  const day = (n: string) => ({ title: n, places: [{ id: n, name: n }] });
  const t1 = withPlanState(base, { status: 'running', totalDays: 5, from: 0, days: [day('a')] });
  assert.equal(t1.id, 'trip-1', 'ทริปเดิม ไม่ใช่ทริปใหม่');
  assert.deepEqual(t1.bookings, [], 'ของที่หาไว้ในแชตยังอยู่');
  assert.deepEqual(t1.days.map((d) => d[0]?.id), ['a']);
  assert.equal(t1.plan?.days.length, 1);
  const t2 = withPlanState(t1, { status: 'running', totalDays: 5, from: 0, days: [day('a'), day('b')] });
  assert.deepEqual(t2.days.map((d) => d[0]?.id), ['a', 'b'], 'วันที่มีแล้วไม่ซ้ำ');
  assert.equal(withPlanState(t2, { status: 'running', totalDays: 5, from: 2, days: [] }), t2, 'ไม่มีอะไรใหม่ ได้ทริปเดิมกลับมา');
  assert.equal(withPlanState(t2, { status: 'running', totalDays: 5, from: 3, days: [day('d')] }).days.length, 2, 'วันขาดช่วง ไม่เติมผิดวัน');
  const t3 = withPlanState(t2, { status: 'done', totalDays: 5, title: 'Tokyo!', from: 2, days: [day('c'), day('d'), day('e')] });
  assert.equal(t3.title.en, 'Tokyo!');
  assert.deepEqual(t3.days.map((d) => d[0]?.id), ['a', 'b', 'c', 'd', 'e']);
  assert.equal(t3.plan?.status, 'done');
  assert.equal(t3.plan?.days.length, 0, 'เสร็จแล้วไม่เก็บสำเนาดิบ');
  const t4 = withPlanState(t2, { status: 'failed', totalDays: 5, error: 'stalled', from: 2, days: [] });
  assert.equal(t4.plan?.status, 'failed');
  assert.equal(t4.plan?.error, 'stalled');
  assert.deepEqual(t4.days.map((d) => d[0]?.id), ['a', 'b'], 'ไม่สำเร็จ วันที่ได้แล้วยังอยู่');
});

test('งานบนเซิร์ฟเวอร์หายไป (ลบบัญชีแล้ว): แผนจบแบบไม่สำเร็จ วันที่ได้แล้วยังอยู่ และเลิกถาม', () => {
  const plan = { job: 'j', token: 't', status: 'running' as const, request: REQ, people: 2, days: [] };
  const base = { ...toAppTrip({ days: [] }, REQ), id: 'trip-1', plan };
  const t1 = withPlanState(base, { status: 'running', totalDays: 3, from: 0, days: [{ title: 'a', places: [{ id: 'a', name: 'a' }] }] });
  const gone = withPlanState(t1, planGone(t1));
  assert.equal(gone.plan?.status, 'failed', 'ไม่ใช่ running ตัวถามทุก 3 วินาทีจึงหยุด');
  assert.equal(gone.plan?.error, 'gone');
  assert.deepEqual(gone.days.map((d) => d[0]?.id), ['a']);
});

test('แผนเพิ่งเสร็จ: เฉพาะตอนเปลี่ยนจากกำลังวางเป็นเสร็จ (เปิดหน้าแผนที่เสร็จแล้วไม่ฉลองซ้ำ)', () => {
  assert.equal(finishedNow('running', 'done'), true);
  assert.equal(finishedNow('done', 'done'), false, 'เสร็จอยู่แล้ว');
  assert.equal(finishedNow(undefined, 'done'), false, 'เปิดหน้ามาก็เห็นว่าเสร็จแล้ว');
  assert.equal(finishedNow('stopped', 'done'), false);
  assert.equal(finishedNow('running', 'failed'), false, 'ล้มเหลวไม่ใช่เสร็จ');
});

// มื้ออาหารและที่พักในแผน (docs/superpowers/specs/2026-11-21-meals-and-stays-design.md)
const OSAKA = { destination: 'Osaka', startDate: '2026-12-26', endDate: '2026-12-28', language: 'th' };
const STAY = (name: string, amount = 18000) => ({ name, area: 'Namba, Osaka', coordinates: { lat: 34.66, lng: 135.5 }, pricePerNight: { amount, currency: 'JPY' } });
const MEAL_DAYS = [
  { places: [
    { id: 'a', name: 'Osaka Castle', category: 'attraction', startTime: '09:00' },
    { id: 'b', name: 'Kushikatsu Daruma', category: 'restaurant', meal: 'dinner', startTime: '18:30' },
    { id: 'c', name: 'Hanshin Cafe', category: 'cafe' },
    { id: 'd', name: 'Brunch Spot', category: 'restaurant', meal: 'brunch' },
  ], stay: STAY('Cross Hotel Osaka') },
  { places: [{ id: 'e', name: 'Kaiyukan' }], stay: { name: '', area: 'Bay Area' } },
  { places: [{ id: 'f', name: 'Kuromon Market' }], stay: STAY('Cross Hotel Osaka') },
];

test('มื้ออาหาร: ร้านเป็นของกิน ป้ายมื้อมีแค่กลางวันกับเย็น ที่เที่ยวไม่มีป้าย', () => {
  const [castle, daruma, cafe, brunch] = toAppTrip({ days: MEAL_DAYS }, OSAKA).days[0];
  assert.equal(castle.food, undefined);
  assert.equal(castle.meal, undefined);
  assert.equal(daruma.food, true);
  assert.equal(daruma.meal, 'dinner');
  assert.equal(cafe.food, true, 'คาเฟ่ก็เป็นของกิน');
  assert.equal(cafe.meal, undefined);
  assert.equal(brunch.meal, undefined, 'มื้ออื่นไม่ขึ้นป้าย');
});

test('ที่พักรายคืน: ชื่อ ย่าน พิกัด ราคาต่อคืน; ไม่มีชื่อไม่นับ; วันสุดท้ายของทริปไม่มีที่พัก', () => {
  const trip = toAppTrip({ days: MEAL_DAYS }, OSAKA);
  assert.deepEqual(trip.stays?.[0], { name: 'Cross Hotel Osaka', area: 'Namba, Osaka', lat: 34.66, lon: 135.5, price: { th: '~¥18,000/คืน', en: '~¥18,000/night' } });
  assert.equal(trip.stays?.[1], null);
  assert.equal(trip.stays?.[2], null, 'คืนสุดท้ายไม่ได้นอนที่นี่ แม้ AI ใส่มา');
});

test('ที่พักไม่มีราคา ไม่แต่งราคาเอง (R15c)', () => {
  const free = toAppTrip({ days: [{ places: [], stay: STAY('Hotel A', 0) }, { places: [] }] }, OSAKA);
  assert.equal(free.stays?.[0]?.price, undefined);
  const none = toAppTrip({ days: [{ places: [], stay: { name: 'Hotel B' } }, { places: [] }] }, OSAKA);
  assert.deepEqual(none.stays?.[0], { name: 'Hotel B', area: undefined, lat: 0, lon: 0, price: undefined });
});

test('วันที่มาทีหลังจากงานบนเซิร์ฟเวอร์พาที่พักมาด้วย', () => {
  const t0: AppTrip = { ...toAppTrip({ days: [MEAL_DAYS[0]] }, OSAKA), plan: { job: 'j', token: 't', status: 'running', request: OSAKA, people: 2, days: [MEAL_DAYS[0]] } };
  const t1 = withPlanState(t0, { status: 'running', totalDays: 3, from: 1, days: [{ places: [{ id: 'g', name: 'Umeda Sky' }], stay: STAY('Hotel Granvia Osaka') }] });
  assert.deepEqual(t1.stays?.map((x) => x?.name ?? null), ['Cross Hotel Osaka', 'Hotel Granvia Osaka']);
});

test('ข้อความของแผน: รอบถัดไปรู้ที่พัก แชร์และถาม AiGo บอกมื้อกับที่พัก', () => {
  assert.equal(plannedText([{ title: 'Castle', places: [{ name: 'Osaka Castle' }, { name: 'Kushikatsu Daruma' }], stay: { name: 'Cross Hotel Osaka' } }, { places: [{ name: 'Kaiyukan' }] }]),
    'Day 1 (Castle): Osaka Castle, Kushikatsu Daruma; stay: Cross Hotel Osaka\nDay 2: Kaiyukan');
  const trip = toAppTrip({ title: 'Osaka eats', days: MEAL_DAYS }, OSAKA);
  assert.match(planText(trip, 'th'), /วันที่ 1: 09:00 Osaka Castle → 18:30 Kushikatsu Daruma \(มื้อเย็น\) → Hanshin Cafe → Brunch Spot · พัก Cross Hotel Osaka\n/);
  assert.match(planText(trip, 'en'), /Day 1: .*18:30 Kushikatsu Daruma \(dinner\).* · stay Cross Hotel Osaka\n/);
  assert.match(tripContext(trip, 'th'), /วันที่ 1: Osaka Castle, Kushikatsu Daruma \(มื้อเย็น\), Hanshin Cafe, Brunch Spot · พัก Cross Hotel Osaka/);
});

test('ทริปเก่าที่ไม่มีมื้อและที่พัก ข้อความเหมือนเดิม', () => {
  const old = toAppTrip({ days: [{ places: [{ id: 'a', name: 'Senso-ji', startTime: '09:00' }] }] }, REQ);
  assert.equal(planText(old, 'th'), 'Tokyo 5 วัน (28 ธ.ค. – 1 ม.ค.)\nวันที่ 1: 09:00 Senso-ji\nวางแผนด้วย AiGo');
  assert.equal(old.days[0][0].food, undefined);
});

test('ช่วงคืนที่พักที่เดิม: คืนติดกันชื่อเดียวกันเป็นช่วงเดียว ย้ายเมืองเริ่มช่วงใหม่', () => {
  const S = (name: string) => ({ name, lat: 0, lon: 0 });
  const stays = [S('A'), S('A'), S('B'), null];
  assert.deepEqual(stayNights(stays, 0), { first: 0, last: 1 });
  assert.deepEqual(stayNights(stays, 1), { first: 0, last: 1 });
  assert.deepEqual(stayNights(stays, 2), { first: 2, last: 2 });
  assert.equal(stayNights(stays, 3), null);
  assert.equal(stayNights(undefined, 0), null);
});
