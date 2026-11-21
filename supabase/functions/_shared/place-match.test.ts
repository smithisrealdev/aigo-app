/// <reference types="node" />
// Matching a place name to a Wikipedia article title (place-photos): decides whose photo and whose coordinates a place gets.
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { isExact, slug, titleFits } from './place-match.ts';

test('an article about the place itself is exact, also with a kind word or another spelling', () => {
  assert.equal(isExact('Osaka Castle', 'Osaka Castle'), true);
  assert.equal(isExact('Kiyomizu-dera', 'Kiyomizu-dera'), true);
  assert.equal(isExact('Fushimi Inari-taisha', 'Fushimi Inari Taisha'), true);
  assert.equal(isExact('Sensō-ji', 'Senso-ji Temple'), true, 'kind words (temple) may be missing from the title');
  assert.equal(isExact('Christ the Redeemer (statue)', 'Christ the Redeemer'), true, '"(statue)" is not part of the name');
  assert.equal(isExact('Museum of Islamic Art, Doha', 'Museum of Islamic Art'), true, '", Doha" is not part of the name');
});

test('a broader article, another place or the city alone is not exact (no coordinates from it)', () => {
  assert.equal(isExact('Otaru', 'Otaru Canal'), false, 'the town, not the canal');
  assert.equal(isExact('Nagoya', 'Nagoya Castle'), false, 'a one-word title is often the city');
  assert.equal(isExact('Nijō Castle', 'Nijo Market'), false, 'another place that shares a word');
  assert.equal(isExact('Goryōkaku', 'Hakodate'), false, 'a hand-picked photo of somewhere else');
  assert.equal(isExact('Nishiki Market', 'Nishiki Market Kyoto'), false, 'the name has a word the title lacks (a city), so not sure');
});

test('title words must all be in the name; spelling marks and case do not matter', () => {
  assert.equal(titleFits('Nijō Castle', 'Nijo Market'), false);
  assert.equal(titleFits('Otaru', 'Otaru Canal'), true);
  assert.equal(slug('Sensō-ji'), slug('Senso-ji'));
  assert.equal(slug('Tromsø'), 'tromso');
});
