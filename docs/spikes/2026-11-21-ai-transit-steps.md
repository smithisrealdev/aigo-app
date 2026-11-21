# Transit-steps spike: my review against known Osaka/Kyoto/Nara routes

✅ right and usable · ⚠️ usable but a detail is wrong · ❌ would mislead or unusable

| Leg | claude-haiku-5.5 (current itinerary model) | claude-sonnet-5.5 | gemini-3.8-flash |
|---|---|---|---|
| Namba hotel → Osaka Castle | ❌ no stations in the answer | ⚠️ right route, both stop counts wrong (3→2, 1→2) | ✅ Midosuji 2 stops, Chuo 2 stops, exit 9 |
| Osaka Castle → Umeda Sky | ⚠️ right line, no stops or time | ✅ Osakajokoen→Osaka 4 stops | ✅ same, Central North exit |
| Umeda Sky → USJ | ⚠️ "Yumesaki Line from Osaka" (only some trains run through) | ⚠️ Nishikujo→Universal City "1 stop" (is 2) | ✅ |
| Namba hotel → Nara Park | ⚠️ old station name "Kintetsu Namba", bus with no number | ✅ | ✅ (stop count 8 depends on train type) |
| Namba hotel → Fushimi Inari | ❌ Namba→Yodoyabashi "2 stops" (is 3), Keihan ride "20 min" (about 45) | ✅ Midosuji→JR Kyoto Line→JR Nara Line, counts right | ⚠️ last step has no stations |
| Namba hotel → Kansai Airport | ✅ | ✅ | ✅ (5 stops only on rapi:t α) |
| Dotonbori → Tsutenkaku | ❌ no answer | ✅ Sakaisuji Line 1 stop | ✅ + exit 3 |
| Tsutenkaku → Abeno Harukas | ✅ walk | ✅ (1 stop by subway) | ✅ walk |
| Namba hotel → Kaiyukan | ❌ "Chuo Line from Namba" (the Chuo Line does not stop at Namba) | ✅ + exit 1 | ✅ + exit 1 |
| Kyoto Station → Kiyomizu-dera | ✅ bus 206 | ✅ bus 206 | ✅ bus 206 |
| Kyoto Station → Arashiyama | ✅ JR Sagano Line | ✅ | ✅ |
| **Fully right** | **4 / 11** | **9 / 11** | **10 / 11** |
| Cost per leg (OpenRouter) | $0.0011 | $0.018 | $0.0048 |
| Time per leg | ~10 s | ~13 s | ~9 s |

## Automatic check against OpenStreetMap

A script matched every ride step against OSM stations, route relations, stop order and numbered exits (Kansai data, queried through the maps.mail.ru Overpass mirror).

- All station names the models wrote exist in OSM (a removed prefix also hides old names such as "Kintetsu Namba").
- Caught the impossible route ("Chuo Line from Namba": no route serves both stations) and all four wrong stop counts found by hand.
- Confirmed numbered exits 9 (Tanimachi 4-chome), 1 (Osakako), 3 (Ebisucho), 2 (Kintetsu-Nara). Named exits at big JR stations ("Central North Exit") use other codes in OSM and cannot be checked.
- False alarms where data is thin: JR nicknames (Sagano Line), the JR Kyoto Line Special Rapid stop count, and Keihan to Fushimi-Inari when the Kyoto tile did not load.
- overpass-api.de refuses this container and Supabase Edge Functions (HTTP 406), and the mirror times out on large queries. Production checking needs our own copy of the rail data per country.

## Takeaways

- AI-written steps are usable with gemini-3.8-flash (10/11, about $0.005 per leg) or claude-sonnet-5.5 (9/11, about $0.018). Not with claude-haiku-5.5, the itinerary model (4/11, with wrong lines).
- Stop counts and exit numbers are where models slip: show them only when our data confirms them.
- Only Osaka, Kyoto and Nara were tested, which models know well. Test more cities before relying on it.
- Spike code is not in the repo; the throwaway `spike-transit` Edge Function now returns 410 and can be deleted from the dashboard.

## Prompt used (OpenRouter, temperature 0.2, JSON response)

The user message was `{"city", "from": {name, lat, lon}, "to": {name, lat, lon}}`.

```text
You plan public transport for tourists. Given a start and an end point in a city (name and coordinates), write the route a first-time visitor should take.

Rules:
- Use real line names and the official English station names shown on signs.
- If walking takes 15 minutes or less, walk.
- Prefer the simplest route (fewest transfers) when the time difference is small.
- Never give departure times, platform numbers or fares.
- If you are not sure of a detail (an exit number, a direction), use null. Do not guess.

Reply with JSON only:
{"steps":[{"type":"walk"|"ride","minutes":number,"mode":"subway"|"train"|"bus"|"tram"|null,"line":string|null,"operator":string|null,"toward":string|null,"from":string|null,"to":string|null,"stops":number|null,"exit":string|null,"note_th":string}],"total_minutes":number}
- "from" and "to" are the station or stop names for rides (null for walks).
- "stops" is how many stops you ride from boarding to getting off (Namba to Shinsaibashi on the Midosuji Line = 1).
- "toward" is the direction shown on signs (usually the final station of the train).
- "exit" is the exit to use at the station where you get off (ride steps only).
- "note_th" is one short sentence in Thai for the traveler.
```

## Test points

```js
  hotel: { name: 'Hotel near Namba Station, Osaka', lat: 34.6657, lon: 135.5016 },
  castle: { name: 'Osaka Castle', lat: 34.6873, lon: 135.5259 },
  sky: { name: 'Umeda Sky Building', lat: 34.7053, lon: 135.4903 },
  usj: { name: 'Universal Studios Japan', lat: 34.6654, lon: 135.4323 },
  nara: { name: 'Nara Park (Todai-ji)', lat: 34.6851, lon: 135.8398 },
  inari: { name: 'Fushimi Inari Taisha', lat: 34.9671, lon: 135.7727 },
  kix: { name: 'Kansai International Airport Terminal 1', lat: 34.4342, lon: 135.2328 },
  dotonbori: { name: 'Dotonbori (Glico sign)', lat: 34.6687, lon: 135.5013 },
  tsutenkaku: { name: 'Tsutenkaku Tower, Shinsekai', lat: 34.6525, lon: 135.5063 },
  harukas: { name: 'Abeno Harukas', lat: 34.6459, lon: 135.5135 },
  kaiyukan: { name: 'Osaka Aquarium Kaiyukan', lat: 34.6545, lon: 135.4290 },
  kyotoSta: { name: 'Kyoto Station', lat: 34.9858, lon: 135.7588 },
  kiyomizu: { name: 'Kiyomizu-dera', lat: 34.9949, lon: 135.7850 },
  bamboo: { name: 'Arashiyama Bamboo Grove', lat: 35.0170, lon: 135.6713 },
```
