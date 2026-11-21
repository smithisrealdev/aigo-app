-- ทริปของผู้ใช้ที่เข้าสู่ระบบแล้ว (R20): แอปเก็บทริปในเครื่องเป็นหลัก แล้วส่งสำเนาขึ้นมาที่นี่ เข้าเครื่องใหม่ก็ได้ทริปคืน
-- data = ทริปทั้งก้อนแบบที่เก็บในเครื่อง (AppTrip) อ่านเขียนได้เฉพาะเจ้าของผ่าน RLS ลบบัญชีแล้วทริปหายตาม
create table if not exists public.user_trips (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null,
  data jsonb not null check (octet_length(data::text) < 2000000),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

alter table public.user_trips enable row level security;

create policy "read own trips" on public.user_trips for select to authenticated using ((select auth.uid()) = user_id);
create policy "add own trips" on public.user_trips for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "change own trips" on public.user_trips for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "remove own trips" on public.user_trips for delete to authenticated using ((select auth.uid()) = user_id);
