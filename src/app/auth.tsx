import { router } from 'expo-router';
import { useEffect } from 'react';

// ปลายทางของ Google เมื่อกลับเข้าแอป (aigo://auth) บน Android ลิงก์นี้เปิดหน้านี้ด้วย ให้กลับไปหน้าที่ผู้ใช้อยู่
export default function AuthReturn() {
  useEffect(() => { if (router.canGoBack()) router.back(); else router.replace('/'); }, []);
  return null;
}
