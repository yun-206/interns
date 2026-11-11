/* 숫자야구 — 혼자(컴퓨터가 숫자를 숨김) / 동기와(서로 숫자를 숨기고 번갈아 맞히기, 판정은 서버) */
window.Hub.boot(function () {
  'use strict';
  const H = window.Hub, { $, esc, icon, team, bb } = H;
  const R = bb.rules;
  H.renderShell('baseball');
  document.querySelectorAll('[data-ic]').forEach(el => { el.outerHTML = icon(el.dataset.ic, 18); });

  const me = team.meId();
  const params = new URLSearchParams(location.search);
  const SOLO_KEY = 'interns-bb-solo:' + me, MODE_KEY = 'interns-bb-mode', MEMO_KEY = 'interns-bb-memo:';
  const LIMIT = { 3: 10, 4: 12 };
  const nm = (id) => H.member(id).name;
  const live = (t) => { $('#blive').textContent = t; };

  let mode = params.get('g') ? 'pvp' : (H.sess.get(MODE_KEY, null) || 'solo');
  let cur = params.get('g') || null;
  let busy = false, buf = '';

  /* ---------- 숫자 입력 (칸 + 숫자판 + 키보드) ---------- */
  let inputCfg = null;   // { n, submit, label, okLabel, random }
  function paintInput(cfg) {
    inputCfg = cfg;
    const box = $('#binput');
    if (!cfg) { box.innerHTML = ''; box.hidden = true; buf = ''; return; }
    box.hidden = false;
    if (buf.length > cfg.n) buf = buf.slice(0, cfg.n);
    box.innerHTML = `
      ${cfg.label ? `<p class="binput__label">${cfg.label}</p>` : ''}
      <div class="bslots" aria-label="입력한 숫자 ${buf ? buf.split('').join(' ') : '없음'}">${[...Array(cfg.n)].map((_, i) => `<span class="bslot${i === buf.length ? ' is-cur' : ''}${buf[i] ? ' is-on' : ''}">${buf[i] || ''}</span>`).join('')}</div>
      <div class="bpad" role="group" aria-label="숫자판">
        ${'1234567890'.split('').map(d => `<button type="button" class="bkey" data-d="${d}"${buf.includes(d) || buf.length >= cfg.n ? ' disabled' : ''}>${d}</button>`).join('')}
        <button type="button" class="bkey bkey--fn" data-back aria-label="지우기"${buf ? '' : ' disabled'}>⌫</button>
        ${cfg.random ? `<button type="button" class="bkey bkey--fn" data-rand aria-label="아무 숫자나">🎲</button>` : `<button type="button" class="bkey bkey--fn" data-clear aria-label="모두 지우기"${buf ? '' : ' disabled'}>C</button>`}
        <button type="button" class="bkey bkey--ok" data-ok${buf.length === cfg.n ? '' : ' disabled'}>${cfg.okLabel || '확인'}</button>
      </div>
      <p class="binput__hint">숫자 키·Backspace·Enter로도 입력돼요 · 같은 숫자는 한 번만</p>`;
  }
  function press(k) {
    if (!inputCfg || busy) return;
    const n = inputCfg.n;
    if (/^[0-9]$/.test(k)) { if (buf.length < n && !buf.includes(k)) buf += k; else if (buf.includes(k)) H.toast('같은 숫자는 한 번만 쓸 수 있어요'); }
    else if (k === 'back') buf = buf.slice(0, -1);
    else if (k === 'clear') buf = '';
    else if (k === 'rand') buf = R.random(n);
    else if (k === 'ok') { if (buf.length !== n) return; const v = buf; buf = ''; inputCfg.submit(v); return; }
    paintInput(inputCfg);
  }
  $('#binput').addEventListener('click', (e) => {
    const b = e.target.closest('.bkey'); if (!b || b.disabled) return;
    const keep = b.dataset.d !== undefined ? null : b;
    press(b.dataset.d !== undefined ? b.dataset.d : b.hasAttribute('data-back') ? 'back' : b.hasAttribute('data-clear') ? 'clear' : b.hasAttribute('data-rand') ? 'rand' : 'ok');
    // 다시 그린 뒤에도 숫자판에 포커스 유지
    const sel = b.dataset.d !== undefined ? `.bkey[data-d="${b.dataset.d}"]` : keep && keep.hasAttribute('data-back') ? '.bkey[data-back]' : null;
    const nx = sel && $('#binput ' + sel); if (nx && !nx.disabled) nx.focus(); else if (sel) { const any = $('#binput .bkey:not([disabled])'); if (any) any.focus(); }
  });
  document.addEventListener('keydown', (e) => {
    if (!inputCfg || e.ctrlKey || e.metaKey || e.altKey) return;
    const t = e.target; if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable) || document.querySelector('dialog[open]')) return;
    if (/^[0-9]$/.test(e.key)) { e.preventDefault(); press(e.key); }
    else if (e.key === 'Backspace') { e.preventDefault(); press('back'); }
    else if (e.key === 'Enter' && buf.length === inputCfg.n) { e.preventDefault(); press('ok'); }   // 숫자를 다 채웠으면 어디에 포커스가 있든 던지기
    else if (e.key === 'Escape') { buf = ''; paintInput(inputCfg); }
  });

  /* ---------- 메모판: 숫자마다 모름 → 없음 → 있음 ---------- */
  let memoKey = null;
  function paintMemo(key) {
    memoKey = key;
    const box = $('#bmemo');
    if (!key) { box.innerHTML = ''; box.hidden = true; return; }
    box.hidden = false;
    const memo = H.sess.get(MEMO_KEY + key, null) || {};
    const lab = { no: '없음', yes: '있음' };
    box.innerHTML = `<p class="binput__label">메모 <small>숫자를 누를 때마다 없음 → 있음 → 모름</small></p><div class="bmemo__row">${'0123456789'.split('').map(d => `<button type="button" class="bmem${memo[d] ? ' is-' + memo[d] : ''}" data-m="${d}" aria-label="${d}: ${lab[memo[d]] || '모름'}">${d}</button>`).join('')}</div>`;
  }
  $('#bmemo').addEventListener('click', (e) => {
    const b = e.target.closest('[data-m]'); if (!b || !memoKey) return;
    const memo = H.sess.get(MEMO_KEY + memoKey, null) || {}, d = b.dataset.m;
    memo[d] = memo[d] === 'no' ? 'yes' : memo[d] === 'yes' ? '' : 'no';
    H.sess.set(MEMO_KEY + memoKey, memo); paintMemo(memoKey); $(`#bmemo [data-m="${d}"]`).focus();
  });

  /* ---------- 기록 표 ---------- */
  const resultChip = (x, n) => {
    const cls = x.s === n ? 'hr' : (!x.s && !x.b) ? 'out' : 'sb';
    return `<span class="bres bres--${cls}">${x.s === n ? '홈런!' : (!x.s && !x.b) ? 'OUT' : `${x.s ? `<b class="bres__s">${x.s}S</b>` : ''}${x.b ? `<b class="bres__b">${x.b}B</b>` : ''}`}</span>`;
  };
  const histList = (rows, n, empty) => rows.length
    ? `<ol class="bhist">${rows.map((x, i) => `<li class="bhist__row${x.s === n ? ' is-hit' : ''}"><span class="bhist__n">${i + 1}</span><span class="bhist__g">${x.g.split('').map(d => `<i>${d}</i>`).join('')}</span>${resultChip(x, n)}</li>`).join('')}</ol>`
    : `<p class="bempty">${empty}</p>`;
  const secretChips = (sec, n, hide) => `<span class="bsec">${[...Array(n)].map((_, i) => `<i>${hide || !sec ? '?' : sec[i]}</i>`).join('')}</span>`;
  // 지금까지 힌트로 남은 후보 수
  function candidates(rows, n) {
    let c = 0;
    const rec = (p) => { if (p.length === n) { if (rows.every(x => { const r = R.score(p, x.g); return r.s === x.s && r.b === x.b; })) c++; return; } for (let d = 0; d < 10; d++) { const ch = String(d); if (!p.includes(ch)) rec(p + ch); } };
    rec(''); return c;
  }

  /* =========================================================
     혼자 하기
     ========================================================= */
  const loadSolo = () => { const g = H.store.get(SOLO_KEY, null); return g && g.n ? g : { n: 3, secret: null, guesses: [], over: null, started: false, hint: false, rec: {} }; };
  let solo = loadSolo(); solo.rec = solo.rec || {};
  const saveSolo = () => H.store.set(SOLO_KEY, solo);
  const recOf = (n) => solo.rec[n] = solo.rec[n] || { w: 0, l: 0, best: 0 };
  function soloNew() {
    solo.secret = R.random(solo.n); solo.guesses = []; solo.over = null; solo.started = true; buf = '';
    H.sess.set(MEMO_KEY + 'solo', {}); saveSolo(); render(); live(`${solo.n}자리 숫자를 숨겼어요. ${LIMIT[solo.n]}번 안에 맞혀요`);
  }
  function soloGuess(v) {
    if (!solo.started || solo.over) return;
    if (solo.guesses.some(x => x.g === v)) { H.toast('이미 불러 본 숫자예요'); buf = v; paintInput(inputCfg); return; }
    const r = R.score(solo.secret, v); solo.guesses.push({ g: v, s: r.s, b: r.b });
    const rc = recOf(solo.n);
    if (r.s === solo.n) { solo.over = 'win'; rc.w++; if (!rc.best || solo.guesses.length < rc.best) rc.best = solo.guesses.length; }
    else if (solo.guesses.length >= LIMIT[solo.n]) { solo.over = 'lose'; rc.l++; }
    saveSolo(); render();
    live(`${v}: ${R.label(r, solo.n)}${solo.over === 'win' ? ` · ${solo.guesses.length}번 만에 맞혔어요` : solo.over === 'lose' ? ` · 정답은 ${solo.secret}` : ''}`);
  }
  function paintSoloPanel() {
    const p = $('#soloPanel'), rc3 = recOf(3), rc4 = recOf(4);
    const playing = solo.started && !solo.over && solo.guesses.length;
    p.innerHTML = `
      <div class="card__head"><h2 class="card__title">${icon('cpu', 18)}혼자 하기</h2></div>
      <div class="fld"><span class="olabel">자릿수</span>
        <div class="seg seg--full" role="radiogroup" aria-label="자릿수">
          <label><input type="radio" name="sDigits" value="3"${solo.n === 3 ? ' checked' : ''}><span>3자리 · ${LIMIT[3]}번</span></label>
          <label><input type="radio" name="sDigits" value="4"${solo.n === 4 ? ' checked' : ''}><span>4자리 · ${LIMIT[4]}번</span></label>
        </div></div>
      <label class="bchk"><input type="checkbox" id="sHint"${solo.hint ? ' checked' : ''}><span>남은 후보 수 보기 <small>(힌트)</small></span></label>
      <button class="btn btn--accent" type="button" id="sStart">${icon('ball', 18)}${playing ? '새로 시작' : '시작하기'}</button>
      ${playing ? '<p class="ohint">하던 판은 새로 시작하면 사라져요</p>' : ''}
      <dl class="brec"><div><dt>3자리</dt><dd>${rc3.w}승 ${rc3.l}패${rc3.best ? ` · 최고 ${rc3.best}번` : ''}</dd></div><div><dt>4자리</dt><dd>${rc4.w}승 ${rc4.l}패${rc4.best ? ` · 최고 ${rc4.best}번` : ''}</dd></div></dl>`;
    p.querySelectorAll('input[name=sDigits]').forEach(r => r.onchange = () => { solo.n = +r.value; if (!solo.started || solo.over || !solo.guesses.length) { solo.started = false; solo.over = null; solo.guesses = []; } saveSolo(); render(); });
    $('#sHint').onchange = (e) => { solo.hint = e.target.checked; saveSolo(); render(); };
    $('#sStart').onclick = soloNew;
  }

  /* =========================================================
     동기와 대결
     ========================================================= */
  let inviteTo = null, inviteDigits = 3;
  const FAIL = { not_invite: '이미 처리된 신청이에요', not_yours: '내 대결이 아니에요', not_playing: '이미 끝난 대결이에요', not_setup: '숫자를 정하는 단계가 아니에요', not_your_turn: '상대 차례예요', bad_number: '서로 다른 숫자로 채워 주세요', _: '연결을 확인해 주세요' };
  async function act(fn, ok) {
    if (busy) return false; busy = true; let done = false;
    try { await fn(); done = true; if (ok) H.toast(ok); }
    catch (e) { console.warn(e); H.toast(FAIL[e.message] || FAIL._); }
    finally { busy = false; render(); }
    return done;
  }
  const resultText = (g) => !g.winner ? '무승부' : g.winner === me ? '승' : bb.isIn(g) ? '패' : `${nm(g.winner)} 승`;
  function gameRow(g, extra) {
    const op = bb.isIn(g) ? bb.opponent(g) : null;
    const who = op ? `${esc(nm(op))} 님` : `${esc(nm(g.p1))} vs ${esc(nm(g.p2))}`;
    const st = g.status === 'invite' ? (g.p1 === me ? '수락 기다리는 중' : '신청 받음')
      : g.status === 'setup' ? (bb.needsSecret(g) ? '<b class="o-turn">내 숫자 정하기</b>' : '숫자 정하는 중')
      : g.status === 'playing' ? (bb.myTurn(g) ? '<b class="o-turn">내 차례</b>' : `${Math.ceil(g.guesses.length / 2)}번째`)
      : g.status === 'done' ? `${resultText(g)}${g.reason === 'resign' ? ' · 기권' : ` · ${Math.ceil(g.guesses.length / 2)}번`}` : '';
    return `<li class="ogame${g.id === cur ? ' is-cur' : ''}"><button type="button" class="ogame__btn" data-open="${g.id}">${H.avatar(op || g.p1)}<span class="ogame__txt"><b>${who}</b><small>${g.digits}자리 · ${st}</small></span></button>${extra || ''}</li>`;
  }
  function paintPvp() {
    const p = $('#bpvpPanel'), all = bb.all(), others = team.list().filter(m => m.id !== me);
    if (inviteTo && !others.some(m => m.id === inviteTo)) inviteTo = null;
    if (!inviteTo && others.length) inviteTo = others[0].id;
    const got = bb.invitesForMe();
    const mine = all.filter(g => bb.isIn(g) && (['setup', 'playing'].includes(g.status) || (g.status === 'invite' && g.p1 === me)));
    const watch = all.filter(g => !bb.isIn(g) && g.status === 'playing');
    const past = all.filter(g => g.status === 'done').slice(0, 6);
    const done = all.filter(g => g.status === 'done' && bb.isIn(g));
    const w = done.filter(g => g.winner === me).length, l = done.filter(g => g.winner && g.winner !== me).length;
    p.innerHTML = `
      ${got.length ? `<section class="card ocard ocard--hot" aria-labelledby="bgotT"><h2 class="card__title" id="bgotT">${icon('bell', 18)}받은 대결 신청</h2>
        <ul class="ogames">${got.map(g => gameRow(g, `<span class="ogame__act"><button class="btn btn--accent btn--sm" type="button" data-acc="${g.id}">수락</button><button class="btn btn--ghost btn--sm" type="button" data-dec="${g.id}">거절</button></span>`)).join('')}</ul></section>` : ''}
      <section class="card ocard" aria-labelledby="bnewT">
        <div class="card__head"><h2 class="card__title" id="bnewT">${icon('userPlus', 18)}대결 신청</h2>${done.length ? `<span class="orec" title="최근 대결 기준">${w}승 ${l}패</span>` : ''}</div>
        ${others.length ? `<div class="fld"><span class="olabel">상대</span><div class="opp" role="radiogroup" aria-label="상대">
            ${others.map(m => `<label class="opp__m"><input type="radio" name="bopp" value="${m.id}"${m.id === inviteTo ? ' checked' : ''}>${H.avatar(m.id)}<span>${esc(m.name)}</span>${team.status(m.id) !== 'offline' ? '<i class="opp__on" title="접속 중"></i>' : ''}</label>`).join('')}
          </div></div>
          <div class="fld"><span class="olabel">자릿수</span><div class="seg seg--full" role="radiogroup" aria-label="자릿수">
            <label><input type="radio" name="bDigits" value="3"${inviteDigits === 3 ? ' checked' : ''}><span>3자리</span></label>
            <label><input type="radio" name="bDigits" value="4"${inviteDigits === 4 ? ' checked' : ''}><span>4자리</span></label>
          </div></div>
          <p class="ohint">서로 숫자를 숨기고, 신청한 사람부터 번갈아 맞혀요. 먼저 맞히면 이겨요(먼저 시작한 쪽이 맞히면 상대에게 한 번 더 기회).</p>
          <button class="btn btn--accent" type="button" id="bInvite">${icon('ball', 18)}대결 신청하기</button>`
        : `<p class="ohint">아직 다른 멤버가 없어요. 동기를 초대해 주세요.</p><button class="btn btn--ghost" type="button" id="bInviteLink">${icon('userPlus', 16)}초대 링크</button>`}
      </section>
      ${mine.length ? `<section class="card ocard" aria-labelledby="bmineT"><h2 class="card__title" id="bmineT">${icon('ball', 18)}내 대결</h2>
        <ul class="ogames">${mine.map(g => gameRow(g, g.status === 'invite' ? `<span class="ogame__act"><button class="btn btn--ghost btn--sm" type="button" data-cancel="${g.id}">취소</button></span>` : '')).join('')}</ul></section>` : ''}
      ${watch.length ? `<section class="card ocard" aria-labelledby="bwatchT"><h2 class="card__title" id="bwatchT">${icon('users', 18)}다른 멤버 대결 · 관전</h2><ul class="ogames">${watch.map(g => gameRow(g)).join('')}</ul></section>` : ''}
      ${past.length ? `<section class="card ocard" aria-labelledby="bpastT"><h2 class="card__title" id="bpastT">${icon('trophy', 18)}지난 대결</h2><ul class="ogames">${past.map(g => gameRow(g)).join('')}</ul></section>` : ''}`;
    p.querySelectorAll('input[name=bopp]').forEach(r => r.onchange = () => { inviteTo = r.value; });
    p.querySelectorAll('input[name=bDigits]').forEach(r => r.onchange = () => { inviteDigits = +r.value; });
    const inv = $('#bInvite'); if (inv) inv.onclick = () => invite(inviteTo, inviteDigits);
    const il = $('#bInviteLink'); if (il) il.onclick = () => H.openInvite();
    const badge = $('#bpvpBadge'), a = bb.attention(); badge.hidden = !a; badge.textContent = String(a);
  }
  async function invite(to, digits) {
    if (!to || busy) return; busy = true;
    try { const g = await bb.invite(to, digits); open(g.id); H.toast(`${nm(to)} 님에게 숫자야구를 신청했어요 · 수락하면 숫자를 정해요`); }
    catch (e) { console.warn(e); H.toast('대결을 신청하지 못했어요 · 연결을 확인해 주세요'); }
    finally { busy = false; render(); }
  }
  function open(id) { cur = id; buf = ''; history.replaceState(null, '', 'baseball.html' + (id ? '?g=' + encodeURIComponent(id) : '')); render(); }
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#bpvpPanel, .bmain')) return;
    const o = e.target.closest('[data-open]'); if (o) { open(o.dataset.open); if (window.matchMedia('(max-width: 900px)').matches) $('.bmain').scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
    const a = e.target.closest('[data-acc]'); if (a) { open(a.dataset.acc); act(() => bb.respond(a.dataset.acc, true), '수락했어요 · 이제 내 숫자를 정해요'); return; }
    const d = e.target.closest('[data-dec]'); if (d) { act(() => bb.respond(d.dataset.dec, false), '다음에 하자고 전했어요'); return; }
    const c = e.target.closest('[data-cancel]'); if (c) { act(() => bb.cancel(c.dataset.cancel), '신청을 취소했어요'); return; }
  });

  /* =========================================================
     화면 그리기
     ========================================================= */
  function render() {
    document.querySelectorAll('input[name=bmode]').forEach(r => { r.checked = r.value === mode; });
    $('#soloPanel').hidden = mode !== 'solo'; $('#bpvpPanel').hidden = mode !== 'pvp';
    const bar = $('#bbar'), board = $('#bboard'), tools = $('#btools');
    if (mode === 'solo') {
      paintSoloPanel();
      const n = solo.n, lim = LIMIT[n], used = solo.guesses.length;
      if (!solo.started) {
        bar.innerHTML = `<div class="bstat"><b>${n}자리 숫자야구</b><small>컴퓨터가 숨긴 숫자를 ${lim}번 안에 맞혀요</small></div>`;
        board.innerHTML = `<div class="bintro">${secretChips(null, n, true)}<p>예) 정답이 <b>491</b>일 때 <b>123</b> → 1B · <b>481</b> → 2S · <b>780</b> → OUT</p><button class="btn btn--accent" type="button" id="bStart">${icon('ball', 18)}시작하기</button></div>`;
        $('#bStart').onclick = soloNew; paintInput(null); paintMemo(null); tools.innerHTML = ''; return;
      }
      const left = lim - used;
      bar.innerHTML = `<div class="bstat"><b>${solo.over === 'win' ? `홈런! ${used}번 만에 맞혔어요 🎉` : solo.over === 'lose' ? '아쉽게 못 맞혔어요' : `${used + 1}번째 도전`}</b><small>${n}자리 · ${solo.over ? `정답 ${solo.secret}` : `${left}번 남음`}${solo.hint && !solo.over ? ` · 가능한 정답 ${candidates(solo.guesses, n)}개` : ''}</small></div>
        <div class="blife" aria-label="남은 기회 ${left}번">${[...Array(lim)].map((_, i) => `<i class="${i < used ? 'is-used' : ''}"></i>`).join('')}</div>`;
      board.innerHTML = `${solo.over ? `<div class="breveal${solo.over === 'win' ? ' is-win' : ''}"><span>정답</span>${secretChips(solo.secret, n)}<button class="btn btn--accent btn--sm" type="button" id="bAgain">한 판 더</button></div>` : ''}
        ${histList(solo.guesses, n, '숫자를 골라 첫 번째로 불러 보세요')}`;
      const ag = $('#bAgain'); if (ag) ag.onclick = soloNew;
      paintInput(solo.over ? null : { n, submit: soloGuess, okLabel: '던지기' });
      paintMemo(solo.over ? null : 'solo');
      tools.innerHTML = !solo.over ? `<button class="btn btn--ghost btn--sm" type="button" id="bGiveUp">${icon('flag', 16)}포기하고 정답 보기</button>` : '';
      const gu = $('#bGiveUp'); if (gu) gu.onclick = () => { if (gu.dataset.sure) { solo.over = 'lose'; recOf(n).l++; saveSolo(); render(); } else { gu.dataset.sure = '1'; gu.classList.add('btn--danger'); gu.innerHTML = `${icon('flag', 16)}정말 포기할까요?`; } };
      return;
    }
    // ----- 동기와 -----
    paintPvp();
    const g = cur ? bb.get(cur) : null;
    tools.innerHTML = '';
    if (!g) {
      bar.innerHTML = `<div class="bstat"><b>동기와 숫자야구</b><small>오른쪽에서 상대를 골라 대결을 신청해요</small></div>`;
      board.innerHTML = `<div class="bintro">${secretChips(null, 3, true)}<p>서로 숫자를 숨기고 번갈아 맞혀요.<br>상대가 부른 숫자에 S·B 판정은 자동으로 해 줘요.</p></div>`;
      paintInput(null); paintMemo(null); return;
    }
    const n = g.digits, inG = bb.isIn(g), op = inG ? bb.opponent(g) : null;
    const mySec = inG ? bb.secretOf(g, me) : null;
    const head = (id) => `<span class="bwho">${H.avatar(id)}<b>${esc(nm(id))}${id === me ? ' (나)' : ''}</b>${g.status === 'playing' && bb.turnOf(g) === id ? '<em class="bwho__turn">차례</em>' : ''}</span>`;
    bar.innerHTML = `${head(g.p1)}<div class="bstat bstat--mid"><b>${esc(statusText(g))}</b><small>${n}자리${!inG ? ' · 관전 중' : ''}</small></div>${head(g.p2)}`;
    if (g.status === 'invite') {
      board.innerHTML = g.p2 === me
        ? `<div class="bintro">${H.avatar(g.p1, 'av--lg')}<p><b>${esc(nm(g.p1))} 님이 ${n}자리 숫자야구 하재요</b><br>수락하면 각자 숫자를 숨기고 시작해요</p><span class="oover__btns"><button class="btn btn--ghost btn--sm" type="button" data-dec="${g.id}">다음에</button><button class="btn btn--accent btn--sm" type="button" data-acc="${g.id}">수락</button></span></div>`
        : `<div class="bintro"><span class="oover__ic oover__ic--wait">${icon('ball', 30)}</span><p><b>수락을 기다리는 중</b><br>${esc(nm(g.p2))} 님이 수락하면 숫자를 정해요</p>${g.p1 === me ? `<button class="btn btn--ghost btn--sm" type="button" data-cancel="${g.id}">신청 취소</button>` : ''}</div>`;
      paintInput(null); paintMemo(null); return;
    }
    if (g.status === 'declined' || g.status === 'canceled') {
      board.innerHTML = `<div class="bintro"><p><b>${g.status === 'declined' ? `${esc(nm(g.p2))} 님이 다음에 하재요` : '취소된 신청이에요'}</b></p></div>`;
      paintInput(null); paintMemo(null); return;
    }
    if (g.status === 'setup') {
      const opReady = inG ? bb.ready(g, op) : false;
      board.innerHTML = inG
        ? (bb.ready(g) ? `<div class="bintro"><p>내 숫자</p>${secretChips(mySec, n)}<p><b>${esc(nm(op))} 님이 숫자를 정하는 중</b><br>정하면 ${g.p1 === me ? '내가' : `${esc(nm(g.p1))} 님이`} 먼저 맞혀요</p></div>`
          : `<div class="bintro bintro--top"><p><b>상대가 맞힐 내 숫자를 정해요</b><br>서로 다른 숫자 ${n}개 · 상대에겐 끝날 때까지 안 보여요${opReady ? `<br><small>${esc(nm(op))} 님은 벌써 정했어요</small>` : ''}</p></div>`)
        : `<div class="bintro"><p>두 사람이 숫자를 정하는 중이에요</p></div>`;
      paintInput(inG && !bb.ready(g) ? { n, okLabel: '이 숫자로 숨기기', random: true, submit: (v) => act(() => bb.setSecret(g.id, v), '숫자를 숨겼어요') } : null);
      paintMemo(null);
      if (inG) { tools.innerHTML = `<button class="btn btn--ghost btn--sm" type="button" id="bResign">${icon('flag', 16)}그만두기</button>`; resignBtn(g); }
      return;
    }
    // playing / done: 두 사람 기록 나란히
    const rows = (id) => g.guesses.filter(x => x.by === id);
    const col = (id) => {
      const target = id === g.p1 ? g.p2 : g.p1;
      const sec = g.status === 'done' ? bb.secretOf(g, target) : target === me ? mySec : null;
      return `<section class="bcol${g.status === 'playing' && bb.turnOf(g) === id ? ' is-turn' : ''}" aria-label="${esc(nm(id))}의 추측">
        <div class="bcol__head"><b>${id === me ? '내가 맞히는 중' : `${esc(nm(id))} 님이 맞히는 중`}</b><span>${target === me ? '내 숫자' : `${esc(nm(target))} 님 숫자`} ${secretChips(sec, n, !sec)}</span></div>
        ${histList(rows(id), n, id === me ? '아직 안 불렀어요' : '아직 안 불렀어요')}</section>`;
    };
    const order = inG ? [me, op] : [g.p1, g.p2];
    let banner = '';
    if (g.status === 'done') {
      const win = g.winner === me;
      banner = `<div class="breveal${win ? ' is-win' : ''}"><b>${esc(statusText(g))}</b>${inG ? `<button class="btn btn--accent btn--sm" type="button" id="bRe">한 판 더</button>` : ''}</div>`;
    } else if (g.solved1) banner = `<div class="bnote">${g.p1 === me ? `맞혔어요! ${esc(nm(g.p2))} 님의 마지막 기회를 기다려요` : g.p2 === me ? `${esc(nm(g.p1))} 님이 맞혔어요 · 이번에 맞히면 무승부!` : `${esc(nm(g.p1))} 님이 맞혔어요 · ${esc(nm(g.p2))} 님 마지막 기회`}</div>`;
    board.innerHTML = `${banner}<div class="bcols">${order.map(col).join('')}</div>`;
    const re = $('#bRe'); if (re) re.onclick = () => invite(op, n);
    paintInput(bb.myTurn(g) ? { n, okLabel: '던지기', submit: (v) => {
      if (rows(me).some(x => x.g === v)) { H.toast('이미 불러 본 숫자예요'); buf = v; paintInput(inputCfg); return; }
      act(() => bb.guess(g.id, v));
    } } : null);
    paintMemo(inG && g.status === 'playing' ? g.id : null);
    if (inG && g.status === 'playing') { tools.innerHTML = `<button class="btn btn--ghost btn--sm" type="button" id="bResign">${icon('flag', 16)}기권</button>`; resignBtn(g); }
  }
  function statusText(g) {
    const inG = bb.isIn(g);
    if (g.status === 'invite') return g.p1 === me ? '수락 기다리는 중' : `${nm(g.p1)} 님의 신청`;
    if (g.status === 'setup') return '숫자 정하는 중';
    if (g.status === 'playing') return bb.myTurn(g) ? '내 차례예요' : `${nm(bb.turnOf(g))} 님 차례`;
    if (g.status === 'done') return (!g.winner ? '비겼어요 · 둘 다 맞혔어요' : inG ? (g.winner === me ? '이겼어요! 🎉' : `${nm(g.winner)} 님이 이겼어요`) : `${nm(g.winner)} 님 승`) + (g.reason === 'resign' ? ' · 기권' : '');
    return g.status === 'declined' ? '거절된 신청' : '취소된 신청';
  }
  function resignBtn(g) {
    const rs = $('#bResign'); if (!rs) return;
    rs.onclick = () => {
      if (rs.dataset.sure) act(() => bb.resign(g.id), '기권했어요');
      else { rs.dataset.sure = '1'; rs.classList.add('btn--danger'); rs.innerHTML = `${icon('flag', 16)}정말 기권할까요?`; setTimeout(() => { if (document.contains(rs) && rs.dataset.sure) { delete rs.dataset.sure; rs.classList.remove('btn--danger'); rs.innerHTML = `${icon('flag', 16)}${g.status === 'setup' ? '그만두기' : '기권'}`; } }, 4000); }
    };
  }

  document.querySelectorAll('input[name=bmode]').forEach(r => r.addEventListener('change', () => {
    mode = r.value; H.sess.set(MODE_KEY, mode); buf = '';
    history.replaceState(null, '', mode === 'pvp' && cur ? 'baseball.html?g=' + encodeURIComponent(cur) : 'baseball.html');
    render();
  }));

  // 상대가 부르면 화면 읽기 프로그램에도 알림. 입력 중인 숫자(buf)는 다시 그려도 유지
  let lastLen = null;
  document.addEventListener('hub:bb', () => {
    const g = cur && bb.get(cur);
    if (mode === 'pvp' && g && lastLen !== null && g.guesses.length > lastLen) { const x = g.guesses[g.guesses.length - 1]; live(`${nm(x.by)} 님: ${x.g} → ${R.label(x, g.digits)}${bb.myTurn(g) ? ' · 내 차례' : ''}`); }
    lastLen = g ? g.guesses.length : null;
    if (mode === 'pvp') render();
  });
  document.addEventListener('hub:team', () => { if (mode === 'pvp') paintPvp(); });

  if (cur && !bb.get(cur)) { cur = null; history.replaceState(null, '', 'baseball.html'); }
  if (cur) lastLen = bb.get(cur).guesses.length;
  render();
});
