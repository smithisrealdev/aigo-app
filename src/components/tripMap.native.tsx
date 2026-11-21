// แผนที่จริงของทริป (Mapbox Standard, R12) ในแอปที่ build เอง: หมุดเลขตามลำดับในแผน เส้นประตามลำดับ และตำแหน่งของเรา
// ใช้ได้เมื่อแอปมีโค้ด native ของ Mapbox และมี EXPO_PUBLIC_MAPBOX_TOKEN; Expo Go, ไม่มี token, วันที่ไม่มีหมุด หรือโหลดแผนที่ไม่ขึ้น ใช้แผนที่วาดแทน
import type * as Mapbox from '@rnmapbox/maps';
import { Image } from 'expo-image';
import { useEffect, useMemo, useRef, useState } from 'react';
import { NativeModules, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { Icon } from '@/components/icon';
import { IconButton, MapPin, SketchMap } from '@/components/ui';
import { arc, GLOBE_SPACE, globePoints, globeZoom, mapLoadFailed, planeAt, type GlobeTrip, type TripGlobeProps, type TripMapProps } from '@/lib/mapPoints';
import { useSettings } from '@/lib/settings';
import { fonts, radius, space } from '@/theme/tokens';

const TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN;
// @rnmapbox/maps โยน error ตั้งแต่ตอนโหลดถ้าแอปไม่มีโค้ด native ของมัน (Expo Go) จึงโหลดเฉพาะเมื่อมีทั้งโมดูลและ token
// eslint-disable-next-line @typescript-eslint/no-require-imports
const M: typeof Mapbox | null = TOKEN && NativeModules.RNMBXModule ? require('@rnmapbox/maps') : null;
M?.setAccessToken(TOKEN!).catch(() => {});
// Android ขอสิทธิ์ตำแหน่งครั้งเดียวต่อการเปิดแอป: ผู้ใช้ปฏิเสธแล้วไม่ถามซ้ำทุกครั้งที่เปิดหน้าที่มีแผนที่
let androidAsk: Promise<boolean> | null = null;
// สีแผนที่ชุดเดียวกับแอป (docs/superpowers/specs/2026-11-21-map-look-design.md) ปรับหลังเจ้าของดูบนเครื่องจริง
const MAP_LOOK = {
  light: { lightPreset: 'day', colorLand: '#F6EFE6', colorWater: '#D4ECFF', colorGreenspaces: '#D2F3E4', colorRoads: '#FFFFFF', colorMotorways: '#FFE9A8', colorBuildings: '#EDE4D8' },
  dark: { lightPreset: 'night', colorLand: '#1F1B17', colorWater: '#22344A', colorGreenspaces: '#1F3A30', colorRoads: '#3D362E', colorMotorways: '#3D3420', colorBuildings: '#2A241F' },
} as const;
// ลองจิจูดของเส้นที่ข้ามเส้นแบ่งวันเกิน 180 ได้ (ให้เส้นต่อเนื่อง) จุดเดี่ยวส่งให้ Mapbox ในช่วง ±180
const wrap = (lon: number) => ((lon + 540) % 360) - 180;

export function TripMap({ points, selected, onSelect, interactive = true, showUser = false, pad, intro = false, pois = false, travel }: TripMapProps) {
  const { colors, isDark, pick } = useSettings();
  // บินจากลูกโลก: 'globe' รอแผนที่โหลด, 'intro' บินลง 2.5 วินาที, 'normal' เปลี่ยนวันแล้วเลื่อนธรรมดา; เล่นครั้งเดียวต่อการเปิดหน้า
  const reduce = useReducedMotion();
  const [stage, setStage] = useState<'globe' | 'intro' | 'normal'>(intro && !reduce ? 'globe' : 'normal');
  useEffect(() => {
    if (stage !== 'intro') return;
    const t = setTimeout(() => setStage('normal'), 2600);
    return () => clearTimeout(t);
  }, [stage]);
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
    // วาดใหม่เมื่อตำแหน่งขยับจริงเท่านั้น (ทิศของเครื่องเปลี่ยนก็ส่งมา)
    const on = (l: Mapbox.Location) => setHere((h) => (h && Math.abs(h[0] - l.coords.longitude) < 1e-5 && Math.abs(h[1] - l.coords.latitude) < 1e-5 ? h : [l.coords.longitude, l.coords.latitude]));
    let live = true;
    // ฟังตำแหน่งเฉพาะแผนที่ที่มีปุ่มไปที่ตำแหน่งของฉัน; จุดฟ้าบนแผนที่ Mapbox แสดงเองโดยไม่ต้องฟัง
    const listen = () => { if (live && interactive) { lm.start(25); lm.addListener(on); } };
    if (Platform.OS === 'android') (androidAsk ??= M.requestAndroidLocationPermissions().catch(() => false)).then((ok) => { if (ok && live) { setGranted(true); listen(); } });
    else listen();
    return () => { live = false; lm.removeListener(on); };
  }, [showUser, interactive]);

  const lons = points.map((p) => p.lon), lats = points.map((p) => p.lat);
  const [w, e, s, n] = [Math.min(...lons), Math.max(...lons), Math.min(...lats), Math.max(...lats)];
  const { w: bw, h: bh } = box;
  // ที่เดียว หรือทุกที่แทบเป็นจุดเดียวกัน: ซูมไปที่จุดนั้น (พอดีกรอบของจุดเดียวจะซูมลึกสุด)
  const one = e - w < 0.002 && n - s < 0.002;
  // วันเดินทาง: เส้นบินตามผิวโลก และรูปเครื่องบินก่อนถึงปลายทาง (คำนวณใหม่เฉพาะเมื่อจุดเปลี่ยน)
  const has = !!travel;
  const [fa, fo, ta, tb] = travel ? [travel.from.lat, travel.from.lon, travel.to.lat, travel.to.lon] : [0, 0, 0, 0];
  const line = useMemo(() => (has ? arc({ lat: fa, lon: fo }, { lat: ta, lon: tb }) : null), [has, fa, fo, ta, tb]);
  const plane = useMemo(() => line && planeAt(line), [line]);
  // ค่าคงที่ตราบที่วันและขนาดไม่เปลี่ยน กล้องจึงไม่ดีดกลับตอนผู้ใช้เลื่อนแผนที่แล้วหน้าจอวาดใหม่
  const camera = useMemo<Mapbox.CameraStop>(() => {
    const padding = { paddingTop: pad.top * bh, paddingBottom: pad.bottom * bh, paddingLeft: pad.x * bw, paddingRight: pad.x * bw };
    // วันเดินทางจบที่ฝั่งปลายทางระดับเห็นทั้งภูมิภาค ให้เห็นเส้นบินพุ่งเข้ามาหาที่แรก
    if (has) return { centerCoordinate: [tb, ta], zoomLevel: 7, padding };
    return one ? { centerCoordinate: [(w + e) / 2, (s + n) / 2], zoomLevel: 15, padding } : { bounds: { ne: [e, n], sw: [w, s] }, padding };
  }, [pad.top, pad.bottom, pad.x, bw, bh, one, w, e, s, n, has, ta, tb]);
  // จุดเริ่มของการบินลง: ลูกโลกทั้งใบหันกลางของวัน (วันเดินทางหันกลางเส้นบิน)
  const [sx, sy] = line ? line[line.length >> 1] : [(w + e) / 2, (s + n) / 2];
  const start = useMemo<Mapbox.CameraStop>(() => ({
    centerCoordinate: [wrap(sx), sy], zoomLevel: globeZoom(bw, bh, { top: pad.top, bottom: pad.bottom, x: pad.x }, sy),
    padding: { paddingTop: pad.top * bh, paddingBottom: pad.bottom * bh, paddingLeft: pad.x * bw, paddingRight: pad.x * bw },
  }), [sx, sy, bw, bh, pad.top, pad.bottom, pad.x]);
  const view = stage === 'globe' ? start : camera;

  if (!M || failed || !points.length) {
    return <View style={StyleSheet.absoluteFill}><SketchMap points={points} pad={pad} selected={selected} onSelect={interactive ? onSelect : undefined} /></View>;
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

  return (
    <View style={[StyleSheet.absoluteFill, { pointerEvents: interactive ? 'auto' : 'none' }]}
      onLayout={(ev) => { const { width, height } = ev.nativeEvent.layout; setBox((b) => (b.w === width && b.h === height ? b : { w: width, h: height })); }}>
      {bw > 0 && (
        // ลูกโลก: ซูมออกจนสุดเห็นโลกทั้งใบ ระดับเมืองหน้าตาเหมือนแผนที่แบน
        <M.MapView style={StyleSheet.absoluteFill} styleURL="mapbox://styles/mapbox/standard" projection="globe" onMapLoadingError={(e) => { if (mapLoadFailed(e)) setFailed(true); }}
          onDidFinishLoadingMap={() => setStage((x) => (x === 'globe' ? 'intro' : x))}
          scrollEnabled={interactive} zoomEnabled={interactive} rotateEnabled={false} pitchEnabled={false} compassEnabled={false} scaleBarEnabled={false}
          // Android: แผนที่อยู่ในหน้าที่เลื่อนขึ้นลงได้ ให้ลากแผนที่ได้ทุกทิศ ไม่ให้หน้ารับการลากขึ้นลงไป
          requestDisallowInterceptTouchEvent={interactive}
          // Android: แผนที่เล็ก (หัวหน้าแผน, วันนี้) ใช้ TextureView ให้มุมโค้งของกรอบตัดแผนที่ได้
          surfaceView={interactive}
          logoPosition={{ bottom: orn, left: space.sm }} attributionEnabled={interactive} attributionPosition={{ bottom: orn, left: space.sm + 92 }}>
          <M.StyleImport id="basemap" existing config={{ ...MAP_LOOK[isDark ? 'dark' : 'light'], showPointOfInterestLabels: pois }} />
          <M.Camera ref={cam} defaultSettings={view} {...view} animationDuration={stage === 'intro' ? 2500 : 600} animationMode={stage === 'intro' ? 'flyTo' : 'easeTo'} />
          {points.length > 1 && (
            <M.ShapeSource id="aigo-route" shape={{ type: 'LineString', coordinates: points.map((p) => [p.lon, p.lat]) }}>
              <M.LineLayer id="aigo-route-line" slot="middle" style={{ lineColor: colors.primary, lineWidth: 4, lineDasharray: [0.2, 2], lineCap: 'round', lineJoin: 'round', lineEmissiveStrength: 1 }} />
            </M.ShapeSource>
          )}
          {line && (
            <M.ShapeSource id="aigo-travel" shape={{ type: 'LineString', coordinates: line }}>
              <M.LineLayer id="aigo-travel-line" slot="middle" style={{ lineColor: colors.primary, lineWidth: 3, lineDasharray: [2, 2], lineCap: 'round', lineJoin: 'round', lineEmissiveStrength: 1 }} />
            </M.ShapeSource>
          )}
          {plane && (
            <M.MarkerView coordinate={[wrap(plane.at[0]), plane.at[1]]} allowOverlap>
              <View accessible={false} style={{ width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', transform: [{ rotate: `${plane.rotate}deg` }] }}>
                <Icon name="plane" color={colors.primary} size={18} />
              </View>
            </M.MarkerView>
          )}
          {travel && (
            <M.MarkerView coordinate={[travel.to.lon, travel.to.lat]} allowOverlap>
              {travel.photo ? (
                <View accessible accessibilityLabel={travel.to.label} style={{ width: 52, height: 52, borderRadius: 26, borderWidth: 3, borderColor: colors.primary, overflow: 'hidden', backgroundColor: colors.surface }}>
                  <Image source={travel.photo} style={StyleSheet.absoluteFill} contentFit="cover" accessible={false} />
                </View>
              ) : <MapPin n={travel.to.n} name={travel.to.label} />}
            </M.MarkerView>
          )}
          {showUser && granted && <M.LocationPuck />}
          {points.map((p) => (
            <M.MarkerView key={p.key} coordinate={[p.lon, p.lat]} allowOverlap allowOverlapWithPuck isSelected={p.key === selected}>
              <MapPin n={p.n} name={p.label} selected={p.key === selected} approx={p.approx} onPress={interactive && onSelect ? () => onSelect(p.key) : undefined} />
            </M.MarkerView>
          ))}
        </M.MapView>
      )}
      {/* แผนที่ที่แตะไม่ได้ (หัวหน้าแผน, วันนี้) กดปุ่ม (i) ไม่ได้: แสดงเครดิตเป็นข้อความแทน ตามเงื่อนไขของ Mapbox และ OpenStreetMap */}
      {bw > 0 && !interactive && (
        <Text style={{ position: 'absolute', left: space.sm + 92, bottom: orn + 3, paddingHorizontal: 4, borderRadius: radius.sm / 3, overflow: 'hidden', backgroundColor: colors.glass, color: colors.mutedStrong, fontFamily: fonts.body, fontSize: 10 }}>
          © Mapbox © OpenStreetMap
        </Text>
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

/**
 * ทริปทั้งหมดบนลูกโลกแบบ Polarsteps (หน้า /globe และการ์ดในแท็บทริป): ภาพดาวเทียม อวกาศมีดาว แสงเรืองรอบโลก
 * รูปของแต่ละทริป และเส้นประระหว่างเมืองในทริป; เลือกทริปแล้วกล้องบินเข้าไปที่ทริปนั้น ไม่เลือกเห็นทั้งใบ (ซูมด้วยสองนิ้วได้ตลอด)
 */
export function TripGlobe({ trips, selected, onSelect, interactive = true, pad }: TripGlobeProps) {
  const { colors } = useSettings();
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [failed, setFailed] = useState(false);
  // ไม่ได้เลือกทริป: หันทริปที่เลือกล่าสุด (ตอนแรกคือทริปแรกในรายการ = ทริปที่เปิดอยู่) เข้าหาเรา
  const [last, setLast] = useState(selected);
  if (selected && selected !== last) setLast(selected);
  const sel = trips.find((t) => t.key === selected);
  const face = sel ?? trips.find((t) => t.key === last) ?? trips[0];
  const { w: bw, h: bh } = box;
  const lons = (sel?.stops ?? []).map((p) => p.lon), lats = (sel?.stops ?? []).map((p) => p.lat);
  const [w, e, s, n] = [Math.min(...lons), Math.max(...lons), Math.min(...lats), Math.max(...lats)];
  const route = !!sel && sel.stops.length > 1;
  const [lon, lat] = [face?.lon ?? 100, face?.lat ?? 15];
  // ค่าคงที่ตราบที่ทริปที่เลือกและขนาดไม่เปลี่ยน กล้องจึงไม่ดีดกลับตอนผู้ใช้หมุนหรือซูมเอง
  const camera = useMemo<Mapbox.CameraStop>(() => {
    const padding = { paddingTop: pad.top * bh, paddingBottom: pad.bottom * bh, paddingLeft: pad.x * bw, paddingRight: pad.x * bw };
    if (route) return { bounds: { ne: [e, n], sw: [w, s] }, padding };
    if (selected) return { centerCoordinate: [lon, lat], zoomLevel: 10, padding };
    return { centerCoordinate: [lon, lat], zoomLevel: globeZoom(bw, bh, { top: pad.top, bottom: pad.bottom, x: pad.x }, lat), padding };
  }, [pad.top, pad.bottom, pad.x, bw, bh, route, selected, w, e, s, n, lon, lat]);

  if (!M || failed || !trips.length) {
    return <View style={StyleSheet.absoluteFill}><SketchMap points={globePoints(trips)} line={false} pad={pad} selected={selected} onSelect={interactive ? onSelect : undefined} /></View>;
  }

  const multi = trips.filter((t) => t.stops.length > 1);
  const lines = { type: 'FeatureCollection' as const, features: multi.map((t) => ({ type: 'Feature' as const, properties: {}, geometry: { type: 'LineString' as const, coordinates: t.stops.map((p) => [p.lon, p.lat]) } })) };
  const dots = { type: 'FeatureCollection' as const, features: multi.flatMap((t) => t.stops.map((p) => ({ type: 'Feature' as const, properties: {}, geometry: { type: 'Point' as const, coordinates: [p.lon, p.lat] } }))) };
  const orn = Math.max(space.sm, pad.bottom * bh - 28);

  return (
    <View style={[StyleSheet.absoluteFill, { pointerEvents: interactive ? 'auto' : 'none' }]}
      onLayout={(ev) => { const { width, height } = ev.nativeEvent.layout; setBox((b) => (b.w === width && b.h === height ? b : { w: width, h: height })); }}>
      {bw > 0 && (
        <M.MapView style={StyleSheet.absoluteFill} styleURL="mapbox://styles/mapbox/standard-satellite" projection="globe" onMapLoadingError={(ev) => { if (mapLoadFailed(ev)) setFailed(true); }}
          scrollEnabled={interactive} zoomEnabled={interactive} rotateEnabled={false} pitchEnabled={false} compassEnabled={false} scaleBarEnabled={false}
          requestDisallowInterceptTouchEvent={interactive} surfaceView={interactive}
          logoPosition={{ bottom: orn, left: space.sm }} attributionEnabled={interactive} attributionPosition={{ bottom: orn, left: space.sm + 92 }}>
          <M.StyleImport id="basemap" existing config={{ showPointOfInterestLabels: false }} />
          {/* อวกาศสีเข้มมีดาว ขอบโลกเรืองฟ้า (ค่าจากตัวอย่างลูกโลกของ Mapbox) */}
          <M.Atmosphere style={{ color: 'rgb(186, 210, 235)', highColor: 'rgb(36, 92, 223)', horizonBlend: 0.02, spaceColor: GLOBE_SPACE, starIntensity: 0.6 }} />
          <M.Camera defaultSettings={camera} {...camera} animationDuration={1400} animationMode="flyTo" />
          <M.ShapeSource id="aigo-globe-routes" shape={lines}>
            <M.LineLayer id="aigo-globe-route" slot="middle" style={{ lineColor: '#FFFFFF', lineWidth: 2.5, lineDasharray: [2, 2], lineCap: 'round', lineJoin: 'round', lineEmissiveStrength: 1 }} />
          </M.ShapeSource>
          <M.ShapeSource id="aigo-globe-stops" shape={dots}>
            <M.CircleLayer id="aigo-globe-stop" slot="middle" style={{ circleRadius: 4, circleColor: '#FFFFFF', circleStrokeWidth: 2, circleStrokeColor: colors.primary, circleEmissiveStrength: 1 }} />
          </M.ShapeSource>
          {trips.map((t) => (
            <M.MarkerView key={t.key} coordinate={[t.lon, t.lat]} allowOverlap isSelected={t.key === selected}>
              <GlobeMarker t={t} on={t.key === selected} onPress={interactive && onSelect ? () => onSelect(t.key) : undefined} />
            </M.MarkerView>
          ))}
        </M.MapView>
      )}
      {/* การ์ดที่แตะแผนที่ไม่ได้กดปุ่ม (i) ไม่ได้: แสดงเครดิตเป็นข้อความ (ภาพดาวเทียมต้องให้เครดิต Maxar ด้วย) */}
      {bw > 0 && !interactive && (
        <Text style={{ position: 'absolute', left: space.sm + 92, bottom: orn + 3, paddingHorizontal: 4, borderRadius: radius.sm / 3, overflow: 'hidden', backgroundColor: colors.glass, color: colors.mutedStrong, fontFamily: fonts.body, fontSize: 10 }}>
          © Mapbox © OpenStreetMap © Maxar
        </Text>
      )}
    </View>
  );
}

// รูปของทริปบนลูกโลก: กรอบขาวมุมมน ทริปที่เลือกใหญ่กว่าและกรอบสีหลัก มุมขวาล่างบอกจำนวนวัน
function GlobeMarker({ t, on, onPress }: { t: GlobeTrip; on: boolean; onPress?: () => void }) {
  const { colors, pick } = useSettings();
  const d = on ? 64 : 48;
  const days = pick({ th: `${t.days} วัน`, en: `${t.days} d` });
  const body = (
    // เว้นขอบให้ป้ายจำนวนวันที่ยื่นออกนอกรูปไม่ถูกตัด
    <View style={{ padding: 10 }}>
      <View style={{ width: d, height: d, borderRadius: d / 4, borderWidth: 3, borderColor: on ? colors.primary : '#FFFFFF', overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary }}>
        {t.photo ? <Image source={t.photo} style={StyleSheet.absoluteFill} contentFit="cover" accessible={false} /> : <Icon name="pin" color={colors.onPrimary} />}
      </View>
      <View style={{ position: 'absolute', right: 0, bottom: 0, height: 22, paddingHorizontal: 7, borderRadius: 11, borderWidth: 2, borderColor: '#FFFFFF', justifyContent: 'center', backgroundColor: colors.ink }}>
        <Text style={{ fontFamily: fonts.bodyBold, fontSize: 11, color: colors.bg }}>{days}</Text>
      </View>
    </View>
  );
  if (!onPress) return body;
  return <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${t.label}, ${days}`} accessibilityState={{ selected: on }}>{body}</Pressable>;
}
