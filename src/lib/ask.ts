import { router } from 'expo-router';

import type { Lang } from './i18n';
import { tripContext, type AppTrip } from './itinerary';

/** "ถาม AiGo" จากหน้าแผน สถานที่ วันนี้ และหน้างาน (RA2): เปิดแชตพร้อมคำถาม แนบแผนของทริปให้ AI ตอบเรื่องทริปนี้ */
export const askAigo = (question: string, trip: AppTrip, lang: Lang, day?: number) =>
  router.push({ pathname: '/chat', params: { prompt: question, about: tripContext(trip, lang, day) } });
