import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { allow, clientIp, tooMany } from "../_shared/rate-limit.ts";
import { base, isExact, mentions, slug, titleFits, words } from "../_shared/place-match.ts";

// Place photos from Wikipedia and Wikimedia Commons (free), cached for everyone in place_photos so each place is searched once.
// POST { places: [{ name, near? }] } -> { photos: [{ url, title, lat?, lon? } | null] } in the same order; null = Wikimedia did not answer, ask again.
// lat/lon = coordinates of the Wikipedia article about the place itself (the app checks map pins against them), never of a broader article;
// again = the coordinates could not be checked yet (Wikipedia did not answer), so the app asks once more later.
// scripts/seed-photos.mjs fills the cache ahead of time for well-known places.
// shortcut: Wikimedia only, so some restaurants and small hotels get no photo;
// add a capped Google Places fallback if too many places come back empty.
const MAX_PLACES = 24;
const DAY = 86_400_000;
const UA = "AiGoTravel/1.0 (https://theaigo.co)";
// Thai, Japanese, Chinese or Korean words make an English Wikipedia search miss, so they are left out of the hint
const NON_LATIN = /[฀-๿぀-ヿ㐀-鿿가-힯]/;

type Place = { name: string; near: string };
type Hit = { url: string | null; title: string | null };
/** {} = no coordinates of the place's own; null in the table = a row cached before coordinates were kept */
type Geo = { lat?: number; lon?: number };
/** shared: the photo does not depend on the near hint (an article's lead image, or a Commons photo found without a hint) */
type Found = Hit & { shared?: boolean; geo?: Geo | null };

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

// Cache rows: "v5|n|<slug>" for Wikipedia photos and Commons photos found without a hint, shared by every trip ("Senso-ji", "Sensoji" and "Sensō-ji" are one row);
// "v5|<name>|<near>" for Commons photos found with a hint and for misses, which depend on the near hint. Rows of earlier versions are never read again.
const nearKey = (p: Place) => `v5|${p.name}|${p.near}`.toLowerCase();
const nameKey = (s: string) => (slug(s) ? `v5|n|${slug(s)}` : null);
const keysOf = (p: Place) => [nameKey(p.name), nearKey(p)].filter((k): k is string => !!k);

// Not a photo of the place: SVG or PNG drawings, and by file name flags, seals, logos, maps, satellite views and disasters
const NOT_PHOTO = /[/_](flag|coat[_ ]of[_ ]arms|seal|emblem|logo|map|locator|location|earthquake|tsunami|wrecks?|disaster)[-_.0-9]|[/_(](satellit|sentinel[-_0-9]|landsat|modis[-_.)]|srtm[-_.)]|nasa[-_.)]|astronaut|iss[0-9])/i;
const drawing = (url: string) => !/[.]jpe?g([?]|$)/i.test(url) || NOT_PHOTO.test(url);
// Thumbnails only: an original file is smaller than a card, and Wikimedia rate-limits originals (they came back 429)
const isPhoto = (url: string) => url.includes("/thumb/") && !drawing(url);
type Page = { index?: number; title?: string; thumbnail?: { source?: string }; imageinfo?: { thumburl?: string }[]; coordinates?: { lat: number; lon: number }[] };
const geoOf = (pg?: Page): Geo => { const c = pg?.coordinates?.[0]; return c ? { lat: c.lat, lon: c.lon } : {}; };
/** One MediaWiki search, best match first; null when the site could not answer (rate limit, network), so nothing gets cached */
async function results(host: string, params: Record<string, string>): Promise<Page[] | null> {
  const url = `https://${host}/w/api.php?` + new URLSearchParams({ action: "query", format: "json", generator: "search", gsrlimit: "1", ...params });
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (!res.ok) { console.warn("wikimedia", host, res.status); return null; }
    const data = await res.json();
    if (data.error) { console.warn("wikimedia", host, data.error.code); return null; }
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
async function search(p: Place): Promise<Found | null> {
  const pages = await results("en.wikipedia.org", { gsrsearch: p.name, gsrnamespace: "0", gsrlimit: "3", prop: "pageimages|coordinates", piprop: "thumbnail", pithumbsize: "640" });
  if (pages === null) return null;
  const name = words(p.name), size = new Set(name).size;
  // coordinates come only from an article about the place itself, with or without a photo
  const geo = geoOf(pages.find((pg) => pg.title && isExact(pg.title, p.name)));
  const fits = pages.filter((pg) => pg.thumbnail?.source && isPhoto(pg.thumbnail.source) && pg.title && titleFits(pg.title, p.name));
  const exact = fits.find((pg) => isExact(pg.title!, p.name));
  if (exact) return { url: exact.thumbnail!.source!, title: exact.title!, shared: true, geo };
  const near = p.near && !NON_LATIN.test(p.near) ? ` ${p.near}` : "";
  const known = new Set([...name, ...words(near), "landscape", "file", "jpg", "jpeg", "png", "webp", "tif", "tiff"]);
  const other = (title: string) => words(title).filter((w) => !known.has(w) && !/^[0-9]+$/.test(w)).length;
  /** The Commons photo of a search whose file name mentions the place with the fewest other words; undefined = none, null = no answer */
  const commons = async (q: string) => {
    const files = await results("commons.wikimedia.org", { gsrsearch: `${q} filetype:bitmap`, gsrnamespace: "6", gsrlimit: "10", prop: "imageinfo", iiprop: "url", iiurlwidth: "640" });
    return files && files.filter((f) => f.imageinfo?.[0]?.thumburl && isPhoto(f.imageinfo[0].thumburl) && f.title && mentions(f.title, p.name))
      .sort((a, b) => other(a.title!) - other(b.title!))[0];
  };
  // a country, region or island whose article opens with a flag, map or satellite view: a landscape photo first ("Scotland" got a house in Texas)
  const scenic = pages.some((pg) => pg.title && pg.thumbnail?.source && titleFits(pg.title, p.name) && drawing(pg.thumbnail.source));
  let file = scenic ? await commons(`${p.name}${near} landscape`) : undefined;
  if (file === undefined) file = await commons(`${p.name}${near}`);
  if (file === null) return null;
  if (file) return { url: file.imageinfo![0].thumburl!, title: file.title!, shared: !p.near, geo };
  const broad = fits.find((pg) => { const t = new Set(words(base(pg.title!))); return t.has(name[0]) && t.size * 2 >= size; });
  if (broad) return { url: broad.thumbnail!.source!, title: broad.title!, shared: true, geo };
  return { url: null, title: null, geo };
}

/** Coordinates of these articles (one request, at most 50 titles); null when Wikipedia could not answer */
async function coordinates(titles: string[]): Promise<Map<string, Geo> | null> {
  const url = "https://en.wikipedia.org/w/api.php?" + new URLSearchParams({ action: "query", format: "json", prop: "coordinates", colimit: "max", titles: titles.join("|") });
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (!res.ok) { console.warn("wikipedia coordinates", res.status); return null; }
    const data = await res.json();
    const out = new Map<string, Geo>();
    for (const pg of Object.values(data.query?.pages ?? {}) as Page[]) if (pg.title) out.set(pg.title, geoOf(pg));
    for (const n of (data.query?.normalized ?? []) as { from: string; to: string }[]) if (out.has(n.to)) out.set(n.from, out.get(n.to)!);
    return out;
  } catch {
    return null;
  }
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
  const items: Place[] = places.map((p) => {
    const name = String((p as { name?: unknown })?.name ?? "").trim().slice(0, 120);
    const near = String((p as { near?: unknown })?.near ?? "").trim().slice(0, 80);
    // "Naples, Italy" is the place Naples near Italy, so the city's own article is found
    const comma = name.indexOf(",");
    return !near && comma > 0 ? { name: name.slice(0, comma).trim(), near: name.slice(comma + 1).trim().slice(0, 80) } : { name, near };
  });

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const found = new Map<string, Found>();
  const born = new Map<string, string>(); // created_at of cached rows, kept when their coordinates are filled in
  const keys = [...new Set(items.filter((p) => p.name).flatMap(keysOf))];
  if (keys.length) {
    const { data } = await sb.from("place_photos").select("key, url, title, created_at, geo").in("key", keys);
    for (const r of data ?? []) {
      // photos are kept 90 days; places without one are searched again after a week, and so are flags, maps and other non-photos cached by an earlier version
      if (Date.now() - Date.parse(r.created_at) < (r.url ? 90 : 7) * DAY && !(r.url && !isPhoto(r.url))) {
        found.set(r.key, { url: r.url, title: r.title, geo: r.geo });
        born.set(r.key, r.created_at);
      }
    }
  }
  const hitKey = (p: Place) => { const k = nameKey(p.name); return k && found.has(k) ? k : found.has(nearKey(p)) ? nearKey(p) : null; };
  const hitOf = (p: Place) => { const k = hitKey(p); return k ? found.get(k) : undefined; };

  // Rows cached before coordinates were kept: an article about the place itself gets its coordinates now, every other row {}
  // (a broader article, a Commons file, a hand-picked photo of somewhere else, or no photo)
  const stale = [...new Map(items.filter((p) => p.name && hitOf(p) && hitOf(p)!.geo == null).map((p) => [hitKey(p)!, p])).entries()];
  if (stale.length) {
    const own = (p: Place) => { const t = hitOf(p)!.title; return t && !t.startsWith("File:") && isExact(t, p.name) ? t : null; };
    const titles = [...new Set(stale.map(([, p]) => own(p)).filter((t): t is string => !!t))];
    const coords = titles.length ? await coordinates(titles) : new Map<string, Geo>();
    if (coords) {
      const rows = stale.map(([key, p]) => {
        const hit = found.get(key)!;
        const t = own(p);
        hit.geo = (t && coords.get(t)) || {};
        return { key, url: hit.url, title: hit.title, created_at: born.get(key)!, geo: hit.geo };
      });
      await sb.from("place_photos").upsert(rows);
    }
  }

  // Search the rest a few at a time, as Wikimedia asks of API clients
  const todo = [...new Map(items.filter((p) => p.name && !hitOf(p)).map((p) => [keysOf(p)[0], p])).values()];
  for (let i = 0; i < todo.length; i += 4) {
    const batch = todo.slice(i, i + 4);
    const hits = await Promise.all(batch.map(search));
    const at = new Date().toISOString();
    // A place's own row (its name, or the near hint for photos that depend on it) carries its coordinates. A Wikipedia photo is also
    // saved under its article's title, but only where no row exists yet: it never replaces a hand-picked photo or stored coordinates,
    // and its coordinates are filled in when someone asks for that title. One key goes in once.
    const own = new Map<string, { key: string; url: string | null; title: string | null; created_at: string; geo: Geo }>();
    const extra = new Map<string, { key: string; url: string | null; title: string | null; created_at: string }>();
    batch.forEach((p, j) => {
      const hit = hits[j];
      if (!hit) return; // Wikimedia did not answer: not cached, so the next request tries again
      const key = hit.shared ? nameKey(p.name) : nearKey(p);
      if (key) { found.set(key, hit); own.set(key, { key, url: hit.url, title: hit.title, created_at: at, geo: hit.geo ?? {} }); }
      const titleKey = hit.shared && hit.title && !hit.title.startsWith("File:") ? nameKey(hit.title) : null;
      if (titleKey && titleKey !== key) {
        if (!found.has(titleKey)) found.set(titleKey, { ...hit, geo: null });
        extra.set(titleKey, { key: titleKey, url: hit.url, title: hit.title, created_at: at });
      }
    });
    for (const key of own.keys()) extra.delete(key);
    if (own.size) await sb.from("place_photos").upsert([...own.values()]);
    if (extra.size) await sb.from("place_photos").upsert([...extra.values()], { onConflict: "key", ignoreDuplicates: true });
  }

  return json({ photos: items.map((p) => {
    const h = p.name ? hitOf(p) : undefined;
    return h ? { url: h.url, title: h.title, ...(typeof h.geo?.lat === "number" && { lat: h.geo.lat, lon: h.geo.lon }), ...(h.geo == null && { again: true }) } : null;
  }) });
});
