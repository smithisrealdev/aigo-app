-- รูปสถานที่ที่ค้นจาก Wikipedia แล้ว (edge function place-photos) ใช้ร่วมกันทุกคน แต่ละที่ค้นครั้งเดียว
-- key = v2|ชื่อ|ย่านหรือเมือง ตัวพิมพ์เล็ก, url ว่าง = ค้นแล้วไม่มีรูป (ค้นใหม่หลัง 7 วัน)
-- แถวที่ไม่มี v2| มาจากรุ่นแรกตอนทดสอบ (บางแถวรูปผิด) ไม่มีใครอ่านแล้ว ลบทิ้งได้
create table if not exists public.place_photos (
  key text primary key,
  url text,
  title text,
  created_at timestamptz not null default now()
);

-- ไม่มี policy: อ่านเขียนได้เฉพาะ service role ผ่าน edge function
alter table public.place_photos enable row level security;
