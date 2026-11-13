/* 오목 — 컴퓨터와(브라우저 안에서) / 동기와(실시간 대국: 신청 → 수락 → 번갈아 두기). 흑 선공, 흑만 33 금지, 5개 이상이면 승 */
window.Hub.boot(function () {
  'use strict';
  const H = window.Hub, { $, esc, icon, team, omok } = H;
  const R = omok.rules, N = R.N, B = 1, W = 2;
  H.renderShell('omok');
  document.querySelectorAll('[data-ic]').forEach(el => { el.outerHTML = icon(el.dataset.ic, 18); });

  const me = team.meId();
  const params = new URLSearchParams(location.search);
  const AI_KEY = 'interns-omok-ai:' + me, MODE_KEY = 'interns-omok-mode';
  const STAR = new Set([3 * N + 3, 3 * N + 11, 7 * N + 7, 11 * N + 3, 11 * N + 11]);
  const colorName = (c) => c === B ? '흑' : '백';
  const nm = (id) => H.member(id).name;

  let mode = params.get('g') ? 'pvp' : (H.sess.get(MODE_KEY, null) || 'ai');
  let cur = params.get('g') || null;     // 보고 있는 동기 대국
  let busy = false, thinking = false, pendingIdx = null, focusIdx = 7 * N + 7;

  /* ---------- 판 만들기 (한 번) ---------- */
  const gb = $('#goban');
  gb.innerHTML = [...Array(N * N)].map((_, i) => {
    const x = i % N, y = (i / N) | 0;
    const edge = `${x === 0 ? ' e-l' : ''}${x === N - 1 ? ' e-r' : ''}${y === 0 ? ' e-t' : ''}${y === N - 1 ? ' e-b' : ''}${STAR.has(i) ? ' is-star' : ''}`;
    return `<button type="button" class="pt${edge}" data-i="${i}" tabindex="${i === focusIdx ? 0 : -1}"><i class="gst"></i></button>`;
  }).join('');
  const cells = [...gb.children];

  // 방향키로 칸 이동 (판 안에서 한 칸만 Tab 대상)
  gb.addEventListener('keydown', (e) => {
    const k = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
    if (!k && e.key !== 'Home' && e.key !== 'End') return;
    e.preventDefault();
    let x = focusIdx % N, y = (focusIdx / N) | 0;
    if (k) { x = Math.max(0, Math.min(N - 1, x + k[0])); y = Math.max(0, Math.min(N - 1, y + k[1])); }
    else { x = e.key === 'Home' ? 0 : N - 1; }
    moveFocus(y * N + x, true);
  });
  function moveFocus(i, focus) { cells[focusIdx].tabIndex = -1; focusIdx = i; cells[i].tabIndex = 0; if (focus) cells[i].focus(); }
  gb.addEventListener('click', (e) => { const c = e.target.closest('.pt'); if (!c) return; const i = +c.dataset.i; moveFocus(i, false); play(i); });

  /* ---------- 판 그리기 ---------- */
  // view: { moves, turnColor(지금 둘 색), canPlay(내가 둘 수 있나), myColor, line(이긴 줄) }
  function paintBoard(v) {
    const b = R.board(v.moves), last = v.moves.length ? v.moves[v.moves.length - 1] : -1;
    const lineSet = new Set(v.line || []);
    const showBan = v.canPlay && v.turnColor === B;
    const near = showBan ? nearMask(b) : null;
    gb.className = 'goban' + (v.canPlay ? ' can-' + (v.turnColor === B ? 'b' : 'w') : '') + (v.line ? ' is-over' : '');
    cells.forEach((c, i) => {
      const s = b[i], ban = showBan && !s && near[i] && R.forbidden(b, i);
      c.classList.toggle('is-b', s === B); c.classList.toggle('is-w', s === W);
      c.classList.toggle('is-last', i === last); c.classList.toggle('is-win', lineSet.has(i));
      c.classList.toggle('is-ban', !!ban); c.classList.toggle('is-pend', i === pendingIdx);
      const order = s ? v.moves.indexOf(i) + 1 : 0;
      c.setAttribute('aria-label', `${R.name(i)}, ${s ? `${colorName(s)} ${order}수째${i === last ? ' (마지막 수)' : ''}` : ban ? '33 금지 자리' : '빈 칸'}`);
      c.setAttribute('aria-disabled', String(!v.canPlay || !!s || !!ban));
    });
  }
  function nearMask(b) {   // 돌 근처 2칸 안의 빈 칸만 금수 검사 (빠르게)
    const m = new Uint8Array(N * N);
    for (let i = 0; i < N * N; i++) if (b[i]) { const x0 = i % N, y0 = (i / N) | 0; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const x = x0 + dx, y = y0 + dy; if (x >= 0 && y >= 0 && x < N && y < N) m[y * N + x] = 1; } }
    return m;
  }
  const live = (t) => { $('#olive').textContent = t; };
  const stoneIc = (c) => `<i class="ostone ostone--${c === B ? 'b' : 'w'}" aria-hidden="true"></i>`;

  /* =========================================================
     컴퓨터와 두기
     ========================================================= */
  const loadAi = () => { const g = H.store.get(AI_KEY, null); return g && Array.isArray(g.moves) ? g : { color: B, level: 'normal', moves: [], over: null, rec: { w: 0, l: 0, d: 0 }, started: false }; };
  let ai = loadAi(); ai.rec = ai.rec || { w: 0, l: 0, d: 0 };
  const saveAi = () => H.store.set(AI_KEY, ai);

  // 칸 점수: 그 칸을 지나는 5칸짜리 창마다 (상대 돌·벽이 없으면) 내 돌 수에 따라 점수
  const WT = [0, 2, 24, 240, 6000, 1e7];
  function evalAt(b, idx, c) {
    const x0 = idx % N, y0 = (idx / N) | 0; let sc = 0;
    for (const [dx, dy] of R.DIRS) {
      for (let s = -4; s <= 0; s++) {
        let cnt = 0, ok = true;
        for (let k = s; k < s + 5; k++) {
          const v = k === 0 ? c : R.at(b, x0 + dx * k, y0 + dy * k);
          if (v === -1 || (v && v !== c)) { ok = false; break; }
          if (v === c) cnt++;
        }
        if (ok) sc += WT[cnt];
      }
    }
    return sc;
  }
  function aiPick(moves, c, level) {
    if (!moves.length) return 7 * N + 7;
    const b = R.board(moves), opp = c === B ? W : B, near = nearMask(b);
    const easy = level === 'easy', def = easy ? 0.7 : 0.92;
    let best = [];
    for (let i = 0; i < N * N; i++) {
      if (b[i] || !near[i]) continue;
      if (c === B && R.forbidden(b, i)) continue;
      b[i] = c; if (R.five(b, i, c)) { b[i] = 0; return i; } b[i] = 0;   // 이길 수 있으면 바로
      let sc = evalAt(b, i, c) + evalAt(b, i, opp) * def;
      sc *= easy ? 0.55 + Math.random() * 0.9 : 1 + Math.random() * 0.02;
      best.push([sc, i]);
    }
    if (!best.length) { for (let i = 0; i < N * N; i++) if (!b[i] && !(c === B && R.forbidden(b, i))) return i; return -1; }
    best.sort((a, z) => z[0] - a[0]);
    if (easy && best.length > 2 && best[0][0] < 5e6 && Math.random() < 0.25) return best[1 + ((Math.random() * 2) | 0)][1];
    return best[0][1];
  }
  function aiCheckEnd(idx, c) {
    const b = R.board(ai.moves), line = R.fiveLine(b, idx, c);
    if (line) { ai.over = { winner: c, line }; ai.rec[c === ai.color ? 'w' : 'l']++; return true; }
    if (ai.moves.length >= N * N) { ai.over = { winner: 0, line: [] }; ai.rec.d++; return true; }
    return false;
  }
  function aiTurn() {
    const c = ai.moves.length % 2 ? W : B;
    if (ai.over || c === ai.color || !ai.started) return;
    thinking = true; render();
    setTimeout(() => {
      thinking = false;
      if (mode !== 'ai' || ai.over || (ai.moves.length % 2 ? W : B) === ai.color) { render(); return; }
      const i = aiPick(ai.moves, c, ai.level);
      if (i < 0) { ai.over = { winner: 0, line: [] }; saveAi(); render(); return; }
      ai.moves.push(i); aiCheckEnd(i, c); saveAi(); render();
      live(`컴퓨터가 ${R.name(i)}에 뒀어요${ai.over ? ` · ${ai.over.winner === ai.color ? '이겼어요' : ai.over.winner ? '졌어요' : '비겼어요'}` : ''}`);
    }, 380 + Math.random() * 320);
  }
  function aiNew() { ai.moves = []; ai.over = null; ai.started = true; saveAi(); render(); aiTurn(); }
  function aiPlay(i) {
    const c = ai.moves.length % 2 ? W : B;
    if (!ai.started || ai.over || thinking || c !== ai.color) return;
    const b = R.board(ai.moves);
    if (b[i]) return;
    if (c === B && R.forbidden(b, i)) { H.toast('흑은 33(열린 3 두 개)이 금지예요'); return; }
    ai.moves.push(i); aiCheckEnd(i, c); saveAi(); render();
    if (!ai.over) aiTurn();
  }
  function aiUndo() {
    if (thinking || !ai.started) return;
    // 내 마지막 수까지 되돌림 (컴퓨터가 응수했으면 그것도)
    let n = ai.moves.length;
    const myLast = (() => { for (let k = n - 1; k >= 0; k--) if ((k % 2 ? W : B) === ai.color) return k; return -1; })();
    if (myLast < 0) return;
    if (ai.over) { ai.rec[ai.over.winner === ai.color ? 'w' : ai.over.winner ? 'l' : 'd']--; ai.over = null; }
    ai.moves = ai.moves.slice(0, myLast); saveAi(); render(); live('한 수 물렀어요');
  }
  function paintAiPanel() {
    const p = $('#aiPanel');
    const lv = ai.level, col = ai.color;
    p.innerHTML = `
      <div class="card__head"><h2 class="card__title">${icon('cpu', 18)}컴퓨터와 두기</h2><span class="orec" title="이 기기에서의 전적">${ai.rec.w}승 ${ai.rec.l}패${ai.rec.d ? ` ${ai.rec.d}무` : ''}</span></div>
      <div class="fld"><span class="olabel">내 돌</span>
        <div class="seg seg--full" role="radiogroup" aria-label="내 돌">
          <label><input type="radio" name="aiColor" value="1"${col === B ? ' checked' : ''}><span>${stoneIc(B)}흑 · 먼저</span></label>
          <label><input type="radio" name="aiColor" value="2"${col === W ? ' checked' : ''}><span>${stoneIc(W)}백 · 나중</span></label>
        </div></div>
      <div class="fld"><span class="olabel">난이도</span>
        <div class="seg seg--full" role="radiogroup" aria-label="난이도">
          <label><input type="radio" name="aiLevel" value="easy"${lv === 'easy' ? ' checked' : ''}><span>쉬움</span></label>
          <label><input type="radio" name="aiLevel" value="normal"${lv !== 'easy' ? ' checked' : ''}><span>보통</span></label>
        </div></div>
      <button class="btn btn--accent" type="button" id="aiStart">${icon('go', 18)}${ai.started && ai.moves.length && !ai.over ? '새로 시작' : '시작하기'}</button>
      ${ai.started && ai.moves.length && !ai.over ? '<p class="ohint">두던 판은 새로 시작하면 사라져요</p>' : ''}`;
    p.querySelectorAll('input[name=aiColor]').forEach(r => r.onchange = () => { ai.color = +r.value; saveAi(); });
    p.querySelectorAll('input[name=aiLevel]').forEach(r => r.onchange = () => { ai.level = r.value; saveAi(); });
    $('#aiStart').onclick = aiNew;
  }

  /* =========================================================
     동기와 두기 (실시간)
     ========================================================= */
  let inviteTo = null, inviteColor = 'black';
  const resultText = (g) => !g.winner ? '무승부' : g.winner === me ? '승' : omok.isIn(g) ? '패' : `${nm(g.winner)} 승`;
  function gameRow(g, extra) {
    const op = omok.isIn(g) ? omok.opponent(g) : null;
    const who = op ? `${esc(nm(op))} 님` : `${esc(nm(g.black))} vs ${esc(nm(g.white))}`;
    const st = g.status === 'invite' ? (g.by === me ? '수락 기다리는 중' : '신청 받음')
      : g.status === 'playing' ? (omok.myTurn(g) ? '<b class="o-turn">내 차례</b>' : `${g.moves.length}수째`)
      : g.status === 'done' ? `${resultText(g)} · ${g.moves.length}수${g.reason === 'resign' ? ' · 기권' : ''}` : '';
    return `<li class="ogame${g.id === cur ? ' is-cur' : ''}"><button type="button" class="ogame__btn" data-open="${g.id}">
        ${H.avatar(op || g.black)}<span class="ogame__txt"><b>${who}</b><small>${op ? `나는 ${colorName(omok.colorOf(g))} · ` : ''}${st}</small></span></button>${extra || ''}</li>`;
  }
  function paintPvp() {
    const p = $('#pvpPanel');
    const all = omok.all(), others = team.list().filter(m => m.id !== me);
    if (inviteTo && !others.some(m => m.id === inviteTo)) inviteTo = null;
    if (!inviteTo && others.length) inviteTo = others[0].id;
    const got = omok.invitesForMe();
    const mine = all.filter(g => omok.isIn(g) && (g.status === 'playing' || (g.status === 'invite' && g.by === me)));
    const watch = all.filter(g => !omok.isIn(g) && g.status === 'playing');
    const past = all.filter(g => g.status === 'done').slice(0, 6);
    const done = all.filter(g => g.status === 'done' && omok.isIn(g));
    const w = done.filter(g => g.winner === me).length, l = done.filter(g => g.winner && g.winner !== me).length;
    p.innerHTML = `
      ${got.length ? `<section class="card ocard ocard--hot" aria-labelledby="gotT"><h2 class="card__title" id="gotT">${icon('bell', 18)}받은 대국 신청</h2>
        <ul class="ogames">${got.map(g => gameRow(g, `<span class="ogame__act"><button class="btn btn--accent btn--sm" type="button" data-acc="${g.id}">수락</button><button class="btn btn--ghost btn--sm" type="button" data-dec="${g.id}">거절</button></span>`)).join('')}</ul></section>` : ''}
      <section class="card ocard" aria-labelledby="newT">
        <div class="card__head"><h2 class="card__title" id="newT">${icon('userPlus', 18)}대국 신청</h2>${done.length ? `<span class="orec" title="최근 대국 기준">${w}승 ${l}패</span>` : ''}</div>
        ${others.length ? `<div class="fld"><span class="olabel">상대</span><div class="opp" role="radiogroup" aria-label="상대">
            ${others.map(m => `<label class="opp__m"><input type="radio" name="opp" value="${m.id}"${m.id === inviteTo ? ' checked' : ''}>${H.avatar(m.id)}<span>${esc(m.name)}</span>${team.status(m.id) !== 'offline' ? '<i class="opp__on" title="접속 중"></i>' : ''}</label>`).join('')}
          </div></div>
          <div class="fld"><span class="olabel">내 돌</span><div class="seg seg--full" role="radiogroup" aria-label="내 돌">
            <label><input type="radio" name="pColor" value="black"${inviteColor === 'black' ? ' checked' : ''}><span>${stoneIc(B)}흑 · 먼저</span></label>
            <label><input type="radio" name="pColor" value="white"${inviteColor === 'white' ? ' checked' : ''}><span>${stoneIc(W)}백 · 나중</span></label>
            <label><input type="radio" name="pColor" value="random"${inviteColor === 'random' ? ' checked' : ''}><span>랜덤</span></label>
          </div></div>
          <button class="btn btn--accent" type="button" id="pInvite">${icon('go', 18)}대국 신청하기</button>`
        : `<p class="ohint">아직 다른 멤버가 없어요. 동기를 초대해 주세요.</p><button class="btn btn--ghost" type="button" id="pInviteLink">${icon('userPlus', 16)}초대 링크</button>`}
      </section>
      ${mine.length ? `<section class="card ocard" aria-labelledby="mineT"><h2 class="card__title" id="mineT">${icon('go', 18)}내 대국</h2>
        <ul class="ogames">${mine.map(g => gameRow(g, g.status === 'invite' ? `<span class="ogame__act"><button class="btn btn--ghost btn--sm" type="button" data-cancel="${g.id}">취소</button></span>` : '')).join('')}</ul></section>` : ''}
      ${watch.length ? `<section class="card ocard" aria-labelledby="watchT"><h2 class="card__title" id="watchT">${icon('users', 18)}다른 멤버 대국 · 관전</h2><ul class="ogames">${watch.map(g => gameRow(g)).join('')}</ul></section>` : ''}
      ${past.length ? `<section class="card ocard" aria-labelledby="pastT"><h2 class="card__title" id="pastT">${icon('trophy', 18)}지난 대국</h2><ul class="ogames">${past.map(g => gameRow(g)).join('')}</ul></section>` : ''}`;
    p.querySelectorAll('input[name=opp]').forEach(r => r.onchange = () => { inviteTo = r.value; });
    p.querySelectorAll('input[name=pColor]').forEach(r => r.onchange = () => { inviteColor = r.value; });
    const inv = $('#pInvite'); if (inv) inv.onclick = () => invite(inviteTo, inviteColor);
    const il = $('#pInviteLink'); if (il) il.onclick = () => H.openInvite();
    const badge = $('#pvpBadge'), a = omok.attention(); badge.hidden = !a; badge.textContent = String(a);
  }
  async function invite(to, color) {
    if (!to || busy) return;
    busy = true;
    try { const g = await omok.invite(to, color); open(g.id); H.toast(`${nm(to)} 님에게 대국을 신청했어요 · 수락하면 바로 시작해요`); }
    catch (e) { console.warn(e); H.toast('대국을 신청하지 못했어요 · 연결을 확인해 주세요'); }
    finally { busy = false; render(); }
  }
  async function act(fn, ok, failMsg) {
    if (busy) return; busy = true;
    try { await fn(); if (ok) H.toast(ok); }
    catch (e) { console.warn(e); H.toast(failMsg[e.message] || failMsg._ || '처리하지 못했어요'); }
    finally { busy = false; render(); }
  }
  const FAIL = { not_invite: '이미 처리된 신청이에요', not_yours: '내 대국이 아니에요', not_playing: '이미 끝난 대국이에요', not_your_turn: '상대 차례예요', bad_move: '이미 돌이 있는 자리예요', _: '연결을 확인해 주세요' };
  $('#pvpPanel').addEventListener('click', (e) => {
    const o = e.target.closest('[data-open]'); if (o) { open(o.dataset.open); if (window.matchMedia('(max-width: 900px)').matches) $('.omok__main').scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
    const a = e.target.closest('[data-acc]'); if (a) { const id = a.dataset.acc; open(id); act(() => omok.respond(id, true), '대국 시작!', FAIL); return; }
    const d = e.target.closest('[data-dec]'); if (d) { act(() => omok.respond(d.dataset.dec, false), '다음에 하자고 전했어요', FAIL); return; }
    const c = e.target.closest('[data-cancel]'); if (c) { act(() => omok.cancel(c.dataset.cancel), '신청을 취소했어요', FAIL); return; }
  });
  function open(id) {
    cur = id; pendingIdx = null;
    history.replaceState(null, '', 'omok.html' + (id ? '?g=' + encodeURIComponent(id) : ''));
    render();
  }
  async function pvpPlay(i) {
    const g = omok.get(cur);
    if (!g || !omok.myTurn(g) || busy || pendingIdx !== null) return;
    const b = R.board(g.moves);
    if (b[i]) return;
    if (omok.colorOf(g) === B && R.forbidden(b, i)) { H.toast('흑은 33(열린 3 두 개)이 금지예요'); return; }
    pendingIdx = i; render();
    try { await omok.move(g.id, i); }
    catch (e) { console.warn(e); H.toast(FAIL[e.message] || '두지 못했어요 · 연결을 확인해 주세요'); }
    finally { pendingIdx = null; render(); }
  }

  /* =========================================================
     화면 그리기
     ========================================================= */
  function play(i) { if (mode === 'ai') aiPlay(i); else pvpPlay(i); }
  function player(id, c, label, turn) {
    return `<div class="oplayer${turn ? ' is-turn' : ''}">${stoneIc(c)}${id ? H.avatar(id) : `<span class="av av--cpu" aria-hidden="true">${icon('cpu', 16)}</span>`}<span class="oplayer__nm"><b>${esc(label)}</b><small>${colorName(c)}${c === B ? ' · 먼저' : ''}</small></span></div>`;
  }
  function render() {
    document.querySelectorAll('input[name=omode]').forEach(r => { r.checked = r.value === mode; });
    $('#aiPanel').hidden = mode !== 'ai'; $('#pvpPanel').hidden = mode !== 'pvp';
    const bar = $('#obar'), tools = $('#otools'), over = $('#oover');
    if (mode === 'ai') {
      paintAiPanel();
      const turnC = ai.moves.length % 2 ? W : B, myTurn = ai.started && !ai.over && !thinking && turnC === ai.color;
      const meName = H.member(me).name;
      const status = !ai.started ? '내 돌과 난이도를 고르고 시작해요' : ai.over ? (ai.over.winner === ai.color ? '이겼어요! 🎉' : ai.over.winner ? '컴퓨터가 이겼어요' : '비겼어요')
        : thinking ? '컴퓨터가 생각 중…' : '내 차례예요';
      bar.innerHTML = `${player(me, ai.color, meName, ai.started && !ai.over && turnC === ai.color)}<div class="obar__mid"><b>${esc(status)}</b><small>${ai.moves.length}수 · ${ai.level === 'easy' ? '쉬움' : '보통'}</small></div>${player(null, ai.color === B ? W : B, '컴퓨터', ai.started && !ai.over && turnC !== ai.color)}`;
      const line = ai.over ? ai.over.line : null;
      paintBoard({ moves: ai.moves, turnColor: turnC, canPlay: myTurn, myColor: ai.color, line });
      const canUndo = ai.started && !thinking && ai.moves.some((_, k) => (k % 2 ? W : B) === ai.color);
      tools.innerHTML = ai.started ? `<button class="btn btn--ghost btn--sm" type="button" id="oUndo"${canUndo ? '' : ' disabled'}>${icon('undo', 16)}무르기</button><button class="btn btn--ghost btn--sm" type="button" id="oAgain">${icon('reset', 16)}새 판</button>` : '';
      const u = $('#oUndo'); if (u) u.onclick = aiUndo;
      const a = $('#oAgain'); if (a) a.onclick = aiNew;
      if (!ai.started) { over.hidden = false; over.innerHTML = `<div class="oover__box"><span class="oover__ic">${icon('go', 30)}</span><b>컴퓨터와 한 판?</b><span>흑이 먼저 둬요</span><button class="btn btn--accent" type="button" id="ovStart">시작하기</button></div>`; $('#ovStart').onclick = aiNew; }
      else if (ai.over) { over.hidden = false; const win = ai.over.winner === ai.color; over.innerHTML = `<div class="oover__box oover__box--sm${win ? ' is-win' : ''}"><b>${win ? '이겼어요! 🎉' : ai.over.winner ? '아쉽게 졌어요' : '비겼어요'}</b><span>${ai.moves.length}수 만에 ${ai.over.winner ? colorName(ai.over.winner) + ' 오목 완성' : '판이 꽉 찼어요'}</span><span class="oover__btns"><button class="btn btn--ghost btn--sm" type="button" id="ovSee">판 보기</button><button class="btn btn--accent btn--sm" type="button" id="ovAgain">한 판 더</button></span></div>`; $('#ovAgain').onclick = aiNew; $('#ovSee').onclick = () => { over.hidden = true; }; }
      else over.hidden = true;
    } else {
      paintPvp();
      const g = cur ? omok.get(cur) : null;
      if (!g) {
        bar.innerHTML = `<div class="obar__mid obar__mid--solo"><b>동기와 두기</b><small>오른쪽에서 상대를 골라 대국을 신청해요</small></div>`;
        paintBoard({ moves: [], turnColor: B, canPlay: false });
        tools.innerHTML = '';
        over.hidden = false; over.innerHTML = `<div class="oover__box"><span class="oover__ic">${icon('users', 30)}</span><b>누구랑 둘까요?</b><span>신청하면 상대에게 알림이 가고,<br>수락하면 서로 화면에서 번갈아 둬요</span></div>`;
        return;
      }
      const turnId = omok.turnOf(g), mineIn = omok.isIn(g), myC = omok.colorOf(g);
      const moves = pendingIdx !== null ? g.moves.concat(pendingIdx) : g.moves;
      const status = g.status === 'invite' ? (g.by === me ? `${nm(omok.opponent(g))} 님의 수락을 기다리는 중` : `${nm(g.by)} 님이 대국을 신청했어요`)
        : g.status === 'playing' ? (pendingIdx !== null ? '두는 중…' : omok.myTurn(g) ? '내 차례예요' : `${nm(turnId)} 님 차례${mineIn ? ' · 기다리는 중' : ''}`)
        : g.status === 'done' ? (!g.winner ? '비겼어요' : mineIn ? (g.winner === me ? '이겼어요! 🎉' : `${nm(g.winner)} 님이 이겼어요`) : `${nm(g.winner)} 님 승`) + (g.reason === 'resign' ? ' · 기권' : '')
        : g.status === 'declined' ? '거절된 신청이에요' : '취소된 신청이에요';
      bar.innerHTML = `${player(g.black, B, nm(g.black) + (g.black === me ? ' (나)' : ''), g.status === 'playing' && turnId === g.black)}<div class="obar__mid"><b>${esc(status)}</b><small>${g.moves.length}수${!mineIn ? ' · 관전 중' : ''}</small></div>${player(g.white, W, nm(g.white) + (g.white === me ? ' (나)' : ''), g.status === 'playing' && turnId === g.white)}`;
      let line = null;
      if (g.status === 'done' && g.reason === 'five' && g.moves.length) { const last = g.moves[g.moves.length - 1]; line = R.fiveLine(R.board(g.moves), last, (g.moves.length - 1) % 2 ? W : B) || []; }
      else if (g.status === 'done') line = [];
      paintBoard({ moves, turnColor: g.moves.length % 2 ? W : B, canPlay: omok.myTurn(g) && pendingIdx === null && !busy, myColor: myC, line });
      tools.innerHTML = g.status === 'playing' && mineIn ? `<button class="btn btn--ghost btn--sm" type="button" id="oResign">${icon('flag', 16)}기권</button>` : '';
      const rs = $('#oResign'); if (rs) rs.onclick = () => { if (rs.dataset.sure) act(() => omok.resign(g.id), '기권했어요', FAIL); else { rs.dataset.sure = '1'; rs.classList.add('btn--danger'); rs.innerHTML = `${icon('flag', 16)}정말 기권할까요?`; setTimeout(() => { if (document.contains(rs)) { delete rs.dataset.sure; rs.classList.remove('btn--danger'); rs.innerHTML = `${icon('flag', 16)}기권`; } }, 4000); } };
      if (g.status === 'invite' && g.by !== me && mineIn) {
        over.hidden = false; over.innerHTML = `<div class="oover__box">${H.avatar(g.by, 'av--lg')}<b>${esc(nm(g.by))} 님이 한 판 하재요</b><span>나는 ${colorName(myC)}${myC === B ? ' · 먼저 둬요' : ' · 나중에 둬요'}</span><span class="oover__btns"><button class="btn btn--ghost btn--sm" type="button" data-dec="${g.id}">다음에</button><button class="btn btn--accent btn--sm" type="button" data-acc="${g.id}">수락</button></span></div>`;
      } else if (g.status === 'invite') {
        over.hidden = false; over.innerHTML = `<div class="oover__box"><span class="oover__ic oover__ic--wait">${icon('go', 30)}</span><b>수락을 기다리는 중</b><span>${esc(nm(omok.opponent(g)))} 님이 수락하면 바로 시작해요</span>${g.by === me ? `<button class="btn btn--ghost btn--sm" type="button" data-cancel="${g.id}">신청 취소</button>` : ''}</div>`;
      } else if (g.status === 'declined' || g.status === 'canceled') {
        over.hidden = false; over.innerHTML = `<div class="oover__box oover__box--sm"><b>${g.status === 'declined' ? `${esc(nm(omok.opponent(g, g.by)))} 님이 다음에 하재요` : '취소된 신청이에요'}</b></div>`;
      } else if (g.status === 'done' && !over.dataset.seen?.includes(g.id)) {
        const win = g.winner === me;
        over.hidden = false; over.innerHTML = `<div class="oover__box oover__box--sm${win ? ' is-win' : ''}"><b>${esc(status)}</b><span>${g.moves.length}수${g.reason === 'five' ? ' · 오목 완성' : g.reason === 'draw' ? ' · 판이 꽉 찼어요' : ''}</span><span class="oover__btns"><button class="btn btn--ghost btn--sm" type="button" id="ovSee">판 보기</button>${mineIn ? `<button class="btn btn--accent btn--sm" type="button" id="ovRe">한 판 더 (돌 바꿔서)</button>` : ''}</span></div>`;
        $('#ovSee').onclick = () => { over.dataset.seen = (over.dataset.seen || '') + ' ' + g.id; over.hidden = true; };
        const re = $('#ovRe'); if (re) re.onclick = () => invite(omok.opponent(g), myC === B ? 'white' : 'black');
      } else over.hidden = true;
    }
  }
  $('#oover').addEventListener('click', (e) => {
    const a = e.target.closest('[data-acc]'); if (a) { act(() => omok.respond(a.dataset.acc, true), '대국 시작!', FAIL); return; }
    const d = e.target.closest('[data-dec]'); if (d) { act(() => omok.respond(d.dataset.dec, false), '다음에 하자고 전했어요', FAIL); return; }
    const c = e.target.closest('[data-cancel]'); if (c) act(() => omok.cancel(c.dataset.cancel), '신청을 취소했어요', FAIL);
  });
  document.querySelectorAll('input[name=omode]').forEach(r => r.addEventListener('change', () => {
    mode = r.value; H.sess.set(MODE_KEY, mode);
    if (mode === 'ai') history.replaceState(null, '', 'omok.html');
    else if (cur) history.replaceState(null, '', 'omok.html?g=' + encodeURIComponent(cur));
    render(); if (mode === 'ai') aiTurn();
  }));

  // 동기 대국: 상대가 두거나 수락하면 다시 그림 + 화면 읽기 프로그램에 알림
  let lastLen = null;
  document.addEventListener('hub:omok', () => {
    const g = cur && omok.get(cur);
    if (mode === 'pvp' && g && lastLen !== null && g.moves.length > lastLen) { const i = g.moves[g.moves.length - 1]; live(`${nm(g.moves.length % 2 ? g.black : g.white)} 님이 ${R.name(i)}에 뒀어요${omok.myTurn(g) ? ' · 내 차례' : ''}`); }
    lastLen = g ? g.moves.length : null;
    render();
  });
  document.addEventListener('hub:team', () => { if (mode === 'pvp') paintPvp(); });

  if (cur && !omok.get(cur)) { cur = null; history.replaceState(null, '', 'omok.html'); }
  if (cur) lastLen = omok.get(cur).moves.length;
  render();
  if (mode === 'ai') aiTurn();
});
