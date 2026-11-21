-- รูปสถานที่ที่ค้นจาก Wikipedia และ Wikimedia Commons แล้ว (edge function place-photos) ใช้ร่วมกันทุกคน แต่ละที่ค้นครั้งเดียว
-- key = v5|n|ชื่อตัวพิมพ์เล็กไม่มีช่องว่าง (รูปที่ใช้ได้ทุกทริป) หรือ v5|ชื่อ|ย่านหรือเมือง (รูปและผลไม่มีรูปที่ขึ้นกับย่าน) เลขรุ่นขึ้นเมื่อเปลี่ยนรูปแบบคีย์
-- url ว่าง = ค้นแล้วไม่มีรูป (ค้นใหม่หลัง 7 วัน) รูปเก็บ 90 วัน, created_at ในอนาคต = รูปที่เลือกเอง ไม่หมดอายุ (place_photo_overrides.sql)
-- แถวที่ไม่ขึ้นต้นด้วย v5| มาจากรุ่นก่อน (บางแถวรูปผิด) ไม่มีใครอ่านแล้ว ลบทิ้งได้
create table if not exists public.place_photos (
  key text primary key,
  url text,
  title text,
  created_at timestamptz not null default now()
);

-- ไม่มี policy: อ่านเขียนได้เฉพาะ service role ผ่าน edge function
alter table public.place_photos enable row level security;
