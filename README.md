# SvelteKit Static Blog Template

**English** | [한국어](docs/readme/README.ko.md) | [日本語](docs/readme/README.ja.md) | [简体中文](docs/readme/README.zh-CN.md)

A static blog template built with SvelteKit. The entire site is prerendered with `@sveltejs/adapter-static`, deployed to GitHub Pages through GitHub Actions, and edited as Markdown through Pages CMS.

## Stack

- SvelteKit and `@sveltejs/adapter-static`
- GitHub Pages deployment through `.github/workflows/deploy.yml`
- Pages CMS configured by the root `.pages.yml`
- Markdown posts in `content/posts`
- DeepL translation sync in `content/translations/<locale>`

## Local development

```sh
bun install
bun run dev
```

Pagefind builds its search index after the static site build. To test search locally:

```sh
bun run build
bun run preview
```

To refresh all configured translations locally, provide a DeepL API key:

```sh
DEEPL_API_KEY=your-key bun run translate:content
```

## Content structure

- `.env.production`: public deployment configuration
- `content/posts/*.md`: source posts with frontmatter and Markdown
- `content/translations/<locale>/site.json`: generated localized site copy
- `content/translations/<locale>/posts/*.md`: generated localized posts
- `static/assets/icons/`: bundled favicon and app icons
- `static/uploads`: files uploaded through Pages CMS
- `scripts/`: build, deployment, and validation tools
- `tests/`: regression and template integration tests

`content`, `.env.production`, and `static/uploads` are owned by each blog. Application code remains in `src`, reducing conflicts when upstream template updates are merged.

## Post Markdown template

Create posts as `.md` files under `content/posts`. The filename without `.md` becomes the URL slug, so `YYYY-MM-DD-kebab-case.md` is recommended.

````markdown
---
id: 2f4ad174-baba-4aa4-89ad-72760aeb2509
title: Deploying a SvelteKit blog
description: A practical guide to deploying a static SvelteKit blog to GitHub Pages.
date: 2026-07-12T18:00:00
updated: 2026-07-13T09:30:00
published: true
category: Technical
tags:
  - sveltekit
  - github-pages
cover: /uploads/covers/sveltekit-blog.webp
---

Write the introduction here.

## First section

The body supports regular Markdown.

```ts
const message = 'Code blocks are preserved during translation.';
```
````

Frontmatter fields follow these rules:

| Field         | Required | Format and behavior                                                                            |
| ------------- | -------- | ---------------------------------------------------------------------------------------------- |
| `id`          | Required | Immutable UUID or ULID. Generate missing IDs with `bun run posts:ids`; never reuse one.        |
| `title`       | Required | Used on list/detail pages and in SEO metadata.                                                 |
| `description` | Required | Used as the post excerpt and SEO description.                                                  |
| `date`        | Required | Use `YYYY-MM-DD` or an ISO datetime. Controls publication date and sorting.                    |
| `updated`     | Optional | ISO date or datetime for meaningful post revisions. Included in the gitblog feed when present. |
| `published`   | Optional | Defaults to `true`. Set to `false` to exclude the post from the build.                         |
| `category`    | Optional | Defaults to `Notes`. Register it in `content/categories` before selecting it in Pages CMS.     |
| `tags`        | Optional | A string array is recommended. Register values in `content/tags` for Pages CMS.                |
| `cover`       | Optional | Public path relative to `static`; CMS uploads use `/uploads/...`.                              |

Tags are stored without `#` and displayed in the same form. An array is recommended:

```yaml
category: Technical
tags:
  - dev
  - git
```

A comma-separated string is also accepted:

```yaml
tags: 'dev, git'
```

`id` belongs to the source post and must survive filename/slug changes. Translations always copy the source ID; do not assign translation IDs independently. Safely backfill IDs and validate all variants with:

```sh
bun run posts:ids
bun run posts:ids:check
```

The backfill command is idempotent. It adds missing source IDs, copies them to translations, removes orphan generated translations, and refuses to overwrite invalid, duplicate, or mismatched existing IDs. Translation sync and GitHub Actions run it before translating; the workflow persists newly generated IDs.

Do not add `locale`, `sourcePath`, `sourceHash`, `translationSchemaVersion`, `translationSource`, or `translatedAt` to source posts. The translation script generates these fields. Update `content/translations` with `bun run translate:content` instead of editing generated files manually.

## Search

- `/search`: search in the source locale
- `/<locale>/search`: search in each configured translation locale
- Pagefind indexes post titles, descriptions, and bodies.
- Category, tag, and locale values are exposed as Pagefind filters.

## gitblog participation

The static build publishes a discovery manifest at `/.well-known/blog-hub.json` (under the GitHub Pages project base path when one is configured). Participation is enabled by default. Set the following public deployment values in `.env.production`:

```sh
PUBLIC_HUB_ENABLED=true
PUBLIC_HUB_URL=https://hub.example.com
PUBLIC_SITE_REPOSITORY=owner/repository
```

- Set `PUBLIC_HUB_ENABLED=false` (also accepts `0`, `no`, or `off`) to opt out. The manifest remains discoverable with `enabled: false`, and workflows stop sending hints.
- `PUBLIC_SITE_REPOSITORY` identifies this blog repository and is the local-build fallback. GitHub Actions uses the trustworthy `GITHUB_REPOSITORY` context instead, so forks do not inherit the upstream repository identity.
- `PUBLIC_HUB_URL` is the gitblog origin used for optional deployment and discussion-comment hints. Leave it empty to rely only on periodic gitblog discovery and feed polling.
- Hint requests contain GitHub identifiers only. gitblog must fetch and verify the public manifest, feed, Discussion, and comment itself.
- Hint delivery has a 10-second timeout and never fails a successful Pages deployment or comment workflow.

The schema-version 1 manifest includes `repository`, `siteUrl`, `sourceLocale`, and an absolute RSS URL for every configured locale. RSS remains valid RSS 2.0 and adds the `https://gitblog.dev/ns/hub/1.0` namespace:

- `<guid isPermaLink="false">` and `<hub:postId>` contain the immutable source post ID.
- `<hub:locale>` identifies the variant while `<hub:sourceLocale>` identifies the source language. Variants share the same post ID.
- `<hub:giscusTerm>` is derived from the immutable ID, so renaming a Markdown file does not split its discussion identity.
- `<hub:cover>` is an absolute URL when a cover exists, and `<hub:updated>` is emitted when `updated` is present.

After a successful Pages deployment, `deploy.yml` sends `POST /v1/ingestion/deploy-hint`. `.github/workflows/hub-discussion-comment.yml` sends created/deleted `discussion_comment` events to `POST /v1/events/comment-hint`. Existing slug-based Giscus discussions are updated in place to the ID-based term during discussion sync, preserving their comments rather than creating replacement discussions.

## GitHub Pages setup

1. Push the repository to GitHub.
2. Open `Settings > Pages` and set `Source` to `GitHub Actions`.
3. Confirm that the default branch is `main`.
4. Set `PUBLIC_SITE_URL` in `.env.production` to the production URL.
5. Add `DEEPL_API_KEY` under `Secrets and variables > Actions`.
6. For DeepL Free, optionally add `DEEPL_API_URL=https://api-free.deepl.com`.
7. Configure site metadata and source/translation/release locales in [`.env.production`](.env.production).

For a project Pages repository, the build reads `GITHUB_REPOSITORY` and sets the base path automatically. The base path stays empty for a user or organization root Pages repository.

### Google Search registration

A GitHub project Pages site is deployed under `https://<owner>.github.io/<repository>/`. Search crawlers only treat `https://<owner>.github.io/robots.txt` as the standard host-level robots file, so submit the sitemap directly through Google Search Console.

1. Add the full deployment URL, including the trailing slash, as a URL-prefix property:

   ```text
   https://<owner>.github.io/<repository>/
   ```

2. Copy only the `content` value from the HTML verification tag into `.env.production`:

   ```sh
   PUBLIC_GOOGLE_SITE_VERIFICATION=your-verification-token
   ```

   The build adds this tag to every page:

   ```html
   <meta name="google-site-verification" content="your-verification-token" />
   ```

3. Deploy, verify ownership, and submit:

   ```text
   https://<owner>.github.io/<repository>/sitemap.xml
   ```

On a custom domain or an `<owner>.github.io` root site, the generated `/robots.txt` is at the host root and its sitemap declaration is valid. Keep the verification tag deployed to preserve Search Console ownership.

To test a base path locally:

```sh
SITE_BASE_PATH=blog bun run build
```

## Updating from the upstream template

Use a real GitHub **Fork** when you want to keep receiving template updates. A fork retains its relationship with the original repository and supports GitHub's `Sync fork` feature. A repository created with `Use this template` has independent Git history and is not automatically synchronized.

Commit your blog changes and confirm that the working tree is clean before updating. Preserve the blog-owned `content`, `.env.production`, and `static/uploads` paths when resolving conflicts.

### Updating a fork

Register the original repository once:

```sh
git remote add upstream https://github.com/ORIGINAL_OWNER/ORIGINAL_REPOSITORY.git
git remote -v
```

Fetch and merge later updates:

```sh
git fetch upstream
git switch main
git merge upstream/main
bun install --frozen-lockfile
bun run check
bun run build
git push origin main
```

GitHub's `Sync fork` → `Update branch` works when there are no conflicts. A local merge is easier to inspect when conflicts are expected.

Resolve each conflicted file, then stage only the resolved paths:

```sh
git status
git add path/to/resolved-file
git commit
```

Run `git merge --abort` before committing if you need to cancel the merge.

### Repositories created with `Use this template`

These repositories cannot use `Sync fork` because they have no shared Git history with the original. For reliable long-term updates, create a real fork and move `content`, `.env.production`, `static/uploads`, and any intentional custom code into it.

If the independent repository must remain, register the original remote and cherry-pick only the required commits:

```sh
git remote add upstream https://github.com/ORIGINAL_OWNER/ORIGINAL_REPOSITORY.git
git fetch upstream
git log --oneline upstream/main
git cherry-pick <commit-sha>
```

Merging all updates with `--allow-unrelated-histories` is not recommended because even matching files can conflict during the first merge.

## Pages CMS setup

1. Sign in to [Pages CMS](https://pagescms.org) with GitHub.
2. Select this repository.
3. Pages CMS reads `.pages.yml` and creates `Posts`, `Categories`, and `Tags` editors.
4. Saving content commits it to the repository; pushes to `main` trigger deployment.

The open `workflow_dispatch` event also exposes a `Deploy GitHub Pages` action in Pages CMS.

Current CMS rules:

- New post filename: `YYYY-MM-DD-title.md`
- Uploaded filenames: normalized to safe slugs
- Categories: created in `Categories` before post selection
- Publication date: datetime with second precision
- Post list: descending by `date`

## Site configuration

Shared public site settings live in `.env.production`. Both `bun run dev` and `bun run build` load its `PUBLIC_` values, so the site title, languages, and social links use the same defaults. Development still runs in Vite's development mode; private production variables are not imported into development by this shared loader. `PUBLIC_SITE_URL` is required. The title defaults to `Blog`; optional copy and comment settings stay empty when unset. Edit `.env.production` for site settings; Pages CMS edits content only. Generated translations remain in `content/translations/<locale>/site.json`.

Explicit process environment values take priority, followed by the current mode's normal env settings, then production public settings. For example, `.env.development.local` can override public settings for local development. Restart the dev server after changing env files. `bun run preview` serves the last `build/` output; run `bun run build` again to preview configuration or code changes.

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

Store only source copy in `PUBLIC_SITE_TAGLINE`, `PUBLIC_SITE_DESCRIPTION`, and `PUBLIC_SITE_FOOTER`. Deployment generates localized values in `content/translations/<locale>/site.json`. Locale-suffixed variables such as `PUBLIC_SITE_DESCRIPTION_EN` are not used.

`PUBLIC_SITE_AUTHOR` is accepted as an alias of `PUBLIC_SITE_OWNER` and takes precedence when both are present.

## Removing a post from Git history

GitBlog Studio can analyze and remove a post’s Markdown history after the repository administrator reviews and confirms the exact plan. `.github/workflows/post-history.yml` runs in this **blog repository** and calls the public template’s reusable worker at an immutable commit. The GitBlog App only needs access to this blog; do not add a PAT or App private key to its secrets. The service repository does not need an App installation.

New blogs inherit this workflow. For an existing blog, add the latest template’s `.github/workflows/post-history.yml` to its default branch, or merge the changes if it already exists. Enable GitHub Actions and allow the `gitblogapp/svelte-gitblog-template` reusable workflow in the repository/organization Actions policy. The caller’s pinned SHA must match the version approved by the GitBlog server; Studio reports a missing or outdated workflow before starting an operation. Run history, logs, and Actions usage belong to the blog repository.

After a history rewrite, deployment continues from the current commit. Forced pushes and unavailable or non-ancestor `before` commits skip only post Release synchronization; surviving posts are not republished as new releases, and removed history is not fetched again.

Start analysis and confirm removal in Studio. Manually dispatching or re-running an Actions job cannot replace administrator confirmation. Branch protections still apply, and concurrent changes require a new analysis. Git history removal changes commit SHAs and does not erase external clones, GitHub caches, Discussions, Releases, images, or old build artifacts. Normal post deletion remains a separate operation.

## Translation workflow

1. Pages CMS stores source posts in `content/posts/*.md`.
2. GitHub Actions runs `bun run translate:content`.
3. DeepL is called only when a translation is missing, its source hash changed, or its schema version changed.
4. `PUBLIC_SITE_TAGLINE`, `PUBLIC_SITE_DESCRIPTION`, and `PUBLIC_SITE_FOOTER` are translated into `content/translations/<locale>/site.json`. Site copy uses automatic source-language detection.
5. Markdown bodies are converted to structured XML and translated with `tag_handling=xml`, `tag_handling_version=v2`, and `ignore_tags` so headings, lists, and code blocks stay intact.
6. Frontmatter `date` bypasses DeepL and keeps the exact source value.
7. Requests include custom instructions to preserve Markdown structure and frontmatter meaning where the target language supports them.
8. Generated files are committed under `content/translations/<locale>`.
9. Static building and Pagefind indexing continue in the same workflow.

Example configuration for Korean source content translated into English, Simplified Chinese, Japanese, and Arabic:

```sh
PUBLIC_SOURCE_LOCALE=ko
PUBLIC_TRANSLATION_LOCALES=en,zh,ja,ar
PUBLIC_RELEASE_LOCALE=en
PUBLIC_RELEASE_USE_TRANSLATIONS=true
```

To disable translation:

```sh
PUBLIC_SOURCE_LOCALE=ko
PUBLIC_TRANSLATION_LOCALES=
```

Default DeepL language mappings are built in. Override individual mappings with `DEEPL_SOURCE_LANG_<LOCALE>` or `DEEPL_TARGET_LANG_<LOCALE>`. Targets that do not support DeepL `custom_instructions`, such as Arabic, are translated without that option.

## Release workflow

- Each changed source post on `main` creates or updates a GitHub Release using a normalized `post-...` tag.
- Releases use the source post by default.
- With `PUBLIC_RELEASE_USE_TRANSLATIONS=true`, the release uses `PUBLIC_RELEASE_LOCALE` when a matching translated post exists.
- If the translation is missing, release generation falls back to the source post.

The initial browser locale follows these rules:

- Only the first visit to `/` checks the browser language or `localStorage.preferredLocale`.
- A configured translation locale redirects to `/<locale>/`; the source locale stays at `/`.
- Explicit locale paths such as `/en/...` or `/zh/...` are never forced back to the source path.
- The locale selector stores its choice in `localStorage.preferredLocale`.

## Giscus comments setup

Post detail pages include Giscus comments. Public Giscus configuration lives in `.env.production`:

- `PUBLIC_GISCUS_REPO`: GitHub repository in `owner/repo` form
- `PUBLIC_GISCUS_REPO_ID`: repository ID required by Giscus
- `PUBLIC_GISCUS_CATEGORY`: GitHub Discussions category name
- `PUBLIC_GISCUS_CATEGORY_ID`: category ID

These values are public configuration and are committed in [`.env.production`](.env.production):

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

Shell environment variables can temporarily override them locally:

```sh
PUBLIC_GISCUS_CATEGORY=Announcements \
bun run build
```

Setup:

1. Enable GitHub Discussions for the repository.
2. Select the repository and category at [giscus.app](https://giscus.app).
3. Copy `repo`, `repoId`, `category`, and `categoryId` into `.env.production`.

The site theme toggle synchronizes automatically with the Giscus iframe theme.

The deployment workflow uses `giscus-post-<first 16 hex characters of SHA-256(post ID)>` as the Giscus `specific` mapping term and pre-creates one Discussion per source post with `scripts/sync-giscus-discussions.mjs`. Every localized route shares that thread. Discussion metadata prefers the English source or English translation when available and otherwise falls back to the source post.

## Customization and update preservation

Theme files live in `src/lib/theme`, user extensions in `src/lib/extensions`, and shared behavior in `src/lib/template`. Run `bun run update:check` for a build that verifies protected source files remain unchanged. Run `bun run test:template` to exercise custom CSS and extension points in a temporary copy. See [the customization guide](docs/customization.md) for contracts, ownership, and migration limits.

### gitblog 통합 댓글 호스트

gitblog 통합 댓글을 사용하려면 `PUBLIC_GISCUS_PROVIDER=gitblog`, `PUBLIC_GISCUS_HOST=https://gitblog.app`으로 설정합니다. 저장소·카테고리 ID는 gitblog에서 자동 연결합니다. 개발 모드에서는 localhost HTTP 미리보기도 허용하지만 운영 블로그에는 공개 HTTPS 주소가 필요합니다.

gitblog에서 생성한 블로그는 앱 연결 완료 시 댓글 저장소·카테고리 ID 4개가 자동 저장됩니다. `PUBLIC_GISCUS_PROVIDER=gitblog`이면서 운영 호스트가 비어 있으면 댓글 영역에 준비 중 안내를 표시합니다. 공식 giscus 설치나 수동 ID 입력은 필요하지 않습니다.

## Template updates in GitBlog Studio

Open your blog in GitBlog Studio and select **Template updates**. The service compares the previous template snapshot, your blog, and the published stable revision, preserves user-owned files, and prepares an update PR. Apply it only after reviewing the changes and passing the `validate-update.yml` checks. Conflicting edits require manual reconciliation; this is a file-level merge, not an automatic framework or theme migration.

The template's `.gitblog/release.json` publishes a stable version and immutable commit SHA. Maintainers should commit and validate code first, then publish the release pointer in a separate commit. A blog's `.gitblog/template.json` is written by its update PR, recording the official revision for subsequent comparisons. See [the customization guide](docs/customization.md) for preservation rules and older-blog limitations.

The GitBlog App needs Contents, Pull requests, Workflows, and Actions access on the target blog. Existing installations may need to approve the added permissions. No PAT or App private key is stored in this repository.

## Automatic GitBlog feed registration

With `PUBLIC_HUB_ENABLED=true` and `PUBLIC_HUB_URL=https://gitblog.app`, a successful Pages deployment calls the official, immutable `register-blog.yml` workflow. It verifies that this is a public blog created from the official template (or fork), reads the Pages address, and sends GitHub Actions OIDC proof. **Installing the GitBlog App is not required for feed registration.** GitHub access tokens are never sent to GitBlog.

Allow the official template's reusable workflow and `id-token: write` in your Actions policy. Initial notification delivery retries up to four times. If it still fails, run **Actions → Sync GitBlog feed → Run workflow**, or deploy again. A blog with neither an installed App nor a successful first notification cannot be discovered automatically. Existing App-based discovery remains supported.

GitBlog records the notification before fetching public RSS immediately. Temporary RSS/CDN failures are retried from durable server state. The manifest and RSS include the build commit so an old cached response cannot replace the new deployment. Registered feeds also receive a daily fallback check. Set `PUBLIC_HUB_ENABLED=false` and redeploy to opt out; an already registered blog becomes hidden when GitBlog next reads its disabled manifest.

Older blogs need the updated deployment workflow, `scripts/hub-settings.mjs`, RSS/manifest build metadata, and the new `sync-hub.yml` workflow. Apply this template release through Studio's **Template updates**. Existing unsigned deployment hints remain supported for previously registered blogs. A failed feed registration job does not undo a successful Pages deployment.
