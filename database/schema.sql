-- ===========================================================================
--  Labstock RSUD SMJ 1 — Database Schema (Supabase)
--  Skema untuk sistem manajemen stok laboratorium
--  Untuk re-run yang aman, semua tabel dihapus dulu (CASCADE).
-- ===========================================================================

-- Hapus semua tabel yang ada (urutan: child → parent)
drop table if exists public.receipt_lines   cascade;
drop table if exists public.po_lines        cascade;
drop table if exists public.purchase_orders cascade;
drop table if exists public.stock_requests  cascade;
drop table if exists public.usages          cascade;
drop table if exists public.batches         cascade;
drop table if exists public.items           cascade;
drop table if exists public.temp_logs       cascade;
drop table if exists public.vendors         cascade;
drop table if exists public.audit_logs      cascade;
drop function if exists public.handle_updated_at cascade;

---------------------------------------------------------------------------
-- 1. profiles — akun pengguna yang dapat login
--    Kolom `name` dapat diubah oleh admin / direset ke `default_name`.
---------------------------------------------------------------------------
create table public.profiles (
  id           uuid         primary key default gen_random_uuid(),
  username     text         unique not null,
  password     text         not null,
  name         text         not null,
  default_name text         not null,
  role         text         not null,
  role_key     text         not null check (role_key in ('superadmin','karu','pj-reagen','gudang','analis')),
  initial      text,
  created_at   timestamp with time zone default now(),
  updated_at   timestamp with time zone default now()
);

-- Trigger otomatis update `updated_at`
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language 'plpgsql';

create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.handle_updated_at();

-- Seed: 5 akun default (name = default_name; bisa diubah lewat aplikasi)
insert into public.profiles (username, password, name, default_name, role, role_key, initial) values
  ('admin',      'labstock2025', 'dr. Ratna Dewi, Sp.PK',        'dr. Ratna Dewi, Sp.PK',        'Kepala Lab / Super Admin', 'superadmin', 'RD'),
  ('karu.lab',   'karu123',      'Dra. Dina Prasetyawati, M.Kes', 'Dra. Dina Prasetyawati, M.Kes', 'Kepala Ruangan Laboratorium', 'karu', 'DP'),
  ('pj.reagen',  'reagen123',    'Andi Kurniawan, S.Si',          'Andi Kurniawan, S.Si',          'PJ Reagen & BMHP', 'pj-reagen', 'AK'),
  ('gudang',     'gudang123',    'Bambang Subagyo, A.Md.AK',      'Bambang Subagyo, A.Md.AK',      'Petugas Gudang Farmasi', 'gudang', 'BS'),
  ('analis',     'analis123',    'Siti Nurhaliza, A.Md.AK',       'Siti Nurhaliza, A.Md.AK',       'Analis / ATLM', 'analis', 'SN');

---------------------------------------------------------------------------
-- 2. items — master stok (reagensia, BMHP, alkes)
---------------------------------------------------------------------------
create table public.items (
  id         text primary key,
  name       text not null,
  sku        text not null unique,
  category   text not null check (category in ('Reagensia','BMHP','Alkes')),
  unit       text not null,
  stock      integer not null default 0,
  min        integer not null default 0,
  price      numeric(14,2) not null,
  location   text,
  cold       boolean default false,
  created_at timestamp with time zone default now()
);

insert into public.items (id, name, sku, category, unit, stock, min, price, location, cold) values
  ('ITM-001', 'Reagen HbA1c Direct',          'RGN-HBA1C-DR', 'Reagensia', 'Kit',    14, 10, 4425000, 'Chiller A · Rak 2', true),
  ('ITM-002', 'Cellclean Sysmex 50ml',        'RGN-CLN-SMX',  'Reagensia', 'Botol',  13,  6, 1210000, 'Chiller A · Rak 3', true),
  ('ITM-003', 'Reagen Glukosa GOD-PAP',       'RGN-GLU-GOD',  'Reagensia', 'Kit',     8, 12,  975000, 'Chiller B · Rak 1', true),
  ('ITM-004', 'Kontrol CBC 3-Part Level N',   'RGN-CTL-CBC',  'Reagensia', 'Vial',   15,  5, 1850000, 'Chiller B · Rak 2', true),
  ('ITM-005', 'Vacutainer EDTA K2 3ml',       'BMHP-EDTA-3',  'BMHP',      'Pcs',  2400, 1000, 4200,    'Gudang B · Rak 5', false),
  ('ITM-006', 'Jarum Vacutainer 22G',         'BMHP-JRM-22',  'BMHP',      'Pcs',   480, 500, 1950,    'Gudang B · Rak 5', false),
  ('ITM-007', 'Tips Mikropipet 1000µL',       'BMHP-TPS-1K',  'BMHP',      'Box',   42, 20,  145000,  'Gudang B · Rak 7', false),
  ('ITM-008', 'Strip Tes Golongan Darah',     'BMHP-ABD-ST',  'BMHP',      'Strip', 600, 200,  68500,  'Gudang B · Rak 6', false),
  ('ITM-009', 'Termometer Infrared Non-Kontak', 'ALK-TRM-IR', 'Alkes',     'Unit',   4,  2,  735000,  'Lemari Alkes · L2', false),
  ('ITM-010', 'Mikropipet Eppendorf 100–1000µL', 'ALK-PPT-1K', 'Alkes',   'Unit',   6,  3, 4850000,  'Lemari Alkes · L1', false);

---------------------------------------------------------------------------
-- 3. batches — lot / batch dengan tanggal kadaluarsa (FEFO)
---------------------------------------------------------------------------
create table public.batches (
  id          text primary key,
  item_id     text    not null references public.items(id) on delete cascade,
  lot         text    not null,
  qty         integer not null,
  expired     date    not null,
  supplier    text,
  received_at date,
  priority    boolean default false
);

insert into public.batches (id, item_id, lot, qty, expired, supplier, received_at, priority) values
  ('B-01', 'ITM-001', '#HBA-2024-12', 14, '2026-11-06', 'PT Kimia Farma Trading',            '2025-10-14', false),
  ('B-02', 'ITM-002', '#CLN-845',     13, '2027-03-14', 'PT Sysmex Indonesia',             '2025-09-22', false),
  ('B-03', 'ITM-003', '#GLU-776',     8, '2025-10-03', 'PT Enseval Putera Megatrading',     '2025-03-05', false),
  ('B-04', 'ITM-004', '#K3P-102',     6, '2025-10-27', 'PT Sysmex Indonesia',             '2025-10-27', false),
  ('B-05', 'ITM-004', '#K3P-099',     9, '2027-01-11', 'PT Sysmex Indonesia',             '2025-11-08', false),
  ('B-06', 'ITM-005', '#EDT-552',    1200, '2026-12-30', 'PT Anugerah Pharmindo',          '2025-11-02', false),
  ('B-07', 'ITM-006', '#JRM-221',    480, '2027-05-06', 'PT Anugerah Pharmindo',          '2025-10-23', false),
  ('B-08', 'ITM-007', '#T1K-088',    42,  '2027-11-04', 'PT Enseval Putera Megatrading',  '2025-09-18', false),
  ('B-09', 'ITM-005', '#EDT-560',    1200, '2027-05-26', 'PT Anugerah Pharmindo',          '2025-12-02', false),
  ('B-10', 'ITM-008', '#ABD-330',    600, '2026-06-12', 'PT Bio Farma (Persero)',         '2025-11-28', false);

---------------------------------------------------------------------------
-- 4. temp_logs — pembacaan suhu perangkat pendingin
---------------------------------------------------------------------------
create table public.temp_logs (
  id     text primary key,
  at     text    not null,
  device text    not null,
  value  numeric(5,1) not null,
  by     text
);

-- Seed: contoh pembacaan suhu (8 entri per perangkat)
insert into public.temp_logs (id, at, device, value, by) values
  ('TL-CHILLER-A-0', '00:00', 'Chiller A', 4.2, 'Auto-Logger'),
  ('TL-CHILLER-A-1', '03:00', 'Chiller A', 3.9, 'Auto-Logger'),
  ('TL-CHILLER-A-2', '06:00', 'Chiller A', 4.0, 'Auto-Logger'),
  ('TL-CHILLER-A-3', '09:00', 'Chiller A', 3.8, 'Auto-Logger'),
  ('TL-CHILLER-A-4', '12:00', 'Chiller A', 4.1, 'Auto-Logger'),
  ('TL-CHILLER-A-5', '15:00', 'Chiller A', 3.9, 'Auto-Logger'),
  ('TL-CHILLER-A-6', '18:00', 'Chiller A', 4.2, 'Auto-Logger'),
  ('TL-CHILLER-A-7', '21:00', 'Chiller A', 4.0, 'Auto-Logger'),
  ('TL-CHILLER-B-0', '00:00', 'Chiller B', 3.6, 'Auto-Logger'),
  ('TL-CHILLER-B-1', '03:00', 'Chiller B', 3.4, 'Auto-Logger'),
  ('TL-CHILLER-B-2', '06:00', 'Chiller B', 3.7, 'Auto-Logger'),
  ('TL-CHILLER-B-3', '09:00', 'Chiller B', 3.5, 'Auto-Logger'),
  ('TL-CHILLER-B-4', '12:00', 'Chiller B', 3.8, 'Auto-Logger'),
  ('TL-CHILLER-B-5', '15:00', 'Chiller B', 3.6, 'Auto-Logger'),
  ('TL-CHILLER-B-6', '18:00', 'Chiller B', 3.4, 'Auto-Logger'),
  ('TL-CHILLER-B-7', '21:00', 'Chiller B', 3.7, 'Auto-Logger'),
  ('TL-FREEZER-0',  '00:00', 'Freezer -20°C', -20.3, 'Auto-Logger'),
  ('TL-FREEZER-1',  '03:00', 'Freezer -20°C', -20.1, 'Auto-Logger'),
  ('TL-FREEZER-2',  '06:00', 'Freezer -20°C', -19.9, 'Auto-Logger'),
  ('TL-FREEZER-3',  '09:00', 'Freezer -20°C', -20.0, 'Auto-Logger'),
  ('TL-FREEZER-4',  '12:00', 'Freezer -20°C', -20.2, 'Auto-Logger'),
  ('TL-FREEZER-5',  '15:00', 'Freezer -20°C', -20.1, 'Auto-Logger'),
  ('TL-FREEZER-6',  '18:00', 'Freezer -20°C', -19.8, 'Auto-Logger'),
  ('TL-FREEZER-7',  '21:00', 'Freezer -20°C', -20.0, 'Auto-Logger');

---------------------------------------------------------------------------
-- 5. usages — pencatatan pemakaian harian
---------------------------------------------------------------------------
create table public.usages (
  id       text primary key,
  date     date    not null,
  item_id  text    not null references public.items(id) on delete cascade,
  qty      integer not null,
  to_unit  text    not null,
  "user"   text,
  note     text
);

-- Seed: 12 pencatatan pemakaian 6 hari terakhir
insert into public.usages (id, date, item_id, qty, to_unit, "user", note) values
  ('U-01', CURRENT_DATE - INTERVAL '6 day', 'ITM-005',  90, 'Unit Pelayanan Darah (UPD)', 'dr. Ratna Dewi, Sp.PK', 'Distribusi skrining donor'),
  ('U-02', CURRENT_DATE - INTERVAL '6 day', 'ITM-001',   2, 'Laboratorium Patologi Klinik', 'dr. Ratna Dewi, Sp.PK', 'Run HbA1c pagi'),
  ('U-03', CURRENT_DATE - INTERVAL '5 day', 'ITM-006',  60, 'Laboratorium Patologi Klinik', 'dr. Ratna Dewi, SP.PK', 'Pengambilan sampel rutin'),
  ('U-04', CURRENT_DATE - INTERVAL '5 day', 'ITM-002',   1, 'Laboratorium Patologi Klinik', 'dr. Ratna Dewi, Sp.PK', 'Maintenance XN-550'),
  ('U-05', CURRENT_DATE - INTERVAL '4 day', 'ITM-005', 140, 'Laboratorium Patologi Klinik', 'dr. Ratna Dewi, Sp.PK', 'Distribusi harian bangsal lab'),
  ('U-06', CURRENT_DATE - INTERVAL '4 day', 'ITM-003',   1, 'Laboratorium Patologi Klinik', 'dr. Ratna Dewi, Sp.PK', 'Panel glukosa'),
  ('U-07', CURRENT_DATE - INTERVAL '3 day', 'ITM-004',   2, 'Laboratorium Patologi Klinik', 'dr. Ratna Dewi, Sp.PK', 'QC harian hematologi'),
  ('U-08', CURRENT_DATE - INTERVAL '3 day', 'ITM-007',   3, 'Unit Pelayanan Darah (UPD)', 'dr. Ratna Dewi, Sp.PK', 'Pengolahan komponen darah'),
  ('U-09', CURRENT_DATE - INTERVAL '2 day', 'ITM-005', 110, 'Unit Pelayanan Darah (UPD)', 'dr. Ratna Dewi, Sp.PK', 'Distribusi skrining donor'),
  ('U-10', CURRENT_DATE - INTERVAL '2 day', 'ITM-008',  25, 'Unit Pelayanan Darah (UPD)', 'dr. Ratna Dewi, Sp.PK', 'Uji golongan donor'),
  ('U-11', CURRENT_DATE - INTERVAL '1 day', 'ITM-001',   2, 'Laboratorium Patologi Klinik', 'dr. Ratna Dewi, Sp.PK', 'Run HbA1c pagi'),
  ('U-12', CURRENT_DATE - INTERVAL '1 day', 'ITM-006',  45, 'Laboratorium Patologi Klinik', 'dr. Ratna Dewi, Sp.PK', 'Pengambilan sampel rutin');

---------------------------------------------------------------------------
-- 6. vendors — daftar pemasok
---------------------------------------------------------------------------
create table public.vendors (
  id       text primary key,
  name     text not null,
  category text,
  pic      text,
  phone    text,
  email    text,
  ekatalog boolean default false,
  rating   numeric(3,1) default 0
);

insert into public.vendors (id, name, category, pic, phone, email, ekatalog, rating) values
  ('V-01', 'PT Kimia Farma Trading',               'Reagensia & KPO',       'Rina Marlina',    '021-450-8899', 'sales@kftd.co.id',        true, 4.8),
  ('V-02', 'PT Enseval Putera Megatrading',        'Distribusi Farmasi',    'Hendro Wijaya',   '021-386-7722', 'lab@enseval.co.id',       true, 4.6),
  ('V-03', 'PT Anugerah Pharmindo Lestari',        'BMHP & Alkes',          'Dewi Anggraini',  '021-589-0112', 'order@apl.co.id',         false, 4.4),
  ('V-04', 'PT Sysmex Indonesia',                  'Instrumen & Reagen',    'Andi Prasetyo',   '021-2903-4111','support@sysmex.co.id',      true, 4.9),
  ('V-05', 'PT Bio Farma (Persero)',               'BUMN Farmasi',          'Sari Kusuma',     '022-203-3755', 'corporate@biofarma.co.id', false, 4.7);

---------------------------------------------------------------------------
-- 7. purchase_orders — pesanan pembelian
---------------------------------------------------------------------------
create table public.purchase_orders (
  id        text primary key,
  po        text not null,
  date      date,
  vendor_id text references public.vendors(id) on delete set null,
  method    text,
  status    text not null default 'Draft' check (status in ('Draft','Diajukan','Disetujui','Dikirim','Diterima')),
  value     numeric(14,2),
  eta       text,
  sj        text
);

-- Seed: 7 pesanan pembelian
insert into public.purchase_orders (id, po, date, vendor_id, method, status, value, eta, sj) values
  ('PO1', 'PO/2025/03/PK-0142', CURRENT_DATE - INTERVAL '3 day', 'V-01', 'E-Katalog',        'Dikirim', 50300000,  'Hari ini 09:15',    null),
  ('PO2', 'PO/2025/03/MB-0089', CURRENT_DATE - INTERVAL '5 day', 'V-02', 'E-Katalog',        'Dikirim', 88600000,  'Besok',             null),
  ('PO3', 'PO/2025/03/BD-0045', CURRENT_DATE - INTERVAL '2 day', 'V-03', 'Tender RS',        'Disetujui', 62150000, '12 Mar',            null),
  ('PO4', 'PO/2025/03/PK-0149', CURRENT_DATE - INTERVAL '1 day', 'V-04', 'E-Katalog',        'Diajukan', 115400000, '14 Mar',            null),
  ('PO5', 'PO/2025/03/CITO-003', CURRENT_DATE - INTERVAL '1 day', 'V-05', 'Pengadaan Langsung', 'Dikirim', 18500000, 'Hari ini (CITO)',   null),
  ('PO6', 'PO/2025/03/PK-0150', CURRENT_DATE,                      'V-01', 'E-Katalog',        'Draft',   19500000,  '-',                 null),
  ('PO7', 'PO/2025/02/PK-0135', CURRENT_DATE - INTERVAL '22 day','V-04', 'E-Katalog',        'Diterima', 37000000, 'Selesai',           'SJ-PK0135-V04');

-- Baris PO (bisa multiple items per PO)
create table public.po_lines (
  po_id   text not null references public.purchase_orders(id) on delete cascade,
  item_id text not null references public.items(id) on delete cascade,
  qty     integer not null,
  primary key (po_id, item_id)
);

-- Seed: 11 baris PO
insert into public.po_lines (po_id, item_id, qty) values
  ('PO1', 'ITM-001', 10), ('PO1', 'ITM-002', 5),
  ('PO2', 'ITM-004', 8),  ('PO2', 'ITM-007', 20),
  ('PO3', 'ITM-008', 400),
  ('PO4', 'ITM-002', 12), ('PO4', 'ITM-004', 6),
  ('PO5', 'ITM-003', 10),
  ('PO6', 'ITM-003', 20),
  ('PO7', 'ITM-004', 20);

-- Baris penerimaan (lot tracking per item yang diterima)
create table public.receipt_lines (
  id         text primary key,
  po_id      text not null references public.purchase_orders(id) on delete cascade,
  item_id    text not null references public.items(id),
  qty        integer not null,
  lot        text,
  expired    date
);

-- Seed: receipt_lines untuk PO7 (diterima sebagian: 16/20)
insert into public.receipt_lines (id, po_id, item_id, qty, lot, expired) values
  ('RC-PO7-ITM004', 'PO7', 'ITM-004', 16, '#K3P-099', CURRENT_DATE + INTERVAL '120 day');

---------------------------------------------------------------------------
-- 8. stock_requests — permintaan stok internal
---------------------------------------------------------------------------
create table public.stock_requests (
  id        text primary key,
  date      date not null,
  from_unit text not null,
  item_id   text not null references public.items(id) on delete cascade,
  qty       integer not null,
  status    text not null default 'Menunggu' check (status in ('Menunggu','Disetujui','Ditolak')),
  note      text
);

-- Seed: 3 permintaan stok
insert into public.stock_requests (id, date, from_unit, item_id, qty, status, note) values
  ('REQ-001', CURRENT_DATE,                      'Unit Pelayanan Darah (UPD)', 'ITM-005', 200, 'Menunggu',  'Stok skrining donor menipis'),
  ('REQ-002', CURRENT_DATE - INTERVAL '1 day',  'Laboratorium Patologi Klinik', 'ITM-006',  50, 'Disetujui', 'Jadwal pengambilan sampel mingguan'),
  ('REQ-003', CURRENT_DATE,                      'Unit Pelayanan Darah (UPD)', 'ITM-007',   5, 'Menunggu',  'Persiapan pengolahan komponen akhir pekan');

---------------------------------------------------------------------------
-- 9. audit_logs — log audit KARS / ISO 15189
---------------------------------------------------------------------------
create table public.audit_logs (
  id     text primary key,
  at     text not null,
  actor  text not null,
  module text not null,
  action text not null,
  detail text
);

-- Seed: 4 entri log audit
insert into public.audit_logs (id, at, actor, module, action, detail) values
  ('A-01', to_char(CURRENT_DATE - INTERVAL '1 day', 'YYYY-MM-DD') || ' 09:12', 'dr. Ratna Dewi, Sp.PK', 'Inventaris', 'Penyesuaian stok',      'ITM-006 Jarum Vacutainer 22G -370 pcs (hasil stock opname)'),
  ('A-02', to_char(CURRENT_DATE - INTERVAL '1 day', 'YYYY-MM-DD') || ' 13:40', 'Bambang S., A.Md.AK',    'Pengadaan',  'PO diajukan ke PPK',   'PO/2025/03/PK-0149 — Rp 115.400.000 (PT Sysmex Indonesia)'),
  ('A-03', to_char(CURRENT_DATE, 'YYYY-MM-DD') || ' 07:05',            'dr. Ratna Dewi, Sp.PK', 'Pemakaian',  'Pemakaian dicatat',      'Reagen HbA1c Direct -2 Kit → Laboratorium Patologi Klinik (Run pagi)'),
  ('A-04', to_char(CURRENT_DATE, 'YYYY-MM-DD') || ' 08:15',            'dr. Ratna Dewi, Sp.PK', 'Kepatuhan',  'Ekspor log audit',       'Periode Februari 2025 untuk asesor KARS (PDF terenkripsi)');

---------------------------------------------------------------------------
-- Row Level Security
-- Aplikasi mengelola otorisasi di sisi klien (frontend). Kebijakan RLS
-- di sini memungkinkan operasi penuh untuk peran anon (internal prototype).
-- Di lingkungan produksi, ganti dengan kebijakan berbasis auth.uid().
---------------------------------------------------------------------------
alter table public.profiles        enable row level security;
alter table public.items           enable row level security;
alter table public.batches         enable row level security;
alter table public.temp_logs       enable row level security;
alter table public.usages          enable row level security;
alter table public.vendors         enable row level security;
alter table public.purchase_orders enable row level security;
alter table public.po_lines        enable row level security;
alter table public.receipt_lines   enable row level security;
alter table public.stock_requests  enable row level security;
alter table public.audit_logs      enable row level security;

create policy "Full access" on public.profiles        for all using (true) with check (true);
create policy "Full access" on public.items           for all using (true) with check (true);
create policy "Full access" on public.batches         for all using (true) with check (true);
create policy "Full access" on public.temp_logs       for all using (true) with check (true);
create policy "Full access" on public.usages          for all using (true) with check (true);
create policy "Full access" on public.vendors         for all using (true) with check (true);
create policy "Full access" on public.purchase_orders for all using (true) with check (true);
create policy "Full access" on public.po_lines        for all using (true) with check (true);
create policy "Full access" on public.receipt_lines   for all using (true) with check (true);
create policy "Full access" on public.stock_requests  for all using (true) with check (true);
create policy "Full access" on public.audit_logs      for all using (true) with check (true);