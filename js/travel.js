/* 전국 일주 — 국내 여행지 28칸 보드게임 (라이트 규칙)
   개인전 2~4명 / 2:2 팀전(자리 0·2 vs 1·3). 컴퓨터 상대 없음.
   판정: 주사위·찬스카드는 서버가 시작할 때 정한 seed + 몇 번째 굴림인지(t)로 정해짐 → 다시 굴리기 불가.
         땅·통행료·카드 계산은 지금 차례인 사람의 브라우저가 하고 결과(state)를 저장(Hub.tv.commit).
         서버는 차례·ver(동시 저장 막기)·크기만 확인. */
window.Hub.boot(function () {
  'use strict';
  const H = window.Hub, { $, esc, icon, team, tv } = H;
  H.renderShell('travel');
  document.querySelectorAll('[data-ic]').forEach(el => { el.outerHTML = icon(el.dataset.ic, 18); });

  const me = team.meId();
  const nm = (id) => H.member(id).name;
  const live = (t) => { $('#tvlive').textContent = t; };
  const won = (n) => `${Number(n).toLocaleString('ko-KR')}만`;

  /* =========================================================
     규칙 (라이트)
     ========================================================= */
  const N = 28, START_CASH = 1500, SALARY = 200, ISLAND = 7, ISL_TURNS = 2;
  const C = (n, g, p) => ({ k: 'city', n, g, p });
  const TILES = [
    { k: 'start', n: '출발' },
    C('공주', 0, 60), C('부여', 0, 60), { k: 'chance', n: '찬스' }, C('전주', 1, 80), C('군산', 1, 80), C('남원', 1, 100),
    { k: 'island', n: '무인도' },
    C('목포', 2, 110), C('여수', 2, 110), C('순천', 2, 130), { k: 'chance', n: '찬스' }, C('통영', 3, 140), C('거제', 3, 150),
    { k: 'rest', n: '휴게소' },
    C('안동', 4, 160), C('경주', 4, 160), C('포항', 4, 180), { k: 'chance', n: '찬스' }, C('대구', 5, 200), C('부산', 5, 220),
    { k: 'storm', n: '태풍' },
    C('강릉', 6, 240), C('속초', 6, 240), C('평창', 6, 260), { k: 'tax', n: '여행세', p: 100 }, C('제주', 7, 300), C('서울', 7, 350),
  ];
  const GROUPS = ['충청', '전북', '전남', '경남', '경북', '영남', '강원', '제주·서울'];
  const LV = ['땅', '별장', '빌딩', '호텔'];
  const RENT = [0.1, 0.4, 1.0, 2.0];
  const bcost = (t) => Math.round(t.p / 2 / 10) * 10;            // 건물 한 단계 값
  const mate = (st, a, b) => st.mode === 'team' && a !== b && a % 2 === b % 2;
  const groupOwned = (st, g, s) => TILES.every((t, i) => t.k !== 'city' || t.g !== g || (st.own[i] && st.own[i][0] === s));
  function rentOf(st, i) {
    const o = st.own[i]; if (!o) return 0;
    const t = TILES[i]; let r = Math.round(t.p * RENT[o[1]] / 5) * 5;
    if (groupOwned(st, t.g, o[0])) r *= 2;                       // 같은 색 전부 가지면 통행료 2배
    return r;
  }
  const worth = (st, s) => st.cash[s] + Object.keys(st.own).filter(i => st.own[i][0] === s).reduce((a, i) => a + TILES[i].p + st.own[i][1] * bcost(TILES[i]), 0);

  // 같은 seed·같은 t면 누구 화면에서든 같은 주사위·카드 (mulberry32)
  const mul = (seed) => { let s = seed | 0; return () => { s = (s + 0x6D2B79F5) | 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  const draw = (seed, t) => { const r = mul((seed ^ Math.imul(t + 1, 0x9E3779B1)) | 0); r(); return { d: [1 + (r() * 6 | 0), 1 + (r() * 6 | 0)], c: r() * CARDS.length | 0 }; };

  const CARDS = [
    { t: '출발로 가요', d: '월급 200만도 받아요', f: (st, g, s) => { warp(st, g, s, 0, true); } },
    { t: '여행 보너스', d: '+150만', f: (st, g, s) => { st.cash[s] += 150; } },
    { t: '과속 딱지', d: '-80만', f: (st, g, s) => { pay(st, g, s, null, 80, '과속 딱지'); } },
    { t: '길을 잘못 들었어요', d: '뒤로 3칸', f: (st, g, s) => { moveBy(st, g, s, -3); land(st, g, s, -1); } },
    { t: '배를 놓쳤어요', d: '무인도로 가요', f: (st, g, s) => { warp(st, g, s, ISLAND, false); st.isl[s] = ISL_TURNS; } },
    { t: '서울 출장', d: '서울로 가요', f: (st, g, s) => { warp(st, g, s, 27, true); land(st, g, s, -1); } },
    { t: '제주행 비행기', d: '제주로 가요', f: (st, g, s) => { warp(st, g, s, 26, true); land(st, g, s, -1); } },
    { t: '생일 축하!', d: '모두에게 30만씩 받아요', f: (st, g, s) => { active(st, g).filter(x => x !== s).forEach(x => pay(st, g, x, s, 30, '생일 축하금')); } },
    { t: '한턱 쏘기', d: '모두에게 30만씩 줘요', f: (st, g, s) => { active(st, g).filter(x => x !== s).forEach(x => { if (!isOut(st, g, s)) pay(st, g, s, x, 30, '한턱'); }); } },
    { t: '건물 점검', d: '건물 한 단계마다 25만', f: (st, g, s) => { const n = Object.keys(st.own).filter(i => st.own[i][0] === s).reduce((a, i) => a + st.own[i][1], 0); if (n) pay(st, g, s, null, n * 25, '건물 점검비'); } },
    { t: '지름길 발견', d: '앞으로 2칸', f: (st, g, s) => { moveBy(st, g, s, 2); land(st, g, s, -1); } },
    { t: '복권 당첨', d: '+200만', f: (st, g, s) => { st.cash[s] += 200; } },
  ];

  /* ---------- 상태 ---------- */
  const init = (g) => {
    const n = g.players.length;
    return { v: 1, mode: g.mode, rounds: g.rounds, n, hs: Math.max(0, g.players.indexOf(g.host)), pos: Array(n).fill(0), cash: Array(n).fill(START_CASH), isl: Array(n).fill(0), tc: Array(n).fill(0),
      out: [], own: {}, cur: 0, t: 0, phase: 'roll', pend: null, dice: null, mv: [], card: null, lastBy: null, lastText: '', log: [], end: null };
  };
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const isOut = (st, g, s) => st.out.includes(g.players[s]) || g.resigned.includes(g.players[s]);
  const active = (st, g) => g.players.map((_, s) => s).filter(s => !isOut(st, g, s));
  const sname = (g, s) => nm(g.players[s]);
  let actLog = null;   // 이번 행동에서 새로 생긴 기록 (알림 문구용)
  function log(st, g, s, x) { st.log.push({ s, x }); if (st.log.length > 40) st.log = st.log.slice(-40); if (actLog) actLog.push(x); }
  function release(st, s) { Object.keys(st.own).forEach(k => { if (st.own[k][0] === s) delete st.own[k]; }); }
  // 기권한 사람: 땅 반납·탈락
  function normalize(st, g) {
    g.players.forEach((p, s) => { if (g.resigned.includes(p) && !st.out.includes(p)) { release(st, s); st.cash[s] = 0; st.out.push(p); log(st, g, s, `${sname(g, s)} 님이 기권했어요`); } });
  }
  // 모자라면 건물(싼 곳부터) → 땅 순서로 반값에 팔아서 냄. 그래도 모자라면 파산(가진 돈 다 주고 탈락, 땅은 반납)
  function pay(st, g, s, to, amt, why) {
    if (amt <= 0 || isOut(st, g, s)) return true;
    if (st.cash[s] < amt) {
      const mine = () => Object.keys(st.own).filter(i => st.own[i][0] === s).map(Number).sort((a, b) => TILES[a].p - TILES[b].p);
      let sold = 0, got = 0;
      while (st.cash[s] < amt) { const b = mine().find(i => st.own[i][1] > 0); if (b == null) break; st.own[b][1]--; const v = bcost(TILES[b]) / 2; st.cash[s] += v; got += v; sold++; }
      while (st.cash[s] < amt) { const l = mine()[0]; if (l == null) break; const v = TILES[l].p / 2; st.cash[s] += v; got += v; delete st.own[l]; sold++; }
      if (sold && st.cash[s] >= amt) log(st, g, s, `${sname(g, s)} 님이 돈이 모자라 건물·땅을 팔았어요 (+${won(got)})`);
    }
    if (st.cash[s] < amt) {
      if (to != null) st.cash[to] += st.cash[s];
      st.cash[s] = 0; release(st, s); st.out.push(g.players[s]);
      log(st, g, s, `${sname(g, s)} 님 파산! (${why} ${won(amt)}을 못 냈어요)`);
      return false;
    }
    st.cash[s] -= amt; if (to != null) st.cash[to] += amt;
    return true;
  }
  function moveBy(st, g, s, k) {
    const from = st.pos[s]; let to = from + k;
    if (k > 0 && to >= N) { st.cash[s] += SALARY; log(st, g, s, `출발을 지나 월급 ${won(SALARY)}`); }
    st.pos[s] = ((to % N) + N) % N; st.mv.push({ s, from, k });
  }
  function warp(st, g, s, to, salary) {
    const from = st.pos[s];
    if (salary && to <= from && from !== 0) { st.cash[s] += SALARY; log(st, g, s, `출발을 지나 월급 ${won(SALARY)}`); }
    st.pos[s] = to; st.mv.push({ s, from, to, w: 1 });
  }
  // 도착한 칸 처리 (card < 0이면 찬스 칸이어도 카드 안 뽑음)
  function land(st, g, s, card) {
    if (isOut(st, g, s)) return;
    const i = st.pos[s], t = TILES[i], who = sname(g, s);
    if (t.k === 'city') {
      const o = st.own[i];
      if (!o) { if (st.cash[s] >= t.p) { st.pend = { type: 'buy', i }; st.phase = 'decide'; } else log(st, g, s, `${who} 님 · ${t.n}에 도착했는데 살 돈이 모자라요`); }
      else if (o[0] === s) { if (o[1] < 3 && st.cash[s] >= bcost(t)) { st.pend = { type: 'build', i }; st.phase = 'decide'; } else log(st, g, s, `${who} 님 · 내 땅 ${t.n}${o[1] >= 3 ? '(호텔)' : ''}에 도착`); }
      else if (mate(st, o[0], s)) log(st, g, s, `${who} 님 · ${t.n}은 같은 팀 땅이라 통행료 없어요`);
      else { const r = rentOf(st, i); if (pay(st, g, s, o[0], r, `${t.n} 통행료`)) log(st, g, s, `${who} 님 → ${sname(g, o[0])} 님 · ${t.n} 통행료 ${won(r)}`); }
    } else if (t.k === 'chance') {
      if (card < 0) return;
      const c = CARDS[card]; st.card = { c: card, s }; log(st, g, s, `${who} 님 찬스: ${c.t} (${c.d})`); c.f(st, g, s);
    } else if (t.k === 'tax') { if (pay(st, g, s, null, t.p, '여행세')) log(st, g, s, `${who} 님 · 여행세 ${won(t.p)}`); }
    else if (t.k === 'island') { st.isl[s] = ISL_TURNS; log(st, g, s, `${who} 님 · 무인도에 갇혔어요 (2번 쉬어요, 더블이면 탈출)`); }
    else if (t.k === 'storm') { log(st, g, s, `${who} 님 · 태풍! 무인도로 떠내려가요`); warp(st, g, s, ISLAND, false); st.isl[s] = ISL_TURNS; }
    else if (t.k === 'rest') log(st, g, s, `${who} 님 · 휴게소에서 쉬어 가요`);
  }
  // 끝났나: 한 명(한 팀)만 남음 → last / 모두 정한 바퀴를 다 돎 → rounds(총자산)
  function finish(st, g) {
    const act = active(st, g), team2 = st.mode === 'team';
    if (!team2 && act.length <= 1) return { reason: 'last', winners: act.map(s => g.players[s]) };
    if (team2 && new Set(act.map(s => s % 2)).size <= 1) return { reason: 'last', winners: act.length ? g.players.filter((_, s) => s % 2 === act[0] % 2) : [] };
    if (!act.every(s => st.tc[s] >= st.rounds)) return null;
    if (team2) {
      const t = [0, 1].map(k => g.players.reduce((a, _, s) => a + (s % 2 === k && !isOut(st, g, s) ? worth(st, s) : 0), 0));
      return { reason: 'rounds', winners: t[0] === t[1] ? [] : g.players.filter((_, s) => s % 2 === (t[0] > t[1] ? 0 : 1)) };
    }
    const best = Math.max(...act.map(s => worth(st, s)));
    return { reason: 'rounds', winners: act.filter(s => worth(st, s) === best).map(s => g.players[s]) };
  }
  function nextSeat(st, g, s) { for (let k = 1; k <= st.n; k++) { const c = (s + k) % st.n; if (!isOut(st, g, c)) return c; } return s; }
  function endTurn(st, g, count) {
    st.pend = null; st.phase = 'roll';
    if (count !== false) st.tc[st.cur]++;
    st.end = finish(st, g);
    if (!st.end) st.cur = nextSeat(st, g, st.cur);
  }
  // 행동들 ---------------------------------------------------------
  function doRoll(st, g) {
    const s = st.cur, r = draw(g.seed, st.t), who = sname(g, s); st.t++;
    st.dice = r.d; st.card = null; st.rolled = true;
    const sum = r.d[0] + r.d[1], dbl = r.d[0] === r.d[1];
    log(st, g, s, `${who} 님 주사위 ${r.d[0]}+${r.d[1]}${dbl ? ' 더블!' : ''}`);
    if (st.isl[s] > 0) {
      if (dbl) { st.isl[s] = 0; log(st, g, s, `${who} 님 · 더블로 무인도 탈출!`); }
      else { st.isl[s]--; log(st, g, s, `${who} 님 · 무인도에서 ${st.isl[s] ? '한 번 더 쉬어요' : '쉬었어요 · 다음 차례에 나가요'}`); return endTurn(st, g); }
    }
    moveBy(st, g, s, sum); land(st, g, s, r.c);
    if (!st.pend || isOut(st, g, s)) endTurn(st, g);
  }
  function decide(st, g, choice) {
    const s = st.cur, p = st.pend; if (!p) return; const t = TILES[p.i], b = bcost(t), who = sname(g, s);
    if (p.type === 'buy' && choice === 'land' && st.cash[s] >= t.p) { st.cash[s] -= t.p; st.own[p.i] = [s, 0]; log(st, g, s, `${who} 님이 ${t.n} 땅을 샀어요 (${won(t.p)})`); }
    else if (p.type === 'buy' && choice === 'villa' && st.cash[s] >= t.p + b) { st.cash[s] -= t.p + b; st.own[p.i] = [s, 1]; log(st, g, s, `${who} 님이 ${t.n} 땅 + 별장 (${won(t.p + b)})`); }
    else if (p.type === 'build' && choice === 'build' && st.cash[s] >= b) { st.own[p.i][1]++; st.cash[s] -= b; log(st, g, s, `${who} 님이 ${t.n}에 ${LV[st.own[p.i][1]]}을 올렸어요 (${won(b)})`); }
    else log(st, g, s, `${who} 님 · ${t.n}은 ${p.type === 'buy' ? '안 샀어요' : '그대로 둬요'}`);
    endTurn(st, g);
  }
  // 3분 넘게 안 둔 사람 차례 넘기기 / 기권한 사람 차례 넘기기
  function skip(st, g) {
    const s = st.cur;
    if (isOut(st, g, s)) { st.pend = null; st.phase = 'roll'; st.end = finish(st, g); if (!st.end) st.cur = nextSeat(st, g, s); return; }
    log(st, g, s, `${sname(g, s)} 님이 자리를 비워서 차례를 넘겼어요`); endTurn(st, g);
  }
  // 화면용: 기권한 사람 땅은 바로 비어 보이게
  const viewCache = {};
  function stOf(g) {
    if (!g.players.length) return null;
    const key = g.id + ':' + g.ver + ':' + g.resigned.length, c = viewCache[g.id];
    if (c && c.key === key) return c.st;
    const st = clone(g.state || init(g)); if (g.resigned.length) normalize(st, g);
    viewCache[g.id] = { key, st }; return st;
  }
  window.__travel = { TILES, CARDS, init, draw, rentOf, worth, bcost, doRoll, decide, skip, finish, pay, land, normalize, groupOwned };

  /* =========================================================
     서버에 저장
     ========================================================= */
  let busy = false;
  const FAIL = { not_lobby: '이미 시작했거나 닫힌 방이에요', not_invited: '초대받은 방이 아니에요', not_host: '방장만 시작할 수 있어요', need_players: '아직 다 안 들어왔어요', not_playing: '이미 끝난 게임이에요', not_player: '참가한 게임이 아니에요', not_your_turn: '지금은 내 차례가 아니에요', stale: '다른 화면에서 먼저 진행됐어요 · 새로 불러왔어요', bad_players: '같이 할 사람 수를 확인해 주세요', bad_partner: '팀전은 같은 팀 1명을 골라 주세요', _: '연결을 확인해 주세요' };
  async function run(fn, ok) {
    if (busy) return; busy = true;
    try { await fn(); if (ok) H.toast(ok); } catch (e) { console.warn(e); H.toast(FAIL[e.message] || FAIL._); }
    finally { busy = false; render(); }
  }
  // state를 복사해서 fn으로 바꾼 뒤 저장
  function play(g, fn) {
    return run(async () => {
      const st = clone(g.state || init(g)); normalize(st, g);
      st.mv = []; st.rolled = false; actLog = [];
      const by = st.cur;
      fn(st);
      st.lastBy = by; st.lastText = actLog.slice(-2).join(' · ').slice(0, 90); actLog = null;
      const done = !!st.end;
      await tv.commit(g.id, g.ver, st, done ? null : g.players[st.cur], done, done ? st.end.winners : null, done ? st.end.reason : null);
    });
  }

  /* =========================================================
     화면
     ========================================================= */
  const params = new URLSearchParams(location.search);
  let cur = params.get('g');
  let info = null;              // 눌러 본 칸 번호
  const SEAT_COL = ['#4f8cff', '#ff6b6b', '#3ccf86', '#f5b83d'];
  const TEAM_COL = [['#4f8cff', '#8fb8ff'], ['#ff6b6b', '#ffa48a']];   // A팀(방장 팀) 파랑 / B팀 빨강
  const teamOf = (st, s) => s % 2 === (st.hs || 0) % 2 ? 0 : 1;
  const seatColor = (st, s) => st && st.mode === 'team' ? TEAM_COL[teamOf(st, s)][s >= 2 ? 1 : 0] : SEAT_COL[s];
  const teamName = (st, s) => teamOf(st, s) ? 'B팀' : 'A팀';
  // 칸 → 8×8 격자 자리 (출발은 오른쪽 아래, 시계 반대 방향… 아래줄 왼쪽으로 → 왼쪽 위로 → 위쪽 오른쪽으로 → 오른쪽 아래로)
  const cell = (i) => i === 0 ? [8, 8] : i < 7 ? [8, 8 - i] : i === 7 ? [8, 1] : i < 14 ? [8 - (i - 7), 1] : i === 14 ? [1, 1] : i < 21 ? [1, i - 13] : i === 21 ? [1, 8] : [i - 20, 8];
  const DICE = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // 애니메이션: 새 ver를 처음 볼 때 주사위 굴림 → 말이 한 칸씩 이동
  const seenVer = {};
  let anim = null;   // { pos: [...], dice: [a,b] | null, rolling: bool }
  function startAnim(g) {
    const st = g.state, prev = seenVer[g.id]; seenVer[g.id] = g.ver;
    if (prev == null || prev >= g.ver || reduce || !st || (!st.rolled && !(st.mv && st.mv.length))) return false;
    const pos = st.pos.slice(), steps = [];
    st.mv.slice().reverse().forEach(m => { pos[m.s] = m.from; });
    st.mv.forEach(m => { if (m.w) steps.push([m.s, m.to]); else { const d = m.k > 0 ? 1 : -1; for (let k = 1; k <= Math.abs(m.k); k++) steps.push([m.s, ((m.from + d * k) % N + N) % N]); } });
    anim = { pos, dice: null, rolling: true, id: g.id };
    const rolled = st.rolled && st.dice;
    let k = 0;
    const tick = () => {
      if (!anim || anim.id !== g.id) return;
      if (k < steps.length) { anim.pos[steps[k][0]] = steps[k][1]; k++; paintBoard(g, anim.pos); setTimeout(tick, 120); }
      else { anim = null; render(); }
    };
    if (rolled) {
      let n = 0; const spin = () => { if (!anim || anim.id !== g.id) return; if (n++ < 6) { anim.dice = [1 + (Math.random() * 6 | 0), 1 + (Math.random() * 6 | 0)]; paintCenter(g); setTimeout(spin, 70); } else { anim.dice = null; anim.rolling = false; paintCenter(g); setTimeout(tick, 150); } };
      spin();
    } else { anim.rolling = false; tick(); }
    return true;
  }

  function paintBoard(g, posOverride) {
    const b = $('#tvb'), st = g ? stOf(g) : null;
    const pos = posOverride || (st ? st.pos : []);
    if (!b.dataset.ready) {
      b.innerHTML = TILES.map((t, i) => { const [r, c] = cell(i); return `<button type="button" class="tvt tvt--${t.k}${t.k === 'city' ? ' tvg' + t.g : ''}${[0, 7, 14, 21].includes(i) ? ' tvt--corner' : ''}" data-i="${i}" style="grid-row:${r};grid-column:${c}" aria-label="${esc(t.n)}"><span class="tvt__n">${esc(t.n)}</span><span class="tvt__p"></span><span class="tvt__lv"></span><span class="tvt__toks"></span></button>`; }).join('') + `<div class="tvc" id="tvc"></div>`;
      b.dataset.ready = '1';
    }
    b.querySelectorAll('.tvt').forEach(el => {
      const i = +el.dataset.i, t = TILES[i], o = st && st.own[i];
      el.style.setProperty('--own', o ? seatColor(st, o[0]) : 'transparent');
      el.classList.toggle('is-own', !!o); el.classList.toggle('is-info', info === i);
      el.classList.toggle('is-here', !!(st && g.status === 'playing' && !anim && st.pos[st.cur] === i));
      el.querySelector('.tvt__p').textContent = t.k === 'city' ? (o ? won(rentOf(st, i)) : won(t.p)) : t.k === 'tax' ? won(t.p) : '';
      el.querySelector('.tvt__lv').innerHTML = o && o[1] ? (o[1] === 3 ? '★' : '▮'.repeat(o[1])) : '';
      const toks = st ? g.players.map((p, s) => ({ p, s })).filter(x => pos[x.s] === i && !isOut(st, g, x.s)) : [];
      el.querySelector('.tvt__toks').innerHTML = toks.map(x => `<span class="tvtok${x.s === st.cur && g.status === 'playing' ? ' is-cur' : ''}" style="--c:${seatColor(st, x.s)}" title="${esc(nm(x.p))}">${H.avatar(x.p)}</span>`).join('');
      const lbl = `${t.n}${t.k === 'city' ? ` · ${GROUPS[t.g]} · ${o ? `${nm(g.players[o[0]])} 님 ${LV[o[1]]} · 통행료 ${won(rentOf(st, i))}` : `${won(t.p)}`}` : ''}${toks.length ? ` · 여기: ${toks.map(x => nm(x.p)).join(', ')}` : ''}`;
      el.setAttribute('aria-label', lbl);
    });
  }

  function infoHtml(g, i) {
    const t = TILES[i], st = stOf(g), o = st.own[i];
    const desc = { start: `지나가거나 도착하면 월급 ${won(SALARY)}`, island: '도착하면 2번 쉬어요 · 더블이 나오면 바로 탈출', rest: '아무 일도 없어요 · 쉬어 가요', storm: '무인도로 떠내려가요 (월급 없음)', chance: '찬스카드 12장 중 하나', tax: `${won(t.p)}을 내요` }[t.k];
    if (t.k !== 'city') return `<div class="tvinfo"><b>${esc(t.n)}</b><span>${desc}</span><button class="link-btn" type="button" data-info-close>닫기</button></div>`;
    const b = bcost(t), same = TILES.filter(x => x.g === t.g).map(x => x.n).join('·');
    return `<div class="tvinfo"><b><i class="tvdot tvg${t.g}"></i>${esc(t.n)} <small>${GROUPS[t.g]}</small></b>
      <span>땅 ${won(t.p)} · 건물 한 단계 ${won(b)}</span>
      <span class="tvinfo__r">통행료 ${RENT.map((r, k) => `${LV[k]} ${won(Math.round(t.p * r / 5) * 5)}`).join(' · ')}</span>
      <span>${same} 다 가지면 통행료 2배</span>
      <span>${o ? `<b style="color:${seatColor(st, o[0])}">${esc(nm(g.players[o[0]]))}</b> 님 · ${LV[o[1]]}` : '아직 주인 없음'}</span>
      <button class="link-btn" type="button" data-info-close>닫기</button></div>`;
  }

  function paintCenter(g) {
    const c = $('#tvc'); if (!c) return;
    if (!g || g.status !== 'playing') { c.innerHTML = info != null && g && g.players.length ? infoHtml(g, info) : `<div class="tvc__logo">${icon('map', 28)}<b>전국 일주</b><small>국내 여행지 28칸</small></div>`; return; }
    if (info != null && !anim) { c.innerHTML = infoHtml(g, info); return; }
    const st = stOf(g), s = st.cur, mine = g.players[s] === me && !g.resigned.includes(me);
    const round = Math.min(st.rounds, Math.min(...active(st, g).map(x => st.tc[x])) + 1);
    const d = anim && anim.dice ? anim.dice : st.dice;
    let body = '';
    if (anim) body = `<span class="tvc__st">${esc(sname(g, (st.mv[0] || { s }).s))} 님 이동 중…</span>`;
    else if (mine && st.phase === 'decide' && st.pend) {
      const t = TILES[st.pend.i], b = bcost(t), cash = st.cash[s];
      body = st.pend.type === 'buy'
        ? `<span class="tvc__st"><b>${esc(t.n)}</b> 살까요? <small>내 돈 ${won(cash)}</small></span>
           <span class="tvc__btns"><button class="btn btn--accent btn--sm" type="button" data-pick="land">땅 ${won(t.p)}</button>${cash >= t.p + b ? `<button class="btn btn--ghost btn--sm" type="button" data-pick="villa">땅+별장 ${won(t.p + b)}</button>` : ''}<button class="btn btn--ghost btn--sm" type="button" data-pick="skip">안 살래요</button></span>`
        : `<span class="tvc__st"><b>${esc(t.n)}</b>에 ${LV[st.own[st.pend.i][1] + 1]} 올릴까요? <small>내 돈 ${won(cash)}</small></span>
           <span class="tvc__btns"><button class="btn btn--accent btn--sm" type="button" data-pick="build">${LV[st.own[st.pend.i][1] + 1]} ${won(b)}</button><button class="btn btn--ghost btn--sm" type="button" data-pick="skip">그대로</button></span>`;
    } else if (mine) body = `<span class="tvc__st"><b>내 차례예요</b>${st.isl[s] ? ' <small>무인도 · 더블이면 탈출</small>' : ''}</span><button class="btn btn--accent tvroll" type="button" id="tvRoll">${icon('dice', 18)}주사위 굴리기</button>`;
    else {
      const stuck = g.players.includes(me) && !g.resigned.includes(me) && Date.now() - g.acted > 180000;
      lastStuck = stuck;
      body = `<span class="tvc__st"><span class="tvc__who" style="--c:${seatColor(st, s)}">${H.avatar(g.players[s])}</span><b>${esc(sname(g, s))}</b> 님 ${st.phase === 'decide' ? '고르는 중' : '차례'}</span>${stuck ? `<button class="btn btn--ghost btn--sm" type="button" id="tvSkip">3분 넘게 안 둬서 차례 넘기기</button>` : ''}`;
    }
    const card = !anim && st.card && st.lastBy === st.card.s ? CARDS[st.card.c] : null;
    const last = !anim && st.log.length ? st.log[st.log.length - 1].x : '';
    c.innerHTML = `<span class="tvc__round">${round} / ${st.rounds}바퀴${st.mode === 'team' ? ' · 2:2' : ''}</span>
      <span class="tvdice${anim && anim.dice ? ' is-rolling' : ''}" aria-label="${d ? `주사위 ${d[0]}, ${d[1]}` : '주사위'}">${d ? `<i>${DICE[d[0]]}</i><i>${DICE[d[1]]}</i>` : '<i>⚀</i><i>⚀</i>'}</span>
      ${card ? `<span class="tvcard"><b>찬스</b> ${esc(card.t)} <small>${esc(card.d)}</small></span>` : last ? `<span class="tvc__last">${esc(last)}</span>` : ''}
      ${body}`;
    const rb = $('#tvRoll', c); if (rb) rb.onclick = () => play(g, (st2) => doRoll(st2, g));
    c.querySelectorAll('[data-pick]').forEach(b => b.onclick = () => play(g, (st2) => decide(st2, g, b.dataset.pick)));
    const sk = $('#tvSkip', c); if (sk) sk.onclick = () => play(g, (st2) => skip(st2, g));
  }

  function paintPlayers(g) {
    const box = $('#tvps');
    if (!g || !g.players.length) { box.hidden = true; return; }
    const st = stOf(g); box.hidden = false;
    const team2 = st.mode === 'team';
    const tsum = team2 ? [0, 1].map(k => g.players.reduce((a, _, s) => a + (teamOf(st, s) === k && !isOut(st, g, s) ? worth(st, s) : 0), 0)) : null;
    box.innerHTML = (team2 ? `<div class="tvteams"><span style="--c:${TEAM_COL[0][0]}">A팀 ${won(tsum[0])}</span><span style="--c:${TEAM_COL[1][0]}">B팀 ${won(tsum[1])}</span></div>` : '') +
      `<ol class="tvplist">${g.players.map((p, s) => {
        const out = isOut(st, g, s), win = g.status === 'done' && g.winners.includes(p);
        return `<li class="tvp${s === st.cur && g.status === 'playing' ? ' is-cur' : ''}${out ? ' is-out' : ''}${p === me ? ' is-me' : ''}${win ? ' is-win' : ''}" style="--c:${seatColor(st, s)}">
          <span class="tvp__av">${H.avatar(p)}</span>
          <span class="tvp__txt"><b>${esc(nm(p))}${team2 ? ` <small>${teamName(st, s)}</small>` : ''}</b><small>${out ? (g.resigned.includes(p) ? '기권' : '파산') : `${won(st.cash[s])} · 자산 ${won(worth(st, s))}`}${!out && st.isl[s] ? ' · 무인도' : ''}</small></span>
          ${win ? `<span class="tvp__win">${icon('trophy', 14)}</span>` : ''}</li>`;
      }).join('')}</ol>`;
  }

  function paintLog(g) {
    const ol = $('#tvlog');
    if (!g || !g.state || !g.state.log.length) { ol.hidden = true; return; }
    const st = g.state; ol.hidden = false;
    ol.innerHTML = st.log.slice(-6).reverse().map(l => `<li style="--c:${seatColor(st, l.s)}">${esc(l.x)}</li>`).join('');
  }

  /* ---------- 오른쪽: 방 만들기·목록 ---------- */
  let pickSet = null, mode = 'solo', rounds = 15, partner = null;
  function paintSide() {
    const p = $('#tvside'), others = team.list().filter(m => m.id !== me);
    if (!pickSet) pickSet = new Set(others.map(m => m.id).slice(0, 3));
    [...pickSet].forEach(id => { if (!others.some(m => m.id === id)) pickSet.delete(id); });
    if (partner && !pickSet.has(partner)) partner = null;
    if (mode === 'team' && !partner && pickSet.size) partner = [...pickSet][0];
    const all = tv.all(), invites = tv.invitesForMe();
    const mine = all.filter(g => tv.isPlayer(g) && ['lobby', 'playing'].includes(g.status));
    const watch = all.filter(g => !tv.isPlayer(g) && g.status === 'playing');
    const past = all.filter(g => g.status === 'done').slice(0, 5);
    const wins = all.filter(g => g.status === 'done' && g.winners.includes(me)).length;
    const row = (g, extra) => {
      const st = g.state, kind = g.mode === 'team' ? '2:2' : `${(g.players.length || g.joined.length)}명`;
      const s = g.status === 'lobby' ? `대기실 · ${g.joined.length}명 들어옴` : g.status === 'playing' ? (tv.myTurn(g) ? '<b class="o-turn">내 차례</b>' : `${esc(nm(g.turn))} 님 차례`) + (st ? ` · ${Math.min(g.rounds, Math.min(...active(st, g).map(x => st.tc[x])) + 1)}바퀴째` : '') : g.status === 'done' ? (!g.winners.length ? '무승부' : g.winners.includes(me) ? '<b class="o-turn">승리</b>' : `${esc(g.winners.map(nm).join('·'))} 님 승`) : '';
      return `<li class="ogame${g.id === cur ? ' is-cur' : ''}"><button type="button" class="ogame__btn" data-open="${g.id}">${H.avatar(g.host)}<span class="ogame__txt"><b>${esc(nm(g.host))} 님의 방 · ${kind} · ${g.rounds}바퀴</b><small>${s}</small></span></button>${extra || ''}</li>`;
    };
    const need = mode === 'team' ? 3 : '1~3';
    p.innerHTML = `
      ${invites.length ? `<section class="card ocard ocard--hot" aria-labelledby="tgT"><h2 class="card__title" id="tgT">${icon('bell', 18)}초대</h2>
        <ul class="ogames">${invites.map(g => row(g, `<span class="ogame__act"><button class="btn btn--accent btn--sm" type="button" data-join="${g.id}">참가</button><button class="btn btn--ghost btn--sm" type="button" data-leave="${g.id}">거절</button></span>`)).join('')}</ul></section>` : ''}
      <section class="card ocard" aria-labelledby="tnT">
        <div class="card__head"><h2 class="card__title" id="tnT">${icon('userPlus', 18)}방 만들기</h2>${wins ? `<span class="orec">${wins}번 승리</span>` : ''}</div>
        ${others.length ? `
          <div class="seg seg--full" role="radiogroup" aria-label="방식">
            <label><input type="radio" name="tmode" value="solo"${mode === 'solo' ? ' checked' : ''}><span>개인전</span></label>
            <label><input type="radio" name="tmode" value="team"${mode === 'team' ? ' checked' : ''}${others.length < 3 ? ' disabled' : ''}><span>2:2 팀전</span></label>
          </div>
          <div class="fld"><span class="olabel">같이 할 사람 (${need}명)</span><div class="opp" role="group" aria-label="같이 할 사람">
            ${others.map(m => `<label class="opp__m"><input type="checkbox" name="tinv" value="${m.id}"${pickSet.has(m.id) ? ' checked' : ''}>${H.avatar(m.id)}<span>${esc(m.name)}</span>${team.status(m.id) !== 'offline' ? '<i class="opp__on" title="접속 중"></i>' : ''}</label>`).join('')}
          </div></div>
          ${mode === 'team' ? `<div class="fld"><span class="olabel">우리 팀 (나 + 1명)</span><div class="seg seg--full" role="radiogroup" aria-label="같은 팀">
            ${[...pickSet].map(id => `<label><input type="radio" name="tpart" value="${id}"${partner === id ? ' checked' : ''}><span>${esc(H.shortName(nm(id)))}</span></label>`).join('') || '<span class="ohint">먼저 같이 할 사람을 골라요</span>'}
          </div></div>` : ''}
          <div class="fld"><span class="olabel">몇 바퀴</span><div class="seg seg--full" role="radiogroup" aria-label="몇 바퀴">
            ${tv.ROUNDS.map(v => `<label><input type="radio" name="trounds" value="${v}"${v === rounds ? ' checked' : ''}><span>${v}바퀴</span></label>`).join('')}
          </div></div>
          <p class="ohint">${mode === 'team' ? '4명이 다 들어오면 시작. 같은 팀 땅은 통행료가 없고, 끝날 때 팀 자산 합으로 겨뤄요.' : '2명 이상 들어오면 시작할 수 있어요. 순서는 랜덤.'} 한 바퀴 = 모두 한 번씩.</p>
          <button class="btn btn--accent" type="button" id="tCreate">${icon('map', 18)}방 만들고 초대하기</button>`
        : `<p class="ohint">아직 다른 멤버가 없어요. 동기를 초대해 주세요.</p><button class="btn btn--ghost" type="button" id="tInviteLink">${icon('userPlus', 16)}초대 링크</button>`}
      </section>
      ${mine.length ? `<section class="card ocard" aria-labelledby="tmT"><h2 class="card__title" id="tmT">${icon('map', 18)}내 게임</h2><ul class="ogames">${mine.map(g => row(g)).join('')}</ul></section>` : ''}
      ${watch.length ? `<section class="card ocard" aria-labelledby="twT"><h2 class="card__title" id="twT">${icon('users', 18)}다른 멤버 게임 · 관전</h2><ul class="ogames">${watch.map(g => row(g)).join('')}</ul></section>` : ''}
      ${past.length ? `<section class="card ocard" aria-labelledby="tpT"><h2 class="card__title" id="tpT">${icon('trophy', 18)}지난 게임</h2><ul class="ogames">${past.map(g => row(g)).join('')}</ul></section>` : ''}
      <details class="card ocard tvrules"><summary class="card__title">${icon('doc', 18)}규칙</summary>
        <ul class="bprules">
          <li>시작 돈 ${won(START_CASH)} · 출발을 지나면 월급 ${won(SALARY)}</li>
          <li>빈 땅에 서면 살 수 있어요(땅만 / 땅+별장). 내 땅에 다시 서면 건물 한 단계 올리기: 별장 → 빌딩 → 호텔</li>
          <li>남의 땅에 서면 통행료. 같은 색 땅을 다 가지면 2배${mode === 'team' ? ' · 같은 팀 땅은 공짜' : ''}</li>
          <li>돈이 모자라면 건물·땅을 반값에 자동으로 팔고, 그래도 모자라면 파산</li>
          <li>찬스 12장 · 무인도 2번 쉬기(더블이면 탈출) · 태풍은 무인도로 · 여행세 ${won(100)}</li>
          <li>정한 바퀴가 끝나면 총자산(돈+땅+건물)이 많은 쪽이 승. 혼자(한 팀)만 남아도 승</li>
          <li>3분 넘게 안 두면 다른 사람이 차례를 넘길 수 있어요</li>
        </ul></details>`;
    p.querySelectorAll('input[name=tmode]').forEach(r => r.onchange = () => { mode = r.value; if (mode === 'team') { const keep = [...pickSet].slice(0, 3); others.forEach(m => { if (keep.length < 3 && !keep.includes(m.id)) keep.push(m.id); }); pickSet = new Set(keep); } paintSide(); });
    p.querySelectorAll('input[name=tinv]').forEach(c => c.onchange = () => {
      if (c.checked) pickSet.add(c.value); else pickSet.delete(c.value);
      if (pickSet.size > 3) { pickSet.delete(c.value); c.checked = false; H.toast('최대 3명까지 초대할 수 있어요'); }
      if (mode === 'team') paintSide();
    });
    p.querySelectorAll('input[name=tpart]').forEach(r => r.onchange = () => { partner = r.value; });
    p.querySelectorAll('input[name=trounds]').forEach(r => r.onchange = () => { rounds = +r.value; });
    const cr = $('#tCreate'); if (cr) cr.onclick = () => {
      if (mode === 'team' && pickSet.size !== 3) { H.toast('팀전은 3명을 골라야 해요 (4명이 같이)'); return; }
      if (!pickSet.size) { H.toast('같이 할 사람을 1명 이상 골라 주세요'); return; }
      run(async () => { const id = await tv.create([...pickSet], mode, rounds, mode === 'team' ? partner : null); open(id); }, '방을 만들었어요 · 다 들어오면 시작을 눌러요');
    };
    const il = $('#tInviteLink'); if (il) il.onclick = () => H.openInvite();
  }

  function open(id) { cur = id; info = null; anim = null; history.replaceState(null, '', 'travel.html' + (id ? '?g=' + encodeURIComponent(id) : '')); render(); }

  function paintOver(g) {
    const over = $('#tvover');
    if (!g) { over.hidden = false; over.innerHTML = `<div class="oover__box"><span class="oover__ic">${icon('map', 30)}</span><b>전국 일주 한 판?</b><span>오른쪽에서 개인전·2:2 팀전과 바퀴 수를 골라<br>방을 만들어요</span></div>`; return; }
    const isP = tv.isPlayer(g);
    if (g.status === 'lobby') {
      const n = g.joined.length, team2 = g.mode === 'team', ready = team2 ? n === 4 : n >= 2;
      const who = [g.host].concat(g.invited).map(id => `<li class="${g.joined.includes(id) ? 'is-in' : ''}">${H.avatar(id)}<span>${esc(H.shortName(nm(id)))}</span>${team2 ? `<small>${id === g.host || id === g.partner ? 'A' : 'B'}</small>` : ''}</li>`).join('');
      over.hidden = false;
      over.innerHTML = g.host === me
        ? `<div class="oover__box"><b>대기실 · ${n}/${g.invited.length + 1}명</b><ul class="tvwho">${who}</ul><span>${team2 ? '4명이 다 들어오면 시작할 수 있어요' : '안 들어온 사람은 빼고 시작해요'}</span><span class="oover__btns"><button class="btn btn--ghost btn--sm" type="button" data-leave="${g.id}">방 닫기</button><button class="btn btn--accent btn--sm" type="button" data-start="${g.id}"${ready ? '' : ' disabled'}>시작</button></span></div>`
        : tv.pendingFor(g) ? `<div class="oover__box">${H.avatar(g.host, 'av--lg')}<b>${esc(nm(g.host))} 님이 전국 일주에 불렀어요</b><span>${team2 ? `2:2 팀전 · 나는 ${g.partner === me ? `${esc(H.shortName(nm(g.host)))} 님과 같은 팀` : '상대 팀'}` : '개인전'} · ${g.rounds}바퀴</span><ul class="tvwho">${who}</ul><span class="oover__btns"><button class="btn btn--ghost btn--sm" type="button" data-leave="${g.id}">거절</button><button class="btn btn--accent btn--sm" type="button" data-join="${g.id}">참가</button></span></div>`
        : isP ? `<div class="oover__box"><span class="oover__ic oover__ic--wait">${icon('map', 30)}</span><b>방장이 시작하길 기다리는 중</b><ul class="tvwho">${who}</ul><button class="btn btn--ghost btn--sm" type="button" data-leave="${g.id}">나가기</button></div>`
        : `<div class="oover__box"><b>대기 중인 방이에요</b><ul class="tvwho">${who}</ul></div>`;
      return;
    }
    if (g.status === 'canceled') { over.hidden = false; over.innerHTML = `<div class="oover__box oover__box--sm"><b>닫힌 방이에요</b></div>`; return; }
    if (g.status === 'done' && !anim) {
      const st = stOf(g), win = g.winners.includes(me);
      const rank = g.players.map((p, s) => ({ p, s, w: isOut(st, g, s) ? -1 : worth(st, s) })).sort((a, b) => b.w - a.w);
      over.hidden = false;
      over.innerHTML = `<div class="oover__box${win ? ' is-win' : ''}"><b>${!g.winners.length ? '무승부!' : win ? (g.mode === 'team' ? '우리 팀 승리! 🎉' : '1등! 🎉') : `${esc(g.winners.map(x => H.shortName(nm(x))).join('·'))} 님 ${g.mode === 'team' ? '팀 ' : ''}승리`}</b>
        <span>${g.reason === 'resign' ? '상대가 기권했어요' : g.reason === 'last' ? '끝까지 남은 쪽이 이겼어요' : `${g.rounds}바퀴 끝 · 총자산으로`}</span>
        <ol class="tvrank">${rank.map((r, k) => `<li style="--c:${seatColor(st, r.s)}">${k + 1}. ${H.avatar(r.p)}<span>${esc(nm(r.p))}${g.mode === 'team' ? ` <small>${teamName(st, r.s)}</small>` : ''}</span><b>${r.w < 0 ? (g.resigned.includes(r.p) ? '기권' : '파산') : won(r.w)}</b></li>`).join('')}</ol>
        ${g.players.includes(me) ? `<button class="btn btn--accent btn--sm" type="button" data-again="${g.id}">같은 사람들로 한 판 더</button>` : ''}</div>`;
      return;
    }
    over.hidden = true;
  }

  function render() {
    paintSide();
    const g = cur ? tv.get(cur) : null;
    if (g && g.status === 'playing' && !anim) startAnim(g);
    else if (g && !anim) seenVer[g.id] = g.ver;
    paintPlayers(g); paintBoard(g, anim && anim.id === (g && g.id) ? anim.pos : null); paintCenter(g); paintLog(g); paintOver(g);
    const actions = $('#tvActs');
    if (actions) actions.remove();
    if (g && g.status === 'playing' && g.players.includes(me) && !g.resigned.includes(me)) {
      $('#tvlog').insertAdjacentHTML('afterend', `<div class="tvacts" id="tvActs"><button class="btn btn--ghost btn--sm" type="button" id="tvResign">${icon('flag', 16)}기권</button></div>`);
      let armed = false;
      $('#tvResign').onclick = (e) => {
        if (!armed) { armed = true; e.currentTarget.innerHTML = `${icon('flag', 16)}정말 기권할까요?`; e.currentTarget.classList.add('btn--danger'); return; }
        run(() => tv.resign(g.id), '기권했어요');
      };
    }
    autoSkipResigned(g);
  }
  // 차례인 사람이 기권했으면 다음 사람 화면이 알아서 넘김
  let autoKey = null;
  function autoSkipResigned(g) {
    if (!g || g.status !== 'playing' || !g.resigned.includes(g.turn) || busy || anim) return;
    const st = g.state || init(g), s = g.players.indexOf(g.turn);
    const t = clone(st); normalize(t, g);
    if (g.players[nextSeat(t, g, s)] !== me || g.resigned.includes(me)) return;
    const key = g.id + ':' + g.ver; if (autoKey === key) return; autoKey = key;
    play(g, (st2) => skip(st2, g));
  }

  // 클릭: 방 열기·참가·거절·시작·한 판 더·칸 정보
  document.addEventListener('click', (e) => {
    const t = e.target.closest('.tvt'); if (t && t.closest('#tvb')) { const i = +t.dataset.i; info = info === i ? null : i; const g = cur ? tv.get(cur) : null; if (g) { paintBoard(g, anim ? anim.pos : null); paintCenter(g); } else { paintBoard(null); $('#tvc').innerHTML = `<div class="tvinfo"><b>${esc(TILES[i].n)}</b>${TILES[i].p ? `<span>${won(TILES[i].p)}</span>` : ''}<button class="link-btn" type="button" data-info-close>닫기</button></div>`; } return; }
    if (e.target.closest('[data-info-close]')) { info = null; const g = cur ? tv.get(cur) : null; if (g) { paintBoard(g); paintCenter(g); } else render(); return; }
    if (!e.target.closest('#tvside, .tvmain')) return;
    const o = e.target.closest('[data-open]'); if (o) { open(o.dataset.open); if (window.matchMedia('(max-width: 900px)').matches) $('.tvmain').scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
    const j = e.target.closest('[data-join]'); if (j) { open(j.dataset.join); run(() => tv.join(j.dataset.join), '참가했어요 · 방장이 시작하면 알려 줄게요'); return; }
    const l = e.target.closest('[data-leave]'); if (l) { const g = tv.get(l.dataset.leave); run(() => tv.leave(l.dataset.leave), g && g.host === me ? '방을 닫았어요' : g && g.joined.includes(me) ? '방에서 나왔어요' : '거절했어요'); return; }
    const s = e.target.closest('[data-start]'); if (s) { run(() => tv.start(s.dataset.start), '시작! 순서는 랜덤이에요'); return; }
    const ag = e.target.closest('[data-again]'); if (ag) {
      const g = tv.get(ag.dataset.again); if (!g) return;
      const my = g.players.indexOf(me), part = g.mode === 'team' ? g.players.find((p, k) => k !== my && k % 2 === my % 2) : null;
      run(async () => { const id = await tv.create(g.players.filter(x => x !== me), g.mode, g.rounds, part); open(id); }, '같은 사람들로 새 방을 만들었어요');
    }
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && info != null) { info = null; render(); } });
  document.addEventListener('hub:tv', () => { if (!anim) render(); else paintSide(); });
  document.addEventListener('hub:team', () => { if (!anim) { paintSide(); const g = cur ? tv.get(cur) : null; paintPlayers(g); } });
  let lastStuck = false;
  document.addEventListener('hub:tick', () => {
    const g = cur ? tv.get(cur) : null; if (!g || g.status !== 'playing' || anim || busy || info != null || tv.myTurn(g)) return;
    const stuck = g.players.includes(me) && !g.resigned.includes(me) && Date.now() - g.acted > 180000;
    if (stuck !== lastStuck) paintCenter(g);
  });

  if (cur && !tv.get(cur)) { cur = null; history.replaceState(null, '', 'travel.html'); }
  if (!cur) { const mineNow = tv.all().find(g => tv.myTurn(g)) || tv.invitesForMe()[0] || tv.all().find(g => tv.isPlayer(g) && ['lobby', 'playing'].includes(g.status)); if (mineNow) open(mineNow.id); }
  render();
  live('전국 일주');
});
