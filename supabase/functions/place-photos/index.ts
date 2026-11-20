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
// v5: rows from earlier versions (wrong photos for some places) are never read again
const keyOf = (p: Place) => `v5|${p.name}|${p.near}`.toLowerCase();

// Words that may differ between a name and its article title ("Mt. Moiwa" / "Mount Moiwa")
const LOOSE = new Set(["the", "of", "and", "de", "la", "le", "el", "mount", "mt", "st", "saint"]);
const words = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 1 && !LOOSE.has(w));
/** The article is about this place only if every word of its title is in the name: "Nijo Market" must not get "Nijō Castle" */
const titleFits = (title: string, name: string) => { const n = new Set(words(name)); const t = words(title); return t.length > 0 && t.every((w) => n.has(w)); };
/** A Commons file name mentions the place if it shares a word of 4+ letters with the name */
const mentions = (title: string, name: string) => { const t = new Set(words(title)); return words(name).some((w) => w.length >= 4 && t.has(w)); };

type Page = { index?: number; title?: string; thumbnail?: { source?: string }; imageinfo?: { thumburl?: string }[] };
/** One MediaWiki search, best match first; null when the site could not answer (rate limit, network), so nothing gets cached */
async function results(host: string, params: Record<string, string>): Promise<Page[] | null> {
  const url = `https://${host}/w/api.php?` + new URLSearchParams({ action: "query", format: "json", generator: "search", gsrlimit: "1", ...params });
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.error) return null;
    return (Object.values(data.query?.pages ?? {}) as Page[]).sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
  } catch {
    return null;
  }
}

/**
 * Photo for a place, most specific first; null when Wikimedia could not answer:
 * 1. the lead image of a Wikipedia article named exactly like the place
 * 2. a Commons photo whose file name mentions the place, the one with the fewest other words
 *    ("Noboribetsu Onsen 01.jpg" over "Raccoon in a tree at Noboribetsu Onsen.jpg")
 * 3. a broader article that keeps the place's first word and at least half its name ("Otaru" for "Otaru Canal"),
 *    never a generic one ("Onsen" for "Jozankei Onsen") or the city alone ("Sapporo" for "Sapporo Ramen Yokocho")
 */
async function search(p: Place): Promise<Hit | null> {
  const pages = await results("en.wikipedia.org", { gsrsearch: p.name, gsrnamespace: "0", gsrlimit: "3", prop: "pageimages", piprop: "thumbnail", pithumbsize: "640" });
  if (pages === null) return null;
  const name = words(p.name), size = new Set(name).size;
  const fits = pages.filter((pg) => pg.thumbnail?.source && pg.title && titleFits(pg.title, p.name));
  const exact = fits.find((pg) => new Set(words(pg.title!)).size >= size);
  if (exact) return { url: exact.thumbnail!.source!, title: exact.title! };
  const near = p.near && !NON_LATIN.test(p.near) ? ` ${p.near}` : "";
  const files = await results("commons.wikimedia.org", { gsrsearch: `${p.name}${near} filetype:bitmap`, gsrnamespace: "6", gsrlimit: "5", prop: "imageinfo", iiprop: "url", iiurlwidth: "640" });
  if (files === null) return null;
  const known = new Set([...name, ...words(near), "file", "jpg", "jpeg", "png", "webp", "tif", "tiff"]);
  const other = (title: string) => words(title).filter((w) => !known.has(w) && !/^\d+$/.test(w)).length;
  const file = files.filter((f) => f.imageinfo?.[0]?.thumburl && f.title && mentions(f.title, p.name))
    .sort((a, b) => other(a.title!) - other(b.title!))[0];
  if (file) return { url: file.imageinfo![0].thumburl!, title: file.title! };
  const broad = fits.find((pg) => { const t = new Set(words(pg.title!)); return t.has(name[0]) && t.size * 2 >= size; });
  if (broad) return { url: broad.thumbnail!.source!, title: broad.title! };
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
