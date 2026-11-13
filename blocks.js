/* 블록 퍼즐 — 10×10 판에 블록 3개씩 놓고 가로·세로 줄을 채우면 지움.
   혼자(최고 점수) / 대결(2~4명, 같은 seed → 같은 블록 순서, 목표 점수 먼저 도착하면 승) */
window.Hub.boot(function () {
  'use strict';
  const H = window.Hub, { $, esc, icon, team, bp } = H;
  H.renderShell('blocks');
  document.querySelectorAll('[data-ic]').forEach(el => { el.outerHTML = icon(el.dataset.ic, 18); });

  const me = team.meId();
  const params = new URLSearchParams(location.search);
  const N = 10;
  const SOLO_KEY = 'interns-bp-solo:' + me, ROOM_KEY = (id) => `interns-bp-room:${id}:${me}`, MODE_KEY = 'interns-bp-mode';
  const nm = (id) => H.member(id).name;
  const live = (t) => { $('#bplive').textContent = t; };

  /* ---------- 블록 모양 (색 번호 1~7) · 작은 블록이 더 자주 ---------- */
  const P = (cells, c, w) => ({ cells, c, w, wd: Math.max(...cells.map(p => p[0])) + 1, ht: Math.max(...cells.map(p => p[1])) + 1 });
  const line = (n, v) => [...Array(n)].map((_, i) => v ? [0, i] : [i, 0]);
  const SHAPES = [
    P([[0, 0]], 1, 3),
    P(line(2), 2, 3), P(line(2, 1), 2, 3), P(line(3), 3, 3), P(line(3, 1), 3, 3),
    P(line(4), 4, 2), P(line(4, 1), 4, 2), P(line(5), 5, 2), P(line(5, 1), 5, 2),
    P([[0, 0], [1, 0], [0, 1], [1, 1]], 6, 3), P([...Array(9)].map((_, i) => [i % 3, (i / 3) | 0]), 7, 2),
    P([[0, 0], [0, 1], [1, 1]], 3, 2), P([[0, 0], [1, 0], [0, 1]], 3, 2), P([[0, 0], [1, 0], [1, 1]], 3, 2), P([[1, 0], [0, 1], [1, 1]], 3, 2),
    P([[0, 0], [0, 1], [0, 2], [1, 2], [2, 2]], 1, 1), P([[0, 0], [1, 0], [2, 0], [0, 1], [0, 2]], 1, 1), P([[0, 0], [1, 0], [2, 0], [2, 1], [2, 2]], 1, 1), P([[2, 0], [2, 1], [0, 2], [1, 2], [2, 2]], 1, 1),
  ];
  const WSUM = SHAPES.reduce((a, s) => a + s.w, 0);
  // 같은 seed면 누구든 같은 순서 (mulberry32)
  const rand = (st) => { st.s = (st.s + 0x6D2B79F5) | 0; let t = st.s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const pick = (st) => { let r = rand(st) * WSUM; for (let i = 0; i < SHAPES.length; i++) { r -= SHAPES[i].w; if (r < 0) return i; } return 0; };
  const lineBonus = (n) => 10 * n * (n + 1) / 2;   // 1줄 10, 2줄 30, 3줄 60, 4줄 100…

  /* ---------- 게임 상태 ---------- */
  const fresh = (seed) => { const g = { seed, rng: { s: seed | 0 }, board: Array(N * N).fill(0), hand: [], score: 0, lines: 0, over: false, placed: 0 }; deal(g); return g; };
  function deal(g) { g.hand = [pick(g.rng), pick(g.rng), pick(g.rng)]; }
  const fits = (b, sh, x, y) => sh.cells.every(([dx, dy]) => { const cx = x + dx, cy = y + dy; return cx >= 0 && cy >= 0 && cx < N && cy < N && !b[cy * N + cx]; });
  const anyFit = (b, sh) => { for (let y = 0; y <= N - sh.ht; y++) for (let x = 0; x <= N - sh.wd; x++) if (fits(b, sh, x, y)) return true; return false; };
  function clearsFor(b, sh, x, y) {
    const t = b.slice(); sh.cells.forEach(([dx, dy]) => { t[(y + dy) * N + x + dx] = sh.c; });
    const rows = [], cols = [];
    for (let i = 0; i < N; i++) { let r = true, c = true; for (let k = 0; k < N; k++) { if (!t[i * N + k]) r = false; if (!t[k * N + i]) c = false; } if (r) rows.push(i); if (c) cols.push(i); }
    return { rows, cols, t };
  }
  // 놓기 → { gained, cleared: [칸 번호], n: 지운 줄 수 }
  function place(g, slot, x, y) {
    const sh = SHAPES[g.hand[slot]];
    if (g.over || g.hand[slot] == null || !fits(g.board, sh, x, y)) return null;
    const { rows, cols, t } = clearsFor(g.board, sh, x, y);
    const cleared = new Set();
    rows.forEach(r => { for (let k = 0; k < N; k++) cleared.add(r * N + k); });
    cols.forEach(c => { for (let k = 0; k < N; k++) cleared.add(k * N + c); });
    const colors = {}; cleared.forEach(i => { colors[i] = t[i]; t[i] = 0; });
    const n = rows.length + cols.length, gained = sh.cells.length + lineBonus(n);
    g.board = t; g.score += gained; g.lines += n; g.placed++;
    g.hand[slot] = null;
    if (g.hand.every(h => h == null)) deal(g);
    g.over = !g.hand.some(h => h != null && anyFit(g.board, SHAPES[h]));
    return { gained, cleared: [...cleared], colors, n };
  }

  window.__blocks = { SHAPES, fresh, place, fits, anyFit };   // 테스트·디버그용

  /* ---------- 모드 · 저장 ---------- */
  let mode = params.get('r') ? 'pvp' : (H.sess.get(MODE_KEY, null) || 'solo');
  let cur = params.get('r') || null;
  let solo = H.store.get(SOLO_KEY, null);
  if (!solo || !solo.board) solo = null;
  let best = (H.store.get(SOLO_KEY + ':best', 0) | 0);
  let roomGame = null, roomGameId = null;
  let sel = null, cursor = 44, pop = null, countdownUntil = 0, countTimer = null;
  const seenStart = {};   // 이 화면에서 대결 시작을 처음 본 시각 (3초 카운트다운)

  function game() { return mode === 'solo' ? solo : roomGame; }
  function saveGame() {
    if (mode === 'solo' && solo) H.store.set(SOLO_KEY, solo);
    else if (roomGame && roomGameId) H.store.set(ROOM_KEY(roomGameId), roomGame);
  }
  function loadRoomGame(r) {
    if (roomGameId === r.id && roomGame) return;
    roomGameId = r.id;
    const saved = H.store.get(ROOM_KEY(r.id), null);
    roomGame = saved && saved.seed === r.seed && saved.board ? saved : fresh(r.seed);
  }

  /* ---------- 판 만들기 ---------- */
  const boardEl = $('#bpboard');
  boardEl.innerHTML = [...Array(N * N)].map((_, i) => `<div class="bc" role="gridcell" data-i="${i}" tabindex="${i === cursor ? 0 : -1}"></div>`).join('');
  const cells = [...boardEl.children];
  // 칸 간격(pitch)과 첫 칸 위치 — 끌어다 놓기 좌표 계산용
  const geo = () => { const a = cells[0].getBoundingClientRect(), b = cells[1].getBoundingClientRect(); return { pitch: b.left - a.left, size: a.width, x: a.left, y: a.top }; };
  const cellSize = () => geo().pitch;

  function paintBoard(prev) {
    const g = game(), b = g ? g.board : Array(N * N).fill(0);
    const pv = prev || null;
    cells.forEach((c, i) => {
      const v = b[i], pc = pv && pv.cells.has(i), cl = pv && pv.clear.has(i), popC = pop && pop.colors[i];
      c.className = 'bc' + (v ? ' c' + v : '') + (pc ? ` is-ghost c${pv.c}${pv.ok ? '' : ' is-bad'}` : '') + (cl ? ' is-clear' : '') + (popC ? ` is-pop c${popC}` : '') + (i === cursor && sel != null ? ' is-cur' : '');
      c.setAttribute('aria-label', `${(i / N | 0) + 1}행 ${i % N + 1}열, ${v ? '채워짐' : '빈 칸'}`);
    });
  }
  function previewAt(x, y) {
    const g = game(); if (!g || sel == null || g.hand[sel] == null) return null;
    const sh = SHAPES[g.hand[sel]], ok = fits(g.board, sh, x, y), set = new Set(), clear = new Set();
    sh.cells.forEach(([dx, dy]) => { const cx = x + dx, cy = y + dy; if (cx >= 0 && cy >= 0 && cx < N && cy < N) set.add(cy * N + cx); });
    if (ok) { const { rows, cols } = clearsFor(g.board, sh, x, y); rows.forEach(r => { for (let k = 0; k < N; k++) clear.add(r * N + k); }); cols.forEach(cc => { for (let k = 0; k < N; k++) clear.add(k * N + cc); }); }
    return { cells: set, clear, ok, c: sh.c };
  }
  const miniHtml = (idx, cls) => {
    const sh = SHAPES[idx];
    return `<span class="bpmini ${cls || ''}" style="--w:${sh.wd};--h:${sh.ht}">${[...Array(sh.wd * sh.ht)].map((_, k) => { const x = k % sh.wd, y = (k / sh.wd) | 0; return `<i class="${sh.cells.some(p => p[0] === x && p[1] === y) ? 'c' + sh.c : 'e'}"></i>`; }).join('')}</span>`;
  };
  function paintTray() {
    const g = game(), t = $('#bptray');
    const active = g && !g.over && canPlay();
    t.innerHTML = [0, 1, 2].map(k => {
      const idx = g ? g.hand[k] : null;
      if (idx == null) return `<div class="bpslot is-empty"></div>`;
      const sh = SHAPES[idx], ok = anyFit(g.board, sh);
      return `<button type="button" class="bpslot${sel === k ? ' is-sel' : ''}${ok ? '' : ' is-stuck'}" data-slot="${k}" aria-pressed="${sel === k}" aria-label="${k + 1}번 블록 · ${sh.cells.length}칸${ok ? '' : ' · 놓을 곳 없음'}"${active ? '' : ' disabled'}>${miniHtml(idx)}</button>`;
    }).join('');
  }
  function canPlay() {
    if (mode === 'solo') return !!solo && !solo.over;
    const r = cur && bp.get(cur);
    return !!(r && r.status === 'playing' && bp.isPlayer(r) && roomGame && !roomGame.over && Date.now() >= countdownUntil);
  }

  /* ---------- 놓기 ---------- */
  let reportTimer = null;
  function doPlace(slot, x, y) {
    const g = game(); if (!g || !canPlay()) return false;
    const res = place(g, slot, x, y);
    if (!res) return false;
    sel = null; pop = res.cleared.length ? { colors: res.colors } : null;
    saveGame();
    if (mode === 'solo' && g.score > best) { best = g.score; H.store.set(SOLO_KEY + ':best', best); }
    floatScore(res.gained, res.n, x, y);
    live(`${res.gained}점${res.n ? ` · ${res.n}줄 지움` : ''} · 합계 ${g.score}점${g.over ? ' · 더 놓을 곳이 없어요' : ''}`);
    render();
    if (pop) setTimeout(() => { pop = null; paintBoard(); }, 380);
    if (mode === 'pvp' && roomGameId) {
      const r = bp.get(roomGameId), urgent = g.over || (r && g.score >= r.target);
      clearTimeout(reportTimer);
      const send = () => bp.report(roomGameId, g.score, g.lines, g.over).then(() => { if (!drag) render(); }).catch(e => console.warn('[blocks] 점수 보내기 실패', e));   // 내가 끝내거나 목표에 닿으면 결과가 바로 보이게
      if (urgent) send(); else reportTimer = setTimeout(send, 450);
    }
    if (g.over && mode === 'solo') H.toast(`끝! ${g.score}점${g.score >= best && g.score > 0 ? ' · 최고 기록' : ''}`);
    return true;
  }
  function floatScore(gained, n, x, y) {
    const wrap = $('.bpwrap'), cs = cellSize(), el = document.createElement('span');
    el.className = 'bpfloat' + (n ? ' is-big' : ''); el.textContent = `+${gained}${n > 1 ? ` · ${n}줄!` : ''}`;
    el.style.left = `${(x + 1) * cs}px`; el.style.top = `${y * cs}px`;
    wrap.appendChild(el); setTimeout(() => el.remove(), 900);
  }

  /* ---------- 끌어다 놓기 (마우스·터치) + 눌러서 고르고 판 누르기 ---------- */
  let drag = null;
  $('#bptray').addEventListener('pointerdown', (e) => {
    const b = e.target.closest('.bpslot[data-slot]'); if (!b || b.disabled) return;
    const slot = +b.dataset.slot, g = game(); if (!g || g.hand[slot] == null) return;
    e.preventDefault();
    const sh = SHAPES[g.hand[slot]], cs = cellSize();
    const ghost = document.createElement('div');
    ghost.className = 'bpdrag'; ghost.innerHTML = miniHtml(g.hand[slot], 'bpmini--big'); ghost.style.setProperty('--cs-outer', geo().size + 'px');
    document.body.appendChild(ghost);
    // 손가락이면 블록이 손가락 위로 보이게 띄움
    const lift = e.pointerType === 'touch' ? cs * 2.2 : 0;
    drag = { slot, sh, ghost, lift, x0: e.clientX, y0: e.clientY, moved: false, pos: null, id: e.pointerId, wasSel: sel === slot };
    sel = slot; paintTray(); moveDrag(e);
  });
  function moveDrag(e) {
    if (!drag) return;
    const G = geo(), cs = G.pitch, w = drag.sh.wd * cs, h = drag.sh.ht * cs;
    const left = e.clientX - w / 2, top = e.clientY - h / 2 - drag.lift;
    drag.ghost.style.transform = `translate(${left}px, ${top}px)`;
    if (Math.abs(e.clientX - drag.x0) + Math.abs(e.clientY - drag.y0) > 6) drag.moved = true;
    const br = boardEl.getBoundingClientRect();
    const x = Math.round((left - G.x) / cs), y = Math.round((top - G.y) / cs);
    const inside = left + w > br.left - cs && left < br.right + cs && top + h > br.top - cs && top < br.bottom + cs;
    drag.pos = inside ? [x, y] : null;
    paintBoard(drag.pos ? previewAt(x, y) : null);
  }
  window.addEventListener('pointermove', (e) => { if (drag && e.pointerId === drag.id) moveDrag(e); });
  function endDrag(e, cancel) {
    if (!drag || (e && e.pointerId !== drag.id)) return;
    const d = drag; drag = null; d.ghost.remove();
    if (!cancel && d.moved && d.pos) { if (!doPlace(d.slot, d.pos[0], d.pos[1])) { H.toast('거기엔 놓을 수 없어요'); paintBoard(); } }
    else if (!d.moved) { sel = d.wasSel ? null : d.slot; paintTray(); paintBoard(); }   // 그냥 누르면 고르기
    else paintBoard();
  }
  window.addEventListener('pointerup', (e) => endDrag(e, false));
  window.addEventListener('pointercancel', (e) => endDrag(e, true));

  // 고른 블록이 있을 때 판 위 마우스 → 미리보기, 누르면 놓기(왼쪽 위 칸 기준)
  const cellAt = (e) => { const c = e.target.closest('.bc'); return c ? +c.dataset.i : null; };
  boardEl.addEventListener('pointermove', (e) => {
    if (drag || sel == null || e.pointerType === 'touch') return;
    const i = cellAt(e); if (i == null) return;
    paintBoard(previewAt(i % N, (i / N) | 0));
  });
  boardEl.addEventListener('pointerleave', () => { if (!drag) paintBoard(); });
  boardEl.addEventListener('click', (e) => {
    if (sel == null) return;
    const i = cellAt(e); if (i == null) return;
    setCursor(i);
    if (!doPlace(sel, i % N, (i / N) | 0)) { H.toast('거기엔 놓을 수 없어요'); paintBoard(previewAt(i % N, (i / N) | 0)); }
  });

  /* ---------- 키보드: 1·2·3 고르기, 방향키, Enter 놓기, Esc 취소 ---------- */
  function setCursor(i, focus) { cells[cursor].tabIndex = -1; cursor = i; cells[i].tabIndex = 0; if (focus) cells[i].focus(); }
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey || document.querySelector('dialog[open]')) return;
    const t = e.target; if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
    const g = game(); if (!g || !canPlay()) return;
    if (['1', '2', '3'].includes(e.key)) { const k = +e.key - 1; if (g.hand[k] != null) { e.preventDefault(); sel = k; paintTray(); setCursor(cursor, true); paintBoard(previewAt(cursor % N, (cursor / N) | 0)); live(`${k + 1}번 블록을 골랐어요 · 방향키로 옮기고 Enter`); } return; }
    if (!boardEl.contains(t)) return;
    const mv = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
    if (mv) { e.preventDefault(); const x = Math.max(0, Math.min(N - 1, cursor % N + mv[0])), y = Math.max(0, Math.min(N - 1, ((cursor / N) | 0) + mv[1])); setCursor(y * N + x, true); paintBoard(previewAt(x, y)); return; }
    if ((e.key === 'Enter' || e.key === ' ') && sel != null) { e.preventDefault(); if (!doPlace(sel, cursor % N, (cursor / N) | 0)) H.toast('거기엔 놓을 수 없어요'); else setCursor(cursor, true); return; }
    if (e.key === 'Escape') { sel = null; paintTray(); paintBoard(); }
  });
  $('#bptray').addEventListener('keydown', (e) => {   // 블록 버튼에서 Enter/Space = 고르고 판으로
    const b = e.target.closest('.bpslot[data-slot]'); if (!b || (e.key !== 'Enter' && e.key !== ' ')) return;
    e.preventDefault(); sel = +b.dataset.slot; paintTray(); setCursor(cursor, true); paintBoard(previewAt(cursor % N, (cursor / N) | 0));
  });

  /* =========================================================
     패널
     ========================================================= */
  function paintSolo() {
    const p = $('#bpSolo'), g = solo;
    p.innerHTML = `
      <div class="card__head"><h2 class="card__title">${icon('blocks', 18)}혼자 하기</h2><span class="orec">최고 ${best}점</span></div>
      <ul class="bprules"><li>블록을 판으로 <b>끌어다 놓거나</b>, 눌러 고른 뒤 판을 눌러요</li><li>한 칸에 1점 · 한 번에 지운 줄 1·2·3·4줄 = 10·30·60·100점</li><li>키보드: <kbd>1</kbd><kbd>2</kbd><kbd>3</kbd> 고르기 · 방향키 · <kbd>Enter</kbd></li></ul>
      <button class="btn btn--accent" type="button" id="bpNew">${icon('blocks', 18)}${g && !g.over && g.placed ? '새로 시작' : '시작하기'}</button>
      ${g && !g.over && g.placed ? '<p class="ohint">하던 판은 새로 시작하면 사라져요</p>' : ''}`;
    $('#bpNew').onclick = () => { solo = fresh(1 + Math.floor(Math.random() * 2147483646)); sel = null; saveGame(); render(); };
  }
  let pickSet = null, target = 1000;
  function paintPvp() {
    const p = $('#bpPvp'), others = team.list().filter(m => m.id !== me);
    if (!pickSet) pickSet = new Set(others.map(m => m.id).slice(0, 3));
    [...pickSet].forEach(id => { if (!others.some(m => m.id === id)) pickSet.delete(id); });
    const rooms = bp.rooms(), invites = bp.invitesForMe();
    const mine = rooms.filter(r => bp.isPlayer(r) && ['lobby', 'playing'].includes(r.status));
    const watch = rooms.filter(r => !bp.isPlayer(r) && r.status === 'playing');
    const past = rooms.filter(r => r.status === 'done').slice(0, 5);
    const done = rooms.filter(r => r.status === 'done' && bp.isPlayer(r)), w = done.filter(r => r.winner === me).length;
    const row = (r, extra) => {
      const ps = bp.players(r.id), lead = ps[0];
      const st = r.status === 'lobby' ? `대기실 · ${ps.length}명 들어옴` : r.status === 'playing' ? `진행 중 · 1등 ${lead ? esc(nm(lead.member)) + ' ' + lead.score + '점' : ''}` : r.status === 'done' ? (!r.winner ? '무승부' : r.winner === me ? '<b class="o-turn">우승</b>' : `${esc(nm(r.winner))} 님 우승`) : '';
      return `<li class="ogame${r.id === cur ? ' is-cur' : ''}"><button type="button" class="ogame__btn" data-open="${r.id}">${H.avatar(r.host)}<span class="ogame__txt"><b>${esc(nm(r.host))} 님의 방 · ${r.target}점</b><small>${st}</small></span></button>${extra || ''}</li>`;
    };
    p.innerHTML = `
      ${invites.length ? `<section class="card ocard ocard--hot" aria-labelledby="pgT"><h2 class="card__title" id="pgT">${icon('bell', 18)}대결 초대</h2>
        <ul class="ogames">${invites.map(r => row(r, `<span class="ogame__act"><button class="btn btn--accent btn--sm" type="button" data-join="${r.id}">참가</button><button class="btn btn--ghost btn--sm" type="button" data-leave="${r.id}">거절</button></span>`)).join('')}</ul></section>` : ''}
      <section class="card ocard" aria-labelledby="pnT">
        <div class="card__head"><h2 class="card__title" id="pnT">${icon('userPlus', 18)}대결 방 만들기</h2>${done.length ? `<span class="orec">${w}번 우승</span>` : ''}</div>
        ${others.length ? `<div class="fld"><span class="olabel">같이 할 사람 (1~3명)</span><div class="opp" role="group" aria-label="같이 할 사람">
            ${others.map(m => `<label class="opp__m"><input type="checkbox" name="pinv" value="${m.id}"${pickSet.has(m.id) ? ' checked' : ''}>${H.avatar(m.id)}<span>${esc(m.name)}</span>${team.status(m.id) !== 'offline' ? '<i class="opp__on" title="접속 중"></i>' : ''}</label>`).join('')}
          </div></div>
          <div class="fld"><span class="olabel">목표 점수</span><div class="seg seg--full" role="radiogroup" aria-label="목표 점수">
            ${bp.TARGETS.map(v => `<label><input type="radio" name="ptarget" value="${v}"${v === target ? ' checked' : ''}><span>${v}</span></label>`).join('')}
          </div></div>
          <p class="ohint">모두 같은 블록 순서로 동시에 시작해요. 목표 점수에 먼저 닿으면 우승, 다들 더 못 놓게 되면 최고 점수가 우승.</p>
          <button class="btn btn--accent" type="button" id="pCreate">${icon('blocks', 18)}방 만들고 초대하기</button>`
        : `<p class="ohint">아직 다른 멤버가 없어요. 동기를 초대해 주세요.</p><button class="btn btn--ghost" type="button" id="pInviteLink">${icon('userPlus', 16)}초대 링크</button>`}
      </section>
      ${mine.length ? `<section class="card ocard" aria-labelledby="pmT"><h2 class="card__title" id="pmT">${icon('blocks', 18)}내 대결</h2><ul class="ogames">${mine.map(r => row(r)).join('')}</ul></section>` : ''}
      ${watch.length ? `<section class="card ocard" aria-labelledby="pwT"><h2 class="card__title" id="pwT">${icon('users', 18)}다른 멤버 대결 · 관전</h2><ul class="ogames">${watch.map(r => row(r)).join('')}</ul></section>` : ''}
      ${past.length ? `<section class="card ocard" aria-labelledby="ppT"><h2 class="card__title" id="ppT">${icon('trophy', 18)}지난 대결</h2><ul class="ogames">${past.map(r => row(r)).join('')}</ul></section>` : ''}`;
    p.querySelectorAll('input[name=pinv]').forEach(c => c.onchange = () => {
      if (c.checked) pickSet.add(c.value); else pickSet.delete(c.value);
      if (pickSet.size > 3) { pickSet.delete(c.value); c.checked = false; H.toast('최대 3명까지 초대할 수 있어요'); }
    });
    p.querySelectorAll('input[name=ptarget]').forEach(r => r.onchange = () => { target = +r.value; });
    const cr = $('#pCreate'); if (cr) cr.onclick = async () => {
      if (!pickSet.size) { H.toast('같이 할 사람을 1명 이상 골라 주세요'); return; }
      await act(async () => { const id = await bp.create([...pickSet], target); open(id); }, '방을 만들었어요 · 다들 들어오면 시작을 눌러요');
    };
    const il = $('#pInviteLink'); if (il) il.onclick = () => H.openInvite();
    const badge = $('#bpPvpBadge'), a = bp.attention(); badge.hidden = !a; badge.textContent = String(a);
  }
  let busy = false;
  const FAIL = { not_lobby: '이미 시작했거나 닫힌 방이에요', not_invited: '초대받은 방이 아니에요', not_host: '방장만 시작할 수 있어요', need_players: '2명 이상 들어와야 시작할 수 있어요', not_playing: '이미 끝난 대결이에요', bad_players: '1~3명을 골라 주세요', _: '연결을 확인해 주세요' };
  async function act(fn, ok) {
    if (busy) return; busy = true;
    try { await fn(); if (ok) H.toast(ok); } catch (e) { console.warn(e); H.toast(FAIL[e.message] || FAIL._); }
    finally { busy = false; render(); }
  }
  function open(id) { cur = id; sel = null; history.replaceState(null, '', 'blocks.html' + (id ? '?r=' + encodeURIComponent(id) : '')); render(); }
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#bpPvp, .bpmain')) return;
    const o = e.target.closest('[data-open]'); if (o) { open(o.dataset.open); if (window.matchMedia('(max-width: 900px)').matches) $('.bpmain').scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
    const j = e.target.closest('[data-join]'); if (j) { open(j.dataset.join); act(() => bp.join(j.dataset.join), '참가했어요 · 방장이 시작하면 바로 시작해요'); return; }
    const l = e.target.closest('[data-leave]'); if (l) { const r = bp.get(l.dataset.leave); act(() => bp.leave(l.dataset.leave), r && r.host === me ? '방을 닫았어요' : r && bp.isPlayer(r) ? '방에서 나왔어요' : '거절했어요'); return; }
    const s = e.target.closest('[data-start]'); if (s) { act(() => bp.start(s.dataset.start)); return; }
    const ag = e.target.closest('[data-again]'); if (ag) { const r = bp.get(ag.dataset.again); if (r) act(async () => { const id = await bp.create(bp.players(r.id).map(p => p.member).filter(x => x !== me), r.target); open(id); }, '같은 사람들로 새 방을 만들었어요'); return; }
  });

  /* =========================================================
     화면 그리기
     ========================================================= */
  function raceHtml(r) {
    const ps = bp.players(r.id), inv = r.status === 'lobby' ? r.invited.filter(id => !ps.some(p => p.member === id)) : [];
    return `<ol class="bprace__list">${ps.map((p, k) => `<li class="bprun${p.member === me ? ' is-me' : ''}${p.over ? ' is-over' : ''}${r.winner === p.member ? ' is-win' : ''}">
        <span class="bprun__rank">${r.status === 'lobby' ? '' : k + 1}</span>${H.avatar(p.member)}<span class="bprun__nm">${esc(nm(p.member))}${p.member === r.host ? ' <small>방장</small>' : ''}</span>
        ${r.status === 'lobby' ? '<span class="bprun__st">들어옴</span>' : `<span class="bprun__bar" aria-hidden="true"><i style="width:${Math.min(100, p.score / r.target * 100)}%"></i></span><span class="bprun__sc">${p.score}${p.over ? ' · 끝' : ''}</span>`}</li>`).join('')}
      ${inv.map(id => `<li class="bprun is-wait">${''}<span class="bprun__rank"></span>${H.avatar(id)}<span class="bprun__nm">${esc(nm(id))}</span><span class="bprun__st">기다리는 중</span></li>`).join('')}</ol>`;
  }
  function render() {
    document.querySelectorAll('input[name=pmode]').forEach(r => { r.checked = r.value === mode; });
    $('#bpSolo').hidden = mode !== 'solo'; $('#bpPvp').hidden = mode !== 'pvp';
    const scoreEl = $('#bpscore'), race = $('#bprace'), over = $('#bpover');
    if (mode === 'solo') {
      paintSolo(); race.hidden = true;
      const g = solo;
      scoreEl.innerHTML = `<div class="bpsc"><span>점수</span><b>${g ? g.score : 0}</b></div><div class="bpsc"><span>지운 줄</span><b>${g ? g.lines : 0}</b></div><div class="bpsc"><span>최고</span><b>${best}</b></div>`;
      if (!g) { over.hidden = false; over.innerHTML = `<div class="oover__box"><span class="oover__ic">${icon('blocks', 30)}</span><b>블록 퍼즐 한 판?</b><span>블록을 끌어다 놓아 줄을 채워요</span><button class="btn btn--accent" type="button" id="bpGo">시작하기</button></div>`; $('#bpGo').onclick = () => $('#bpNew').click(); }
      else if (g.over) { over.hidden = false; over.innerHTML = `<div class="oover__box oover__box--sm${g.score >= best ? ' is-win' : ''}"><b>${g.score >= best && g.score ? '최고 기록! 🎉' : '더 놓을 곳이 없어요'}</b><span>${g.score}점 · ${g.lines}줄 지움</span><button class="btn btn--accent btn--sm" type="button" id="bpGo">한 판 더</button></div>`; $('#bpGo').onclick = () => $('#bpNew').click(); }
      else over.hidden = true;
      paintTray(); paintBoard(); return;
    }
    // ----- 대결 -----
    paintPvp();
    const r = cur ? bp.get(cur) : null;
    if (!r) {
      roomGame = null; roomGameId = null; race.hidden = true;
      scoreEl.innerHTML = `<div class="bpsc bpsc--wide"><span>대결</span><b>2~4명이 같은 블록으로 점수 경쟁</b></div>`;
      over.hidden = false; over.innerHTML = `<div class="oover__box"><span class="oover__ic">${icon('users', 30)}</span><b>누구랑 겨룰까요?</b><span>오른쪽에서 같이 할 사람과 목표 점수를 골라<br>방을 만들어요</span></div>`;
      paintTray(); paintBoard(); return;
    }
    const isP = bp.isPlayer(r), myP = bp.player(r.id);
    race.hidden = false; race.innerHTML = `<div class="bprace__head"><b>목표 ${r.target}점</b><small>${r.status === 'lobby' ? '대기실' : r.status === 'playing' ? '진행 중' : r.status === 'done' ? '끝' : '닫힌 방'}${!isP ? ' · 관전' : ''}</small></div>${raceHtml(r)}`;
    if (r.status === 'playing' && isP) {
      loadRoomGame(r);
      if (!seenStart[r.id]) { seenStart[r.id] = Date.now(); if (!roomGame.placed && Date.now() - (r.started || 0) < 15000) countdownUntil = Date.now() + 3000; }
    } else if (r.status !== 'playing') { roomGame = r.status === 'done' && isP ? (H.store.get(ROOM_KEY(r.id), null) || null) : null; roomGameId = roomGame ? r.id : null; }
    else { roomGame = null; roomGameId = null; }
    const g = roomGame;
    scoreEl.innerHTML = `<div class="bpsc"><span>내 점수</span><b>${g ? g.score : myP ? myP.score : 0}</b></div><div class="bpsc"><span>지운 줄</span><b>${g ? g.lines : 0}</b></div><div class="bpsc"><span>목표</span><b>${r.target}</b></div>`;
    if (r.status === 'lobby') {
      const ready = bp.players(r.id).length;
      over.hidden = false;
      over.innerHTML = r.host === me
        ? `<div class="oover__box"><span class="oover__ic oover__ic--wait">${icon('users', 30)}</span><b>대기실 · ${ready}명 들어옴</b><span>다 들어오면 시작을 눌러요<br>안 들어온 사람은 빼고 시작해요</span><span class="oover__btns"><button class="btn btn--ghost btn--sm" type="button" data-leave="${r.id}">방 닫기</button><button class="btn btn--accent btn--sm" type="button" data-start="${r.id}"${ready < 2 ? ' disabled' : ''}>시작</button></span></div>`
        : bp.pendingFor(r) ? `<div class="oover__box">${H.avatar(r.host, 'av--lg')}<b>${esc(nm(r.host))} 님이 블록 퍼즐 대결에 불렀어요</b><span>목표 ${r.target}점 먼저 닿으면 우승</span><span class="oover__btns"><button class="btn btn--ghost btn--sm" type="button" data-leave="${r.id}">거절</button><button class="btn btn--accent btn--sm" type="button" data-join="${r.id}">참가</button></span></div>`
        : isP ? `<div class="oover__box"><span class="oover__ic oover__ic--wait">${icon('blocks', 30)}</span><b>방장이 시작하길 기다리는 중</b><span>시작하면 3초 뒤 모두 같이 시작해요</span><button class="btn btn--ghost btn--sm" type="button" data-leave="${r.id}">나가기</button></div>`
        : `<div class="oover__box"><b>대기 중인 방이에요</b></div>`;
    } else if (r.status === 'canceled') { over.hidden = false; over.innerHTML = `<div class="oover__box oover__box--sm"><b>닫힌 방이에요</b></div>`; }
    else if (r.status === 'done') {
      const win = r.winner === me;
      over.hidden = false; over.innerHTML = `<div class="oover__box oover__box--sm${win ? ' is-win' : ''}"><b>${!r.winner ? '무승부!' : win ? '우승! 🎉' : `${esc(nm(r.winner))} 님 우승`}</b><span>${r.reason === 'target' ? `목표 ${r.target}점 먼저 도착` : '모두 끝나서 최고 점수로'}${myP ? ` · 내 점수 ${myP.score}점` : ''}</span>${isP ? `<button class="btn btn--accent btn--sm" type="button" data-again="${r.id}">같은 사람들로 한 판 더</button>` : ''}</div>`;
    } else if (!isP) { over.hidden = false; over.innerHTML = `<div class="oover__box oover__box--sm"><b>관전 중</b><span>위 점수판에서 실시간으로 봐요</span></div>`; }
    else if (Date.now() < countdownUntil) {
      over.hidden = false; const n = Math.ceil((countdownUntil - Date.now()) / 1000);
      over.innerHTML = `<div class="oover__box oover__box--count"><b class="bpcount">${n}</b><span>같은 블록으로 동시에 시작!</span></div>`;
      clearTimeout(countTimer); countTimer = setTimeout(render, 250);
    } else if (g && g.over) { over.hidden = false; over.innerHTML = `<div class="oover__box oover__box--sm"><b>더 놓을 곳이 없어요</b><span>${g.score}점 · 다른 사람이 끝나길 기다려요</span></div>`; }
    else over.hidden = true;
    paintTray(); paintBoard();
  }

  document.querySelectorAll('input[name=pmode]').forEach(r => r.addEventListener('change', () => {
    mode = r.value; H.sess.set(MODE_KEY, mode); sel = null;
    history.replaceState(null, '', mode === 'pvp' && cur ? 'blocks.html?r=' + encodeURIComponent(cur) : 'blocks.html');
    render();
  }));
  document.addEventListener('hub:bp', () => { if (mode === 'pvp' && !drag) render(); });
  document.addEventListener('hub:team', () => { if (mode === 'pvp' && !drag) paintPvp(); });
  window.addEventListener('resize', () => { if (!drag) paintBoard(); });

  if (cur && !bp.get(cur)) { cur = null; history.replaceState(null, '', 'blocks.html'); }
  render();
});
