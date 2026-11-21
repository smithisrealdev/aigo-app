// Fills the place photo cache ahead of time so the first user of a famous place sees its photo at once:
//   node scripts/seed-photos.mjs [file or folder]      (default: every .txt in scripts/photo-seeds/)
// A list file has "# City, Country" headers and one place per line, written as the chat writes them (common English names).
// Safe to run again: places already in the cache answer from the database without asking Wikimedia.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ENDPOINT = process.env.PLACE_PHOTOS_URL ?? 'https://vjblrglalptgdxabteqm.supabase.co/functions/v1/place-photos';
const KEY = process.env.SUPABASE_PUBLISHABLE_KEY ?? 'sb_publishable_ThF183z7kk5KPpjGxBggFQ_Op7La_La'; // publishable: meant to be public
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const target = process.argv[2] ?? new URL('./photo-seeds', import.meta.url).pathname;
const files = statSync(target).isDirectory() ? readdirSync(target).filter((f) => f.endsWith('.txt')).sort().map((f) => join(target, f)) : [target];

const seen = new Set();
const places = [];
for (const file of files) {
  let near = '';
  for (const raw of readFileSync(file, 'utf8').split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith('#')) near = line.slice(1).trim();
    else if (!seen.has(line.toLowerCase())) { seen.add(line.toLowerCase()); places.push({ name: line, near }); }
  }
}

const ask = async (batch) => {
  const res = await fetch(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: KEY }, body: JSON.stringify({ places: batch }) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()).photos;
};

// photos[j]: {url} = photo, {url: null} = Wikimedia has none, null = Wikimedia did not answer (asked again in the next pass)
const result = new Map();
let todo = places;
let answeredBatches = 0, failedBatches = 0;
for (let pass = 1; pass <= 3 && todo.length; pass++) {
  const unanswered = [];
  for (let i = 0; i < todo.length; i += 24) {
    const batch = todo.slice(i, i + 24);
    try {
      (await ask(batch)).forEach((p, j) => (p ? result.set(batch[j], p) : unanswered.push(batch[j])));
      answeredBatches++;
    } catch (e) {
      console.log(`\nbatch failed (${e.cause?.code ?? e.message}), asking again later`);
      // Node's fetch ignores HTTPS_PROXY: behind a proxy run with NODE_USE_ENV_PROXY=1
      if (!answeredBatches && ++failedBatches >= 3) throw new Error('Cannot reach the place-photos function. Behind a proxy, run: NODE_USE_ENV_PROXY=1 node scripts/seed-photos.mjs');
      unanswered.push(...batch);
      await sleep(5000);
    }
    process.stdout.write(`\rpass ${pass}: ${Math.min(i + 24, todo.length)}/${todo.length}   `);
    await sleep(1000);
  }
  console.log();
  todo = unanswered;
  if (todo.length && pass < 3) await sleep(15000);
}

const withPhoto = [...result.values()].filter((p) => p.url).length;
console.log(`${places.length} places: ${withPhoto} with a photo, ${result.size - withPhoto} without, ${todo.length} unanswered`);
const lines = (title, list) => list.length && console.log(`${title}:\n  ${list.join('\n  ')}`);
lines('No photo', [...result].filter(([, p]) => !p.url).map(([q]) => q.name));
lines('Unanswered', todo.map((q) => q.name));
