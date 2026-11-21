/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { arc, dayPoints, globeZoom, mapLoadFailed, navTarget, planeAt, travelLeg, tripSpots } from './mapPoints.ts';

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

// ลูกโลกของทริปทั้งหมด
const castle = place('castle', 34.6873, 135.5262), kuromon = place('kuromon', 34.6655, 135.5066), namba = place('namba', 34.666, 135.5);
const kaiyukan = place('kaiyukan', 34.6545, 135.4289), umeda = place('umeda', 34.7025, 135.4959), tokyo = place('tokyo', 35.6586, 139.7454);
const kiyomizu = place('kiyomizu', 34.9949, 135.785), fushimi = place('fushimi', 34.9671, 135.7727);

test('ทริปที่ยังไม่มีที่ที่มีพิกัด ไม่ขึ้นบนลูกโลก ทริปอื่นเรียงตามเดิม', () => {
  const spots = tripSpots([{ id: 'none', days: [[place('x', 0, 0)], []] }, { id: 'osaka', days: [[castle]] }, { id: 'empty', days: [] }]);
  assert.deepEqual(spots.map((s) => s.key), ['osaka']);
});

test('รูปของทริปปักบนที่จริงที่อยู่กลางทริป ไม่ใช่ที่ที่พิกัดหลุดไปเมืองอื่น', () => {
  const [s] = tripSpots([{ id: 'osaka', days: [[castle, kuromon, tokyo], [namba], [kaiyukan, umeda]] }]);
  assert.deepEqual([s.lat, s.lon], [namba.lat, namba.lon]);
  assert.equal(s.stops.length, 1, 'ทริปเมืองเดียวมีจุดเดียว ไม่มีเส้น');
});

test('วันที่อยู่เมืองเดียวกันเป็นจุดเดียว วันที่ไปอีกเมืองเป็นอีกจุด ตามลำดับวัน วันที่ไม่มีพิกัดข้าม', () => {
  const [s] = tripSpots([{ id: 'kansai', days: [[castle, kuromon], [namba], [place('ghost', 0, 0)], [kiyomizu, fushimi], [kaiyukan]] }]);
  const near = (p: { lat: number; lon: number }, q: { lat: number; lon: number }) => Math.abs(p.lat - q.lat) < 0.05 && Math.abs(p.lon - q.lon) < 0.05;
  assert.equal(s.stops.length, 3);
  assert.ok(near(s.stops[0], castle) && near(s.stops[1], kiyomizu) && near(s.stops[2], kaiyukan), JSON.stringify(s.stops));
});

// วันเดินทาง: เส้นบินจากที่สุดท้ายของวันไปที่แรกของวันถัดไป
const bkk = place('bkk', 13.69, 100.75), vag = place('vag', 49.283, -123.12), canadaPlace = place('canada', 49.288, -123.111);
const close = (a: number, b: number, d: number) => Math.abs(a - b) <= d;

test('วันบินไปแวนคูเวอร์เป็นวันเดินทาง: จากที่สุดท้ายของวันไปที่แรกของวันถัดไป', () => {
  const leg = travelLeg([[bkk], [vag, canadaPlace]], 0, label, none);
  assert.equal(leg?.from.key, 'bkk');
  assert.equal(leg?.to.key, 'vag');
});

test('ไปเมืองใกล้ๆ วันสุดท้าย หรือวันถัดไปยังไม่มีพิกัด ไม่ใช่วันเดินทาง', () => {
  assert.equal(travelLeg([[castle], [kiyomizu]], 0, label, none), undefined, 'โอซาก้าไปเกียวโตราว 40 กม.');
  assert.equal(travelLeg([[bkk], [vag]], 1, label, none), undefined, 'วันสุดท้าย');
  assert.equal(travelLeg([[bkk], [place('x', 0, 0)]], 0, label, none), undefined, 'วันถัดไปยังไม่มีพิกัด');
});

test('เส้นบินข้ามเส้นแบ่งวัน (กรุงเทพไปแวนคูเวอร์) โค้งผ่านแปซิฟิกเหนือ ไม่วนรอบโลก', () => {
  const line = arc(bkk, vag);
  assert.ok(close(line[0][0], 100.75, 1e-9) && close(line[0][1], 13.69, 1e-9), JSON.stringify(line[0]));
  const [lon, lat] = line[line.length - 1];
  assert.ok(close(((lon + 540) % 360) - 180, -123.12, 1e-6) && close(lat, 49.283, 1e-6), JSON.stringify([lon, lat]));
  assert.ok(line.every((p, i) => i === 0 || Math.abs(p[0] - line[i - 1][0]) < 10), 'ลองจิจูดต่อเนื่อง');
  assert.ok(line[line.length >> 1][1] > 45, `กลางทางอยู่เหนือ 45 องศา ได้ ${line[line.length >> 1][1]}`);
});

test('รูปเครื่องบินอยู่ก่อนถึงราว 80 กม. และหันไปทางที่บิน; เส้นสั้นกว่า 400 กม. อยู่กลางเส้น', () => {
  const east = planeAt(arc({ lat: 0, lon: 0 }, { lat: 0, lon: 10 }));
  assert.ok(close(east.at[0], 9.28, 0.05) && close(east.rotate, 45, 1), JSON.stringify(east));
  assert.ok(close(planeAt(arc({ lat: 0, lon: 0 }, { lat: 10, lon: 0 })).rotate, -45, 1));
  const short = arc({ lat: 0, lon: 0 }, { lat: 0, lon: 1.8 });
  assert.deepEqual(planeAt(short).at, short[short.length >> 1]);
});

test('ลูกโลกทั้งใบพอดีพื้นที่ที่ไม่ถูกบัง และไม่ซูมต่ำกว่า 0', () => {
  assert.ok(close(globeZoom(390, 844, { top: 0.1, bottom: 0.4, x: 0.1 }, 0), 0.785, 0.01));
  assert.equal(globeZoom(358, 240, { top: 0.08, bottom: 0.14, x: 0.06 }, 35), 0);
});
