import { Anuphan_400Regular, Anuphan_600SemiBold, Anuphan_700Bold } from '@expo-google-fonts/anuphan';
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, ThemeProvider, usePathname } from 'expo-router';
import Stack from 'expo-router/stack';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { ToastProvider, useToast } from '@/components/ui';
import { AuthProvider, useAuth } from '@/lib/auth';
import { finishedNow, type PlanStatus } from '@/lib/itinerary';
import { SettingsProvider, useSettings } from '@/lib/settings';
import { TripProvider, useTrip } from '@/lib/tripStore';

SplashScreen.preventAutoHideAsync();

// แผนเสร็จตอนอยู่หน้าอื่น: บอกด้วย toast (หน้างานของ AiGo แสดงเองอยู่แล้ว)
function PlanDoneToast() {
  const { trips } = useTrip();
  const { pick } = useSettings();
  const toast = useToast();
  const path = usePathname();
  const seen = useRef(new Map<string, PlanStatus | undefined>());
  useEffect(() => {
    for (const t of trips) {
      const now = t.plan?.status;
      if (finishedNow(seen.current.get(t.id), now) && path !== '/work') toast(pick({ th: `แผน ${pick(t.title)} เสร็จแล้ว`, en: `Your ${pick(t.title)} plan is ready` }));
      seen.current.set(t.id, now);
    }
  }, [trips, path, toast, pick]);
  return null;
}

function Root() {
  const { ready, isDark, colors } = useSettings();
  const { ready: tripReady } = useTrip();
  const { ready: authReady } = useAuth();
  const [fontsLoaded, fontError] = useFonts({ Anuphan_400Regular, Anuphan_600SemiBold, Anuphan_700Bold });
  // ฟอนต์โหลดไม่ได้ก็เปิดแอปด้วยฟอนต์ระบบ ดีกว่าค้างที่หน้าเปิด
  const show = ready && tripReady && authReady && (fontsLoaded || !!fontError);
  useEffect(() => { if (show) SplashScreen.hideAsync(); }, [show]);
  if (!show) return null;
  const base = isDark ? DarkTheme : DefaultTheme;
  return (
    <ThemeProvider value={{ ...base, colors: { ...base.colors, background: colors.bg, card: colors.surface, text: colors.ink, border: colors.line } }}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <ToastProvider>
        <PlanDoneToast />
        <Stack screenOptions={{ headerShown: false }} />
      </ToastProvider>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return <GestureHandlerRootView style={{ flex: 1 }}><SettingsProvider><AuthProvider><TripProvider><Root /></TripProvider></AuthProvider></SettingsProvider></GestureHandlerRootView>;
}
