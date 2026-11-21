// แผนที่ของทริปบนเว็บ: แผนที่วาด (Mapbox ใช้ได้เฉพาะในแอปที่ build เอง ดู tripMap.native.tsx) เต็มกรอบของตัวที่ครอบ
import { StyleSheet, View } from 'react-native';

import { SketchMap } from '@/components/ui';
import { globePoints, type TripGlobeProps, type TripMapProps } from '@/lib/mapPoints';

export function TripMap({ points, selected, onSelect, interactive = true, pad }: TripMapProps) {
  return (
    <View style={StyleSheet.absoluteFill}>
      <SketchMap points={points} pad={pad} selected={selected} onSelect={interactive ? onSelect : undefined} />
    </View>
  );
}

/** ทริปทั้งหมดบนเว็บ: แผนที่วาด หมุดเลขตามลำดับทริป (ลูกโลกใช้ได้เฉพาะในแอปที่ build เอง) */
export function TripGlobe({ trips, selected, onSelect, interactive = true, pad }: TripGlobeProps) {
  return (
    <View style={StyleSheet.absoluteFill}>
      <SketchMap points={globePoints(trips)} line={false} pad={pad} selected={selected} onSelect={interactive ? onSelect : undefined} />
    </View>
  );
}
