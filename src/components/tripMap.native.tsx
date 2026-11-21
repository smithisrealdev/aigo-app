// แผนที่จริงของทริป (Mapbox Standard, R12) ในแอปที่ build เอง: หมุดเลขตามลำดับในแผน เส้นประตามลำดับ และตำแหน่งของเรา
// ใช้ได้เมื่อแอปมีโค้ด native ของ Mapbox และมี EXPO_PUBLIC_MAPBOX_TOKEN; Expo Go, ไม่มี token, วันที่ไม่มีหมุด หรือโหลดแผนที่ไม่ขึ้น ใช้แผนที่วาดแทน
import type * as Mapbox from '@rnmapbox/maps';
import { useEffect, useMemo, useRef, useState } from 'react';
import { NativeModules, Platform, StyleSheet, View } from 'react-native';

import { IconButton, MapPin, SketchMap } from '@/components/ui';
import type { TripMapProps } from '@/lib/mapPoints';
import { useSettings } from '@/lib/settings';
import { space } from '@/theme/tokens';

const TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN;
// @rnmapbox/maps โยน error ตั้งแต่ตอนโหลดถ้าแอปไม่มีโค้ด native ของมัน (Expo Go) จึงโหลดเฉพาะเมื่อมีทั้งโมดูลและ token
// eslint-disable-next-line @typescript-eslint/no-require-imports
const M: typeof Mapbox | null = TOKEN && NativeModules.RNMBXModule ? require('@rnmapbox/maps') : null;
M?.setAccessToken(TOKEN!).catch(() => {});

export function TripMap({ points, selected, onSelect, interactive = true, showUser = false, pad, style }: TripMapProps) {
  const { colors, isDark, pick } = useSettings();
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [failed, setFailed] = useState(false);
  const [here, setHere] = useState<[number, number] | null>(null);
  // iPhone: Mapbox ถามสิทธิ์เองตอนแสดงตำแหน่ง (ข้อความใน app.json) Android ต้องขอก่อนแสดง
  const [granted, setGranted] = useState(Platform.OS === 'ios');
  const [meFor, setMeFor] = useState(''); // กล้องไปอยู่ที่ตำแหน่งเราตอนดูวันไหน
  const cam = useRef<Mapbox.Camera>(null);

  useEffect(() => {
    if (!M || !showUser) return;
    const lm = M.locationManager;
    const on = (l: Mapbox.Location) => setHere([l.coords.longitude, l.coords.latitude]);
    let live = true;
    const listen = () => { if (live) { lm.start(25); lm.addListener(on); } };
    if (Platform.OS === 'android') M.requestAndroidLocationPermissions().then((ok) => { if (ok && live) { setGranted(true); listen(); } }, () => {});
    else listen();
    return () => { live = false; lm.removeListener(on); };
  }, [showUser]);

  const lons = points.map((p) => p.lon), lats = points.map((p) => p.lat);
  const [w, e, s, n] = [Math.min(...lons), Math.max(...lons), Math.min(...lats), Math.max(...lats)];
  const { w: bw, h: bh } = box;
  // ที่เดียว หรือทุกที่แทบเป็นจุดเดียวกัน: ซูมไปที่จุดนั้น (พอดีกรอบของจุดเดียวจะซูมลึกสุด)
  const one = e - w < 0.002 && n - s < 0.002;
  // ค่าคงที่ตราบที่วันและขนาดไม่เปลี่ยน กล้องจึงไม่ดีดกลับตอนผู้ใช้เลื่อนแผนที่แล้วหน้าจอวาดใหม่
  const camera = useMemo<Mapbox.CameraStop>(() => {
    const padding = { paddingTop: pad.top * bh, paddingBottom: pad.bottom * bh, paddingLeft: pad.x * bw, paddingRight: pad.x * bw };
    return one ? { centerCoordinate: [(w + e) / 2, (s + n) / 2], zoomLevel: 15, padding } : { bounds: { ne: [e, n], sw: [w, s] }, padding };
  }, [pad.top, pad.bottom, pad.x, bw, bh, one, w, e, s, n]);

  if (!M || failed || !points.length) {
    return <View style={[StyleSheet.absoluteFill, style]}><SketchMap points={points} pad={pad} selected={selected} onSelect={interactive ? onSelect : undefined} /></View>;
  }

  const day = `${w},${e},${s},${n}`;
  const atMe = !!here && meFor === day;
  const toggleMe = () => {
    if (!here) return;
    cam.current?.setCamera(atMe ? { ...camera, animationDuration: 600 } : { centerCoordinate: here, zoomLevel: 15, animationDuration: 600 });
    setMeFor(atMe ? '' : day);
  };
  // โลโก้และปุ่มเครดิตของ Mapbox ต้องมองเห็น (R12): มุมซ้ายล่าง ในขอบล่างที่เว้นไว้ เหนือแผ่นที่ทับแผนที่ (มุมขวาล่างเว้นให้ปุ่มของหน้า)
  const orn = Math.max(space.sm, pad.bottom * bh - 28);
  const ordered = [...points].sort((a, b) => Number(a.key === selected) - Number(b.key === selected)); // หมุดที่เลือกอยู่บนสุด

  return (
    <View style={[StyleSheet.absoluteFill, { pointerEvents: interactive ? 'auto' : 'none' }, style]}
      onLayout={(ev) => { const { width, height } = ev.nativeEvent.layout; setBox((b) => (b.w === width && b.h === height ? b : { w: width, h: height })); }}>
      {bw > 0 && (
        <M.MapView style={StyleSheet.absoluteFill} styleURL="mapbox://styles/mapbox/standard" onMapLoadingError={() => setFailed(true)}
          scrollEnabled={interactive} zoomEnabled={interactive} rotateEnabled={false} pitchEnabled={false} compassEnabled={false} scaleBarEnabled={false}
          logoPosition={{ bottom: orn, left: space.sm }} attributionPosition={{ bottom: orn, left: space.sm + 92 }}>
          <M.StyleImport id="basemap" existing config={{ lightPreset: isDark ? 'night' : 'day', showPointOfInterestLabels: false }} />
          <M.Camera ref={cam} defaultSettings={camera} {...camera} animationDuration={600} animationMode="easeTo" />
          {points.length > 1 && (
            <M.ShapeSource id="aigo-route" shape={{ type: 'LineString', coordinates: points.map((p) => [p.lon, p.lat]) }}>
              <M.LineLayer id="aigo-route-line" slot="middle" style={{ lineColor: colors.primary, lineWidth: 4, lineDasharray: [0.2, 2], lineCap: 'round', lineJoin: 'round', lineEmissiveStrength: 1 }} />
            </M.ShapeSource>
          )}
          {showUser && granted && <M.LocationPuck />}
          {ordered.map((p) => (
            <M.MarkerView key={p.key} coordinate={[p.lon, p.lat]} allowOverlap allowOverlapWithPuck>
              <MapPin n={p.n} name={p.label} selected={p.key === selected} approx={p.approx} onPress={interactive && onSelect ? () => onSelect(p.key) : undefined} />
            </M.MarkerView>
          ))}
        </M.MapView>
      )}
      {interactive && here && (
        <View style={{ position: 'absolute', right: space.md, bottom: orn }}>
          <IconButton icon={atMe ? 'map' : 'locate'} variant="glass" onPress={toggleMe}
            label={atMe ? pick({ th: 'ดูทั้งวัน', en: 'Show the whole day' }) : pick({ th: 'ไปที่ตำแหน่งของฉัน', en: 'Go to my location' })} />
        </View>
      )}
    </View>
  );
}
