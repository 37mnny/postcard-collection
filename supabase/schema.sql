-- ポストカードのへや — Supabase schema
-- Supabase Dashboard の SQL Editor でこのファイルをそのまま実行してください。
-- 冪等 (何度実行してもエラーにならない) ように書いています。
--
-- 画像そのものは Cloudinary に保存します(Supabase Free プランのストレージ1GB制限を
-- 避けるため)。ここでは投稿のメタデータだけを持ちます。
-- image_path = Cloudinary の public_id / image_url = Cloudinary の配信URL(secure_url)

create table if not exists postcards (
  id uuid primary key default gen_random_uuid(),
  group_name text, -- アイドルグループ名
  idol_name text not null, -- メンバー名
  name text,
  album_name text, -- 収録元の名前(アルバム名/書籍名/その他、source_type と対で使う)
  source_type text not null default 'album', -- 'album' | 'book' | 'other'
  tags text[] not null default '{}',
  release_date date,
  image_path text not null,
  image_url text not null,
  back_image_path text,
  back_image_url text,
  kind text not null default 'postcard', -- 'postcard' | 'photocard'
  rounded boolean not null default false, -- photocard のみ意味を持つ(角丸にするか)
  photocard_size text not null default '55x85', -- photocard のみ意味を持つ('55x85' | '63x88')
  owned boolean not null default true,
  created_at timestamptz not null default now()
);

alter table postcards add column if not exists back_image_path text;
alter table postcards add column if not exists back_image_url text;
alter table postcards add column if not exists kind text not null default 'postcard';
alter table postcards add column if not exists rounded boolean not null default false;
alter table postcards add column if not exists photocard_size text not null default '55x85';
alter table postcards add column if not exists group_name text;
alter table postcards add column if not exists source_type text not null default 'album';
alter table postcards add column if not exists tags text[] not null default '{}';

alter table postcards enable row level security;

drop policy if exists "postcards_public_select" on postcards;
create policy "postcards_public_select" on postcards for select using (true);

drop policy if exists "postcards_public_insert" on postcards;
create policy "postcards_public_insert" on postcards for insert with check (true);

drop policy if exists "postcards_public_update" on postcards;
create policy "postcards_public_update" on postcards for update using (true);

drop policy if exists "postcards_public_delete" on postcards;
create policy "postcards_public_delete" on postcards for delete using (true);

-- 注意: このスキーマはログイン無しの個人利用を想定し、
-- anon キーからの読み書きをすべて許可しています。
-- 他人に公開URLを共有する予定がある場合は、Supabase Auth を追加して
-- 上記ポリシーを auth.uid() ベースに絞ることを検討してください。
