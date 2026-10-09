# SvelteKit 정적 블로그 템플릿

[English](../../README.md) | **한국어** | [日本語](README.ja.md) | [简体中文](README.zh-CN.md)

SvelteKit 기반 정적 블로그 템플릿입니다. `@sveltejs/adapter-static`으로 전체 사이트를 prerender하고, GitHub Pages에 GitHub Actions로 배포하며, Pages CMS에서 Markdown 콘텐츠를 편집할 수 있게 구성되어 있습니다.

## 기술 스택

- SvelteKit + `@sveltejs/adapter-static`
- GitHub Pages deployment via `.github/workflows/deploy.yml`
- Pages CMS via root `.pages.yml`
- Markdown posts in `content/posts`
- DeepL translation sync into `content/translations/<locale>`

## 로컬 개발

```sh
bun install
bun run dev
```

`Pagefind` 검색 인덱스는 정적 빌드 후 생성됩니다. 검색 기능까지 확인하려면 아래 흐름을 사용합니다.

```sh
bun run build
bun run preview
```

등록된 번역 언어 파일까지 로컬에서 갱신하려면 DeepL API 키를 넣고 아래 명령을 실행합니다.

```sh
DEEPL_API_KEY=your-key bun run translate:content
```

## 콘텐츠 구조

- `.env.production`: 배포 시 사용하는 공개 사이트 설정
- `content/posts/*.md`: frontmatter + Markdown 본문
- `content/translations/<locale>/site.json`: DeepL이 생성하는 언어별 사이트 문구
- `content/translations/<locale>/posts/*.md`: DeepL이 생성하고 커밋하는 언어별 번역본
- `static/assets/icons/`: 기본 제공 파비콘·앱 아이콘
- `static/uploads`: CMS 업로드 이미지
- `scripts/`: 빌드·배포·검증 도구
- `tests/`: 회귀 테스트와 템플릿 통합 테스트

`content`, `.env.production`, `static/uploads`는 블로그별 사용자 데이터 영역입니다. 템플릿 애플리케이션 코드는 `src`에 두어 원본 저장소의 코드 변경을 병합할 때 사용자 콘텐츠와 충돌하는 범위를 줄입니다.

## 게시글 Markdown 템플릿

게시글은 `content/posts` 아래에 `.md` 파일로 작성합니다. 파일명에서 `.md`를 제외한 값이 URL slug가 되므로 `YYYY-MM-DD-kebab-case.md` 형식을 권장합니다.

````markdown
---
title: SvelteKit 블로그 배포하기
description: SvelteKit 정적 블로그를 GitHub Pages에 배포하는 과정을 정리합니다.
date: 2026-07-12T18:00:00
published: true
category: Technical
tags:
  - sveltekit
  - github-pages
cover: /uploads/covers/sveltekit-blog.webp
---

게시글 도입부를 작성합니다.

## 첫 번째 섹션

본문은 일반 Markdown으로 작성할 수 있습니다.

```ts
const message = 'Code blocks are preserved during translation.';
```
````

frontmatter 필드는 다음 규칙을 따릅니다.

| 필드          | 필수 | 형식 및 동작                                                                         |
| ------------- | ---- | ------------------------------------------------------------------------------------ |
| `title`       | 필수 | 게시글 제목입니다. 목록, 상세 페이지, SEO 메타 정보에 사용됩니다.                    |
| `description` | 필수 | 게시글 요약입니다. 목록 excerpt와 SEO description에 사용됩니다.                      |
| `date`        | 필수 | `YYYY-MM-DD` 또는 ISO datetime을 사용합니다. 발행일과 정렬 기준입니다.               |
| `published`   | 선택 | 기본값은 `true`입니다. `false`이면 빌드 결과에서 제외됩니다.                         |
| `category`    | 선택 | 기본값은 `Notes`입니다. Pages CMS에서는 `content/categories`에 먼저 등록합니다.      |
| `tags`        | 선택 | 문자열 배열을 권장합니다. Pages CMS에서는 `content/tags`에 먼저 등록합니다.          |
| `cover`       | 선택 | `static` 기준 공개 경로입니다. CMS 업로드 이미지는 `/uploads/...` 형식을 사용합니다. |

포스트 frontmatter에는 카테고리와 별도로 여러 태그를 둘 수 있습니다. 태그는 `#` 없이 저장하고 화면에도 `dev`처럼 표시됩니다.

Pages CMS에서는 `Tags` 컬렉션에서 태그를 먼저 만들고, 포스트 편집 화면의 `Tags` 필드에서 여러 개를 선택합니다.

```yaml
category: Technical
tags:
  - dev
  - git
```

한 줄 문자열 형태도 가능합니다.

```yaml
tags: 'dev, git'
```

`locale`, `sourcePath`, `sourceHash`, `translationSchemaVersion`, `translationSource`, `translatedAt`은 번역 스크립트가 생성하는 필드입니다. 원문 게시글에는 직접 추가하지 않습니다. 번역 결과인 `content/translations` 파일도 직접 작성하기보다 `bun run translate:content`로 갱신합니다.

## 검색

- `/search`: Pagefind 기반 전체 검색 페이지
- `/<locale>/search`: 등록된 번역 언어별 검색 페이지
- 게시글 상세 페이지의 제목, 설명, 본문이 검색 인덱스에 포함됩니다.
- 카테고리, 태그, 로케일은 Pagefind filter로 노출됩니다.

## GitHub Pages 설정

1. 저장소를 GitHub에 푸시합니다.
2. GitHub 저장소의 `Settings > Pages`에서 `Source`를 `GitHub Actions`로 설정합니다.
3. 기본 브랜치가 `main`인지 확인합니다.
4. `.env.production`의 `PUBLIC_SITE_URL`을 실제 배포 URL로 바꿉니다.
5. 저장소 `Secrets and variables > Actions`에 `DEEPL_API_KEY`를 추가합니다.
6. DeepL Free를 쓰면 선택적으로 `DEEPL_API_URL=https://api-free.deepl.com`도 추가합니다.
7. 공개 설정 파일 [`.env.production`](../../.env.production)에 사이트 메타, 원문/번역 언어, 릴리즈 언어를 등록합니다.

프로젝트 Pages 저장소라면 빌드 시 `GITHUB_REPOSITORY` 값을 읽어 자동으로 base path를 맞춥니다. 사용자/조직 루트 Pages 저장소라면 base path는 빈 문자열로 유지됩니다.

### Google 검색 등록

GitHub 프로젝트 Pages는 `https://<owner>.github.io/<repository>/` 하위 경로에 배포됩니다. 검색 로봇은 호스트 루트의 `https://<owner>.github.io/robots.txt`만 표준 robots 파일로 확인하므로, 이 저장소가 만드는 `/<repository>/robots.txt`의 사이트맵 선언만으로 검색엔진 발견을 보장할 수 없습니다. 프로젝트 Pages에서는 Google Search Console에 사이트맵을 직접 제출해야 합니다.

1. Search Console에서 실제 배포 주소 전체를 URL-prefix 속성으로 추가합니다. 마지막 `/`도 포함합니다.

   ```text
   https://<owner>.github.io/<repository>/
   ```

2. Search Console이 발급한 HTML 태그의 `content` 값만 `.env.production`에 저장합니다.

   ```sh
   PUBLIC_GOOGLE_SITE_VERIFICATION=your-verification-token
   ```

   빌드하면 모든 페이지의 `<head>`에 다음 메타 태그가 생성됩니다.

   ```html
   <meta name="google-site-verification" content="your-verification-token" />
   ```

3. 배포 후 Search Console에서 소유권을 확인하고 다음 사이트맵을 제출합니다.

   ```text
   https://<owner>.github.io/<repository>/sitemap.xml
   ```

독립 도메인이나 `<owner>.github.io` 루트 사이트에 배포하면 생성된 `/robots.txt`가 호스트 루트에 위치하므로 그 안의 사이트맵 선언도 유효합니다. 인증 토큰은 공개 정보이며, Search Console 소유권 확인을 유지하려면 배포된 메타 태그를 제거하지 않습니다.

로컬에서도 base path를 강제로 맞춰 보고 싶다면 아래처럼 빌드할 수 있습니다.

```sh
SITE_BASE_PATH=blog bun run build
```

## 원본 템플릿에서 업데이트하기

원본 템플릿의 변경을 계속 받아야 한다면 GitHub의 **Fork**로 블로그 저장소를 만드는 방식을 권장합니다. Fork는 원본 저장소와 관계가 유지되므로 GitHub의 `Sync fork` 기능이나 Git 명령으로 업데이트할 수 있습니다. `Use this template`로 만든 저장소는 독립된 Git 이력을 가지므로 자동 동기화 대상이 아닙니다.

업데이트하기 전에 블로그 저장소의 작업을 먼저 커밋하고 작업 트리가 깨끗한지 확인합니다. `content`, `.env.production`, `static/uploads`는 블로그별 사용자 데이터이므로 충돌 해결 과정에서 원본 템플릿 값으로 덮어쓰지 않도록 주의합니다.

### Fork 업데이트

처음 한 번 원본 저장소를 `upstream`으로 등록합니다.

```sh
git remote add upstream https://github.com/ORIGINAL_OWNER/ORIGINAL_REPOSITORY.git
git remote -v
```

이후 원본 `main` 브랜치의 변경을 가져와 현재 블로그에 병합합니다.

```sh
git fetch upstream
git switch main
git merge upstream/main
bun install --frozen-lockfile
bun run check
bun run build
git push origin main
```

GitHub 저장소 화면의 `Sync fork` → `Update branch`도 사용할 수 있지만, 충돌이 예상되면 로컬에서 병합하는 편이 변경 내용을 확인하기 쉽습니다.

병합 충돌이 발생하면 `git status`에 표시된 파일을 직접 수정한 후 해결한 파일만 지정하여 커밋합니다.

```sh
git status
git add path/to/resolved-file
git commit
```

병합을 취소하고 시작 전 상태로 돌아가려면 커밋 전에 `git merge --abort`를 실행합니다.

### `Use this template` 저장소

`Use this template`로 만든 저장소는 원본과 공통 Git 이력이 없으므로 `Sync fork`를 사용할 수 없습니다. 지속적인 업데이트가 중요하다면 원본을 실제로 Fork한 새 저장소를 만든 뒤 `content`, `.env.production`, `static/uploads`와 필요한 사용자 코드를 옮기는 방법이 가장 안전합니다.

기존 template 저장소를 유지해야 한다면 원본을 remote로 등록하고 필요한 변경 커밋을 선택적으로 가져올 수 있습니다.

```sh
git remote add upstream https://github.com/ORIGINAL_OWNER/ORIGINAL_REPOSITORY.git
git fetch upstream
git log --oneline upstream/main
git cherry-pick <commit-sha>
```

여러 원본 커밋을 한꺼번에 병합하는 `--allow-unrelated-histories` 방식은 최초 병합 시 동일 파일도 충돌할 수 있으므로 권장하지 않습니다.

## Pages CMS 설정

1. [Pages CMS](https://pagescms.org)에 GitHub 계정으로 로그인합니다.
2. 이 저장소를 선택합니다.
3. 루트 `.pages.yml`을 읽으면 `Posts`, `Categories`, `Tags` 편집기가 자동으로 생성됩니다.
4. 글을 저장하면 저장소에 커밋되고, `main` 브랜치 푸시 시 GitHub Pages가 다시 배포됩니다.

`workflow_dispatch`가 열려 있으므로 Pages CMS에서 `Deploy GitHub Pages` 액션 버튼으로 수동 배포도 실행할 수 있습니다.

현재 CMS 설정은 아래 운영 규칙을 포함합니다.

- 새 글 파일명: `YYYY-MM-DD-title.md`
- 업로드 파일명: safe slug로 정규화
- 카테고리: `Categories` 컬렉션에서 먼저 생성한 뒤 게시글에서 선택
- 발행일: 초 단위까지 포함한 datetime 입력
- 글 목록: 최신 `date` 기준으로 기본 정렬

## 사이트 설정

공통 공개 사이트 설정은 `.env.production`에서 관리합니다. `bun run dev`와 `bun run build` 모두 이 파일의 `PUBLIC_` 값을 읽으므로 사이트 이름, 언어, 소셜 링크에 같은 기본 설정을 사용합니다. 개발 서버는 Vite 개발 모드를 그대로 유지하며, 공통 로더는 비공개 운영 환경변수를 개발 환경으로 가져오지 않습니다. `PUBLIC_SITE_URL`은 필수이며 제목의 기본값은 `Blog`입니다. 선택 문구와 댓글 설정은 비어 있으면 그대로 둡니다. 사이트 설정은 `.env.production`에서 수정하고 Pages CMS에서는 콘텐츠만 편집합니다. 번역 결과인 `content/translations/<locale>/site.json`은 유지합니다.

명시적으로 지정한 실행 환경변수, 현재 모드의 일반 env 설정, 운영 공개 설정 순서로 우선 적용합니다. 예를 들어 `.env.development.local`에서 개발용 공개 설정을 덮어쓸 수 있습니다. env 파일을 변경하면 개발 서버를 다시 시작하세요. `bun run preview`는 마지막 `build/` 결과를 제공하므로 설정이나 코드를 수정한 뒤에는 `bun run build`를 다시 실행해야 합니다.

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

`PUBLIC_SITE_TAGLINE`, `PUBLIC_SITE_DESCRIPTION`, `PUBLIC_SITE_FOOTER`는 원문 값만 둡니다. 배포할 때 `PUBLIC_TRANSLATION_LOCALES`에 등록된 언어별 문구가 `content/translations/<locale>/site.json`으로 자동 생성됩니다. locale suffix가 붙은 `PUBLIC_SITE_DESCRIPTION_EN` 같은 환경변수는 사용하지 않습니다.

`PUBLIC_SITE_AUTHOR`도 같은 값으로 인식됩니다. 둘 다 있으면 `PUBLIC_SITE_AUTHOR`가 우선합니다.

## 번역 워크플로

1. Pages CMS에서 원문을 `content/posts/*.md`에 저장합니다.
2. GitHub Actions가 `bun run translate:content`를 실행합니다.
3. `.env.production`의 `PUBLIC_TRANSLATION_LOCALES`에 등록된 각 언어별로 번역본이 없거나 원문 해시가 바뀌었거나 번역 스키마 버전이 달라진 경우에만 DeepL을 호출합니다.
4. 사이트 문구인 `PUBLIC_SITE_TAGLINE`, `PUBLIC_SITE_DESCRIPTION`, `PUBLIC_SITE_FOOTER`도 같은 방식으로 번역되어 `content/translations/<locale>/site.json`에 저장됩니다. 문구마다 원문 언어가 다를 수 있으므로 사이트 문구는 DeepL의 언어 자동 감지를 사용합니다.
5. 본문 Markdown은 구조화 XML로 변환해 `tag_handling=xml`, `tag_handling_version=v2`, `ignore_tags` 기반으로 번역하므로 헤딩, 리스트, 코드블록 보존이 더 안정적입니다.
6. frontmatter `date`는 DeepL에 보내지지 않고 원문 값을 그대로 복사하므로 게시 시각까지 유지됩니다.
7. DeepL 요청에는 마크다운 구조와 frontmatter 의미를 보존하라는 custom instruction도 포함됩니다.
8. 생성된 번역 파일은 `content/translations/<locale>` 아래에 커밋됩니다.
9. 같은 워크플로에서 정적 빌드와 Pagefind 인덱싱이 이어서 실행됩니다.

번역 언어는 공개 env로 관리합니다. 아래 예시는 한국어 원문을 영어, 중국어 간체, 일본어, 아랍어로 번역합니다.

```sh
PUBLIC_SOURCE_LOCALE=ko
PUBLIC_TRANSLATION_LOCALES=en,zh,ja,ar
PUBLIC_RELEASE_LOCALE=en
PUBLIC_RELEASE_USE_TRANSLATIONS=true
```

번역을 끄고 원문만 배포하려면 `PUBLIC_TRANSLATION_LOCALES`를 비워둡니다.

```sh
PUBLIC_SOURCE_LOCALE=ko
PUBLIC_TRANSLATION_LOCALES=
```

DeepL 언어 코드는 기본 매핑을 사용합니다. 필요하면 `DEEPL_SOURCE_LANG_<LOCALE>` 또는 `DEEPL_TARGET_LANG_<LOCALE>` 환경변수로 특정 언어만 덮어쓸 수 있습니다. DeepL `custom_instructions`는 일부 target 언어에서만 지원되므로, 아랍어처럼 미지원 언어는 해당 옵션을 빼고 번역합니다.

## 릴리스 워크플로

- `main`에 반영된 포스트 파일마다 GitHub 태그 규칙에 맞게 정규화한 `post-...` 태그로 GitHub Release가 생성되거나 갱신됩니다. 공백, `.`, 한글처럼 태그에 바로 쓸 수 없는 문자가 있으면 안전한 slug와 짧은 해시 조합으로 바뀝니다.
- 기본값은 원문을 Release 본문으로 사용합니다.
- 공개 env 값 `PUBLIC_RELEASE_USE_TRANSLATIONS=true`가 설정되어 있으면 `PUBLIC_RELEASE_LOCALE`에 대응되는 `content/translations/<locale>/posts/*.md`가 있을 때 해당 번역본으로 Release 본문과 제목을 갱신합니다.
- 번역본이 없으면 번역 릴리스 모드에서도 자동으로 원문으로 fallback 합니다.

브라우저 첫 접속 시 기본 로케일은 다음 규칙으로 결정됩니다.

- `/` 루트에 처음 접근했을 때만 브라우저 선호 언어 또는 `localStorage.preferredLocale`을 확인합니다.
- 선호 언어가 `PUBLIC_TRANSLATION_LOCALES`에 있으면 `/<locale>/`로 이동하고, 원문 언어이면 루트 경로를 유지합니다.
- 이미 `/en/...`, `/zh/...`처럼 명시적인 언어 경로로 접근한 경우에는 강제로 원문 경로로 바꾸지 않습니다.
- 상단 언어 선택 값을 바꾸면 선택이 `localStorage.preferredLocale`에 저장됩니다.

## Giscus 댓글 설정

포스트 상세 페이지에는 Giscus 댓글 영역이 연결되어 있습니다. 이 프로젝트는 공개 가능한 Giscus 설정을 루트의 `.env.production` 파일로 관리합니다.

- `PUBLIC_GISCUS_REPO`: `owner/repo` 형식의 GitHub 저장소
- `PUBLIC_GISCUS_REPO_ID`: Giscus가 요구하는 저장소 ID
- `PUBLIC_GISCUS_CATEGORY`: 댓글을 저장할 GitHub Discussions 카테고리 이름
- `PUBLIC_GISCUS_CATEGORY_ID`: 해당 카테고리 ID

값은 [`.env.production`](../../.env.production)에 넣습니다. 이 파일은 공개 설정 전용으로 커밋됩니다.

```sh
.env.production

PUBLIC_GISCUS_REPO=owner/repo
PUBLIC_GISCUS_REPO_ID=your-repo-id
PUBLIC_GISCUS_CATEGORY=General
PUBLIC_GISCUS_CATEGORY_ID=your-category-id
PUBLIC_SOURCE_LOCALE=ko
PUBLIC_TRANSLATION_LOCALES=en,zh,ja,ar
PUBLIC_RELEASE_LOCALE=en
PUBLIC_RELEASE_USE_TRANSLATIONS=true
```

로컬에서 같은 값을 임시로 덮어쓰고 싶다면 셸 환경변수로 넘길 수도 있습니다.

```sh
PUBLIC_GISCUS_CATEGORY=Announcements \
bun run build
```

설정 절차:

1. 저장소에서 GitHub Discussions를 활성화합니다.
2. [giscus.app](https://giscus.app)에서 저장소와 카테고리를 선택합니다.
3. 생성된 값 중 `repo`, `repoId`, `category`, `categoryId`를 `.env.production`에 복사합니다.

사이트의 다크모드 토글은 Giscus iframe 테마와 자동으로 동기화됩니다.

배포 워크플로는 `giscus-post-<SHA-256(post ID) 앞 16자리>`를 giscus `specific` mapping term으로 쓰고, `scripts/sync-giscus-discussions.mjs`로 원문 포스트별 Discussion을 미리 생성합니다. 이렇게 하면 번역 경로(`/en`, `/ja`, `/ar` 등)가 모두 같은 댓글 thread를 공유하고, 첫 댓글/반응 시점에 Discussion이 뒤늦게 생성되어 iframe을 새로고침해야 하는 상황을 피할 수 있습니다. Discussion 제목, 본문, Canonical URL은 원문이 영어이면 원문 영어를 쓰고, 원문이 영어가 아니면서 영어 번역 파일이 있으면 영어 번역 경로를 쓰며, 영어 번역이 없으면 원문을 사용합니다.

## 디자인·콘텐츠·추가 기능 보존

디자인은 `src/lib/theme`, 사용자 기능은 `src/lib/extensions`, 공식 동작은 `src/lib/template`에서 관리합니다. `bun run update:check`는 콘텐츠를 생성·번역하지 않고 검사와 빌드를 실행하며 보호 파일의 변경 여부를 확인합니다. `bun run test:template`은 임시 복사본에서 사용자 스타일과 확장 연결을 검증합니다. 자세한 규약과 기존 사용자 코드 이전 절차는 [커스터마이징 가이드](../customization.md)를 참고하세요.

## GitBlog 피드 자동 등록

`.env.production`의 `PUBLIC_HUB_ENABLED=true`, `PUBLIC_HUB_URL=https://gitblog.app` 설정으로 배포 후 피드에 참여합니다. 공식 템플릿으로 만든 공개 저장소 또는 포크라면 **GitBlog App 설치 없이도** 등록됩니다. 배포 작업이 고정된 공식 `register-blog.yml`을 호출하고, 이 워크플로가 저장소의 템플릿 관계·공개 여부·기본 브랜치·Pages 주소를 확인한 뒤 GitHub Actions OIDC 증명을 보냅니다. 저장소 접근 토큰은 GitBlog에 전송하지 않습니다.

GitHub Actions 정책에서 공식 템플릿의 재사용 워크플로와 `id-token: write`를 허용해야 합니다. 첫 알림은 최대 4회 전송을 시도합니다. 모두 실패했다면 **Actions → Sync GitBlog feed → Run workflow**로 재시도하거나 다시 배포하세요. 앱 설치도 없고 첫 알림도 성공하지 않은 저장소는 서비스가 자동으로 발견할 수 없습니다. 기존 앱 설치 기반 탐색도 함께 유지됩니다.

알림을 받은 GitBlog는 D1에 수집 상태를 먼저 기록하고 공개 RSS를 바로 확인합니다. CDN에서 이전 배포 결과가 반환되거나 RSS 요청이 실패하면 서버가 재시도합니다. 정상 피드는 매일 한 번 보완 수집합니다. 참여를 중단하려면 `PUBLIC_HUB_ENABLED=false`로 재배포하세요. 이미 등록된 블로그는 다음 manifest 확인 시 숨겨집니다.

기존 블로그에는 새 배포 워크플로, `scripts/hub-settings.mjs`, RSS·manifest의 배포 커밋 정보와 `sync-hub.yml`이 필요합니다. Studio의 **템플릿 업데이트**로 적용할 수 있습니다. 이전 템플릿의 인증 없는 알림도 이미 등록된 블로그에서는 계속 지원합니다. 피드 등록 작업이 실패해도 완료된 Pages 배포는 유지됩니다.
