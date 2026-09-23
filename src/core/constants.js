/* 기획 승인된 튜닝 값 — 바꿀 땐 CLAUDE.md에 이유를 남기고 몬테카를로 분포를 다시 확인할 것 */

// 스윙
export const PIVOT = Object.freeze({ x: -3, y: 8.55, z: 0 }); // 스윙 피벗 = 고리 높이
export const FALLX = PIVOT.x + 3.05;                          // 펭귄이 떨어지는 x (고리 중심)
export const SWING_REST = -2.6, SWING_WINDUP = -3.05, SWING_W = 17, SWING_END = 2.35;

// 펭귄 시작 위치 (다이빙대 끝)
export const START = Object.freeze({ x: -6.6, y: 14.25 + 0.62 });
export const DIVE_X = -0.55;

// 물리
export const GRAV = 14, GRAV_FALL = 7, R = 0.45, VMAX = 95;
export const SUBSTEP = 1 / 120;
export const MAX_ENERGY = 3;

// 코스
export const COURSE = 5200;
export const GROUND_WEIGHTS = [['seal', 24], ['tramp', 15], ['fire', 9], ['ice', 13], ['snowman', 14], ['rock', 9], ['crevasse', 9]];
export const HAZARD_FROM = 150; // 바위·크레바스는 이 거리 이후에만
