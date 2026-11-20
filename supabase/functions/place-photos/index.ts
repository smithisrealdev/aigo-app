import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { allow, clientIp, tooMany } from "../_shared/rate-limit.ts";

// Place photos from Wikipedia and Wikimedia Commons (free), cached for everyone in place_photos so each place is searched once.
// POST { places: [{ name, near? }] } -> { photos: [{ url, title } | null] } in the same order.
// shortcut: Wikimedia only, so some restaurants and small hotels get no photo;
// add a capped Google Places fallback if too many places come back empty.
const MAX_PLACES = 24;
const DAY = 86_400_000;
const UA = "AiGoTravel/1.0 (https://theaigo.co)";
// Thai, Japanese, Chinese or Korean words make an English Wikipedia search miss, so they are left out of the hint
const NON_LATIN = /[฀-๿぀-ヿ㐀-鿿가-힯]/;

type Place = { name: string; near: string };
type Hit = { url: string | null; title: string | null };

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const keyOf = (p: Place) => `${p.name}|${p.near}`.toLowerCase();

// Words that may differ between a name and its article title ("Mt. Moiwa" / "Mount Moiwa")
const LOOSE = new Set(["the", "of", "and", "de", "la", "le", "el", "mount", "mt", "st", "saint"]);
const words = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 1 && !LOOSE.has(w));
/** The article is about this place only if every word of its title is in the name: "Nijo Market" must not get "Nijō Castle" */
const titleFits = (title: string, name: string) => { const n = new Set(words(name)); const t = words(title); return t.length > 0 && t.every((w) => n.has(w)); };
/** A Commons file name mentions the place if it shares a word of 4+ letters with the name */
const mentions = (title: string, name: string) => { const t = new Set(words(title)); return words(name).some((w) => w.length >= 4 && t.has(w)); };

type Page = { index?: number; title?: string; thumbnail?: { source?: string }; imageinfo?: { thumburl?: string }[] };
/** One MediaWiki search; null when the site could not answer (rate limit, network), so nothing gets cached */
async function first(host: string, params: Record<string, string>): Promise<Page | undefined | null> {
  const url = `https://${host}/w/api.php?` + new URLSearchParams({ action: "query", format: "json", generator: "search", gsrlimit: "1", ...params });
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.error) return null;
    return (Object.values(data.query?.pages ?? {}) as Page[]).sort((a, b) => (a.index ?? 0) - (b.index ?? 0))[0];
  } catch {
    return null;
  }
}

/** The Wikipedia article's lead image, else a Commons photo that names the place; null when Wikimedia could not answer */
async function search(p: Place): Promise<Hit | null> {
  const page = await first("en.wikipedia.org", { gsrsearch: p.name, gsrnamespace: "0", prop: "pageimages", piprop: "thumbnail", pithumbsize: "640" });
  if (page === null) return null;
  if (page?.thumbnail?.source && page.title && titleFits(page.title, p.name)) return { url: page.thumbnail.source, title: page.title };
  const near = p.near && !NON_LATIN.test(p.near) ? ` ${p.near}` : "";
  const file = await first("commons.wikimedia.org", { gsrsearch: `${p.name}${near} filetype:bitmap`, gsrnamespace: "6", prop: "imageinfo", iiprop: "url", iiurlwidth: "640" });
  if (file === null) return null;
  const thumb = file?.imageinfo?.[0]?.thumburl;
  if (thumb && file?.title && mentions(file.title, p.name)) return { url: thumb, title: file.title };
  return { url: null, title: null };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (!(await allow(`photo:ip:${clientIp(req)}`, 600, 3600))) return tooMany(corsHeaders, "Too many photo requests", 3600);

  let places: unknown;
  try {
    places = (await req.json())?.places;
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }
  if (!Array.isArray(places) || places.length > MAX_PLACES) return json({ error: `places must be a list of at most ${MAX_PLACES}` }, 400);
  const items: Place[] = places.map((p) => ({
    name: String((p as { name?: unknown })?.name ?? "").trim().slice(0, 120),
    near: String((p as { near?: unknown })?.near ?? "").trim().slice(0, 80),
  }));

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const found = new Map<string, Hit>();
  const keys = [...new Set(items.filter((p) => p.name).map(keyOf))];
  if (keys.length) {
    const { data } = await sb.from("place_photos").select("key, url, title, created_at").in("key", keys);
    for (const r of data ?? []) {
      // photos are kept 90 days; places without one are searched again after a week
      if (Date.now() - Date.parse(r.created_at) < (r.url ? 90 : 7) * DAY) found.set(r.key, { url: r.url, title: r.title });
    }
  }

  // Search the rest a few at a time, as Wikimedia asks of API clients
  const todo = keys.filter((k) => !found.has(k)).map((k) => items.find((p) => keyOf(p) === k)!);
  for (let i = 0; i < todo.length; i += 4) {
    const batch = todo.slice(i, i + 4);
    const hits = await Promise.all(batch.map(search));
    const rows = batch.flatMap((p, j) => {
      const hit = hits[j];
      if (!hit) return []; // Wikipedia did not answer: not cached, so the next request tries again
      found.set(keyOf(p), hit);
      return [{ key: keyOf(p), url: hit.url, title: hit.title, created_at: new Date().toISOString() }];
    });
    if (rows.length) await sb.from("place_photos").upsert(rows);
  }

  return json({ photos: items.map((p) => (p.name && found.get(keyOf(p))) || null) });
});
