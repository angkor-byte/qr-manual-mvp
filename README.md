# qr-manual-mvp

重機QR 安全マニュアル管理の **MVP（UI モック）**。API・データベースは持たず、画面だけで動く。
レンタル会社向けに、機体ごとの QR から安全マニュアル等の最新版を表示し、搭載確認・交付・読み取り回数・社員の読み取り位置を機番ごとに記録する、という流れを見せる。

掲載物はすべて**見本**（実機の取扱説明書ではない）。

- 公開: GitHub Pages（main / `docs`）
  - トップ: https://angkor-byte.github.io/qr-manual-mvp/ → `app/login` へ転送。**「全体管理画面」と「営業所の画面」の2つの入口**を出す（ボタンを押すだけで入れる）
  - QR 画面: https://angkor-byte.github.io/qr-manual-mvp/app/q/QR-000123 （SK200-0001・提案資料と同じ番号）
  - 見本PDF: https://angkor-byte.github.io/qr-manual-mvp/m/QR-000123.pdf
- 使用先: 大和建設名義「コベルコ建機トータルサポート様向け 重機QR 安全マニュアル管理のご提案」（2026-10）

## 構成

| パス | 中身 |
|---|---|
| `ui/` | 画面のソース（Nuxt 3 + PrimeVue 4 + Tailwind・SPA） |
| `ui/mock/fixtures.json` | 画面に出すデモデータ。**表示を変えるときはここを直接編集** |
| `ui/public/mock-files/` | 書類画面で開く PDF |
| `docs/` | 公開物（`docs/app` = `ui` のビルド結果・`docs/m` = 見本PDF） |
| `src/` | 見本PDFの元（`manual-SK200-0001.html` → Chrome headless で `docs/m/QR-000123.pdf`） |

## 動かす・公開する

```bash
cd ui && yarn install
yarn dev                     # http://localhost:8200/login
# 公開物を作り直す（base パスはリポ名に合わせる）
NUXT_APP_BASE_URL=/qr-manual-mvp/app/ yarn nuxt generate
rm -rf ../docs/app && cp -R .output/public ../docs/app && cp ../docs/app/200.html ../docs/404.html
```

`docs/404.html` は SPA のフォールバック（`/app/q/...` などを直接開いたときに画面を出す）。ビルドし直したら必ずコピーし直す。

## 仕様の要点（デモで見せていること）

- **画面は2層**：全体管理画面（本社・資産統括部）＝全営業所を一覧し「営業所ごとの状況」で比べる／営業所の画面＝自分の営業所の機械・書類（閲覧のみ）・QR・所在だけ。台帳の取込と書類の登録・改版は本社だけ
- 見える範囲はログインのトークンで決まる（`mock-token`＝全体、`mock-office-{ID}`＝その営業所）。絞り込みは `composables/mock.ts` が API の代わりに行う。営業所は `fixtures.json` の `/admin/masters.offices`（東海支社 名古屋・小牧／関西支社 大阪）

- **QR は機体を指す**（`/q/{QR番号}`）。書類は機種に1回登録し、改版しても QR は貼り替え不要
- 1台に有効な QR は常に1枚。再発行すると旧 QR は「無効」表示
- **位置は社員の読み取りだけ記録**。お客様が読んだときの位置は残さない
- ログイン状態で QR 画面を開くと社員の操作（搭載確認・交付など）が出る。社員アカウントは seibi@ / front@ / kaiso@demo.jp
- 登録系の操作は成功表示だけで保存しない。位置は固定値で記録した体にしている

## 注意

- PrimeVue は **v4（MIT）** に固定。v5 は「Invalid PrimeUI License」が表示される
- TypeScript は 5 系に固定（7 は Yarn の組み込みパッチで失敗する）
- 以前は API（NestJS）と web の2リポ構成だったが、2026-10-13 に UI モック1本へ統合した
