# 디자인과 사용자 기능을 보존하는 업데이트

이 문서는 현재 SvelteKit 템플릿의 커스터마이징 경계를 정의합니다. GitBlog 서비스의 범용 SDK나 별도 core 저장소를 도입한 것은 아닙니다.

## 파일 소유권

| 영역                                            | 역할                                  | 업데이트 정책                                |
| ----------------------------------------------- | ------------------------------------- | -------------------------------------------- |
| `content/`, `static/`                           | 원문, 번역문, 이미지, 파비콘          | 일반 코드 업데이트에서 보존                  |
| `src/lib/theme/`                                | 현재 적용한 레이아웃과 스타일         | 기능 업데이트와 별도로 변경                  |
| `src/app.css`, `src/app.html`                   | 사용자 CSS 진입점, 폰트·HTML 설정     | 보존                                         |
| `src/lib/extensions/`                           | 사용자 컴포넌트와 페이지 실행 코드    | 보존                                         |
| `.env.production`, `.pages.yml`                 | 사용자 사이트·CMS 설정                | 보존                                         |
| `src/routes/`                                   | 공식 라우트 연결과 사용자 추가 페이지 | 변경 비교 후 병합, 알 수 없는 파일 삭제 금지 |
| `package.json`, `bun.lock`, 빌드 설정, 워크플로 | 공식·사용자 의존성과 실행 환경        | 필요한 변경만 병합                           |
| `src/lib/template/`                             | 공식 화면 동작, 메타데이터, 확장 연결 | 호환성을 검증하며 업데이트                   |

기계가 읽는 정책은 `.gitblog/update-policy.json`에 있습니다. `preserve`는 일반 업데이트에서 보존할 경로이고 `mergeOnly`는 통째로 교체하면 안 되는 경로입니다. 여기에 없는 파일도 삭제해도 된다는 뜻은 아닙니다. GitBlog Studio의 템플릿 업데이트는 이전 공식 버전과 비교해 사용자가 수정한 공식 파일을 감지합니다.

**일반 Git 병합에는 이 정책이 자동 적용되지 않습니다.** GitBlog Studio의 템플릿 업데이트는 정책을 적용해 파일 단위로 세 버전을 비교하고, 충돌이 없는 경우 별도 업데이트 PR을 생성합니다. 사용자와 템플릿이 같은 파일을 모두 수정하면 자동 줄 병합 대신 검토를 요청합니다. `Sync fork`, 파일 복사, 일반 Git 병합으로 변경을 받을 때도 이 정책에 따라 diff를 검토해야 합니다.

## 테마 수정

- `SiteLayout.svelte`: 헤더, 메뉴, 푸터, 전체 배치, theme-color.
- `HomeView.svelte`: 글 목록과 필터의 배치.
- `ArticleView.svelte`: 제목·커버·본문·목차·댓글·관련 글의 배치.
- `styles.css`: 기존 디자인의 CSS 전체. 기존 변수와 선택자를 유지했습니다.
- `src/app.css`: 테마 스타일을 가져오는 사용자 진입점. 마지막에 개인 CSS를 추가할 수 있습니다.

`src/routes/+layout.svelte`는 공식 `SiteShell`에 위임합니다. `SiteShell`은 언어 이동, 다크모드, 검색 상태와 메타데이터를 관리합니다. 테마는 `SiteController`를 받아 해당 동작을 호출합니다. 팝업 바깥 클릭 처리를 유지하려면 언어 메뉴 컨테이너의 `bind:this={state.localeMenuEl}` 연결을 유지하세요.

게시글 컴포넌트는 데이터와 SEO를 유지하고 `ArticleView`를 호출합니다. 공식 `ArticleBody`는 본문 HTML을 표시하며, `bind:element={article.element}` 연결로 목차를 계산합니다. 테마를 수정할 때 `post-title`, 본문 참조와 `data-pagefind-body` 연결을 유지해야 목차·검색이 계속 동작합니다. 추가 콘텐츠가 검색 대상이면 사용자 컴포넌트에 적절한 Pagefind 속성을 직접 지정하세요.

`src/lib/template/contracts.ts`가 공개 타입 경계입니다. 현재 테마·확장 API 버전은 1입니다. 새로운 필수 props, 슬롯 제거, 본문 DOM 구조·선택자 변경은 호환성 검토가 필요한 변경입니다. 테마 변경을 기능 업데이트에 묶어 강제 적용하지 않습니다. `ArticleBody`를 자체 구현으로 교체하면 공식 본문 기능이 자동으로 반영되지 않으므로 직접 호환성을 관리해야 합니다.

공유 검색·댓글·관련 글 컴포넌트까지 완전한 독립 테마 엔진으로 분리한 것은 아닙니다. CSS를 보존해도 공식 컴포넌트의 DOM이 바뀌면 디자인이 달라질 수 있으므로 미리보기 검증은 필요합니다.

## 사용자 기능 등록

`src/lib/extensions/registry.ts`를 수정합니다. 등록 순서대로 표시되며, 컴포넌트가 없으면 추가 HTML 래퍼도 생성하지 않습니다.

```ts
import Newsletter from './Newsletter.svelte';
import type { BlogExtension } from '$lib/template/contracts';

export const extensions: BlogExtension[] = [
	{
		id: 'newsletter',
		apiVersion: 1,
		components: {
			'article-after-body': Newsletter
		}
	}
];
```

`Newsletter.svelte`는 다음처럼 데이터를 받습니다.

```svelte
<script lang="ts">
	import type { ExtensionContext } from '$lib/template/contracts';
	let { context }: { context: ExtensionContext } = $props();
</script>

<aside aria-label="뉴스레터">
	<p>{context.post?.title} 글을 읽어주셔서 감사합니다.</p>
</aside>
```

지원하는 표시 위치:

- `article-before-body`: 커버 다음, 본문 직전.
- `article-after-body`: 본문 다음, 댓글 직전.
- `site-footer`: 전체 사이트 푸터 다음.

모든 위치에 `site`, `locale`, `pathname`을 전달하고 게시글에서는 `post`도 제공합니다. 기본 페이지에서는 `post`가 없을 수 있습니다. 새 테마도 이 위치들을 렌더링해야 등록한 기능이 나타납니다.

페이지별 브라우저 동작은 `onPage`로 등록합니다. SSR에서는 실행되지 않습니다. 현재 페이지 컨텍스트가 바뀌면 기존 정리 함수를 실행한 뒤 다시 초기화하고, 사이트 셸이 제거될 때도 정리합니다. 반환한 정리 함수에서 이벤트 리스너·타이머·외부 위젯을 해제하세요. 페이지 전환 시 무조건 새로 생기지 않는 영속 레이아웃에서는 `onMount`만으로 페이지별 기능을 구현하지 마세요.

```ts
{
  id: 'reading-tools',
  apiVersion: 1,
  onPage(context) {
    if (!context.post) return;
    const listener = () => { /* 사용자 기능 */ };
    window.addEventListener('scroll', listener, { passive: true });
    return () => window.removeEventListener('scroll', listener);
  }
}
```

중복 ID나 지원하지 않는 API 버전은 빌드를 실패시킵니다. 실패한 확장을 조용히 숨기지 않습니다. 실제 기능의 호환성까지 타입 검사만으로 보장하지는 않습니다.

## 콘텐츠를 수정하지 않는 검증

```sh
bun run update:check
bun run test:template
```

`update:check`는 다음을 실행합니다.

1. 보존·병합 대상 파일의 경로와 바이트 해시를 기록합니다.
2. 기존 테스트, 게시글 ID 읽기 전용 검사, Svelte 타입 검사를 실행합니다.
3. 정적 빌드, gitblog 계약 검증, Pagefind 인덱싱을 실행합니다.
4. 성공·실패 여부와 관계없이 보호 대상 파일의 추가·수정·삭제를 확인합니다.

`build/`, `.svelte-kit/` 등 빌드 산출물은 생성됩니다. 번역, ID 생성, 파일 정리, GitHub 쓰기, 배포는 호출하지 않습니다. 이 명령은 쓰기를 막는 샌드박스가 아닙니다. 사용자 빌드 플러그인 등이 보호 파일을 바꾸면 이를 감지해 실패시키며, 사용자 작업을 잃지 않도록 자동 복원하지 않습니다. 검증 도중 직접 파일을 편집해도 변경으로 감지됩니다.

`test:template`은 임시 복사본에서 사용자 CSS와 확장 컴포넌트, 게시글을 등록해 실제 빌드를 검사합니다. 프로젝트 Pages 하위 경로, 본문 앞뒤·푸터 연결, 게시글 ID 전달, Google 인증 메타데이터, 소스 보존을 확인합니다. 원본 블로그는 수정하지 않습니다.

`.github/workflows/validate-update.yml`은 PR에서 읽기 권한으로 검증합니다. 기존 `deploy.yml`은 별개의 발행 워크플로이며 여전히 ID 생성·번역·Discussion·Release 동기화를 수행합니다. `posts:ids --write` 및 번역 명령에는 원문이 없는 번역 파일을 삭제하는 기존 동작이 있으므로 **마이그레이션 미리보기에 발행 워크플로를 사용하지 마세요.** 실제 발행에서 콘텐츠를 바꾸는 작업은 별도로 검토해야 합니다.

## 기존 커스터마이징을 옮기는 순서

1. 현재 저장소의 커밋과 파일, URL, 게시글 ID, 대표 화면을 기준으로 기록합니다.
2. 사용자가 수정한 기존 `+layout.svelte`, 게시글·목록 컴포넌트, `app.css`를 공식 파일로 덮어쓰지 말고 변경 내용을 테마 영역으로 옮깁니다.
3. 추가 기능을 registry에 연결하고 사용자 추가 페이지·의존성·CMS 필드를 유지합니다.
4. 현재와 같은 화면·기능이 나오는지 먼저 검증합니다. 이 단계에 새 디자인이나 새 기능을 섞지 않습니다.
5. 이후 공식 기능 업데이트를 별도 PR로 적용합니다. 충돌·호환성 실패 시 기존 배포를 유지합니다.

이미 깊게 수정한 블로그를 이 구조로 자동 변환하는 기능은 아직 없습니다. 테마 API 버전이 같더라도 화면 비교와 사용자 기능 확인이 필요합니다. 되돌릴 때는 업데이트 변경만 되돌려서, 이후 작성한 글을 보존해야 합니다.

## GitBlog Studio에서 업데이트

블로그 관리의 **템플릿 업데이트**를 사용합니다. `.gitblog/release.json`에 발행된 안정 버전을 분석하고, 글·이미지·설정·테마·확장을 보존한 PR을 준비합니다. `validate-update.yml`의 검증이 성공하고 변경 내용을 확인한 뒤 Studio에서 적용합니다. 적용 전 새 글이 작성되거나 PR이 변경되면 다시 분석합니다. 충돌이 있는 코드는 GitHub에서 사용자 변경을 보존해 병합한 뒤 다시 분석해야 합니다.

첫 업데이트는 템플릿으로 생성한 블로그의 최초 커밋을 기준으로 합니다. 성공적으로 적용한 버전은 `.gitblog/template.json`에 기록됩니다. Fork, 기준 버전을 알 수 없는 저장소, 테마 분리 이전 구조와 API가 달라진 버전은 자동 이전하지 않습니다. 해당 저장소의 실제 공식 기준 커밋을 확인하거나 기존 커스터마이징을 먼저 이전해야 합니다. 프레임워크 교체와 테마 디자인 교체는 이 업데이트에 포함되지 않습니다.

유지보수자는 코드 변경을 검증·커밋한 뒤 `.gitblog/release.json`의 version과 revision을 별도 커밋으로 발행합니다. revision은 GitHub에 공개된 40자리 커밋 SHA여야 합니다. `.gitblog/template.json`은 각 블로그의 적용 기록이므로 템플릿에 미리 복사하지 않습니다. 새 블로그도 최초 생성 커밋으로 기준을 판별합니다.
