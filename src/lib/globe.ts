import { tripSpots, type GlobeTrip } from '@/lib/mapPoints';
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
