# CLAUDE.md — 펭귄 스매시 3D (penguin-shoot)

이 파일은 Claude Code가 이 저장소의 맥락을 이어받기 위한 안내서다. 기획·튜닝·배포 이력은 Claude Cowork 세션(2026-09-23)에서 진행됐다.

## 한 줄 요약
절벽 다이빙대에서 떨어지는 펭귄을 예티가 방망이로 날려 비거리를 겨루는 원버튼 Three.js 게임. 2000년대 플래시 장타 게임(Yetisports 계열)에서 영감을 받았지만 캐릭터·이름은 모두 오리지널이다. **원작 이름, 로고, 캐릭터 디자인을 가져오지 말 것.**

- 배포: https://ring-wdr.github.io/penguin-shoot/
- 기본 브랜치: `main` (다른 브랜치 없음)
- 언어: UI 문구, 주석, 커밋 이외 문서는 한국어

## 현재 구조
Vite + ES 모듈. 게임 로직(`src/core/`)은 DOM·three에 의존하지 않는 순수 JS라 Node(Vitest)에서 그대로 돈다.

```
index.html                  # 마크업만 (HUD, 타이틀/결과 오버레이) → /src/main.js
src/
  main.js                   # 조립: Sim + View + UI + 오디오 + 저장, 렌더 루프, window.__game
  style.css
  core/                     # 순수 로직 (three/DOM 금지)
    constants.js            # 튜닝 수치 (PIVOT, 중력, 가중치, COURSE …)
    sim.js                  # Sim 클래스: 상태 머신, step/collide, tick/advance, 연출은 fx 콜백으로 요청
    judge.js                # judgeHit(dy), inSwingReach, rollWind
    course.js               # genCourse(rng), crevasseAt, onIce, balloonY
    records.js              # parseStore, recordRun (localStorage 형식)
    rng.js / math.js        # mulberry32, pick, clamp/damp/hash3, 연출용 rand
  scene/                    # color.js(컬러 관리 설정, 첫 import) stage.js(렌더러·카메라·하늘·조명) materials.js(M, MS, mesh, part)
                            # terrain.js(지형·절벽·다이빙대·고리) scenery.js(나무·산·표지판·BEST 깃발·풍향계) particles.js(Pool, 눈 자국, 눈발)
  models/                   # yeti.js, penguin.js (매끈), course-objects.js (로우폴리 make*, buildCourseMeshes)
  view.js                   # 포즈·카메라·오브젝트 애니메이션·그림자 타깃 (sim 상태를 읽기만 함, easeSwing 제외)
  ui.js / input.js / audio.js
tests/                      # Vitest: judge, course, sim(결정성 포함), records, distribution(몬테카를로 회귀)
e2e/smoke.spec.js           # Playwright: 타이틀 → 시작 → 결과 → 다시, 헛스윙, 390px 레이아웃
scripts/montecarlo.js       # npm run montecarlo -- [판 수] [시드]
```

- 명령: `npm run dev` (http://localhost:5173/penguin-shoot/), `npm test`, `npm run test:e2e`(빌드 후 preview 4173 포트), `npm run build`
- Three.js **0.186** (npm). r149 색감을 유지하려고 `ColorManagement.enabled = false`(`scene/color.js`, 어떤 Color보다 먼저 실행돼야 함) + `outputColorSpace = LinearSRGBColorSpace` + 조명 세기 ×π(r155 물리 조명 단위). `PCFSoftShadowMap`은 r180+에서 제거돼 `PCFShadowMap` 사용. r149와 스크린샷 비교로 색·명암 동일 확인함.
- Vite dev 서버는 `node_modules/.vite`에 three를 미리 번들해 둔다. three 버전을 바꾼 뒤 화면이 이상하면 이 폴더를 지우고 재시작할 것.
- 폰트: Google Fonts `Jua`(디스플레이) + `Gowun Dodum`(본문).
- 저장: `localStorage` 키 `penguin-smash-3d` → `{ best, recent[5] }`. 모든 접근은 try/catch로 감싼다.
- 사운드: 음원 파일 없이 Web Audio로 합성(`tone`, `noise`, 슬라이드 루프 노이즈).

### 로직 ↔ 연출 경계
- `new Sim({ rng, fx })`: `rng`는 **로직 난수**(코스·바람·물개·폭죽)만 쓴다. 파티클·새 흩어짐·바위 회전 같은 연출 난수는 `Math.random`(`math.js`의 `rand`). 그래서 시드가 같으면 입력이 같을 때 결과가 같다.
- 연출이 필요하면 sim이 `fx.sfx/pop/burst/sparkle/shake/hint/energy/ring/slide/objectHit/finish/result …`를 호출한다(목록은 `sim.js` 머리 주석). 테스트에선 fx를 비워 두면 된다.
- 코스 오브젝트 데이터(`objs`, `airs`)에 뷰가 메시를 `o.m`으로 붙인다. 로직은 `o.m`을 건드리지 않는다.
- 예외 두 가지(원본 동작 그대로 유지): 스윙 전 방망이 대기 각도(`sim.easeSwing`)와 풍선 판정 높이(`o.y`)는 **렌더 루프에서만** 갱신된다. `advance()`로 도는 헤드리스 측정에는 반영되지 않는다.

### 상태 머신
`title → ready → waddle → fall → (스윙 적중) flight ⇄ slide → done → result`
- 헛스윙이나 미스: `fall`에서 바닥 도달 → `finish('miss')` (0m)
- 크레바스: `flight`/`slide` 중 → `sink` → `finish('crevasse')` (빠진 지점이 기록)
- 정지: `slide`에서 vx ≤ 0.15 → `finish('stop')`

## 게임 규칙 & 튜닝 수치 (기획 승인된 값 — 바꿀 땐 이유를 남길 것)
**타격**: 스윙 각속도 17rad/s, 방망이가 각도 0을 지나는 순간 `dy = 펭귄 y − PIVOT.y`로 판정
- 오차 `e = |dy − 0.1|`: PERFECT < 0.38, GREAT < 0.8, GOOD < 1.25, 빗맞음 < 1.75, 그 이상은 헛스윙
- 발사각 `38° + (dy−0.1)×12°` (12~62°), 속도 `30 + 31·q^1.3` (q = 1 − e/1.75), PERFECT ×1.08, vx에 바람 배율 곱함
- 중력: 낙하 7, 비행 14. 공기저항 vx 0.035/s. 바운스 최대 3회(|vy|>7일 때 vy×0.38, vx×0.8). 미끄럼 마찰 6.5, 빙판 1.1

**v2 보너스/위험** (지상 간격 24~58m, 공중 18~44m, 코스 5,000m)
| 요소 | 가중치 | 효과 |
|---|---|---|
| 물개 | 24 | 속력 유지 ×0.96~1.2, 38~55°로 재발사 (히트박스 \|dx\|<2.0, 바닥높이<2.3) |
| 트램펄린 | 15 | vy 17~36, vx ×1.2 (최소 24) |
| 폭죽 상자 | 9 | 58~88m/s, 42~62° 발사 |
| 빙판 | 13 | 미끄럼 마찰 1.1 |
| 눈사람 | 14 | vx ×0.5 |
| 바위 | 9 | vx ×0.28 (150m 이후) |
| 크레바스 | 9 | 즉시 종료 (150m 이후, 폭 3.5~6m) |
| 철새 떼(공중, 55%) | — | vx +16, vy +5, 떼 자체가 +x로 3~6m/s 이동 |
| 풍선(공중, 45%) | — | vy +15, vx ×1.05 |

- 바람: 판마다 15% 확률로 무풍, 그 외 −15%~+15%. 발사 vx 배율 + 비행 중 가속 `wind×6`
- 날개짓 에너지 3칸, 보너스 1회당 +1. 높이 12m 미만이면 1.35배. `slide` 중 누르면 점프(vy 7.5, 크레바스 회피용)
- COMBO: 착지해 `slide`로 들어가기 전까지 연속 보너스 수

**목표 분포 (사용자 승인: "대박은 5판에 1번")** — 400판 몬테카를로, 타이밍 오차 σ=0.6m
중앙값 459m · 하위 10% 202m · 상위 10% 1,430m · 최고 4,409m · **1,000m 이상 18.3%** · 2,000m 이상 3.5% · 크레바스 종료 8.5%
→ 물리·가중치를 건드리면 이 분포를 다시 측정해 크게 벗어나지 않는지 확인할 것.

## 디버그 훅 & 검증 방법
`window.__game`은 테스트·튜닝용이다(프로덕션에 남아 있어도 무해).
- `resetRun()`, `action()`, `state`, `P`(위치·속도), `run`(판정·이벤트·거리), `energy`, `objs`, `airs`, `sim`(Sim 인스턴스)
- `advance(sec, until?)`: 렌더 없이 로직만 1/120초 단위로 진행. `until()`이 true면 중단
- `snap()`: 카메라와 포즈를 즉시 목표로 맞추고 한 프레임 렌더(스크린샷용, rAF가 멈춘 환경에서도 동작)

몬테카를로는 이제 Node에서 돈다: `npm run montecarlo -- 4000 7` (브라우저 불필요, 4,000판 수 초). 회귀 테스트는 `tests/distribution.test.js`(시드 고정 1,200판).
리팩토링 직후 원본 단일 파일과 4,000판씩 비교: 원본 중앙값 477m · 1,000m 이상 18.2% · 2,000m 이상 3.1% · 크레바스 11.1% / 모듈판 483m · 17.5% · 3.2% · 11.0%. (위 400판 수치의 크레바스 8.5%는 표본 오차였다.)

참고용 원래 브라우저 버전 (Playwright `page.evaluate`):
```js
const g = window.__game, gauss = () => { let u=0; while(!u) u=Math.random(); return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*Math.random()); };
g.resetRun();
const off = gauss() * 0.6;                                   // 사람 타이밍 오차
g.advance(10, () => g.state === 'fall' && g.P.y < 8.65 + off + 1.55); // 스윙 선행시간 보정
g.action();
for (let t = 0; t < 200 && g.state !== 'result'; t += 1/60) {
  if (g.state === 'flight' && g.energy > 0 && g.P.vy < 0 && g.P.y < 9 && Math.random() < 0.02) g.action();
  g.advance(1/60);
}
// g.run.dist, g.run.events, g.run.kind
```
헤드리스 크로미움(swiftshader)은 매우 느려서 실시간 플레이 검증이 안 된다. 로직은 `advance`로, 화면은 `snap()` 후 스크린샷으로 확인한다. Claude 데스크톱 앱의 브라우저 패널도 숨겨져 있으면 rAF가 멈추므로 같은 방법을 쓴다.

## 알려진 함정 (이미 한 번씩 밟은 것)
1. **z-fighting**: `cliff()`에서 바위 블록 윗면과 눈 덮개 윗면이 같은 높이면 시작 화면 카메라 드리프트 때 깜빡인다. 바위 높이를 `h − 0.35`로 내려 해결했다. 겹치는 평면을 새로 만들 땐 반드시 높이를 떨어뜨릴 것.
2. **그림자**: `sun.shadow.bias = -0.0004`, `normalBias = 0.045`. 매끈한 캐릭터에서 acne가 생기면 normalBias부터 조정. 그림자 카메라는 ±36m이고 `updateVisuals`에서 펭귄을 따라다닌다.
3. `.overlay{display:grid}`가 `hidden` 속성을 덮어쓰지 않도록 `[hidden]{display:none!important}`가 CSS에 있다. 지우지 말 것.
4. 세로 화면: `aspectK = clamp(1.35 / aspect, 1, 2.6)`로 카메라 거리를 늘린다. 레이아웃을 바꿔도 390px 폭에서 확인할 것(e2e 테스트가 가로 넘침을 검사한다). `.panel`은 `box-sizing:border-box`, `width:min(490px,100%)` — 예전 content-box라 390px에서 좌우 19px씩 화면 밖으로 넘쳤다.
5. 오브젝트 애니메이션은 카메라 x ±220~260m 안에서만 돈다(`view.js`). 공중 풍선의 판정 y(`o.y`)도 이 안에서만 갱신된다.
6. three 내부(UUID 생성 등)도 `Math.random`을 쓴다. 스크린샷 비교용으로 `Math.random`을 시드 고정해도 three 버전이 다르면 나무·코스 배치가 달라진다. 색 비교는 같은 구도(절벽·캐릭터)로 할 것.

## 배포 / CI
- `.github/workflows/deploy-pages.yml`
  - `test` 잡(push·PR·수동): `npm ci` → `npm test`(Vitest) → Playwright Chromium 설치 → `npm run test:e2e`. 실패하면 `test-results`를 아티팩트로 올린다.
  - `build` 잡(PR 제외): `npm ci && npm run build` → `dist/` 업로드(upload-pages-artifact@v5) → `deploy` 잡(deploy-pages@v5)
  - Vite `base: '/penguin-shoot/'` (vite.config.js). 경로를 바꾸면 playwright.config.js의 baseURL도 같이.
- `github-pages` 환경은 custom branch policy로 **`main`만** 배포를 허용한다. (처음엔 옛 기본 브랜치만 허용돼서 "Branch main is not allowed to deploy" 오류가 났었다.) 배포 브랜치를 바꾸면 이 정책도 같이 바꿔야 한다: `gh api repos/Ring-wdr/penguin-shoot/environments/github-pages/deployment-branch-policies`

## Git 규칙
- Conventional Commits (`feat:`, `fix:`, `refactor:`, `ci:`, `chore!:` + `BREAKING CHANGE:`)
- 히스토리 보존: `reset --hard`나 force-push 금지, fast-forward 또는 PR 머지
- 이전 Vite/TypeScript 프로토타입(드래그 발사, 릴레이 모드)은 3b36e28까지의 히스토리에 남아 있다. 되살릴 게 있으면 거기서 가져올 것.

## 리팩토링 이력
2026-09-23 로드맵 1~5단계 완료: Vite + ES 모듈 분리, three 0.149 → 0.186(npm), 순수 로직 코어 + Vitest(몬테카를로 회귀 포함), Playwright 스모크, 빌드·테스트 기반 배포.
- 로직을 옮길 때 **동작·수치 동일성**을 유지할 것. 난수는 주입된 `rng`만 로직에 쓰고, 분포는 `npm run montecarlo`로 확인.
- 시각 스타일 원칙: 환경은 로우폴리, 예티·펭귄만 매끈하게. UI 팔레트 ink `#17233B`, ice `#DDEFFA`, snow `#F7FBFF`, coral `#FF5D3A`, gold `#FFC23C`, pine `#2E5E4E`
