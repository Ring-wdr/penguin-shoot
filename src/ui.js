/* HUD · 팝업 · 힌트 · 결과 화면 (DOM) */
const $ = id => document.getElementById(id);

export const fmt = d => d.toFixed(1);

const HINTS = {
  ready: '펭귄이 <b>노란 고리</b>를 지날 때 스윙!',
  fall: '지금! <b>스페이스 · 클릭 · 탭</b>',
  flight: '누르면 <b>날개짓</b> · 땅 가까이서 쓰면 더 세요',
  flightNo: '에너지 없음 · <b>보너스</b>를 맞히면 1칸 충전',
  slide: '미끄러질 때 누르면 <b>점프</b> · 크레바스 조심!',
  slideNo: '쭈우욱 미끄러지는 중…',
  done: '',
};
export const HIT_POP = {
  perfect: ['PERFECT!', 'var(--gold)'],
  great: ['GREAT!', '#8FD3F5'],
  good: ['GOOD', '#FFFFFF'],
  weak: ['빗맞음…', '#C9D3E1'],
};
const JUDGE_TXT = { perfect: 'PERFECT 타격', great: 'GREAT 타격', good: 'GOOD 타격', weak: '빗맞은 타격', miss: '헛스윙' };
const EVT = [['fire', '폭죽 상자', 'gold'], ['seal', '물개', 'good'], ['tramp', '트램펄린', 'good'], ['balloon', '풍선', 'good'], ['birds', '철새 떼', 'good'], ['snowman', '눈사람', 'bad'], ['rock', '바위', 'bad']];

export function createUI() {
  const el = {
    hud: $('hud'), dist: $('dist'), best: $('best'), energy: $('energy'), wind: $('wind'), hint: $('hint'), pop: $('pop'),
    title: $('title'), result: $('result'), tBest: $('t-best'), mute: $('mute'), startBtn: $('startBtn'), againBtn: $('againBtn'),
  };
  let hintKey = '';

  const ui = {
    el,
    refreshBest(best) { el.best.textContent = fmt(best); el.tBest.textContent = best > 0 ? fmt(best) + ' m' : '—'; },

    energy(n, visible) {
      el.energy.querySelectorAll('i').forEach((e, i) => e.classList.toggle('on', i < n));
      el.energy.classList.toggle('empty', n <= 0);
      if (visible !== undefined) el.energy.hidden = !visible;
    },

    wind(w) {
      const pct = Math.round(Math.abs(w) * 100);
      el.wind.className = 'chip wind ' + (w >= 0.005 ? 'tail' : w <= -0.005 ? 'head' : 'calm');
      el.wind.textContent = w >= 0.005 ? `순풍 → +${pct}%` : w <= -0.005 ? `← 맞바람 −${pct}%` : '바람 없음';
    },

    pop(txt, color, sub) {
      el.pop.innerHTML = '';
      el.pop.append(document.createTextNode(txt));
      if (sub) { const s = document.createElement('small'); s.textContent = sub; el.pop.append(s); }
      el.pop.style.color = color || 'var(--gold)';
      el.pop.classList.remove('show'); void el.pop.offsetWidth; el.pop.classList.add('show');
    },

    hint(key) {
      if (key === hintKey) return; hintKey = key;
      el.hint.innerHTML = HINTS[key] || ''; el.hint.hidden = !HINTS[key];
    },

    dist(d) { el.dist.textContent = fmt(d); },

    /** 새 판 시작: 오버레이 닫고 HUD 표시 */
    startRun(wind) {
      el.result.hidden = true; el.title.hidden = true; el.hud.hidden = false;
      hintKey = '';
      ui.wind(wind);
    },

    showResult(run, store) {
      $('r-dist').textContent = fmt(run.dist);
      const j = run.judge || 'miss';
      const jEl = $('r-judge'); jEl.textContent = JUDGE_TXT[j]; jEl.className = 'judge ' + (j === 'perfect' ? 'perfect' : j === 'great' ? 'great' : j === 'miss' ? 'miss' : '');
      $('r-new').hidden = !run.isNew;
      $('r-ang').textContent = run.hit ? Math.round(run.angle) + '°' : '—';
      $('r-spd').textContent = run.hit ? Math.round(run.speed) + ' m/s' : '—';
      $('r-hgt').textContent = run.hit ? Math.round(run.maxH) + ' m' : '—';
      $('r-best').textContent = fmt(store.best) + ' m';
      const ev = $('r-events'); ev.innerHTML = '';
      const tag = (cls, text) => { const s = document.createElement('span'); s.className = 'evt ' + cls; s.textContent = text; ev.append(s); };
      let any = false;
      EVT.forEach(([k, name, kind]) => { const n = run.events[k]; if (!n) return; any = true; tag(kind, `${name} ×${n}`); });
      if (run.kind === 'crevasse') { any = true; tag('bad', '크레바스에 빠짐'); }
      if (run.maxCombo >= 2) tag('gold', `최대 COMBO ×${run.maxCombo}`);
      if (!any) tag('none', run.hit ? '이벤트 없이 실력만으로!' : '다음엔 고리를 노려 보세요');
      const pct = Math.round(Math.abs(run.wind) * 100);
      $('r-wind').textContent = run.wind > 0.004 ? `순풍 +${pct}%` : run.wind < -0.004 ? `맞바람 −${pct}%` : '바람 없음';
      const list = $('r-list'); list.innerHTML = '';
      store.recent.forEach((r, i) => {
        const li = document.createElement('li'); if (i === 0) li.className = 'me';
        const a = document.createElement('span'); a.textContent = `${i === 0 ? '방금' : i + 1 + '번째 전'} · ${JUDGE_TXT[r.j] || ''}${r.c ? ' · 크레바스' : ''}`;
        const b = document.createElement('span'); b.className = 'd'; b.textContent = fmt(r.d) + ' m';
        li.append(a, b); list.appendChild(li);
      });
      el.result.hidden = false; el.hud.hidden = true; el.hint.hidden = true;
      setTimeout(() => { try { el.againBtn.focus({ preventScroll: true }); } catch (e) { /* 무시 */ } }, 50);
    },
  };
  return ui;
}
