# Backend ของ AiGo Mobile

โปรเจกต์ Supabase: `aigo` · id `vjblrglalptgdxabteqm` · ap-southeast-1 (สิงคโปร์)
URL: `https://vjblrglalptgdxabteqm.supabase.co`
publishable key (ใส่ในแอปได้): `sb_publishable_ThF183z7kk5KPpjGxBggFQ_Op7La_La`

ตั้งใหม่เมื่อ 20 พ.ย. 2026 เพราะโปรเจกต์เดิมของเว็บ `dvzqgsukcmdhwwxsynwg` ไม่มีใน DNS แล้ว (`auth.theaigo.co` ยังชี้ไปที่นั่น เว็บ theaigo.co จึงล็อกอินและแชตไม่ได้)

## ทำแล้ว

- ลง migration ทั้ง 102 ไฟล์จาก `ai-travel-buddy-13/supabase/migrations` ได้ 64 ตาราง ไฟล์ที่ต้องแก้ให้ลงบนฐานข้อมูลใหม่ได้:
  - `20260115070340_…` ลบฟังก์ชันแชร์ทริป 4 ตัวก่อนสร้างใหม่ เพราะเปลี่ยนชนิดค่าที่คืน
  - `20260217134155_…` สร้างตารางซ้ำกับ `20260105140000_stripe_subscriptions.sql` จึงใช้ IF NOT EXISTS และเพิ่มคอลัมน์ `payment_history.stripe_payment_id`
  - `20260301000001_add_cron_monthly_reset.sql` ตั้ง cron เอง ภายหลังลบงานนี้ออก เพราะซ้ำกับ `reset-monthly-credits`
  - `20260315000004_travel_pass_plan.sql` แปลง `features` เป็น jsonb และลบ check constraint ของ `plan_limits.id`
- สร้างตาราง `guest_sessions`, `itinerary_skeleton_cache` และฟังก์ชันโควตาผู้เยี่ยมชม 5 ตัว ซึ่งไม่มีอยู่ในไฟล์ migration ใดเลย (โปรเจกต์เดิมคงสร้างด้วยมือ) โครงเดาจากโค้ดที่เรียกใช้ ดู [../supabase/guest_quota_and_skeleton_cache.sql](../supabase/guest_quota_and_skeleton_cache.sql)
- ปิดช่องโหว่ที่ติดมาจากฐานข้อมูลเดิม: ผู้ไม่ได้ล็อกอินเรียก `update_plan_credits`, `deduct_credits`, `reset_monthly_credits`, `reward_*` และฟังก์ชัน SECURITY DEFINER อื่นผ่าน `/rest/v1/rpc` ได้ จึงให้เรียกได้เฉพาะ service role (ฟังก์ชันเกี่ยวกับทริปให้ผู้ที่ล็อกอินเรียกได้) ตรวจแล้วว่า anon โดนปฏิเสธ
- deploy edge function `trip-chat` และ `generate-itinerary` (โค้ดเดียวกับเว็บ, verify_jwt ปิดตาม config เดิม เพราะตรวจ token ในโค้ดเอง)

## แอปเรียกอะไรแล้วบ้าง

- หน้าแชต (`src/app/chat.tsx`) ส่งบทสนทนาให้ `trip-chat` แล้วอ่านคำตอบแบบสตรีมผ่าน `src/lib/backend.ts` (header `apikey` = publishable key, `x-device-id` = เลขเครื่องโหมดผู้เยี่ยมชม)
  แยกปุ่มตอบด่วน `[QUICK_REPLIES]` และสรุปทริป `[TRIP_SUMMARY]` ด้วย `src/lib/chat.ts` ถ้าเรียกครั้งแรกไม่สำเร็จ (เช่นยังไม่มี key) จะใช้บทสนทนาตัวอย่างและบอกว่าเป็นตัวอย่าง
- กดให้ AiGo จัดการหลังแชตสรุปทริปแล้ว หน้างานของ AiGo เรียก `generate-itinerary` ด้วยสรุปทริปและบทสนทนา แล้วแปลงผลเป็นทริปของแอป (`src/lib/itinerary.ts`)
  แต่ละวันขึ้นในหน้างานและเก็บลงทริปทันทีที่ AI วางเสร็จ (หน้าแผนเปิดดูได้ระหว่างนั้น วันที่ยังไม่มาขึ้นว่า "AiGo กำลังวางแผนวันที่ N")
  ถ้าการเรียกครั้งไหนได้ไม่ครบทุกวัน แอปขอวันที่เหลือเองด้วย `fromDay` และรายการที่วางแล้ว (`planned`) กดลองใหม่ก็ทำต่อจากวันที่ได้แล้ว
  ทริปเก็บในเครื่อง (`src/lib/tripStore.tsx`) หน้าแผน สถานที่ แผนที่ ทริป แชร์ อ่านจากที่เดียวกัน ล้างทริปได้ที่หน้าบัญชี
  ทริปที่สร้างยังไม่มีรูป ราคาเป็นค่าประมาณของ AI และยังไม่ได้ตรวจเวลาเปิด (แอปบอกตรงๆ) ผู้เยี่ยมชมสร้างได้สัปดาห์ละ 1 ทริป (โควตาใน `guest_sessions`)
- ยังเป็นข้อมูลตัวอย่าง: เที่ยวบินและที่พักที่รออนุมัติ (ต้อง deploy `search-flights` / `search-hotels`) หน้าระหว่างเที่ยว และเที่ยวบินดีเลย์

## ฟังก์ชันที่ deploy อยู่ (โค้ดอยู่ใน `supabase/functions/`)

โค้ดตั้งต้นมาจาก repo เว็บ แก้แล้วดังนี้ ถ้าจะ deploy ใหม่ให้ใช้ไฟล์ใน repo นี้ ไม่ใช่ของเว็บ

- `trip-chat` (Claude Haiku 5.5, สำรองด้วย Gemini 3.8 Flash ซึ่งเป็นคนละผู้ให้บริการ): ไม่รับโมเดลที่แอปขอมา กันคนสลับไปใช้โมเดลแพงบนบิลของเรา
  ปิดการคิดก่อนตอบ (reasoning) ของ Haiku เพราะทำให้คำแรกช้าราว 15 วินาที และกิน max_tokens จนคำตอบถูกตัดก่อนถึง [TRIP_SUMMARY]
  ท้าย prompt มี DIRECTIVE 12 สำหรับแอป: ไม่ส่งบล็อกเที่ยวบิน ที่พัก ตั๋ว รูป และตารางที่แอปซ่อนอยู่แล้ว ตอบสั้นราว 120 คำ ข้อเสนอเป็นบรรทัดละวัน ตามด้วย [READY_TO_GENERATE] และ [TRIP_SUMMARY]
  จำกัดคำตอบไว้ที่ 8,192 token (OpenRouter จองเครดิตตาม max_tokens; ไม่ตั้งจะจอง 64K แล้วตอบ 402 เมื่อเครดิตเหลือน้อย)
  ให้ OpenRouter เก็บ prompt ระบบไว้ใช้ซ้ำ (prompt caching ของ Anthropic) และจำกัดผู้เยี่ยมชมไว้ที่ 60 ข้อความต่อชั่วโมงต่อ IP กับ 40 ข้อความต่อชั่วโมงต่อเครื่อง
- `generate-itinerary` (Claude Haiku 5.5, สำรองด้วย Gemini 3.5 Flash Lite): เดิมใช้ Sonnet ราว 70 วินาทีต่อวัน เกินเวลาที่ Supabase ให้ (~150 วินาที) จึงโดนตัด
  ตอนนี้แผน 5 วันเสร็จใน 35–50 วินาที ขอเฉพาะฟิลด์ที่แอปใช้ กำหนดภาษาของข้อความตามผู้ใช้ และจำกัดผู้เยี่ยมชมไว้ที่ 5 ทริปต่อวันต่อ IP (นอกจากโควตา 1 ทริปต่อสัปดาห์ต่อเครื่อง)
  แผนที่เคยสร้างแล้ว (ที่หมาย จำนวนวัน สไตล์ และภาษาเดียวกัน) ดึงจาก `itinerary_skeleton_cache` ไม่เสียเงิน 7 วัน
  เวลา ~150 วินาทีของ Supabase นับต่อ worker ไม่ใช่ต่อคำขอ (worker หนึ่งรับหลายคำขอต่อกัน คำขอที่มาทีหลังจึงได้เวลาน้อยกว่า)
  ฟังก์ชันจึงจำเวลาที่ worker เริ่ม และหยุดเองหลังจบวันใดวันหนึ่งถ้าวันถัดไปน่าจะเกิน 125 วินาที แล้วจบโดยไม่มี `complete` ให้แอปขอต่อด้วย `fromDay`
  การเรียกต่อ (`fromDay` > 1) ไม่ตรวจและไม่นับโควตาทริปซ้ำ (ครั้งแรกนับแล้ว) ไม่ใช้แคช และผู้เยี่ยมชมเรียกต่อได้ 20 ครั้งต่อวันต่อ IP (`gen:more:`)
  วัดแล้ว: ทริป 4 วันวันแรกขึ้นราว 25 วินาที (AI คิดก่อนเขียน) วันต่อไปทุก ~3 วินาที, 30 วันบน worker ใหม่เสร็จในครั้งเดียว 80–95 วินาที,
  บน worker ที่ใช้มาแล้ว 46 วินาที หยุดเองหลังวันที่ 1 ตอน worker อายุ 103 วินาที (ก่อนแก้ ถูกตัดกลางทางที่ 150 วินาที)
- ตัวนับจำกัดจำนวนครั้ง: ตาราง `edge_rate_limits` และฟังก์ชัน `hit_rate_limit` ([../supabase/rate_limits.sql](../supabase/rate_limits.sql)) ใช้ได้เฉพาะ service role

ค่าใช้จ่ายที่วัดได้ (20 พ.ย. 2026): แชตด้วย Haiku 5.5 ข้อความแรกราว $0.001 (รวมค่าเก็บ prompt ครั้งแรก) ข้อความถัดไปราว $0.0005 คำแรกขึ้นใน 3–4 วินาที ตอบจบใน 6–7 วินาที
(เดิม Sonnet 4.6 ราว $0.01–0.03 ต่อข้อความ) สร้างแผน 5 วันด้วย Haiku 5.5 ไม่ถึง $0.01 ใช้เวลาฝั่งเซิร์ฟเวอร์ราว 30 วินาที

## ยังขาด

1. ตั้งวงเงินของ key บน OpenRouter ไว้เสมอ และเติมเครดิตก่อนให้คนอื่นทดลอง
2. edge function อีกราว 58 ตัวยังไม่ได้ deploy วิธีที่เร็วที่สุดคือรันจากเครื่องที่มี Supabase CLI ในโฟลเดอร์ของ repo เว็บ:
   `supabase functions deploy --project-ref vjblrglalptgdxabteqm`
3. secret อื่นที่ฟังก์ชันใช้: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `GOOGLE_SEARCH_API_KEY`, `GOOGLE_SEARCH_CX`, `ELEVENLABS_API_KEY`, `FIRECRAWL_API_KEY`, `TAVILY_API_KEY`
4. ตั้งค่า Auth: Sign in with Apple, Google, URL ของแอปสำหรับ redirect
5. ถ้าจะให้เว็บ theaigo.co ใช้โปรเจกต์นี้ด้วย: เปลี่ยน `VITE_SUPABASE_URL` / key ใน Vercel และ CNAME ของ `auth.theaigo.co` แต่เว็บเรียก `deduct_credits` และ `reward_referral_trip_credits` จากเบราว์เซอร์โดยตรง ซึ่งตอนนี้ถูกปิดแล้ว ต้องย้ายไปเรียกผ่าน edge function ก่อน
   และ `trip-chat` ตัวนี้ตั้งให้ตอบสั้นแบบแอป (DIRECTIVE 12) เว็บที่แสดงการ์ดเที่ยวบินและที่พักต้องใช้ฟังก์ชันแยกที่ไม่มีข้อนี้
7. ตัวสำรอง Gemini 3.8 Flash ของ `trip-chat` ยังไม่เคยถูกเรียกจริง (ทำงานเฉพาะตอน Anthropic ล่ม) ควรทดสอบก่อนเปิดให้คนทั่วไปใช้
6. ข้อเตือนจาก security advisor ที่ยังไม่แก้: view แบบ SECURITY DEFINER 7 ตัว (สรุปค่าใช้จ่ายและสถานที่), ฟังก์ชันที่ไม่ได้ตั้ง search_path 16 ตัว, `pg_trgm` อยู่ใน schema public
