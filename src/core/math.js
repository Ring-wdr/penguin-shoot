export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
/** 프레임 독립 지수 감쇠 보간 계수 */
export const damp = (k, dt) => 1 - Math.exp(-k * dt);
export function hash3(x, y, z) { const s = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453; return s - Math.floor(s); }
export const DEG = Math.PI / 180;
/** 연출용 난수 (로직 난수는 Sim의 rng를 쓴다) */
export const rand = (a, b) => a + Math.random() * (b - a);
