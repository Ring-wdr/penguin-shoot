import * as THREE from 'three';
import { clamp } from '../core/math.js';

/* 렌더러 / 씬 / 카메라 / 하늘 / 조명 */
export function createStage(host) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap; // r180+에서 PCFSoft는 제거됨(PCF가 부드러운 필터링을 함)
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace; // r149 레거시 출력과 동일
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const FOG = new THREE.Color(0xE4F1FA);
  scene.fog = new THREE.Fog(FOG, 140, 620);
  scene.background = FOG;

  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 2000);
  const stage = { renderer, scene, camera, aspectK: 1 };
  stage.resize = () => {
    const w = host.clientWidth || window.innerWidth, h = host.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    stage.aspectK = clamp(1.35 / camera.aspect, 1, 2.6); // 세로 화면이면 카메라를 뒤로 뺀다
  };
  window.addEventListener('resize', stage.resize);

  /* 하늘 */
  stage.sky = new THREE.Mesh(
    new THREE.SphereGeometry(900, 24, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { top: { value: new THREE.Color(0x5FA8E0) }, mid: { value: new THREE.Color(0xA9D4F2) }, bot: { value: FOG } },
      vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
      fragmentShader: 'uniform vec3 top; uniform vec3 mid; uniform vec3 bot; varying vec3 vP; void main(){ float h = vP.y; vec3 c = h > 0.12 ? mix(mid, top, smoothstep(0.12, 0.6, h)) : mix(bot, mid, smoothstep(-0.02, 0.12, h)); gl_FragColor = vec4(c,1.0); }',
    }),
  );
  scene.add(stage.sky);

  /* 조명 — r149 레거시 조명 세기 × π (물리 기반 조명 단위로 환산) */
  scene.add(new THREE.HemisphereLight(0xE8F3FF, 0x8FA6C2, 0.78 * Math.PI));
  const sun = new THREE.DirectionalLight(0xFFF3DE, 0.95 * Math.PI);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -36, right: 36, top: 36, bottom: -36, near: 1, far: 220 });
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.045; // 매끈한 캐릭터에 acne가 생기면 이것부터 조정
  scene.add(sun, sun.target);
  stage.sun = sun;

  return stage;
}
