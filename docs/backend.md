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
- กดให้ AiGo จัดการหลังแชตสรุปทริปแล้ว หน้างานของ AiGo เรียก `generate-itinerary` ด้วยสรุปทริปและบทสนทนา แสดงความคืบหน้ารายวัน แล้วแปลงผลเป็นทริปของแอป (`src/lib/itinerary.ts`)
  ทริปเก็บในเครื่อง (`src/lib/tripStore.tsx`) หน้าแผน สถานที่ แผนที่ ทริป แชร์ อ่านจากที่เดียวกัน ล้างทริปได้ที่หน้าบัญชี
  ทริปที่สร้างยังไม่มีรูป ราคาเป็นค่าประมาณของ AI และยังไม่ได้ตรวจเวลาเปิด (แอปบอกตรงๆ) ผู้เยี่ยมชมสร้างได้สัปดาห์ละ 1 ทริป (โควตาใน `guest_sessions`)
- ยังเป็นข้อมูลตัวอย่าง: เที่ยวบินและที่พักที่รออนุมัติ (ต้อง deploy `search-flights` / `search-hotels`) หน้าระหว่างเที่ยว และเที่ยวบินดีเลย์

## ยังขาด

1. **OPENROUTER_API_KEY**: ใส่ที่ Supabase Dashboard → Edge Functions → Secrets ตอนนี้ทั้งสองฟังก์ชันตอบ 500 เพราะไม่มี key
2. edge function อีกราว 58 ตัวยังไม่ได้ deploy วิธีที่เร็วที่สุดคือรันจากเครื่องที่มี Supabase CLI ในโฟลเดอร์ของ repo เว็บ:
   `supabase functions deploy --project-ref vjblrglalptgdxabteqm`
3. secret อื่นที่ฟังก์ชันใช้: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `GOOGLE_SEARCH_API_KEY`, `GOOGLE_SEARCH_CX`, `ELEVENLABS_API_KEY`, `FIRECRAWL_API_KEY`, `TAVILY_API_KEY`
4. ตั้งค่า Auth: Sign in with Apple, Google, URL ของแอปสำหรับ redirect
5. ถ้าจะให้เว็บ theaigo.co ใช้โปรเจกต์นี้ด้วย: เปลี่ยน `VITE_SUPABASE_URL` / key ใน Vercel และ CNAME ของ `auth.theaigo.co` แต่เว็บเรียก `deduct_credits` และ `reward_referral_trip_credits` จากเบราว์เซอร์โดยตรง ซึ่งตอนนี้ถูกปิดแล้ว ต้องย้ายไปเรียกผ่าน edge function ก่อน
6. ข้อเตือนจาก security advisor ที่ยังไม่แก้: view แบบ SECURITY DEFINER 7 ตัว (สรุปค่าใช้จ่ายและสถานที่), ฟังก์ชันที่ไม่ได้ตั้ง search_path 16 ตัว, `pg_trgm` อยู่ใน schema public
