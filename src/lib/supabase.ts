// supabase-js ต้องใช้ URL แบบครบ ซึ่ง React Native ไม่มี (บางรุ่นไม่มี URLSearchParams.set) ตัวเสริมนี้ข้ามบนเว็บเอง
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

// โปรเจกต์ Supabase ของแอป (docs/backend.md) publishable key ออกแบบมาให้ฝังในแอปได้
export const SUPABASE_URL = 'https://vjblrglalptgdxabteqm.supabase.co';
export const PUBLISHABLE_KEY = 'sb_publishable_ThF183z7kk5KPpjGxBggFQ_Op7La_La';

// บัญชีผู้ใช้ผ่าน Supabase Auth: เก็บ session ในเครื่อง เปิดแอปใหม่ไม่ต้องเข้าระบบซ้ำ, PKCE สำหรับ Google ที่กลับเข้าแอปทางลิงก์
export const supabase = createClient(SUPABASE_URL, PUBLISHABLE_KEY, {
  auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false, flowType: 'pkce' },
});

// ต่ออายุ token เฉพาะตอนแอปเปิดอยู่ (ตามคำแนะนำของ Supabase สำหรับ React Native)
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => (state === 'active' ? supabase.auth.startAutoRefresh() : supabase.auth.stopAutoRefresh()));
}
