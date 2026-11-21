// แผนที่ของทริปบนเว็บ: แผนที่วาด (Mapbox ใช้ได้เฉพาะในแอปที่ build เอง ดู tripMap.native.tsx) เต็มกรอบของตัวที่ครอบ
import { StyleSheet, View } from 'react-native';

import { SketchMap } from '@/components/ui';
import type { TripMapProps } from '@/lib/mapPoints';

export function TripMap({ points, selected, onSelect, interactive = true, pad, style }: TripMapProps) {
  return (
    <View style={[StyleSheet.absoluteFill, style]}>
      <SketchMap points={points} pad={pad} selected={selected} onSelect={interactive ? onSelect : undefined} />
    </View>
  );
}
