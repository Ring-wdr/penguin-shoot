import { ac, setMuted, isMuted } from './audio.js';

/* 입력: Space·Enter·클릭·탭 하나로 스윙/날개짓/점프, R = 재시작 */
export function bindInput({ sim, ui, start }) {
  const host = document.getElementById('game');
  host.addEventListener('pointerdown', e => { e.preventDefault(); ac(); sim.action(); });
  window.addEventListener('keydown', e => {
    if (e.code === 'Space' || e.code === 'Enter') {
      if (sim.state === 'title' || sim.state === 'result') {
        if (e.target && e.target.tagName === 'BUTTON') return; // 버튼 자체 클릭으로 처리
        e.preventDefault(); start(); return;
      }
      e.preventDefault(); if (!e.repeat) { ac(); sim.action(); }
    } else if (e.code === 'KeyR' && sim.state !== 'title') { start(); }
  });
  ui.el.startBtn.addEventListener('click', start);
  ui.el.againBtn.addEventListener('click', start);
  ui.el.mute.addEventListener('click', e => {
    setMuted(!isMuted());
    e.currentTarget.textContent = isMuted() ? '소리 꺼짐' : '소리 켜짐';
    e.currentTarget.setAttribute('aria-pressed', String(isMuted()));
  });
  ui.el.mute.addEventListener('pointerdown', e => e.stopPropagation());
}
