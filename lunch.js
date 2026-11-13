/* 점심 뽑기 — 후보 1~4개 → 돌림판 또는 랜덤 뽑기. 결과는 DB에 남고 다른 멤버 화면에서도 같은 애니메이션으로 재생 */
window.Hub.boot(function () {
  'use strict';
  const H = window.Hub, { $, esc, icon, team, lunch, TEAM } = H;
  H.renderShell('lunch');
  document.querySelectorAll('[data-ic]').forEach(el => { el.outerHTML = icon(el.dataset.ic, 18); });

  const MAX = 4, DRAFT = 'interns-lunch-draft';
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const COLORS = ['#01539f', '#2f6f8f', '#4a5a9a', '#2a7a6e'];
  let busy = false, rot = 0;
  let seen = new Set(lunch.all().map(l => l.id));

  /* ---------- 후보 입력 ---------- */
  const saved = (H.store.get(DRAFT, null) || {});
  $('#cands').innerHTML = [...Array(MAX)].map((_, i) => `
    <label class="cand"><span class="cand__n" style="background:${COLORS[i]}">${i + 1}</span>
      <input type="text" maxlength="20" placeholder="${i === 0 ? '예: 김치찌개' : '후보 ' + (i + 1)}" aria-label="후보 ${i + 1}" data-i="${i}" value="${esc((saved.c || [])[i] || '')}">
      <button type="button" class="icon-btn icon-btn--sm cand__x" data-x="${i}" aria-label="후보 ${i + 1} 지우기">${icon('close', 14)}</button></label>`).join('');
  if (saved.mode === 'draw') document.querySelector('input[name=mode][value=draw]').checked = true;
  $('#ideas').innerHTML = (TEAM.lunchIdeas || []).map(x => `<button type="button" class="idea" data-idea="${esc(x)}">${esc(x)}</button>`).join('');

  const inputs = () => [...document.querySelectorAll('#cands input')];
  const mode = () => document.querySelector('input[name=mode]:checked').value;
  function candidates() {
    const out = [];
    inputs().forEach(i => { const v = i.value.trim().replace(/\s+/g, ' '); if (v && !out.includes(v)) out.push(v); });
    return out;
  }
  function saveDraft() { H.store.set(DRAFT, { c: inputs().map(i => i.value), mode: mode() }); }
  function syncUi() {
    const c = candidates();
    $('#goBtn').innerHTML = mode() === 'wheel' ? `${icon('wheel', 18)}돌림판 돌리기` : `${icon('dice', 18)}랜덤 뽑기`;
    $('#goBtn').disabled = busy;
    document.querySelectorAll('.idea').forEach(b => b.classList.toggle('is-in', c.includes(b.dataset.idea)));
    if (!busy) drawStage(c, null);
    saveDraft();
  }
  $('#cands').addEventListener('input', () => { $('#candErr').textContent = ''; syncUi(); });
  $('#cands').addEventListener('click', (e) => { const x = e.target.closest('[data-x]'); if (!x || busy) return; inputs()[x.dataset.x].value = ''; syncUi(); inputs()[x.dataset.x].focus(); });
  $('#ideas').addEventListener('click', (e) => {
    const b = e.target.closest('[data-idea]'); if (!b || busy) return;
    const v = b.dataset.idea, ins = inputs();
    const has = ins.find(i => i.value.trim() === v);
    if (has) { has.value = ''; syncUi(); return; }      // 다시 누르면 빼기
    const empty = ins.find(i => !i.value.trim());
    if (!empty) { H.toast('후보는 4개까지 넣을 수 있어요'); return; }
    empty.value = v; syncUi();
  });
  document.querySelectorAll('input[name=mode]').forEach(r => r.addEventListener('change', syncUi));
  $('#clearBtn').onclick = () => { if (busy) return; inputs().forEach(i => { i.value = ''; }); $('#result').innerHTML = ''; syncUi(); inputs()[0].focus(); };

  /* ---------- 무대: 돌림판 / 카드 ---------- */
  const pt = (r, deg) => { const a = deg * Math.PI / 180; return [(r * Math.sin(a)).toFixed(2), (-r * Math.cos(a)).toFixed(2)]; };
  function wheelSvg(c) {
    const n = Math.max(c.length, 1), seg = 360 / n, R = 92;
    const slices = (c.length ? c : ['?']).map((name, i) => {
      const a0 = i * seg, a1 = (i + 1) * seg, mid = a0 + seg / 2;
      const [x0, y0] = pt(R, a0), [x1, y1] = pt(R, a1);
      const path = n === 1 ? `<circle r="${R}" fill="${c.length ? COLORS[0] : 'var(--surface-2)'}"/>` : `<path d="M0 0 L${x0} ${y0} A${R} ${R} 0 0 1 ${x1} ${y1} Z" fill="${COLORS[i % 4]}"/>`;
      const label = name.length > 7 ? name.slice(0, 6) + '…' : name;
      const fs = n === 1 ? 20 : label.length > 5 ? 11 : 13;
      const [tx, ty] = n === 1 ? [0, -38] : pt(54, mid);
      const r = n === 1 ? 0 : mid;   // 바늘(위)에 멈췄을 때 당첨 글자가 똑바로 보이게
      return `${path}<text x="${tx}" y="${ty}" transform="rotate(${r} ${tx} ${ty})" class="wheel__txt" font-size="${fs}" ${c.length ? '' : 'fill="var(--faint)"'}>${esc(label)}</text>`;
    }).join('');
    return `<div class="wheel"><svg viewBox="-100 -100 200 200" role="img" aria-label="돌림판: ${esc(c.join(', ') || '후보 없음')}">
      <g class="wheel__rot" id="wheelRot" style="transform: rotate(${rot}deg)">${slices}${n > 1 ? (c.map((_, i) => { const [x, y] = pt(R, i * seg); return `<line x1="0" y1="0" x2="${x}" y2="${y}" class="wheel__line"/>`; }).join('')) : ''}</g>
      <circle r="${R}" class="wheel__rim"/><circle r="13" class="wheel__hub"/>
    </svg><span class="wheel__pin" aria-hidden="true"></span></div>`;
  }
  function cardsHtml(c) {
    const list = c.length ? c : ['후보를 넣어 주세요'];
    return `<div class="draw draw--${list.length}">${list.map((name, i) => `<div class="dcard" data-k="${i}" style="--c:${c.length ? COLORS[i % 4] : 'var(--surface-2)'}"><span class="dcard__n">${c.length ? i + 1 : '?'}</span><b>${esc(name)}</b></div>`).join('')}</div>`;
  }
  function drawStage(c, m) { $('#stage').innerHTML = (m || mode()) === 'wheel' ? wheelSvg(c) : cardsHtml(c); }

  // 애니메이션: 결과 index에 정확히 멈춤
  function spinTo(c, result) {
    return new Promise(res => {
      drawStage(c, 'wheel');
      const g = $('#wheelRot'), seg = 360 / c.length;
      const center = (result + 0.5) * seg, jitter = (Math.random() - 0.5) * seg * 0.6;
      const base = ((-(center + jitter) - rot) % 360 + 360) % 360;
      rot = rot + (reduce ? 0 : 360 * 5) + base;
      if (reduce) { g.style.transform = `rotate(${rot}deg)`; return res(); }
      void g.getBoundingClientRect();
      g.style.transition = 'transform 4.2s cubic-bezier(.12,.72,.09,1)';
      g.style.transform = `rotate(${rot}deg)`;
      setTimeout(res, 4300);
    });
  }
  function shuffleTo(c, result) {
    return new Promise(res => {
      drawStage(c, 'draw');
      const cards = [...document.querySelectorAll('.dcard')];
      if (reduce || c.length === 1) { cards[result].classList.add('is-win'); cards.forEach((el, i) => i !== result && el.classList.add('is-lose')); return res(); }
      const steps = 14 + c.length * 2 + ((result - (14 + c.length * 2)) % c.length + c.length) % c.length;   // 마지막 칸 = result
      let i = 0;
      const tick = () => {
        cards.forEach(el => el.classList.remove('is-hot'));
        cards[i % c.length].classList.add('is-hot');
        if (i >= steps) { cards.forEach(el => el.classList.remove('is-hot')); cards[result].classList.add('is-win'); cards.forEach((el, k) => k !== result && el.classList.add('is-lose')); return res(); }
        i++;
        setTimeout(tick, 55 + Math.pow(i / steps, 3) * 380);
      };
      tick();
    });
  }
  function showResult(pick, mineNow) {
    const name = pick.candidates[pick.result];
    const who = pick.by === team.meId() ? '내가' : `${H.member(pick.by).name} 님이`;
    $('#result').innerHTML = `<p class="result__eyebrow">${esc(who)} ${pick.mode === 'wheel' ? '돌림판으로' : '랜덤으로'} 뽑았어요</p>
      <p class="result__name">🍚 <b>${esc(name)}</b></p>
      <div class="result__acts">
        <button class="btn btn--ghost btn--sm" type="button" id="againBtn">${icon('reset', 16)}다시 뽑기</button>
        <button class="btn btn--accent btn--sm" type="button" id="shareBtn">${icon('group', 16)}단체방에 알리기</button>
      </div>`;
    $('#againBtn').onclick = () => go();
    $('#shareBtn').onclick = async (e) => {
      e.currentTarget.disabled = true;
      try { await H.messages.send('group', `🍚 오늘 점심은 ${name}! (${pick.mode === 'wheel' ? '돌림판' : '랜덤 뽑기'} · 후보 ${pick.candidates.join(', ')})`); H.toast('단체방에 보냈어요'); }
      catch (er) { console.warn(er); H.toast('보내지 못했어요'); e.currentTarget.disabled = false; }
    };
    if (mineNow) $('#result').querySelector('.result__name').classList.add('is-pop');
  }
  async function play(pick, mineNow) {
    busy = true; syncUi(); $('#result').innerHTML = `<p class="result__eyebrow">${pick.by === team.meId() ? '두근두근…' : `${esc(H.member(pick.by).name)} 님이 뽑는 중…`}</p>`;
    if (pick.mode === 'wheel') await spinTo(pick.candidates, pick.result); else await shuffleTo(pick.candidates, pick.result);
    busy = false; $('#goBtn').disabled = false;
    showResult(pick, mineNow);
    renderHist();
  }

  async function go() {
    if (busy) return;
    const c = candidates();
    if (!c.length) { $('#candErr').textContent = '후보를 하나 이상 넣어 주세요'; inputs()[0].focus(); return; }
    $('#candErr').textContent = '';
    const m = mode(), result = lunch.pickIndex(c.length);
    busy = true; $('#goBtn').disabled = true;
    let pick;
    try { pick = await lunch.add({ mode: m, candidates: c, result }); seen.add(pick.id); }
    catch (er) { console.warn(er); busy = false; $('#goBtn').disabled = false; H.toast('뽑기 결과를 저장하지 못했어요 · 연결을 확인해 주세요'); return; }
    await play(pick, true);
  }
  $('#goBtn').onclick = go;

  /* ---------- 최근 기록 ---------- */
  function renderHist() {
    const list = lunch.all().slice(0, 10);
    $('#hist').innerHTML = list.length ? list.map(l => `<li class="act">${H.avatar(l.by)}<span class="grow"><b>${esc(l.candidates[l.result])}</b><small>${esc(H.member(l.by).name)} · ${l.mode === 'wheel' ? '돌림판' : '랜덤'} · ${l.candidates.map(esc).join(', ')}</small></span><span class="when">${esc(H.ago(l.at))}</span>
      <button type="button" class="icon-btn icon-btn--sm" data-reuse="${esc(l.id)}" aria-label="이 후보로 다시" title="이 후보로 다시">${icon('reset', 15)}</button></li>`).join('')
      : `<li class="empty empty--box">${icon('bowl', 22)}<b>아직 뽑은 기록이 없어요</b><span>첫 점심을 뽑아 보세요</span></li>`;
  }
  $('#hist').addEventListener('click', (e) => {
    const b = e.target.closest('[data-reuse]'); if (!b || busy) return;
    const l = lunch.all().find(x => x.id === b.dataset.reuse); if (!l) return;
    inputs().forEach((i, k) => { i.value = l.candidates[k] || ''; });
    document.querySelector(`input[name=mode][value=${l.mode}]`).checked = true;
    syncUi(); window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  });

  // 다른 멤버가 뽑으면 내 화면에서도 같은 결과로 재생
  const queue = [];
  document.addEventListener('hub:lunch', async () => {
    const fresh = lunch.all().filter(l => !seen.has(l.id)).reverse();
    fresh.forEach(l => seen.add(l.id));
    renderHist();
    fresh.filter(l => l.by !== team.meId() && Date.now() - l.at < 120000).forEach(l => queue.push(l));
    while (queue.length && !busy) await play(queue.shift(), false);
  });

  syncUi();
  renderHist();
  const today = lunch.today()[0];
  if (today) { drawStage(today.candidates, today.mode); if (today.mode === 'wheel') { const seg = 360 / today.candidates.length; rot = -((today.result + 0.5) * seg); $('#wheelRot').style.transform = `rotate(${rot}deg)`; } else { const cs = document.querySelectorAll('.dcard'); cs.forEach((el, k) => el.classList.add(k === today.result ? 'is-win' : 'is-lose')); } showResult(today, false); }
  H.notifs.markSeen('lunch');
  document.dispatchEvent(new CustomEvent('hub:notices'));   // 종 배지 갱신
});
