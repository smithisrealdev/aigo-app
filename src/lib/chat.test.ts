/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { parseReply, shortDate, sseDelta } from './chat.ts';

const REPLY = `## โอซาก้า 5 วัน
**ปราสาทโอซาก้า** เปิด 09:00
![Osaka Castle](IMAGE:Osaka Castle Japan)
- เดินเล่นโดทงโบริ
[READY_TO_GENERATE]
[TRIP_SUMMARY]
destination: Osaka, Japan
startDate: 2026-12-12
endDate: 2026-12-16
duration: 5
budget: 40000 THB
travelers: Couple
tripStyle: Food
[/TRIP_SUMMARY]
[FLIGHTS]
[FLIGHT]BKK-KIX|19600[/FLIGHT]
[/FLIGHTS]
[QUICK_REPLIES]
- 🚀 Generate trip|Generate my detailed itinerary now
- ✏️ Change dates
[/QUICK_REPLIES]`;

test('แยกปุ่มตอบด่วน สรุปทริป และสัญญาณพร้อมสร้างแผน ออกจากข้อความ', () => {
  const r = parseReply(REPLY);
  assert.equal(r.text, 'โอซาก้า 5 วัน\nปราสาทโอซาก้า เปิด 09:00\n• เดินเล่นโดทงโบริ');
  // ดีไซน์ไม่ใช้อีโมจิ: ตัดออกจากป้าย ส่วนปุ่ม 🚀 จำไว้ว่าเป็นปุ่มสร้างแผน
  assert.deepEqual(r.quickReplies, [
    { label: 'Generate trip', message: 'Generate my detailed itinerary now', go: true },
    { label: 'Change dates', message: 'Change dates', go: false },
  ]);
  assert.equal(r.summary?.destination, 'Osaka, Japan');
  assert.equal(r.summary?.budget, '40000 THB');
  assert.equal(r.ready, true);
});

test('ระหว่างสตรีม ซ่อนบล็อกที่ยังไม่ปิดและแท็กที่มาไม่ครบ', () => {
  assert.equal(parseReply('ไปช่วงไหนดี\n[QUICK_REPLIES]\n- ธ.ค.|ไปเดือน', true).text, 'ไปช่วงไหนดี');
  assert.equal(parseReply('ไปช่วงไหนดี\n[QUICK_RE', true).text, 'ไปช่วงไหนดี');
  assert.equal(parseReply('พร้อมแล้ว [READY_TO_GENERATE] ต่อด้วยข้อความ', true).text, 'พร้อมแล้ว ต่อด้วยข้อความ');
  assert.equal(parseReply('ข้อความธรรมดา').summary, null);
});

test('อ่านข้อความที่เพิ่มจาก SSE ของ OpenRouter', () => {
  assert.equal(sseDelta('data: {"choices":[{"delta":{"content":"สวัส"}}]}'), 'สวัส');
  assert.equal(sseDelta(': OPENROUTER PROCESSING'), '');
  assert.equal(sseDelta('data: [DONE]'), '');
  assert.throws(() => sseDelta('data: {"error":{"message":"rate limited"}}'), /rate limited/);
});

test('วันที่แบบสั้นสำหรับสรุปทริป', () => {
  assert.equal(shortDate('2026-12-12', 'th'), '12 ธ.ค.');
  assert.equal(shortDate('2026-01-05', 'en'), '5 Jan');
  assert.equal(shortDate('ธันวาคม', 'th'), 'ธันวาคม');
});

test('ตาราง Markdown กลายเป็นบรรทัดอ่านง่าย', () => {
  const r = parseReply('งบประมาณ\n| รายการ | ราคา |\n|--------|------:|\n| ตั๋วเครื่องบิน | ~9,000 บาท |\n| โรงแรม | ~14,000 บาท |');
  assert.equal(r.text, 'งบประมาณ\nรายการ · ราคา\n\nตั๋วเครื่องบิน · ~9,000 บาท\nโรงแรม · ~14,000 บาท');
});

test('การ์ดจากบล็อกของ AI ทั้งรูปแบบ | และรูปแบบเดิมของ DIRECTIVE 7', () => {
  const raw = `ไฮไลต์ที่ห้ามพลาด
[PLACES]
[PLACE]name: Dotonbori | area: Namba | why: คลองนีออนกับสตรีทฟู้ดยามค่ำ[/PLACE]
[PLACE]area: Namba | why: ไม่มีชื่อ ต้องข้าม[/PLACE]
[/PLACES]
[FLIGHTS]
[FLIGHT]airline: AirAsia X | iata: D7 | from: BKK | to: KIX | date: 2026-12-26 | departure: 08:30 | type: direct | price: ~6,000 THB/คน[/FLIGHT]
[/FLIGHTS]
[HOTELS]
[HOTEL]name: Hotel Hankyu Respire Osaka area: Umeda, Osaka rating: 4.4 price: ~4,000 THB highlights: เชื่อมสถานี Umeda[/HOTEL]
[/HOTELS]
[RESTAURANTS]
[RESTAURANT]name: Kushikatsu Daruma | area: Shinsekai | cuisine: kushikatsu | price: ~1,000 THB | why: ต้นตำรับเสียบไม้ทอด[/RESTAURANT]
[/RESTAURANTS]
[SERVICES]
[SERVICE]type: rail_pass | name: Kansai Area Pass | price: ~2,800 THB | why: นั่งรถไฟไปเกียวโตกับนาราได้ไม่จำกัด[/SERVICE]
[/SERVICES]`;
  const r = parseReply(raw);
  assert.deepEqual(r.cards.map((c) => [c.kind, c.name]), [['place', 'Dotonbori'], ['flight', 'AirAsia X'], ['hotel', 'Hotel Hankyu Respire Osaka'], ['food', 'Kushikatsu Daruma'], ['service', 'Kansai Area Pass']]);
  assert.deepEqual(r.cards[1], { kind: 'flight', name: 'AirAsia X', area: undefined, why: undefined, price: '~6,000 THB/คน', rating: undefined, cuisine: undefined, airline: 'AirAsia X', from: 'BKK', to: 'KIX', date: '2026-12-26', departure: '08:30', type: 'direct', provider: undefined });
  assert.equal(r.cards[2].area, 'Umeda, Osaka');
  assert.equal(r.cards[2].why, 'เชื่อมสถานี Umeda', 'highlights ของรูปแบบเดิมเป็นเหตุผล');
  assert.equal(r.cards[4].type, 'rail_pass');
  assert.equal(r.text, 'ไฮไลต์ที่ห้ามพลาด', 'บล็อกการ์ดไม่โผล่ในข้อความ');
  assert.deepEqual(parseReply('[PLACES]\n[PLACE]name: Dotonbori | area: Na', true).cards, [], 'การ์ดที่ยังมาไม่ครบไม่แสดง');
});

test('ตัดอีโมจิออกจากข้อความของ AI แต่เก็บตัวอักษรไทย ตัวเลข และลูกศร', () => {
  assert.equal(parseReply('สวัสดีค่ะ 😊 ทริปนี้ ✈️ บินตรง\n🍜 ราเมนต้องลอง → 5 ร้าน').text, 'สวัสดีค่ะ ทริปนี้ บินตรง\nราเมนต้องลอง → 5 ร้าน');
});
