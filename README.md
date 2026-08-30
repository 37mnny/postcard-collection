# ポストカードのへや

アイドルのポストカードを記録するための、かわいい一覧サイト。React (Vite) + Supabase + Cloudinary。

## 機能

- ポストカードの投稿(アイドル名・名前・アルバム名・リリース日・持ってる/持ってないハート)
- カメラ or 写真からのスキャン + 台形補正(4すみをドラッグして調整→自動でまっすぐな長方形に補正)
- キーワード検索(アイドル名・名前・アルバム名)
- 「持ってるだけ」絞り込み
- リリース日の新しい順/古い順・追加順ソート

## 構成

- **Supabase**: 投稿のメタデータ(アイドル名・名前・アルバム名など)を保存する Postgres DB
- **Cloudinary**: 画像本体を保存(無料枠が大きく=25クレジット/月、カード登録不要のため。
  Supabase Storage の無料枠(1GB)より広く使えます)

## セットアップ

1. 依存関係をインストール

   ```bash
   npm install
   ```

2. **Supabase**: プロジェクトを作成し(無料プランでOK。カードを課金される既存の組織とは
   **別の新しい組織を Free プランで**作るのがおすすめ)、SQL Editor で `supabase/schema.sql` を実行する
   - `postcards` テーブルが作られます(画像はここには置きません)

3. **Cloudinary**: https://cloudinary.com で無料アカウントを作成(カード登録不要)
   - ダッシュボードの「Cloud name」を控える
   - Settings → Upload → Upload presets → 新規作成し、**Signing Mode を "Unsigned" に設定**
     (クライアントから直接アップロードするため。プリセット名を控える)

4. `.env.example` を `.env` にコピーして、4つの値を埋める

   ```bash
   cp .env.example .env
   ```

   ```
   VITE_SUPABASE_URL=...
   VITE_SUPABASE_ANON_KEY=...
   VITE_CLOUDINARY_CLOUD_NAME=...
   VITE_CLOUDINARY_UPLOAD_PRESET=...
   ```

5. 開発サーバーを起動

   ```bash
   npm run dev
   ```

## 台形補正について

`src/lib/perspective.js` に、OpenCV 等を使わない自前のホモグラフィ実装があります。
選んだ4点(はがきの4すみ)から出力の長方形への変換行列を計算し、出力画素ごとに
元画像を逆変換でサンプリングして(バイリニア補間)まっすぐな画像を作っています。

## 注意

- このアプリはログイン機能を持たず、個人利用を想定して anon キーからの読み書きを
  すべて許可しています。URLを他人と共有する予定がある場合は Supabase Auth の追加を
  検討してください。
- Cloudinary の unsigned upload preset は「誰でもそのプリセットで画像をアップロードできる」
  設定です。API シークレットではないため漏れても致命的ではありませんが、公開を前提に
  していない個人用途として使ってください。

## Lint

```bash
npm run lint
```
