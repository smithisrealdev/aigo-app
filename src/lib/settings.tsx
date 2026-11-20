import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { translate, type Key, type L, type Lang } from '@/lib/i18n';
import { dark, light, type Palette } from '@/theme/tokens';

type Saved = { lang: Lang; theme: 'system' | 'light' | 'dark'; autoEdit: boolean };
const DEFAULTS: Saved = { lang: 'th', theme: 'system', autoEdit: true };
const KEY = 'aigo.settings.v1';

type Ctx = Saved & {
  ready: boolean;
  set: (patch: Partial<Saved>) => void;
  colors: Palette;
  isDark: boolean;
  t: (key: Key, vars?: Record<string, string | number>) => string;
  pick: (text: L) => string;
};

const SettingsContext = createContext<Ctx | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [saved, setSaved] = useState<Saved>(DEFAULTS);
  const [ready, setReady] = useState(false);
  const scheme = useColorScheme();

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => { if (raw) setSaved({ ...DEFAULTS, ...JSON.parse(raw) }); })
      .catch(() => {}) // อ่านไม่ได้ก็ใช้ค่าเริ่มต้น แอปยังใช้ได้ครบ
      .finally(() => setReady(true));
  }, []);

  const set = (patch: Partial<Saved>) =>
    setSaved((prev) => {
      const next = { ...prev, ...patch };
      AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });

  const isDark = saved.theme === 'dark' || (saved.theme === 'system' && scheme === 'dark');
  const value: Ctx = {
    ...saved, ready, set, isDark,
    colors: isDark ? dark : light,
    t: (key, vars) => translate(saved.lang, key, vars),
    pick: (text) => text[saved.lang],
  };
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used inside SettingsProvider');
  return ctx;
}
