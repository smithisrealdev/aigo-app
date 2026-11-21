import assert from 'node:assert/strict';
import { test } from 'node:test';

import { KITS, kitFor, ordered } from './travelKit.ts';

test('finds the country from the destination the chat writes', () => {
  assert.equal(kitFor('Osaka, Japan'), KITS.japan);
  assert.equal(kitFor('Seoul'), KITS.korea);
  assert.equal(kitFor('Hong Kong'), KITS.hongkong);
  assert.equal(kitFor('Paris & Rome'), KITS.europe);
  assert.equal(kitFor('Ho Chi Minh City, Vietnam'), KITS.vietnam);
  assert.equal(kitFor('Bali, Indonesia'), KITS.indonesia);
  assert.equal(kitFor('Lima, Peru'), null);
  assert.equal(kitFor(''), null);
});

test('every item says what it is for in both languages, and links only to https or a store search', () => {
  for (const kit of Object.values(KITS)) {
    for (const x of kit.items) {
      assert.ok(x.name.th && x.name.en && x.what.th && x.what.en, x.name.en);
      if (x.url) assert.match(x.url, /^https:\/\//);
      assert.ok(!(x.url && x.store), `${x.name.en} has both a site and a store search`);
    }
  }
});

test('things to do at home come first', () => {
  const list = ordered(KITS.japan.items);
  const firstThere = list.findIndex((x) => x.when === 'there');
  assert.ok(list.slice(firstThere).every((x) => x.when === 'there'));
});
