# 펭귄 스매시 3D

절벽 다이빙대에서 뛰어내리는 펭귄을 예티가 방망이로 날려 비거리를 겨루는 원버튼 3D 게임입니다.
2000년대 플래시 장타 게임에서 영감을 받은 오리지널 리메이크입니다.

**플레이:** https://ring-wdr.github.io/penguin-shoot/

## 조작

`스페이스` · `클릭` · `탭` 하나로 모두 조작합니다.

1. 펭귄이 **노란 고리**를 지날 때 눌러서 스윙합니다. 고리 중심에 가까울수록 멀리 날아갑니다.
2. 날아가는 중에 누르면 **날개짓**을 합니다. 에너지 3칸이며, 땅 가까이서 쓰면 더 셉니다.
3. 미끄러지는 중에 누르면 **점프**해서 크레바스를 넘을 수 있습니다.

## 코스 요소

| 구분 | 요소 |
|---|---|
| 보너스 | 물개, 트램펄린, 폭죽 상자, 풍선, 철새 떼 (맞히면 에너지 1칸 충전, 연속이면 COMBO) |
| 위험 | 크레바스(즉시 종료), 눈사람, 바위 |
| 변수 | 판마다 무작위로 바뀌는 코스 배치와 바람(±15%) |

## 구성

- Vite + ES 모듈. 게임 로직(`src/core/`)은 three·DOM과 분리된 순수 JS이고, 3D 연출(`src/scene/`, `src/models/`, `src/view.js`)은 로직 상태를 읽어서 그립니다.
- Three.js(npm)를 사용하고, 캐릭터와 지형은 모두 코드로 모델링했습니다.
- 효과음은 Web Audio로 실시간 합성하고, 기록은 브라우저 localStorage에 저장합니다.

## 개발

```bash
npm install
npm run dev          # http://localhost:5173/penguin-shoot/
npm test             # Vitest: 판정·코스·상태 머신·비거리 분포 회귀
npm run test:e2e     # Playwright 스모크 (처음엔 npx playwright install chromium)
npm run montecarlo   # 비거리 분포 측정 (기본 400판)
npm run build        # dist/
```

## 배포

`main` 브랜치에 푸시하면 `.github/workflows/deploy-pages.yml`이 테스트 → 빌드 → GitHub Pages 배포를 진행합니다.
(저장소 Settings → Pages → Source: **GitHub Actions**)
