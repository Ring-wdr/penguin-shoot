import * as THREE from 'three';

/*
 * r149 시절 색감 유지: 컬러 관리 끄고(hex 색을 변환 없이 사용) 선형 출력.
 * 어떤 THREE.Color보다 먼저 실행돼야 하므로 main.js에서 가장 먼저 import 한다.
 * 조명 세기는 r155 물리 기반 조명 전환 때문에 stage.js에서 ×π 보정한다.
 */
THREE.ColorManagement.enabled = false;
