-- Skema tabel cadangan (mirror) di Supabase untuk Tama Studio Community.
--
-- Jalankan file ini di: Supabase Dashboard > SQL Editor > New query > Run.
-- Kalau kamu pakai 2 project Supabase (Supabase 1 & Supabase 2) sebagai
-- cadangan berjenjang, jalankan file yang SAMA di KEDUA project itu.
--
-- Desain sengaja generik: satu kolom `data jsonb` per tabel yang
-- menyimpan seluruh isi dokumen Firestore apa adanya, bukan dipetakan
-- kolom-per-kolom. Ini pilihan sadar supaya:
--   (a) skema Supabase tidak perlu diubah tiap kali struktur data di
--       Firestore berubah (nambah field baru di app, dst), dan
--   (b) gampang dipulihkan balik ke Firestore kalau suatu saat dibutuhkan
--       (id + JSON penuh sudah cukup untuk rekonstruksi dokumen).
-- Konsekuensinya: ini backup MENTAH, bukan database relasional yang bisa
-- langsung di-query pakai SQL per-field tanpa `data->>'field'`. Kalau ke
-- depan kamu mau Supabase juga dipakai untuk fitur AKTIF (bukan cuma
-- cadangan) yang butuh query relasional, skema ini perlu didesain ulang
-- — itu di luar scope "backup" yang diminta sekarang.

create table if not exists repos_mirror (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists books_mirror (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists groups_mirror (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists users_mirror (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists showcase_mirror (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists clips_mirror (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists jobs_mirror (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists conversations_mirror (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

-- Semua tabel di atas HANYA ditulis oleh Cloud Function TSC lewat
-- service_role key (yang punya akses penuh, melewati Row Level Security).
-- Sebagai lapisan aman tambahan, aktifkan RLS dan JANGAN buat policy
-- apa pun untuk role `anon`/`authenticated` — supaya data cadangan ini
-- tidak bisa diakses lewat anon/public key Supabase kamu sama sekali,
-- cuma lewat service_role dari Cloud Function.
alter table repos_mirror enable row level security;
alter table books_mirror enable row level security;
alter table groups_mirror enable row level security;
alter table users_mirror enable row level security;
alter table showcase_mirror enable row level security;
alter table clips_mirror enable row level security;
alter table jobs_mirror enable row level security;
alter table conversations_mirror enable row level security;
