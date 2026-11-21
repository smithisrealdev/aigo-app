import type { ImageSource } from 'expo-image';

import type { AppTrip } from '@/lib/itinerary';
import { travelLeg, tripSpots, type GlobeTrip, type TravelLeg } from '@/lib/mapPoints';
import { usePhotos } from '@/lib/photos';
import { useSettings } from '@/lib/settings';
import { useTrip } from '@/lib/tripStore';

/** ทริปทั้งหมดที่ขึ้นบนลูกโลก (หน้า /globe และการ์ดในแท็บทริป): ตำแหน่งจาก tripSpots รูปปกของทริปหรือรูปของเมืองปลายทาง */
export function useGlobeTrips(): GlobeTrip[] {
  const { pick } = useSettings();
  const { trips } = useTrip();
  const cover = usePhotos(trips.filter((x) => !x.cover).map((x) => ({ name: x.destination.en })));
  return tripSpots(trips).map((s) => {
    const x = trips.find((y) => y.id === s.key)!;
    return { ...s, label: pick(x.title), photo: x.cover ?? cover({ name: x.destination.en }), days: x.totalDays };
  });
}

/** วันเดินทางของวันนั้น (docs/superpowers/specs/2026-11-21-map-look-design.md) พร้อมรูปของที่แรกของวันถัดไป */
export function useTravelLeg(trip: AppTrip, day: number): (TravelLeg & { photo?: ImageSource }) | undefined {
  const { pick } = useSettings();
  const near = trip.destination.en;
  // ทริปตัวอย่างมีพิกัดที่ตรวจแล้ว ทริปอื่นใช้พิกัดของ AI: เส้นบินดูระดับภูมิภาค คลาดกันไม่กี่กิโลเมตรไม่เห็น
  const leg = travelLeg(trip.days, day, (x) => pick(x.name), trip.sample ? (x) => x : () => undefined);
  const to = leg && trip.days[day + 1]?.find((x) => x.id === leg.to.key);
  const photo = usePhotos(to && !to.photo ? [{ name: to.name.en, near }] : []);
  return leg && { ...leg, photo: to?.photo ?? (to ? photo({ name: to.name.en, near }) : undefined) };
}
