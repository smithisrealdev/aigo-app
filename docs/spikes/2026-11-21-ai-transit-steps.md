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
