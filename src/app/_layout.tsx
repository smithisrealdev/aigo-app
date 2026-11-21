import { Anuphan_400Regular, Anuphan_600SemiBold, Anuphan_700Bold } from '@expo-google-fonts/anuphan';
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import Stack from 'expo-router/stack';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { ToastProvider } from '@/components/ui';
import { AuthProvider, useAuth } from '@/lib/auth';
import { SettingsProvider, useSettings } from '@/lib/settings';
import { TripProvider, useTrip } from '@/lib/tripStore';

SplashScreen.preventAutoHideAsync();

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
        <Stack screenOptions={{ headerShown: false }} />
      </ToastProvider>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return <GestureHandlerRootView style={{ flex: 1 }}><SettingsProvider><AuthProvider><TripProvider><Root /></TripProvider></AuthProvider></SettingsProvider></GestureHandlerRootView>;
}
