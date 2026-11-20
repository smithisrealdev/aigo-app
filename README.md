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

16 หน้าตาม mockup ต่อ Supabase จริงแล้วสำหรับแชต สร้างแผน รูปสถานที่ และการ์ดจอง (ดู [docs/backend.md](docs/backend.md))
ทริปโอซาก้าใน `src/data/trip.ts` เหลือไว้เป็นตัวอย่างในแท็บทริปก่อนมีทริปจริงเท่านั้น จุดที่เป็นทางลัดมีคอมเมนต์ `shortcut:` ในโค้ด

ทดสอบบนมือถือด้วย Expo Go: [docs/phone-test.md](docs/phone-test.md)
