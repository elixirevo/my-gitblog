# SvelteKit 静的ブログテンプレート

[English](../../README.md) | [한국어](README.ko.md) | **日本語** | [简体中文](README.zh-CN.md)

SvelteKit ベースの静的ブログテンプレートです。サイト全体を `@sveltejs/adapter-static` でプリレンダリングし、GitHub Actions から GitHub Pages へデプロイします。Markdown コンテンツは Pages CMS で編集できます。

## 技術スタック

- SvelteKit と `@sveltejs/adapter-static`
- `.github/workflows/deploy.yml` による GitHub Pages デプロイ
- ルートの `.pages.yml` で設定する Pages CMS
- `content/posts` の Markdown 投稿
- `content/translations/<locale>` の DeepL 翻訳

## ローカル開発

```sh
bun install
bun run dev
```

Pagefind の検索インデックスは静的ビルド後に生成されます。検索まで確認する場合：

```sh
bun run build
bun run preview
```

設定済み言語の翻訳をローカルで更新する場合：

```sh
DEEPL_API_KEY=your-key bun run translate:content
```

## コンテンツ構造

- `.env.production`：デプロイ時の公開設定
- `content/posts/*.md`：frontmatter と Markdown の原文
- `content/translations/<locale>/site.json`：自動生成される多言語サイト文言
- `content/translations/<locale>/posts/*.md`：自動生成される多言語投稿
- `static/assets/icons/`: 標準のファビコン・アプリアイコン
- `static/uploads`：Pages CMS からアップロードしたファイル
- `scripts/`: ビルド・デプロイ・検証ツール
- `tests/`: 回帰テストとテンプレート統合テスト

`content`、`.env.production`、`static/uploads` はブログごとのユーザーデータです。アプリケーションコードを `src` に分離することで、上流テンプレートの更新をマージするときの競合を減らします。

## 投稿 Markdown テンプレート

投稿は `content/posts` に `.md` ファイルとして作成します。`.md` を除いたファイル名が URL slug になるため、`YYYY-MM-DD-kebab-case.md` を推奨します。

````markdown
---
title: SvelteKit ブログをデプロイする
description: SvelteKit の静的ブログを GitHub Pages にデプロイする手順をまとめます。
date: 2026-07-12T18:00:00
published: true
category: Technical
tags:
  - sveltekit
  - github-pages
cover: /uploads/covers/sveltekit-blog.webp
---

ここに導入文を書きます。

## 最初のセクション

本文には通常の Markdown を使用できます。

```ts
const message = 'Code blocks are preserved during translation.';
```
````

frontmatter フィールドの規則：

| フィールド    | 必須 | 形式と動作                                                               |
| ------------- | ---- | ------------------------------------------------------------------------ |
| `title`       | 必須 | 一覧、詳細ページ、SEO メタデータに使用します。                           |
| `description` | 必須 | 投稿の抜粋と SEO description に使用します。                              |
| `date`        | 必須 | `YYYY-MM-DD` または ISO datetime。公開日と並び順を決めます。             |
| `published`   | 任意 | 既定値は `true`。`false` の投稿はビルド結果から除外されます。            |
| `category`    | 任意 | 既定値は `Notes`。Pages CMS では先に `content/categories` へ登録します。 |
| `tags`        | 任意 | 文字列配列を推奨。Pages CMS 用の値は `content/tags` へ登録します。       |
| `cover`       | 任意 | `static` 基準の公開パス。CMS アップロードは `/uploads/...` を使います。  |

タグは `#` なしで保存します。配列形式を推奨します。

```yaml
category: Technical
tags:
  - dev
  - git
```

カンマ区切りの文字列も使用できます。

```yaml
tags: 'dev, git'
```

原文には `locale`、`sourcePath`、`sourceHash`、`translationSchemaVersion`、`translationSource`、`translatedAt` を追加しないでください。これらは翻訳スクリプトが生成します。`content/translations` を直接編集せず、`bun run translate:content` で更新します。

## 検索

- `/search`：原文言語の検索ページ
- `/<locale>/search`：各翻訳言語の検索ページ
- Pagefind は投稿のタイトル、説明、本文をインデックスします。
- カテゴリ、タグ、locale は Pagefind filter として公開されます。

## GitHub Pages の設定

1. リポジトリを GitHub に push します。
2. `Settings > Pages` の `Source` を `GitHub Actions` にします。
3. デフォルトブランチが `main` であることを確認します。
4. `.env.production` の `PUBLIC_SITE_URL` を実際の URL に変更します。
5. `Secrets and variables > Actions` に `DEEPL_API_KEY` を追加します。
6. DeepL Free では必要に応じて `DEEPL_API_URL=https://api-free.deepl.com` も追加します。
7. [`.env.production`](../../.env.production) にサイト情報と原文・翻訳・Release の言語を設定します。

プロジェクト Pages では `GITHUB_REPOSITORY` から base path を自動設定します。ユーザーまたは組織のルート Pages では base path は空です。

### Google Search への登録

GitHub のプロジェクト Pages は `https://<owner>.github.io/<repository>/` にデプロイされます。検索クローラーが標準 robots ファイルとして確認するのはホストルートの `https://<owner>.github.io/robots.txt` だけなので、Google Search Console から sitemap を直接送信してください。

1. 末尾の `/` を含む完全な URL を URL-prefix property として追加します。

   ```text
   https://<owner>.github.io/<repository>/
   ```

2. HTML 認証タグの `content` 値だけを設定します。

   ```sh
   PUBLIC_GOOGLE_SITE_VERIFICATION=your-verification-token
   ```

   ビルド時に次のタグが生成されます。

   ```html
   <meta name="google-site-verification" content="your-verification-token" />
   ```

3. デプロイ後に所有権を確認し、次の sitemap を送信します。

   ```text
   https://<owner>.github.io/<repository>/sitemap.xml
   ```

独自ドメインまたは `<owner>.github.io` ルートサイトでは `/robots.txt` がホストルートに配置され、その sitemap 宣言も有効です。Search Console の所有権を維持するため、認証タグは削除しないでください。

ローカルで base path を試す場合：

```sh
SITE_BASE_PATH=blog bun run build
```

## 上流テンプレートから更新する

継続的にテンプレート更新を受け取る場合は、GitHub の実際の **Fork** を推奨します。Fork は元リポジトリとの関係を保持し、`Sync fork` を利用できます。`Use this template` で作成したリポジトリは独立した Git 履歴を持つため、自動同期されません。

更新前にブログ側の変更をコミットし、作業ツリーをきれいにしてください。競合解決時にはブログ固有の `content`、`.env.production`、`static/uploads` を保持します。

### Fork を更新する

最初に元リポジトリを登録します。

```sh
git remote add upstream https://github.com/ORIGINAL_OWNER/ORIGINAL_REPOSITORY.git
git remote -v
```

以後の更新を取得してマージします。

```sh
git fetch upstream
git switch main
git merge upstream/main
bun install --frozen-lockfile
bun run check
bun run build
git push origin main
```

競合がなければ GitHub の `Sync fork` → `Update branch` も利用できます。競合が予想される場合はローカルマージの方が変更を確認しやすくなります。

競合を解消したファイルだけを指定してコミットします。

```sh
git status
git add path/to/resolved-file
git commit
```

コミット前にマージを中止する場合は `git merge --abort` を実行します。

### `Use this template` で作成したリポジトリ

元リポジトリと共通の Git 履歴がないため `Sync fork` は利用できません。長期的な更新が必要なら、実際の Fork を新しく作り、`content`、`.env.production`、`static/uploads` と必要なカスタムコードを移す方法が最も安全です。

独立リポジトリを維持する場合は、必要なコミットだけを選択して取り込めます。

```sh
git remote add upstream https://github.com/ORIGINAL_OWNER/ORIGINAL_REPOSITORY.git
git fetch upstream
git log --oneline upstream/main
git cherry-pick <commit-sha>
```

`--allow-unrelated-histories` で全履歴を一度にマージする方法は、初回マージ時に同じファイルでも競合する可能性があるため推奨しません。

## Pages CMS の設定

1. GitHub アカウントで [Pages CMS](https://pagescms.org) にログインします。
2. このリポジトリを選択します。
3. `.pages.yml` が読み込まれ、`Posts`、`Categories`、`Tags` エディターが作成されます。
4. 保存するとリポジトリへコミットされ、`main` への push で再デプロイされます。

`workflow_dispatch` により Pages CMS から `Deploy GitHub Pages` アクションも実行できます。

現在の CMS ルール：

- 新規投稿ファイル名：`YYYY-MM-DD-title.md`
- アップロードファイル名：安全な slug に正規化
- カテゴリ：`Categories` で作成してから投稿で選択
- 公開日時：秒精度の datetime
- 投稿一覧：`date` の降順

## サイト設定

デプロイごとに異なる公開値は `.env.production` で管理します。`PUBLIC_SITE_URL` は必須です。タイトルの既定値は `Blog`、任意の文言は空のままです。サイト設定は `.env.production` で編集し、Pages CMS はコンテンツの編集に使います。翻訳結果の `content/translations/<locale>/site.json` は保持します。

```sh
PUBLIC_SITE_TITLE="My Blog"
PUBLIC_SITE_TAGLINE="Notes and essays"
PUBLIC_SITE_DESCRIPTION="A static blog built with SvelteKit."
PUBLIC_SITE_OWNER="Your Name"
PUBLIC_SITE_FOOTER="Built with SvelteKit."
PUBLIC_SITE_URL=https://example.com
PUBLIC_GOOGLE_SITE_VERIFICATION=your-verification-token
PUBLIC_SOCIAL_X_URL=https://x.com/your-handle
PUBLIC_SOCIAL_GITHUB_URL=https://github.com/your-name
```

`PUBLIC_SITE_TAGLINE`、`PUBLIC_SITE_DESCRIPTION`、`PUBLIC_SITE_FOOTER` には原文だけを保存します。デプロイ時に `content/translations/<locale>/site.json` へ翻訳が生成されます。`PUBLIC_SITE_DESCRIPTION_EN` のような locale suffix 付き変数は使いません。

`PUBLIC_SITE_AUTHOR` は `PUBLIC_SITE_OWNER` の別名で、両方ある場合は前者が優先されます。

## 翻訳ワークフロー

1. Pages CMS が原文を `content/posts/*.md` に保存します。
2. GitHub Actions が `bun run translate:content` を実行します。
3. 翻訳がない、原文ハッシュが変わった、schema version が変わった場合だけ DeepL を呼び出します。
4. tagline、description、footer を `content/translations/<locale>/site.json` へ翻訳します。サイト文言は原言語を自動検出します。
5. Markdown 本文は構造化 XML に変換し、`tag_handling=xml`、`tag_handling_version=v2`、`ignore_tags` で見出し、リスト、コードブロックを保持します。
6. frontmatter の `date` は DeepL へ送らず、原文値を維持します。
7. 対応言語では custom instructions を使って Markdown と frontmatter の意味を保持します。
8. 生成ファイルを `content/translations/<locale>` にコミットします。
9. 同じワークフローで静的ビルドと Pagefind インデックス作成を続けます。

韓国語の原文を英語、簡体字中国語、日本語、アラビア語へ翻訳する例：

```sh
PUBLIC_SOURCE_LOCALE=ko
PUBLIC_TRANSLATION_LOCALES=en,zh,ja,ar
PUBLIC_RELEASE_LOCALE=en
PUBLIC_RELEASE_USE_TRANSLATIONS=true
```

翻訳を無効にする場合：

```sh
PUBLIC_SOURCE_LOCALE=ko
PUBLIC_TRANSLATION_LOCALES=
```

DeepL の言語マッピングは組み込みです。`DEEPL_SOURCE_LANG_<LOCALE>` または `DEEPL_TARGET_LANG_<LOCALE>` で個別に上書きできます。アラビア語など `custom_instructions` 非対応の対象言語では、そのオプションを省略します。

## Release ワークフロー

- `main` で変更された各原文投稿から、正規化した `post-...` タグの GitHub Release を作成または更新します。
- 既定では原文を Release 本文に使います。
- `PUBLIC_RELEASE_USE_TRANSLATIONS=true` で対応する翻訳があれば `PUBLIC_RELEASE_LOCALE` を使います。
- 翻訳がなければ原文へ fallback します。

ブラウザ初回 locale の規則：

- `/` の初回アクセス時だけブラウザ言語または `localStorage.preferredLocale` を確認します。
- 設定済み翻訳言語は `/<locale>/` へ移動し、原文言語は `/` に残ります。
- `/en/...` や `/zh/...` など明示的な言語パスは原文へ強制変更しません。
- 言語選択は `localStorage.preferredLocale` に保存されます。

## Giscus コメント設定

投稿詳細ページには Giscus コメントがあります。公開設定は `.env.production` で管理します。

- `PUBLIC_GISCUS_REPO`：`owner/repo` 形式の GitHub リポジトリ
- `PUBLIC_GISCUS_REPO_ID`：Giscus が要求するリポジトリ ID
- `PUBLIC_GISCUS_CATEGORY`：GitHub Discussions のカテゴリ名
- `PUBLIC_GISCUS_CATEGORY_ID`：カテゴリ ID

これらは公開してコミットできる設定です。

```sh
PUBLIC_GISCUS_REPO=owner/repo
PUBLIC_GISCUS_REPO_ID=your-repo-id
PUBLIC_GISCUS_CATEGORY=General
PUBLIC_GISCUS_CATEGORY_ID=your-category-id
PUBLIC_SOURCE_LOCALE=ko
PUBLIC_TRANSLATION_LOCALES=en,zh,ja,ar
PUBLIC_RELEASE_LOCALE=en
PUBLIC_RELEASE_USE_TRANSLATIONS=true
```

ローカルでは shell 環境変数で一時的に上書きできます。

```sh
PUBLIC_GISCUS_CATEGORY=Announcements \
bun run build
```

設定手順：

1. リポジトリで GitHub Discussions を有効にします。
2. [giscus.app](https://giscus.app) でリポジトリとカテゴリを選択します。
3. `repo`、`repoId`、`category`、`categoryId` を `.env.production` にコピーします。

サイトのダークモードは Giscus iframe のテーマと自動同期します。

デプロイワークフローは `giscus-post-<first 16 hex characters of SHA-256(post ID)>` を Giscus の `specific` mapping term として使い、`scripts/sync-giscus-discussions.mjs` で原文投稿ごとに Discussion を事前作成します。すべての言語パスが同じスレッドを共有します。Discussion メタデータは英語原文または英語翻訳を優先し、なければ原文へ fallback します。
