/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { dateRange, genEvent, legOf, minutesOf, peopleOf, requestFromSummary, toAppTrip } from './itinerary.ts';

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
  assert.equal(trip.totalDays, 1);
  assert.equal(trip.days[0][0].minutes, 90);
  assert.equal(trip.days[0][0].entry.text.en, 'Free');
  assert.equal(trip.days[0][1].entry.text.th, '~¥1,000');
  assert.equal(trip.days[0][0].checked, false);
  assert.deepEqual(trip.legs.a, { mode: 'walk', text: { th: 'เดิน · ~5 นาที', en: 'Walk · ~5 min' } });
  assert.equal(trip.legs.b, undefined, 'จุดสุดท้ายของวันไม่มีการเดินทางต่อ');
  assert.deepEqual(trip.dayTitles?.map((d) => d.en), ['Asakusa–Ueno']);
  assert.equal(trip.sample, false);
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
