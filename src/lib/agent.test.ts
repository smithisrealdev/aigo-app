/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { decide } from './agent.ts';

test('งานที่ไม่เสียเงินและย้อนกลับได้ AiGo ทำเอง', () => {
  assert.equal(decide({ id: 'move', title: 'ย้ายสวนไปพรุ่งนี้', costBaht: 0, reversible: true }), 'auto');
});

test('ทุกอย่างที่เสียเงินต้องรออนุมัติ แม้จะย้อนกลับได้', () => {
  assert.equal(decide({ id: 'hotel', title: 'จองที่พัก ยกเลิกฟรี', costBaht: 9800, reversible: true }), 'approve');
});

test('ย้อนกลับไม่ได้หรือส่งข้อมูลส่วนตัว ต้องรออนุมัติ', () => {
  assert.equal(decide({ id: 'cancel', title: 'ยกเลิกการจอง', costBaht: 0, reversible: false }), 'approve');
  assert.equal(decide({ id: 'share', title: 'ส่งชื่อให้โรงแรม', costBaht: 0, reversible: true, sharesPersonalData: true }), 'approve');
});

test('ปิดสวิตช์แก้แผนเอง แล้วทุกอย่างกลับมาถามก่อน', () => {
  assert.equal(decide({ id: 'move', title: 'ย้ายสวนไปพรุ่งนี้', costBaht: 0, reversible: true }, false), 'approve');
});
