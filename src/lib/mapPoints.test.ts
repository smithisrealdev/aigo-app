/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { dayPoints, mapLoadFailed, navTarget } from './mapPoints.ts';

const place = (id: string, lat: number, lon: number) => ({ id, lat, lon, name: { th: id, en: id } });
const label = (p: { name: { en: string } }) => p.name.en;
const none = () => undefined;

test('หมุดเลขตามลำดับในแผน แม้บางที่ไม่ได้ปัก', () => {
  const { points, missing } = dayPoints([place('a', 34.69, 135.5), place('b', 0, 0), place('c', 34.67, 135.5)], label, none);
  assert.deepEqual(points.map((p) => [p.key, p.n]), [['a', 1], ['c', 3]]);
  assert.deepEqual(missing, ['b'], 'ไม่มีพิกัดไม่ปักหมุด');
});

test('ที่ที่ห่างจากที่อื่นของวันเกิน 50 กม. ไม่ปักหมุด', () => {
  const osaka = [place('a', 34.69, 135.5), place('b', 34.67, 135.5), place('c', 34.66, 135.51)];
  const { points, missing } = dayPoints([...osaka, place('tokyo', 35.68, 139.76)], label, none);
  assert.deepEqual(points.map((p) => p.key), ['a', 'b', 'c']);
  assert.deepEqual(missing, ['tokyo']);
});

test('พิกัดที่ AI เดาเป็นตำแหน่งโดยประมาณ พิกัดที่ตรวจแล้วไม่ใช่', () => {
  assert.equal(dayPoints([place('a', 34.69, 135.5)], label, none).points[0].approx, true);
  assert.equal(dayPoints([place('a', 34.69, 135.5)], label, (p) => p).points[0].approx, false);
});

test('พิกัดจาก Wikipedia ห่างจากที่ AI ให้ไม่เกิน 5 กม.: หมุดปกติที่ตำแหน่งของ Wikipedia; ไกลกว่านั้นยังเป็นตำแหน่งโดยประมาณของ AI', () => {
  const wiki: Record<string, { lat: number; lon: number }> = { castle: { lat: 34.6873, lon: 135.5262 }, kuromon: { lat: 35.0, lon: 135.9 } };
  const { points } = dayPoints([place('castle', 34.69, 135.53), place('kuromon', 34.6655, 135.5066)], label, (p) => wiki[p.id]);
  assert.deepEqual(points.map((p) => [p.key, p.approx, p.lat, p.lon]), [['castle', false, 34.6873, 135.5262], ['kuromon', true, 34.6655, 135.5066]]);
});

test('วันเดียวที่เดียวยังได้หมุด และป้ายมาจากชื่อ', () => {
  const { points } = dayPoints([place('castle', 34.6873, 135.5262)], label, (p) => p);
  assert.deepEqual(points, [{ key: 'castle', lat: 34.6873, lon: 135.5262, n: 1, label: 'castle', approx: false }]);
});

test('พิกัดนอกช่วงของโลก (AI สลับละติจูดกับลองจิจูด) ไม่ปักหมุด แม้เป็นที่เดียวของวัน', () => {
  assert.deepEqual(dayPoints([place('swapped', 135.5, 34.69)], label, none), { points: [], missing: ['swapped'] });
  const { points, missing } = dayPoints([place('a', 34.69, 135.5), place('b', 135.51, 34.67), place('c', 34.67, 181)], label, none);
  assert.deepEqual(points.map((p) => p.key), ['a']);
  assert.deepEqual(missing, ['b', 'c']);
});

test('นำทางไปที่หมุด (ตำแหน่งที่ตรวจแล้วถ้ามี) ที่ไม่ได้ปักหมุดนำทางด้วยชื่อกับเมือง ไม่ใช้พิกัดของ AI', () => {
  const pins = [{ key: 'castle', lat: 34.6873, lon: 135.5262, n: 1, label: 'Osaka Castle', approx: false }];
  assert.deepEqual(navTarget({ id: 'castle', name: 'Osaka Castle' }, pins, 'Osaka'), { name: 'Osaka Castle', lat: 34.6873, lon: 135.5262 });
  assert.deepEqual(navTarget({ id: 'tokyo', name: 'Tokyo Tower' }, pins, 'Osaka'), { name: 'Tokyo Tower, Osaka' });
});

test('แผนที่ถือว่าโหลดไม่ขึ้นเฉพาะเมื่อสไตล์โหลดไม่ได้ ไทล์หรือรูปบางชิ้นพลาด (เน็ตหลุดสั้นๆ) ยังใช้แผนที่จริงต่อ', () => {
  assert.equal(mapLoadFailed({ error: 'style', type: 'style' }), true);
  assert.equal(mapLoadFailed({ error: 'unknown' }), true, 'ไม่บอกชนิด ถือว่าโหลดไม่ขึ้น');
  assert.equal(mapLoadFailed(undefined), true);
  for (const type of ['tile', 'source', 'sprite', 'glyphs'] as const) assert.equal(mapLoadFailed({ error: type, type }), false, type);
});
