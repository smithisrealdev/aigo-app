// Live check of the plan-job API in generate-itinerary (docs/superpowers/specs/2026-11-21-server-plan-jobs-design.md).
// Starts a short plan as a brand-new guest device, never drives it, and waits for the server to finish it on its own.
//   NODE_USE_ENV_PROXY=1 node scripts/plan-job-check.mjs [days=2] [--no-chat]
// --no-chat starts without a chat, as a direct API caller would: the job must still save every day (it never uses the
// whole-trip cache). Costs one short AI plan. Exits 1 on the first failed expectation.
const URL = 'https://vjblrglalptgdxabteqm.supabase.co/functions/v1/generate-itinerary';
const KEY = 'sb_publishable_ThF183z7kk5KPpjGxBggFQ_Op7La_La';
const days = Number(process.argv.find((a) => /^\d+$/.test(a)) ?? 2);
const noChat = process.argv.includes('--no-chat');
const device = 'check' + Array.from({ length: 27 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
const post = async (body) => {
  const res = await fetch(URL, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: KEY, 'x-device-id': device }, body: JSON.stringify(body) });
  const text = await res.text();
  let data = null;
  try { data = JSON.parse(text); } catch { /* not JSON */ }
  return { status: res.status, data, text };
};
const fail = (msg) => { console.error('FAIL:', msg); process.exit(1); };
const iso = (d) => d.toISOString().slice(0, 10);

const bad = await post({ job: 'status', jobId: crypto.randomUUID(), token: 'nope', have: 0 });
if (bad.status !== 403) fail(`status of an unknown job should be 403, got ${bad.status} ${bad.text.slice(0, 120)}`);
console.log('unknown job -> 403');

const start = new Date(Date.now() + 40 * 86400000);
const req = {
  job: 'start', destination: 'Chiang Mai', startDate: iso(start), endDate: iso(new Date(+start + (days - 1) * 86400000)), language: 'th',
  ...(!noChat && { conversationMessages: [{ role: 'user', content: `เที่ยวเชียงใหม่และภาคเหนือ ${days} วัน ชอบคาเฟ่ วัด ธรรมชาติ` }] }),
};
const s = await post(req);
if (s.status !== 200 || !s.data?.jobId || !s.data?.token || s.data.totalDays !== days) fail(`start should give jobId, token, totalDays=${days}; got ${s.status} ${s.text.slice(0, 200)}`);
console.log('started', s.data.jobId);
const { jobId, token } = s.data;

const wrong = await post({ job: 'status', jobId, token: token + 'x', have: 0 });
if (wrong.status !== 403) fail(`status with a wrong token should be 403, got ${wrong.status}`);
console.log('wrong token -> 403');

const t0 = Date.now();
let last;
while (Date.now() - t0 < (days > 10 ? 20 : 9) * 60_000) {
  await new Promise((r) => setTimeout(r, 20_000));
  last = (await post({ job: 'status', jobId, token, have: 0 })).data;
  console.log(`${Math.round((Date.now() - t0) / 1000)}s: ${last?.status} ${last?.days?.length}/${last?.totalDays}${last?.error ? ' error=' + last.error : ''}`);
  if (last?.status !== 'running') break;
}
if (last?.status !== 'done' || last.days.length !== days) fail(`job should end done with ${days} days, got ${last?.status} ${last?.days?.length}`);
if (!last.title) fail('the job should keep the trip title the AI wrote');
// every day once, in order (a run that was cut or two runs at once must not skip or repeat a day)
const dates = last.days.map((d) => d.date);
const want = Array.from({ length: days }, (_, i) => iso(new Date(+start + i * 86400000)));
if (dates.join() !== want.join()) fail(`days should be ${want.join(', ')}; got ${dates.join(', ')}`);
const names = last.days.flatMap((d) => (d.places ?? []).map((p) => p.name));
if (new Set(names).size !== names.length) console.warn(`note: the AI repeated a place (${names.length - new Set(names).size} times)`);
const tail = (await post({ job: 'status', jobId, token, have: days - 1 })).data;
if (tail?.days?.length !== 1) fail(`have=${days - 1} should return only the last day, got ${tail?.days?.length}`);
// The free trip was counted when day 1 was saved; a start that says it continues a trip is still a new trip
const again = await post({ ...req, fromDay: days });
if (again.data?.jobId) await post({ job: 'stop', jobId: again.data.jobId, token: again.data.token });
if (again.status !== 429 || again.data?.code !== 'GUEST_QUOTA_EXCEEDED') fail(`a start with fromDay from a device past its free trip should get 429 GUEST_QUOTA_EXCEEDED, got ${again.status} ${again.text.slice(0, 160)}`);
console.log('start with fromDay past the free trip -> 429');
console.log(`PASS: ${days} days in ${Math.round((Date.now() - t0) / 1000)} s without the app; first places: ${names.slice(0, 8).join(', ')}`);
