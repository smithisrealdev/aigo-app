/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { ChatCard } from './chat.ts';
import { cardLink, flightLink, hotelLink, klookLink } from './links.ts';

const TRIP = { destination: 'Osaka, Japan', startDate: '2026-12-26', endDate: '2026-12-30', people: 2 };
const card = (c: Partial<ChatCard> & Pick<ChatCard, 'kind' | 'name'>): ChatCard => c;

test('เที่ยวบิน: ขาไปค้นแบบไปกลับใน Aviasales ขากลับค้นเที่ยวเดียว', () => {
  assert.equal(flightLink(card({ kind: 'flight', name: 'AirAsia X', from: 'bkk', to: 'KIX', date: '2026-12-26' }), TRIP), 'https://www.aviasales.com/search/BKK2612KIX30122?marker=692842');
  assert.equal(flightLink(card({ kind: 'flight', name: 'Thai Airways', from: 'KIX', to: 'BKK', date: '2026-12-30' }), TRIP), 'https://www.aviasales.com/search/KIX3012BKK2?marker=692842');
  assert.match(flightLink(card({ kind: 'flight', name: 'x', from: 'Bangkok', to: 'Osaka' }), TRIP), /^https:\/\/www\.google\.com\/travel\/flights\?q=Flights%20from%20Bangkok%20to%20Osaka%202026-12-26$/);
});

test('ที่พัก ตั๋ว ร้าน และบริการ', () => {
  assert.equal(hotelLink(card({ kind: 'hotel', name: 'Hotel Hankyu Respire Osaka' }), TRIP),
    'https://www.booking.com/searchresults.html?ss=Hotel+Hankyu+Respire+Osaka%2C+Osaka%2C+Japan&checkin=2026-12-26&checkout=2026-12-30&group_adults=2&no_rooms=1');
  assert.equal(klookLink('JR Pass'), 'https://affiliate.klook.com/redirect?aid=115623&aff_adid=1235530&k_site=https%3A%2F%2Fwww.klook.com%2Fsearch%2F%3Fquery%3DJR%2520Pass');
  assert.equal(cardLink(card({ kind: 'food', name: 'Kushikatsu Daruma', area: 'Shinsekai' }), TRIP), 'https://www.google.com/maps/search/?api=1&query=Kushikatsu%20Daruma%20Shinsekai');
  assert.equal(cardLink(card({ kind: 'service', name: 'Car rental', type: 'car_rental' }), TRIP), 'https://localrent.tpm.lv/lrzvZSNx');
  assert.match(cardLink(card({ kind: 'service', name: 'Kansai Area Pass', type: 'rail_pass' }), TRIP), /^https:\/\/affiliate\.klook\.com\/redirect\?.*Kansai%2520Area%2520Pass$/);
});
