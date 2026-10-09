# SvelteKit 静态博客模板

[English](../../README.md) | [한국어](README.ko.md) | [日本語](README.ja.md) | **简体中文**

这是一个基于 SvelteKit 的静态博客模板。整个站点使用 `@sveltejs/adapter-static` 预渲染，通过 GitHub Actions 部署到 GitHub Pages，并可通过 Pages CMS 编辑 Markdown 内容。

## 技术栈

- SvelteKit 与 `@sveltejs/adapter-static`
- `.github/workflows/deploy.yml` 中的 GitHub Pages 部署流程
- 根目录 `.pages.yml` 配置的 Pages CMS
- `content/posts` 中的 Markdown 文章
- `content/translations/<locale>` 中的 DeepL 翻译结果

## 本地开发

```sh
bun install
bun run dev
```

Pagefind 会在静态构建完成后生成搜索索引。如需测试搜索功能：

```sh
bun run build
bun run preview
```

如需在本地更新已配置语言的翻译：

```sh
DEEPL_API_KEY=your-key bun run translate:content
```

## 内容结构

- `.env.production`：部署时使用的公开配置
- `content/posts/*.md`：带 frontmatter 的 Markdown 原文
- `content/translations/<locale>/site.json`：自动生成的多语言网站文案
- `content/translations/<locale>/posts/*.md`：自动生成的多语言文章
- `static/assets/icons/`: 默认网站图标和应用图标
- `static/uploads`：通过 Pages CMS 上传的文件
- `scripts/`: 构建、部署和验证工具
- `tests/`: 回归测试和模板集成测试

`content`、`.env.production` 和 `static/uploads` 属于各博客自己的数据。应用代码保留在 `src` 中，以减少合并上游模板更新时的冲突。

## 文章 Markdown 模板

在 `content/posts` 下创建 `.md` 文件。去掉 `.md` 后的文件名会成为 URL slug，建议使用 `YYYY-MM-DD-kebab-case.md`。

````markdown
---
title: 部署 SvelteKit 博客
description: 介绍如何将 SvelteKit 静态博客部署到 GitHub Pages。
date: 2026-07-12T18:00:00
published: true
category: Technical
tags:
  - sveltekit
  - github-pages
cover: /uploads/covers/sveltekit-blog.webp
---

在这里编写文章导语。

## 第一节

正文支持标准 Markdown。

```ts
const message = 'Code blocks are preserved during translation.';
```
````

frontmatter 字段规则：

| 字段          | 必填 | 格式与行为                                                           |
| ------------- | ---- | -------------------------------------------------------------------- |
| `title`       | 是   | 用于文章列表、详情页和 SEO 元数据。                                  |
| `description` | 是   | 用作文章摘要和 SEO description。                                     |
| `date`        | 是   | 使用 `YYYY-MM-DD` 或 ISO datetime，决定发布日期和排序。              |
| `published`   | 否   | 默认为 `true`；设为 `false` 时不会进入构建结果。                     |
| `category`    | 否   | 默认为 `Notes`；在 Pages CMS 中选择前先登记到 `content/categories`。 |
| `tags`        | 否   | 推荐字符串数组；Pages CMS 使用的值先登记到 `content/tags`。          |
| `cover`       | 否   | 相对于 `static` 的公开路径；CMS 上传文件使用 `/uploads/...`。        |

标签不带 `#` 保存，推荐使用数组：

```yaml
category: Technical
tags:
  - dev
  - git
```

也支持逗号分隔的单行字符串：

```yaml
tags: 'dev, git'
```

不要在原文中添加 `locale`、`sourcePath`、`sourceHash`、`translationSchemaVersion`、`translationSource` 或 `translatedAt`。这些字段由翻译脚本生成。请运行 `bun run translate:content` 更新 `content/translations`，不要手动编辑生成文件。

## 搜索

- `/search`：原文语言的搜索页
- `/<locale>/search`：各翻译语言的搜索页
- Pagefind 会索引文章标题、描述和正文。
- 分类、标签和 locale 会作为 Pagefind 过滤条件。

## GitHub Pages 设置

1. 将仓库推送到 GitHub。
2. 在 `Settings > Pages` 中将 `Source` 设置为 `GitHub Actions`。
3. 确认默认分支为 `main`。
4. 将 `.env.production` 中的 `PUBLIC_SITE_URL` 改为实际部署地址。
5. 在 `Secrets and variables > Actions` 中添加 `DEEPL_API_KEY`。
6. 使用 DeepL Free 时可添加 `DEEPL_API_URL=https://api-free.deepl.com`。
7. 在 [`.env.production`](../../.env.production) 中设置网站信息以及原文、翻译和 Release 语言。

项目型 Pages 仓库会读取 `GITHUB_REPOSITORY` 并自动设置 base path；用户或组织根站点的 base path 保持为空。

### 注册 Google Search

GitHub 项目 Pages 部署在 `https://<owner>.github.io/<repository>/` 下。搜索引擎只把主机根目录的 `https://<owner>.github.io/robots.txt` 视为标准 robots 文件，因此请在 Google Search Console 中直接提交 sitemap。

1. 以 URL-prefix 属性添加完整部署地址，并保留末尾 `/`：

   ```text
   https://<owner>.github.io/<repository>/
   ```

2. 只复制 HTML 验证标签的 `content` 值：

   ```sh
   PUBLIC_GOOGLE_SITE_VERIFICATION=your-verification-token
   ```

   构建时会在页面 `<head>` 中生成：

   ```html
   <meta name="google-site-verification" content="your-verification-token" />
   ```

3. 部署并验证所有权后提交：

   ```text
   https://<owner>.github.io/<repository>/sitemap.xml
   ```

独立域名或 `<owner>.github.io` 根站点的 `/robots.txt` 位于主机根目录，其中的 sitemap 声明有效。请保留验证标签以维持 Search Console 所有权。

本地测试 base path：

```sh
SITE_BASE_PATH=blog bun run build
```

## 从上游模板更新

如果希望持续获得模板更新，建议使用真正的 GitHub **Fork**。Fork 会保留与原仓库的关系，并可使用 `Sync fork`。通过 `Use this template` 创建的仓库拥有独立 Git 历史，不会自动同步。

更新前先提交自己的修改并确保工作区干净。解决冲突时请保留博客自己的 `content`、`.env.production` 和 `static/uploads`。

### 更新 Fork

首次添加原仓库：

```sh
git remote add upstream https://github.com/ORIGINAL_OWNER/ORIGINAL_REPOSITORY.git
git remote -v
```

获取并合并后续更新：

```sh
git fetch upstream
git switch main
git merge upstream/main
bun install --frozen-lockfile
bun run check
bun run build
git push origin main
```

没有冲突时也可使用 GitHub 的 `Sync fork` → `Update branch`。预计有冲突时，本地合并更便于检查变化。

解决冲突后只暂存已经处理的文件：

```sh
git status
git add path/to/resolved-file
git commit
```

如需取消未提交的合并，运行 `git merge --abort`。

### 通过 `Use this template` 创建的仓库

这类仓库与原仓库没有共同 Git 历史，不能使用 `Sync fork`。如需长期更新，最安全的方法是创建真正的 Fork，并迁移 `content`、`.env.production`、`static/uploads` 以及确实需要的自定义代码。

如果必须保留独立仓库，可选择性获取原仓库的提交：

```sh
git remote add upstream https://github.com/ORIGINAL_OWNER/ORIGINAL_REPOSITORY.git
git fetch upstream
git log --oneline upstream/main
git cherry-pick <commit-sha>
```

不建议使用 `--allow-unrelated-histories` 一次性合并全部历史，因为首次合并时相同文件也可能产生冲突。

## Pages CMS 设置

1. 使用 GitHub 登录 [Pages CMS](https://pagescms.org)。
2. 选择此仓库。
3. Pages CMS 读取 `.pages.yml` 并创建 `Posts`、`Categories` 和 `Tags` 编辑器。
4. 保存内容会提交到仓库；推送到 `main` 后自动部署。

`workflow_dispatch` 也会在 Pages CMS 中提供 `Deploy GitHub Pages` 操作。

当前 CMS 规则：

- 新文章文件名：`YYYY-MM-DD-title.md`
- 上传文件名：规范化为安全 slug
- 分类：先在 `Categories` 中创建再选择
- 发布时间：精确到秒的 datetime
- 文章列表：按 `date` 降序

## 网站配置

各部署环境不同的公开值保存在 `.env.production`。`PUBLIC_SITE_URL` 为必填项，标题默认值为 `Blog`，可选文案保持为空。网站设置在 `.env.production` 中修改，Pages CMS 仅用于编辑内容。翻译结果 `content/translations/<locale>/site.json` 保持不变。

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

`PUBLIC_SITE_TAGLINE`、`PUBLIC_SITE_DESCRIPTION`、`PUBLIC_SITE_FOOTER` 只保存原文。部署时会在 `content/translations/<locale>/site.json` 中生成翻译。不再使用 `PUBLIC_SITE_DESCRIPTION_EN` 这类带 locale 后缀的变量。

`PUBLIC_SITE_AUTHOR` 是 `PUBLIC_SITE_OWNER` 的别名，两者同时存在时优先使用前者。

## 翻译流程

1. Pages CMS 将原文保存到 `content/posts/*.md`。
2. GitHub Actions 运行 `bun run translate:content`。
3. 仅在翻译缺失、原文哈希变化或 schema 版本变化时调用 DeepL。
4. 网站 tagline、description 和 footer 会翻译到 `content/translations/<locale>/site.json`，并自动检测每条文案的原语言。
5. Markdown 正文转换为结构化 XML，并使用 `tag_handling=xml`、`tag_handling_version=v2` 和 `ignore_tags`，以保留标题、列表和代码块。
6. frontmatter 的 `date` 不发送给 DeepL，保持原始值。
7. 支持的目标语言会使用 custom instructions 保留 Markdown 与 frontmatter 语义。
8. 生成文件提交到 `content/translations/<locale>`。
9. 同一工作流继续进行静态构建和 Pagefind 索引。

韩文原文翻译为英文、简体中文、日文和阿拉伯文的示例：

```sh
PUBLIC_SOURCE_LOCALE=ko
PUBLIC_TRANSLATION_LOCALES=en,zh,ja,ar
PUBLIC_RELEASE_LOCALE=en
PUBLIC_RELEASE_USE_TRANSLATIONS=true
```

关闭翻译：

```sh
PUBLIC_SOURCE_LOCALE=ko
PUBLIC_TRANSLATION_LOCALES=
```

项目内置 DeepL 语言映射，也可通过 `DEEPL_SOURCE_LANG_<LOCALE>` 或 `DEEPL_TARGET_LANG_<LOCALE>` 覆盖。阿拉伯文等不支持 `custom_instructions` 的目标语言会省略该选项。

## Release 流程

- `main` 上变更的每篇原文都会用规范化的 `post-...` 标签创建或更新 GitHub Release。
- 默认使用原文作为 Release 内容。
- `PUBLIC_RELEASE_USE_TRANSLATIONS=true` 时，若存在对应翻译，则使用 `PUBLIC_RELEASE_LOCALE`。
- 翻译缺失时自动回退到原文。

浏览器首次选择 locale 的规则：

- 只有首次访问 `/` 时读取浏览器语言或 `localStorage.preferredLocale`。
- 配置的翻译语言跳转到 `/<locale>/`，原文语言保留在 `/`。
- `/en/...`、`/zh/...` 等显式语言路径不会被强制改回原文。
- 语言选择器把结果保存到 `localStorage.preferredLocale`。

## Giscus 评论设置

文章详情页包含 Giscus 评论。公开配置保存在 `.env.production`：

- `PUBLIC_GISCUS_REPO`：`owner/repo` 格式的 GitHub 仓库
- `PUBLIC_GISCUS_REPO_ID`：Giscus 所需的仓库 ID
- `PUBLIC_GISCUS_CATEGORY`：GitHub Discussions 分类名
- `PUBLIC_GISCUS_CATEGORY_ID`：分类 ID

这些是可公开并提交的配置：

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

本地可用 shell 环境变量临时覆盖：

```sh
PUBLIC_GISCUS_CATEGORY=Announcements \
bun run build
```

设置步骤：

1. 为仓库启用 GitHub Discussions。
2. 在 [giscus.app](https://giscus.app) 选择仓库和分类。
3. 将 `repo`、`repoId`、`category`、`categoryId` 复制到 `.env.production`。

网站的深色模式会自动与 Giscus iframe 主题同步。

部署流程使用 `giscus-post-<first 16 hex characters of SHA-256(post ID)>` 作为 Giscus `specific` mapping term，并通过 `scripts/sync-giscus-discussions.mjs` 为每篇原文预先创建 Discussion。所有语言路径共享同一讨论串。Discussion 元数据优先使用英文原文或英文翻译，否则回退到原文。
