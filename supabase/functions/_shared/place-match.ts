// Matching a place name to a Wikipedia article title (place-photos): whose photo and whose coordinates a place gets.
// No imports, so the app's test runner (node) checks it too: place-match.test.ts

// Letters NFD does not split into a base letter and a mark: "Tromsø" is "Tromso"
export const FOLD: Record<string, string> = { "ø": "o", "æ": "ae", "ß": "ss", "ł": "l", "đ": "d", "ð": "d", "þ": "th" };
export const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[øæßłđðþ]/g, (c) => FOLD[c]);
export const slug = (s: string) => fold(s).replace(/[^a-z0-9]+/g, "");
// Words that may differ between a name and its article title ("Mt. Moiwa" / "Mount Moiwa", "New York" / "New York City")
export const LOOSE = new Set(["the", "of", "and", "de", "la", "le", "el", "mount", "mt", "st", "saint", "city"]);
export const words = (s: string) => fold(s).split(/[^a-z0-9]+/).filter((w) => w.length > 1 && !LOOSE.has(w));
export const KIND = new Set(["temple", "shrine", "park", "market", "castle", "museum", "garden", "gardens", "palace", "station", "cathedral", "church", "bridge", "tower"]);
/** "Christ the Redeemer (statue)" and "Museum of Islamic Art, Doha" are articles about "Christ the Redeemer" and "Museum of Islamic Art" */
export const base = (title: string) => title.split("(")[0].split(",")[0];
/** The article is about this place only if every word of its title is in the name: "Nijo Market" must not get "Nijō Castle" */
export const titleFits = (title: string, name: string) => { const n = new Set(words(name)); const t = words(base(title)); return t.length > 0 && t.every((w) => n.has(w)); };
/**
 * The article is about the place itself: as many words as the name, or two or more words that cover the name except for words that
 * only say what kind of place it is ("Senso-ji Temple" is the article "Sensō-ji"); a one-word title is often the city, so "Nagoya" is not "Nagoya Castle"
 */
export const isExact = (title: string, name: string) => {
  if (!titleFits(title, name)) return false;
  const n = words(name), t = new Set(words(base(title)));
  return t.size >= new Set(n).size || (t.size >= 2 && n.every((w) => t.has(w) || KIND.has(w)));
};
/** A Commons file name mentions the place if it shares a word of 4+ letters with the name */
export const mentions = (title: string, name: string) => { const t = new Set(words(title)); return words(name).some((w) => w.length >= 4 && t.has(w)); };
