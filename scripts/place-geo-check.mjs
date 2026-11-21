// Live check: place-photos answers with the coordinates of the place's own Wikipedia article, so map pins can be checked
// (docs/superpowers/plans/2026-11-21-map-phase-1.md task 4). A place with no article of its own gets no coordinates.
//   NODE_USE_ENV_PROXY=1 node scripts/place-geo-check.mjs
const URL = 'https://vjblrglalptgdxabteqm.supabase.co/functions/v1/place-photos';
const KEY = 'sb_publishable_ThF183z7kk5KPpjGxBggFQ_Op7La_La';
const fail = (msg) => { console.error('FAIL:', msg); process.exit(1); };
const ask = async (places) => {
  const res = await fetch(URL, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: KEY }, body: JSON.stringify({ places }) });
  if (!res.ok) fail(`place-photos answered ${res.status}`);
  return (await res.json()).photos;
};
const near = (p, lat, lon) => p && Math.abs(p.lat - lat) < 0.02 && Math.abs(p.lon - lon) < 0.02;

// asked twice: the first answer may come from rows cached before coordinates were kept, the second from the saved coordinates
for (const round of [1, 2]) {
  const [castle, kiyomizu, stall] = await ask([
    { name: 'Osaka Castle', near: 'Osaka' },
    { name: 'Kiyomizu-dera', near: 'Kyoto' },
    { name: 'Uncle Somchai Noodle Stall', near: 'Chiang Mai' },
  ]);
  if (!near(castle, 34.687, 135.526)) fail(`round ${round}: Osaka Castle should come with its article's coordinates, got ${JSON.stringify(castle)}`);
  if (!near(kiyomizu, 34.995, 135.785)) fail(`round ${round}: Kiyomizu-dera should come with its article's coordinates, got ${JSON.stringify(kiyomizu)}`);
  if (stall && (stall.lat !== undefined || stall.lon !== undefined)) fail(`round ${round}: a place without an article must not get coordinates, got ${JSON.stringify(stall)}`);
  console.log(`round ${round}: Osaka Castle ${castle.lat},${castle.lon}; Kiyomizu-dera ${kiyomizu.lat},${kiyomizu.lon}; noodle stall none`);
}
console.log('PASS: articles give coordinates, places without one do not');
