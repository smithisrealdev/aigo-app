import type { User } from '@supabase/supabase-js';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { PUBLISHABLE_KEY, SUPABASE_URL } from '@/lib/backend';
import type { L } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';

// เข้าสู่ระบบ (R19): อีเมลพร้อมรหัส 6 หลัก, Google, Apple ออกจากระบบ (R36) แล้วทริปยังอยู่ในเครื่อง
// Google และ Apple ใช้ได้เมื่อเปิดใน Supabase Auth แล้ว (docs/backend.md) ก่อนหน้านั้นปุ่มบอกตรงๆ ว่ายังไม่เปิด
WebBrowser.maybeCompleteAuthSession(); // เว็บ: ปิดหน้าต่างเข้าสู่ระบบเมื่อกลับมาที่แอป

export type Provider = 'google' | 'apple';

/** ข้อผิดพลาดที่ผู้ใช้อ่านเข้าใจ บอกว่าเกิดอะไรและทำอะไรต่อได้ */
export class AuthProblem extends Error {
  constructor(public text: L) { super(text.en); }
}

const NOT_ON: Record<Provider, L> = {
  google: { th: 'การเข้าสู่ระบบด้วย Google ยังไม่เปิดในรุ่นทดลองนี้ ใช้อีเมลได้เลย', en: 'Google sign-in is not switched on in this preview yet. You can use email.' },
  apple: { th: 'การเข้าสู่ระบบด้วย Apple ยังไม่เปิดในรุ่นทดลองนี้ ใช้อีเมลได้เลย', en: 'Apple sign-in is not switched on in this preview yet. You can use email.' },
};

export function problem(e: unknown): AuthProblem {
  if (e instanceof AuthProblem) return e;
  const { code, name } = (e ?? {}) as { code?: string; name?: string };
  if (code === 'email_address_not_authorized') return new AuthProblem({ th: 'ตอนนี้ระบบส่งอีเมลได้เฉพาะอีเมลของทีม AiGo ระหว่างนี้ใช้ต่อในเครื่องนี้ได้ ทริปเก็บไว้ในเครื่องแล้ว', en: 'For now AiGo can only email its own team. Keep using this phone; your trips are saved on it.' });
  if (code === 'over_email_send_rate_limit' || code === 'over_request_rate_limit') return new AuthProblem({ th: 'ขอรหัสถี่เกินไป รอสักครู่แล้วลองอีกครั้ง', en: 'Too many tries. Wait a moment and try again.' });
  if (code === 'otp_expired') return new AuthProblem({ th: 'รหัสไม่ถูกต้องหรือหมดอายุแล้ว กดส่งรหัสใหม่ได้', en: 'That code is wrong or has expired. You can send a new one.' });
  if (code === 'email_address_invalid' || code === 'validation_failed') return new AuthProblem({ th: 'อีเมลนี้ใช้ไม่ได้ ลองตรวจตัวสะกดอีกครั้ง', en: 'That email address does not work. Check the spelling.' });
  if (e instanceof TypeError || name === 'AuthRetryableFetchError') return new AuthProblem({ th: 'ต่ออินเทอร์เน็ตไม่ได้ ลองใหม่เมื่อมีสัญญาณ', en: 'No internet connection. Try again when you are online.' });
  return new AuthProblem({ th: 'เข้าสู่ระบบไม่สำเร็จ ลองอีกครั้ง', en: 'Could not sign in. Please try again.' });
}

/** ผู้ให้บริการนี้เปิดใน Supabase Auth หรือยัง (การตั้งค่าสาธารณะของโปรเจกต์) */
async function switchedOn(provider: Provider) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/settings`, { headers: { apikey: PUBLISHABLE_KEY } });
  return res.ok && (await res.json())?.external?.[provider] === true;
}

/** Google ผ่านหน้าเว็บในแอป แล้วกลับมาที่ aigo://auth (ในแอป Expo Go เป็น exp://.../--/auth) พร้อมรหัสแลก session */
async function google() {
  const redirectTo = Linking.createURL('auth');
  const { data, error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo, skipBrowserRedirect: true } });
  if (error) throw error;
  const res = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (res.type !== 'success') return false;
  const { queryParams } = Linking.parse(res.url);
  const code = typeof queryParams?.code === 'string' ? queryParams.code : '';
  if (!code) throw new Error(String(queryParams?.error_description ?? 'Google returned no code'));
  const { error: exchange } = await supabase.auth.exchangeCodeForSession(code);
  if (exchange) throw exchange;
  return true;
}

/** Apple บน iPhone: หน้าต่างของระบบ แล้วส่ง identity token ให้ Supabase */
async function apple() {
  try {
    const cred = await AppleAuthentication.signInAsync({ requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL] });
    if (!cred.identityToken) throw new Error('Apple returned no identity token');
    const { error } = await supabase.auth.signInWithIdToken({ provider: 'apple', token: cred.identityToken });
    if (error) throw error;
    return true;
  } catch (e) {
    if ((e as { code?: string }).code === 'ERR_REQUEST_CANCELED') return false;
    throw e;
  }
}

type Ctx = {
  ready: boolean;
  user: User | null;
  /** ส่งรหัส 6 หลักไปที่อีเมล ยังไม่มีบัญชีก็สมัครให้เลย */
  sendCode: (email: string) => Promise<void>;
  verifyCode: (email: string, code: string) => Promise<void>;
  /** false = ผู้ใช้ปิดหน้าต่างเอง */
  signInWith: (provider: Provider) => Promise<boolean>;
  signOut: () => Promise<void>;
};
const AuthContext = createContext<Ctx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null)).catch(() => {}).finally(() => setReady(true));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    return () => data.subscription.unsubscribe();
  }, []);

  const call = async (fn: () => Promise<{ error: unknown }>) => {
    const res = await fn().catch((e: unknown) => { throw problem(e); });
    if (res.error) throw problem(res.error);
  };
  const value: Ctx = {
    ready, user,
    sendCode: (email) => call(() => supabase.auth.signInWithOtp({ email: email.trim().toLowerCase() })),
    verifyCode: (email, code) => call(() => supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token: code.trim(), type: 'email' })),
    signInWith: async (provider) => {
      try {
        if (!(await switchedOn(provider))) throw new AuthProblem(NOT_ON[provider]);
        return provider === 'apple' ? await apple() : await google();
      } catch (e) {
        throw problem(e);
      }
    },
    signOut: async () => {
      const { error } = await supabase.auth.signOut();
      if (error) await supabase.auth.signOut({ scope: 'local' }); // ออฟไลน์: ออกจากเครื่องนี้ก่อน
    },
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
