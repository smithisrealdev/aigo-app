# AiGo Mobile

แอปมือถือ AiGo (Expo / React Native) แนวคิด: บอกครั้งเดียว AiGo จัดการให้ ถามแค่ตอนที่ต้องจ่ายเงิน

- สเปก: `docs/requirements.md` (หมวด 1a หลักการ AI Agent)
- mockup: https://claude.ai/artifact/YDHqzheiiRT8wMjZe3AAb8
- ระบบดีไซน์ยืมจาก ChefJiw (`src/theme/tokens.ts`, `src/components/ui.tsx`)

## คำสั่ง

```bash
npm install
npx expo start      # เปิดแอป (Expo Go หรือเว็บ)
npm run typecheck
npm run lint
npm test            # ทดสอบกฎ "AiGo ทำเอง หรือรออนุมัติ" ใน src/lib/agent.ts
```

## สถานะ

ส่วนแรก: หน้า AiGo, แชต, AiGo กำลังจัดการ, รอคุณอนุมัติ, ทริป, แผนรายวัน, สถานที่ ใช้ข้อมูลตัวอย่างใน `src/data/trip.ts` ยังไม่ต่อ Supabase
