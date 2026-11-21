/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { dayPoints } from './mapPoints.ts';

const place = (id: string, lat: number, lon: number) => ({ id, lat, lon, name: { th: id, en: id } });
const label = (p: { name: { en: string } }) => p.name.en;

test('หมุดเลขตามลำดับในแผน แม้บางที่ไม่ได้ปัก', () => {
  const { points, missing } = dayPoints([place('a', 34.69, 135.5), place('b', 0, 0), place('c', 34.67, 135.5)], label, false);
  assert.deepEqual(points.map((p) => [p.key, p.n]), [['a', 1], ['c', 3]]);
  assert.deepEqual(missing, ['b'], 'ไม่มีพิกัดไม่ปักหมุด');
});

test('ที่ที่ห่างจากที่อื่นของวันเกิน 50 กม. ไม่ปักหมุด', () => {
  const osaka = [place('a', 34.69, 135.5), place('b', 34.67, 135.5), place('c', 34.66, 135.51)];
  const { points, missing } = dayPoints([...osaka, place('tokyo', 35.68, 139.76)], label, false);
  assert.deepEqual(points.map((p) => p.key), ['a', 'b', 'c']);
  assert.deepEqual(missing, ['tokyo']);
});

test('พิกัดที่ AI เดาเป็นตำแหน่งโดยประมาณ พิกัดที่ตรวจแล้วไม่ใช่', () => {
  assert.equal(dayPoints([place('a', 34.69, 135.5)], label, false).points[0].approx, true);
  assert.equal(dayPoints([place('a', 34.69, 135.5)], label, true).points[0].approx, false);
});

test('วันเดียวที่เดียวยังได้หมุด และป้ายมาจากชื่อ', () => {
  const { points } = dayPoints([place('castle', 34.6873, 135.5262)], label, true);
  assert.deepEqual(points, [{ key: 'castle', lat: 34.6873, lon: 135.5262, n: 1, label: 'castle', approx: false }]);
});
