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
  assert.deepEqual(r.quickReplies, [
    { label: '🚀 Generate trip', message: 'Generate my detailed itinerary now' },
    { label: '✏️ Change dates', message: '✏️ Change dates' },
  ]);
  assert.equal(r.summary?.destination, 'Osaka, Japan');
  assert.equal(r.summary?.budget, '40000 THB');
  assert.equal(r.ready, true);
});

test('ระหว่างสตรีม ซ่อนบล็อกที่ยังไม่ปิดและแท็กที่มาไม่ครบ', () => {
  assert.equal(parseReply('ไปช่วงไหนดี\n[QUICK_REPLIES]\n- ธ.ค.|ไปเดือน', true).text, 'ไปช่วงไหนดี');
  assert.equal(parseReply('ไปช่วงไหนดี\n[QUICK_RE', true).text, 'ไปช่วงไหนดี');
  assert.equal(parseReply('พร้อมแล้ว [READY_TO_GENERATE] ต่อด้วยข้อความ', true).text, 'พร้อมแล้ว  ต่อด้วยข้อความ');
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
