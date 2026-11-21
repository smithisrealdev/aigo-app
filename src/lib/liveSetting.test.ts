/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { liveSetting } from './liveSetting.ts';

const later = () => new Promise((r) => setTimeout(r, 0));

test('ค่าตั้งของเครื่องที่เปลี่ยนระหว่างแอปเปิดอยู่ อ่านได้ค่าล่าสุด (ไม่ใช่ค่าตอนเปิดแอป)', async () => {
  let fire = (_: boolean) => {};
  const now = liveSetting(() => Promise.resolve(false), (f) => { fire = f; });
  assert.equal(now(), undefined, 'ยังไม่รู้ค่า');
  await later();
  assert.equal(now(), false);
  fire(true);
  assert.equal(now(), true, 'เปิด "ลดการเคลื่อนไหว" ทีหลัง');
});

test('ค่าที่เปลี่ยนก่อนการอ่านครั้งแรกจะเสร็จ ชนะค่าที่อ่านได้ทีหลัง', async () => {
  let fire = (_: boolean) => {};
  const now = liveSetting(() => new Promise((r) => setTimeout(() => r(false), 5)), (f) => { fire = f; });
  fire(true);
  await new Promise((r) => setTimeout(r, 10));
  assert.equal(now(), true);
});
