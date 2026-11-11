/* =========================================================
   interns 공통: 아이콘, 테마, 데이터(멤버·접속 상태·쪽지·공지·일정·점심·활동), 상단바·사이드바, 알림, 토스트

   데이터 저장 방식은 두 가지이고, data/team.js의 supabase 값으로 자동 선택돼요.
   - Supabase 모드 : url·key가 있으면 → 실제 DB(Supabase), 다른 기기끼리 실시간 공유
                    기기마다 '익명 로그인' 사용자를 받고, 비밀번호로 입장하면 그 기기가 멤버와 연결돼요.
                    DB 보안 규칙(RLS)이 '입장한 기기만' 읽게 하고, 1:1 쪽지는 당사자만 읽게 막아요.
   - 로컬 모드     : 비어 있으면 → 이 브라우저 localStorage (같은 브라우저 탭끼리만 · 미리보기용)
   화면 코드는 두 모드 모두 같은 Hub.team / Hub.messages / Hub.notices / Hub.schedules / Hub.lunch를 써요.
   ========================================================= */
(function () {
  'use strict';
  const TEAM = Object.assign({ name: 'interns', sub: '', password: '', links: [], supabase: {}, scheduleKinds: [], lunchIdeas: [] }, window.HUB_TEAM || {});
  const SB = TEAM.supabase || {};
  const SB_LIB = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.119.0/dist/umd/supabase.js';
  const $ = (s, el) => (el || document).querySelector(s);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const emit = (name, detail) => document.dispatchEvent(new CustomEvent(name, { detail }));

  /* ---------- 아이콘 (24px stroke) ---------- */
  const P = {
    calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    doc: '<path d="M7 3.5h7l4.5 4.5v12.5H7z"/><path d="M14 3.5V8h4.5M10 13h5M10 16.5h5"/>',
    folder: '<path d="M3.5 7.5a2 2 0 0 1 2-2h4l2 2.5h7a2 2 0 0 1 2 2v7.5a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z"/>',
    link: '<path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1"/><path d="M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1"/>',
    home: '<path d="M4 11l8-6.5 8 6.5V20h-5.5v-5.5h-5V20H4z"/>',
    users: '<circle cx="9" cy="8.5" r="3.5"/><path d="M3 20c.6-3.4 3-5.5 6-5.5s5.4 2.1 6 5.5M16 5.5a3.5 3.5 0 0 1 0 6.5M18 14.8c1.6.8 2.7 2.6 3 5.2"/>',
    userPlus: '<circle cx="10" cy="8.5" r="3.5"/><path d="M3.5 20c.6-3.4 3.2-5.5 6.5-5.5 1.6 0 3 .5 4.1 1.3M18.5 14v6M15.5 17h6"/>',
    bell: '<path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15z"/><path d="M10 20.5a2.2 2.2 0 0 0 4 0"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    back: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
    left: '<path d="M14.5 6l-6 6 6 6"/>',
    right: '<path d="M9.5 6l6 6-6 6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    megaphone: '<path d="M4 10v4h3l7 4.5v-13L7 10z"/><path d="M17.5 9a4 4 0 0 1 0 6"/>',
    pulse: '<path d="M3 12h4l2.5-6 4 12 2.5-6h5"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4L6 18M18 6l1.4-1.4"/>',
    moon: '<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z"/>',
    external: '<path d="M14 4.5h5.5V10M19.5 4.5L11 13M17 14v5.5H4.5V7H10"/>',
    trash: '<path d="M5 7h14M9.5 7V4.5h5V7M7 7l.8 12.5h8.4L17 7"/>',
    copy: '<rect x="8.5" y="8.5" width="11" height="11" rx="2.5"/><path d="M15.5 8.5V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7.5a2 2 0 0 0 2 2h2.5"/>',
    logout: '<path d="M14 4.5h4a1.5 1.5 0 0 1 1.5 1.5v12a1.5 1.5 0 0 1-1.5 1.5h-4M10 16l4-4-4-4M14 12H4.5"/>',
    reset: '<path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3M4.5 4.5v4h4"/>',
    lock: '<rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/>',
    cloud: '<path d="M7 18.5a4.5 4.5 0 0 1-.6-9 6 6 0 0 1 11.5 1.6A3.8 3.8 0 0 1 17.5 18.5z"/>',
    device: '<rect x="6" y="3" width="12" height="18" rx="2.5"/><path d="M10.5 17.5h3"/>',
    chat: '<path d="M5 18.5V7a2.5 2.5 0 0 1 2.5-2.5h9A2.5 2.5 0 0 1 19 7v7a2.5 2.5 0 0 1-2.5 2.5H9z"/><path d="M8.5 9h7M8.5 12.5h4.5"/>',
    send: '<path d="M4.5 12L20 4.5l-4 15.5-4.2-6.3z"/><path d="M11.8 13.7L20 4.5"/>',
    edit: '<path d="M4.5 19.5l1-4L15.5 5.5a2.1 2.1 0 0 1 3 3L8.5 18.5z"/><path d="M13.5 7.5l3 3"/>',
    bowl: '<path d="M3.5 11.5h17a8.5 8.5 0 0 1-17 0z"/><path d="M8 20h8M9 4.5c0 1.5 1.2 1.5 1.2 3M13 4.5c0 1.5 1.2 1.5 1.2 3"/>',
    wheel: '<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5v17M3.5 12h17M6 6l12 12M18 6L6 18"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/>',
    dice: '<rect x="4" y="4" width="16" height="16" rx="4"/><circle cx="9" cy="9" r="1.2" fill="currentColor"/><circle cx="15" cy="15" r="1.2" fill="currentColor"/><circle cx="15" cy="9" r="1.2" fill="currentColor"/><circle cx="9" cy="15" r="1.2" fill="currentColor"/>',
    group: '<circle cx="8" cy="9" r="3"/><circle cx="16" cy="9" r="3"/><path d="M2.5 19c.5-3 2.7-4.8 5.5-4.8s5 1.8 5.5 4.8M13.5 15.2c.8-.6 1.6-1 2.5-1 2.8 0 5 1.8 5.5 4.8"/>',
    clip: '<path d="M20 11.5l-7.8 7.8a5 5 0 0 1-7.1-7.1l8.2-8.2a3.4 3.4 0 0 1 4.8 4.8l-8.2 8.2a1.7 1.7 0 0 1-2.4-2.4l7.5-7.5"/>',
    camera: '<path d="M4 8.5A2 2 0 0 1 6 6.5h2.2l1.5-2h4.6l1.5 2H18a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/><circle cx="12" cy="13" r="3.6"/>',
    image: '<rect x="3.5" y="4.5" width="17" height="15" rx="3"/><circle cx="9" cy="10" r="1.8"/><path d="M20.5 16l-5-5-8.5 8.5"/>',
    file: '<path d="M7 3.5h7l4.5 4.5v12.5H7z"/><path d="M14 3.5V8h4.5"/>',
    download: '<path d="M12 4v11M7 10.5l5 5 5-5M5 19.5h14"/>',
    go: '<rect x="3.5" y="3.5" width="17" height="17" rx="3"/><path d="M3.5 9.5h17M3.5 14.5h17M9.5 3.5v17M14.5 3.5v17"/><circle cx="9.5" cy="9.5" r="2.4" fill="currentColor"/><circle cx="14.5" cy="14.5" r="2.4" fill="var(--surface, #fff)"/>',
    flag: '<path d="M6 21V4M6 4.5h11l-2 4 2 4H6"/>',
    undo: '<path d="M9 14L4.5 9.5 9 5"/><path d="M4.5 9.5H14a5.5 5.5 0 0 1 0 11h-3"/>',
    cpu: '<rect x="6" y="6" width="12" height="12" rx="2.5"/><path d="M9.5 3v3M14.5 3v3M9.5 18v3M14.5 18v3M3 9.5h3M3 14.5h3M18 9.5h3M18 14.5h3"/>',
    trophy: '<path d="M8 4.5h8v4a4 4 0 0 1-8 0z"/><path d="M8 6H5a3 3 0 0 0 3 3.5M16 6h3a3 3 0 0 1-3 3.5M12 12.5V16M8.5 20h7M10 16h4v4h-4z"/>',
    blocks: '<rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5" fill="currentColor"/>',
    ball: '<circle cx="12" cy="12" r="8.5"/><path d="M7.2 5.2c1.6 1.8 2.5 4.2 2.5 6.8s-.9 5-2.5 6.8M16.8 5.2c-1.6 1.8-2.5 4.2-2.5 6.8s.9 5 2.5 6.8"/>',
    plane: '<path d="M3 13.5l7-1.5 4.5-7.5a1.6 1.6 0 0 1 2.8 1.6L15.5 13l4 1.5.9 2.5-5.4-.6-2.7 4.1-2 .3.7-4.9-5-1.1z"/>',
  };
  const icon = (name, size) => `<svg class="ic" viewBox="0 0 24 24" width="${size || 20}" height="${size || 20}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] || P.link}</svg>`;

  /* ---------- 브라우저 저장소 (막혀 있으면 메모리) ---------- */
  function makeStore(kind) {
    const mem = {};
    const s = () => { try { return window[kind]; } catch (e) { return null; } };
    return {
      get(k, d) { try { const v = s().getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return k in mem ? mem[k] : d; } },
      set(k, v) { try { s().setItem(k, JSON.stringify(v)); } catch (e) { mem[k] = v; } },
      del(k) { try { s().removeItem(k); } catch (e) {} delete mem[k]; },
      keys() { try { const o = s(), r = []; for (let i = 0; i < o.length; i++) r.push(o.key(i)); return r; } catch (e) { return Object.keys(mem); } },
    };
  }
  const store = makeStore('localStorage');
  const sess = makeStore('sessionStorage');
  const PFX = 'interns-';
  const K = { members: PFX + 'members', me: PFX + 'me', activity: PFX + 'activity', pres: PFX + 'p:', myStatus: PFX + 'mystatus', notices: PFX + 'notices', messages: PFX + 'messages', reads: PFX + 'reads', schedules: PFX + 'schedules', kinds: PFX + 'kinds', lunch: PFX + 'lunch', omok: PFX + 'omok', bb: PFX + 'bb', bbSec: PFX + 'bbsec', bpRooms: PFX + 'bprooms', bpPlayers: PFX + 'bpplayers', seen: PFX + 'seen:' };

  /* ---------- 날짜 ---------- */
  const pad = (n) => String(n).padStart(2, '0');
  const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parseYmd = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const weekStart = (d) => { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); const w = (x.getDay() + 6) % 7; return addDays(x, -w); };
  const DOW = ['일', '월', '화', '수', '목', '금', '토'];
  const todayYmd = () => ymd(new Date());
  function dayLabel(dateStr) {
    const today = todayYmd(), tmr = ymd(addDays(new Date(), 1));
    const d = parseYmd(dateStr);
    if (dateStr === today) return '오늘';
    if (dateStr === tmr) return '내일';
    return `${d.getMonth() + 1}/${d.getDate()} (${DOW[d.getDay()]})`;
  }
  const shortDate = (s) => { const d = parseYmd(s); return `${d.getMonth() + 1}/${d.getDate()}(${DOW[d.getDay()]})`; };
  const rangeLabel = (a, b) => a === b ? shortDate(a) : `${shortDate(a)} ~ ${shortDate(b)}`;
  function ago(ts) {
    const s = Math.max(0, (Date.now() - ts) / 1000);
    if (s < 60) return '방금 전';
    if (s < 3600) return `${Math.floor(s / 60)}분 전`;
    const d = new Date(ts), t = new Date();
    if (ymd(d) === ymd(t)) return `${Math.floor(s / 3600)}시간 전`;
    if (ymd(d) === ymd(addDays(t, -1))) return '어제';
    return `${d.getMonth() + 1}/${d.getDate()}`;
  }

  /* =========================================================
     데이터 캐시 — 화면은 항상 여기서 읽고(동기), 쓰기는 백엔드로(비동기)
     ========================================================= */
  const state = { members: [], activity: [], notices: [], messages: [], reads: {}, schedules: [], kinds: [], lunch: [], omok: [], bb: [], bbSec: {}, bpRooms: [], bpPlayers: [], online: {}, lastSeen: {}, meId: null };
  const byAtDesc = (a, b) => b.at - a.at;
  const byAt = (a, b) => a.at - b.at;
  const bySched = (a, b) => (a.start + a.at).localeCompare(b.start + b.at);
  const newId = (p) => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  /* ---------- 숫자야구 규칙: 서로 다른 숫자 n자리, 자리까지 맞으면 S, 숫자만 맞으면 B ---------- */
  const BB = {
    valid: (g, n) => typeof g === 'string' && new RegExp(`^[0-9]{${n}}$`).test(g) && new Set(g).size === n,
    score(sec, g) { let s = 0, b = 0; for (let i = 0; i < g.length; i++) { if (g[i] === sec[i]) s++; else if (sec.includes(g[i])) b++; } return { s, b }; },
    random(n) { const d = [...'0123456789'], a = new Uint32Array(10); crypto.getRandomValues(a); for (let i = 9; i > 0; i--) { const j = a[i] % (i + 1); [d[i], d[j]] = [d[j], d[i]]; } return d.slice(0, n).join(''); },
    label: (r, n) => r.s === n ? '홈런!' : (!r.s && !r.b) ? 'OUT' : `${r.s ? r.s + 'S' : ''}${r.s && r.b ? ' ' : ''}${r.b ? r.b + 'B' : ''}`,
  };

  /* ---------- 오목 규칙 (15×15, 흑 선공, 흑만 33 금지, 5개 이상이면 승) ---------- */
  const OMOK = (() => {
    const N = 15, DIRS = [[1, 0], [0, 1], [1, 1], [1, -1]];
    const board = (moves) => { const b = new Int8Array(N * N); moves.forEach((m, i) => { b[m] = i % 2 ? 2 : 1; }); return b; };
    const at = (b, x, y) => (x < 0 || y < 0 || x >= N || y >= N) ? -1 : b[y * N + x];
    // idx를 지나는 c색 연속 구간 [앞쪽 칸 수, 뒤쪽 칸 수]
    const run = (b, idx, c, dx, dy) => {
      const x0 = idx % N, y0 = (idx / N) | 0; let a = 0, z = 0;
      while (at(b, x0 + dx * (z + 1), y0 + dy * (z + 1)) === c) z++;
      while (at(b, x0 - dx * (a + 1), y0 - dy * (a + 1)) === c) a++;
      return [a, z];
    };
    const five = (b, idx, c) => DIRS.some(([dx, dy]) => { const [a, z] = run(b, idx, c, dx, dy); return a + z + 1 >= 5; });
    const fiveLine = (b, idx, c) => {
      for (const [dx, dy] of DIRS) { const [a, z] = run(b, idx, c, dx, dy); if (a + z + 1 >= 5) { const x0 = idx % N, y0 = (idx / N) | 0, out = []; for (let k = -a; k <= z; k++) out.push((y0 + dy * k) * N + x0 + dx * k); return out; } }
      return null;
    };
    // (흑이 idx에 놓인 상태에서) 이 방향에 '열린 3'이 있나: 한 칸을 더 두면 양끝이 빈 4(.XXXX.)가 되는 자리가 있으면 열린 3
    const openThree = (b, idx, dx, dy) => {
      const x0 = idx % N, y0 = (idx / N) | 0;
      for (let k = -4; k <= 4; k++) {
        if (!k) continue;
        const x = x0 + dx * k, y = y0 + dy * k;
        if (at(b, x, y) !== 0) continue;
        const e = y * N + x; b[e] = 1;
        const [a, z] = run(b, idx, 1, dx, dy);
        const inRun = k >= -a && k <= z;
        const ok = inRun && a + z + 1 === 4 && at(b, x0 - dx * (a + 1), y0 - dy * (a + 1)) === 0 && at(b, x0 + dx * (z + 1), y0 + dy * (z + 1)) === 0;
        b[e] = 0;
        if (ok) return true;
      }
      return false;
    };
    // 흑의 33 금수인가 (5가 되는 수는 허용)
    const forbidden = (b, idx) => {
      if (b[idx]) return false;
      b[idx] = 1;
      let bad = false;
      if (!five(b, idx, 1)) bad = DIRS.filter(([dx, dy]) => openThree(b, idx, dx, dy)).length >= 2;
      b[idx] = 0;
      return bad;
    };
    const name = (idx) => `${'ABCDEFGHJKLMNOP'[idx % N]}${N - ((idx / N) | 0)}`;   // 바둑판 좌표 (I 빼고)
    return { N, DIRS, board, at, run, five, fiveLine, forbidden, name };
  })();
  const OFFLINE_AFTER = 25000;   // 로컬: 마지막 신호 후 25초
  const GRACE = 5000;            // Supabase: 화면에서 사라진 뒤 5초(페이지 이동 깜빡임 방지)
  const ST = { online: '온라인', meeting: '바쁨', away: '자리 비움', offline: '오프라인' };
  let backend = null;

  /* ---------- 로컬 백엔드 (localStorage · 미리보기용) ---------- */
  const localBackend = {
    mode: 'local',
    async load() {
      const arr = (k) => { const v = store.get(k, []); return Array.isArray(v) ? v : []; };
      state.members = arr(K.members);
      state.activity = arr(K.activity);
      state.notices = arr(K.notices).slice().sort(byAtDesc);
      state.messages = arr(K.messages).slice().sort(byAt);
      state.reads = store.get(K.reads, {}) || {};
      state.schedules = arr(K.schedules).slice().sort(bySched);
      state.kinds = arr(K.kinds);
      state.omok = arr(K.omok);
      state.bb = arr(K.bb); state.bbSec = store.get(K.bbSec, {}) || {};
      state.bpRooms = arr(K.bpRooms); state.bpPlayers = arr(K.bpPlayers);
      state.lunch = arr(K.lunch).slice().sort(byAtDesc);
    },
    meId() { const id = sess.get(K.me, null) || store.get(K.me, null); return id && state.members.some(m => m.id === id) ? id : null; },
    async checkPassword(pw) { return !!TEAM.password && pw === TEAM.password; },
    async memberNames(pw) { if (!(await this.checkPassword(pw))) throw new Error('wrong_password'); return state.members.map(m => m.name); },
    async join(pw, name, role, asTabOnly) {
      if (!(await this.checkPassword(pw))) throw new Error('wrong_password');
      await this.load();
      let m = state.members.find(x => x.name === name), isNew = false;
      if (m) { if (role) m.role = role; }
      else {
        m = { id: newId('p'), name, role: role || '', joinedAt: Date.now() }; state.members.push(m); isNew = true;
        state.activity = [{ who: m.id, what: '들어왔어요', where: TEAM.name, at: Date.now() }].concat(state.activity).slice(0, 30);
        store.set(K.activity, state.activity);
      }
      store.set(K.members, state.members);
      sess.set(K.me, m.id); const dev = store.get(K.me, null); if (!asTabOnly || !dev || !state.members.some(x => x.id === dev)) store.set(K.me, m.id);
      return { member: m, isNew };
    },
    async continueAs(id) { sess.set(K.me, id); },
    async setAvatar(data) {
      const m = state.members.find(x => x.id === this.meId()); if (!m) throw new Error('not_member');
      const prev = m.avatar || null; m.avatar = data || null;
      try { localStorage.setItem(K.members, JSON.stringify(state.members)); }
      catch (e) { m.avatar = prev; throw new Error('local_full'); }
    },
    async addActivity(a) { state.activity = [a].concat(state.activity).slice(0, 30); store.set(K.activity, state.activity); },
    async addNotice(n) { const item = Object.assign({ id: newId('n'), at: Date.now() }, n); state.notices = [item].concat(state.notices); store.set(K.notices, state.notices); return item; },
    async removeNotice(id) { state.notices = state.notices.filter(n => n.id !== id); store.set(K.notices, state.notices); },
    async sendMessage(m) {
      const item = Object.assign({ id: newId('d'), at: Date.now(), readAt: null }, m);
      state.messages = state.messages.concat(item);
      try { localStorage.setItem(K.messages, JSON.stringify(state.messages)); }
      catch (e) { state.messages = state.messages.filter(x => x !== item); throw new Error('local_full'); }   // 미리보기 모드는 브라우저 저장 공간(약 5MB)이 한계
      return item;
    },
    async uploadFile(path, blob) { return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(r.error); r.readAsDataURL(blob); }); },   // 로컬은 data URL 자체를 '경로'로
    async signUrls(paths) { const o = {}; paths.forEach(p => { o[p] = p; }); return o; },
    async downloadUrl(path) { return path; },
    async markRead(me, other) {
      if (other === 'group') { state.reads[me] = Date.now(); store.set(K.reads, state.reads); return; }
      let changed = false;
      state.messages.forEach(m => { if (m.to === me && m.from === other && !m.readAt) { m.readAt = Date.now(); changed = true; } });
      if (changed) store.set(K.messages, state.messages);
    },
    async addSchedule(s) { const item = Object.assign({ id: newId('s'), at: Date.now() }, s); state.schedules = state.schedules.concat(item).sort(bySched); store.set(K.schedules, state.schedules); return item; },
    async removeSchedule(id) { state.schedules = state.schedules.filter(s => s.id !== id); store.set(K.schedules, state.schedules); },
    async updateSchedule(id, p) {
      const s = state.schedules.find(x => x.id === id); if (!s) throw new Error('not_found');
      Object.assign(s, p, { edited: Date.now() }); state.schedules.sort(bySched); store.set(K.schedules, state.schedules); return s;
    },
    async addKind(k) { if (state.kinds.some(x => x.name === k.name)) throw new Error('duplicate'); state.kinds = state.kinds.concat(Object.assign({ at: Date.now() }, k)); store.set(K.kinds, state.kinds); },
    async removeKind(name) { state.kinds = state.kinds.filter(x => x.name !== name); store.set(K.kinds, state.kinds); },
    async addLunch(l) { const item = Object.assign({ id: newId('l'), at: Date.now() }, l); state.lunch = [item].concat(state.lunch).slice(0, 50); store.set(K.lunch, state.lunch); return item; },
    // 오목 (서버 함수와 같은 규칙을 브라우저에서)
    _og(id) { const g = state.omok.find(x => x.id === id); if (!g) throw new Error('not_found'); return g; },
    _osave() { state.omok.sort((a, b) => b.upd - a.upd); state.omok = state.omok.slice(0, 60); store.set(K.omok, state.omok); },
    _oend(g, winner, reason) {
      Object.assign(g, { status: 'done', winner, reason, upd: Date.now() });
      if (winner) { const loser = winner === g.black ? g.white : g.black; this.addActivity({ who: winner, what: '오목에서 이겼어요', where: `${(state.members.find(m => m.id === loser) || {}).name || ''} 님${reason === 'resign' ? ' 기권' : '과 대국'}`, at: Date.now() }); }
    },
    async omokInvite(o) { const g = { id: newId('o'), black: o.black, white: o.white, by: o.by, status: 'invite', moves: [], winner: null, reason: null, at: Date.now(), upd: Date.now() }; state.omok.unshift(g); this._osave(); return g; },
    async omokRespond(id, accept) { const me = this.meId(), g = this._og(id); if (g.status !== 'invite') throw new Error('not_invite'); if (me === g.by || ![g.black, g.white].includes(me)) throw new Error('not_yours'); g.status = accept ? 'playing' : 'declined'; g.upd = Date.now(); this._osave(); },
    async omokCancel(id) { const me = this.meId(), g = this._og(id); if (g.status !== 'invite') throw new Error('not_invite'); if (me !== g.by) throw new Error('not_yours'); g.status = 'canceled'; g.upd = Date.now(); this._osave(); },
    async omokMove(id, idx) {
      const me = this.meId(), g = this._og(id); if (g.status !== 'playing') throw new Error('not_playing');
      const n = g.moves.length, turn = n % 2 ? g.white : g.black;
      if (me !== turn) throw new Error('not_your_turn');
      if (!(idx >= 0 && idx < 225) || g.moves.includes(idx)) throw new Error('bad_move');
      g.moves = g.moves.concat(idx); g.upd = Date.now();
      if (OMOK.five(OMOK.board(g.moves), idx, n % 2 ? 2 : 1)) this._oend(g, me, 'five');
      else if (g.moves.length >= 225) this._oend(g, null, 'draw');
      this._osave();
    },
    _bg(id) { const g = state.bb.find(x => x.id === id); if (!g) throw new Error('not_found'); return g; },
    _bsave() { state.bb.sort((a, b) => b.upd - a.upd); state.bb = state.bb.slice(0, 60); store.set(K.bbSec, state.bbSec); store.set(K.bb, state.bb); },
    _bend(g, winner, reason) {
      Object.assign(g, { status: 'done', winner, reason, upd: Date.now() });
      if (winner) { const loser = winner === g.p1 ? g.p2 : g.p1; this.addActivity({ who: winner, what: '숫자야구에서 이겼어요', where: `${(state.members.find(m => m.id === loser) || {}).name || ''} 님${reason === 'resign' ? ' 기권' : '과 대결'}`, at: Date.now() }); }
    },
    async bbInvite(o) { const g = { id: newId('b'), p1: o.p1, p2: o.p2, digits: o.digits, status: 'invite', ready1: false, ready2: false, guesses: [], solved1: false, winner: null, reason: null, at: Date.now(), upd: Date.now() }; state.bb.unshift(g); this._bsave(); return g; },
    async bbRespond(id, accept) { const me = this.meId(), g = this._bg(id); if (g.status !== 'invite') throw new Error('not_invite'); if (me !== g.p2) throw new Error('not_yours'); g.status = accept ? 'setup' : 'declined'; g.upd = Date.now(); this._bsave(); },
    async bbCancel(id) { const me = this.meId(), g = this._bg(id); if (g.status !== 'invite') throw new Error('not_invite'); if (me !== g.p1) throw new Error('not_yours'); g.status = 'canceled'; g.upd = Date.now(); this._bsave(); },
    async bbSetSecret(id, sec) {
      const me = this.meId(), g = this._bg(id); if (g.status !== 'setup') throw new Error('not_setup'); if (me !== g.p1 && me !== g.p2) throw new Error('not_yours'); if (!BB.valid(sec, g.digits)) throw new Error('bad_number');
      (state.bbSec[id] = state.bbSec[id] || {})[me] = sec;
      if (me === g.p1) g.ready1 = true; else g.ready2 = true;
      if (g.ready1 && g.ready2) g.status = 'playing'; g.upd = Date.now(); this._bsave();
    },
    async bbGuess(id, guess) {
      const me = this.meId(), g = this._bg(id); if (g.status !== 'playing') throw new Error('not_playing');
      const n = g.guesses.length, turn = n % 2 ? g.p2 : g.p1; if (me !== turn) throw new Error('not_your_turn'); if (!BB.valid(guess, g.digits)) throw new Error('bad_number');
      const opp = me === g.p1 ? g.p2 : g.p1, r = BB.score((state.bbSec[id] || {})[opp] || '', guess), hit = r.s === g.digits;
      g.guesses = g.guesses.concat({ by: me, g: guess, s: r.s, b: r.b }); g.upd = Date.now();
      if (me === g.p1 && hit) g.solved1 = true;
      if (me === g.p2) { if (g.solved1 && hit) this._bend(g, null, 'draw'); else if (g.solved1) this._bend(g, g.p1, 'solve'); else if (hit) this._bend(g, g.p2, 'solve'); else if (n + 1 >= 60) this._bend(g, null, 'draw'); }
      this._bsave();
    },
    async bbResign(id) { const me = this.meId(), g = this._bg(id); if (!['setup', 'playing'].includes(g.status)) throw new Error('not_playing'); if (me !== g.p1 && me !== g.p2) throw new Error('not_yours'); this._bend(g, me === g.p1 ? g.p2 : g.p1, 'resign'); this._bsave(); },
    _br(id) { const r = state.bpRooms.find(x => x.id === id); if (!r) throw new Error('not_found'); return r; },
    _bpsave() { state.bpRooms.sort((a, b) => b.upd - a.upd); state.bpRooms = state.bpRooms.slice(0, 40); const ids = new Set(state.bpRooms.map(r => r.id)); state.bpPlayers = state.bpPlayers.filter(p => ids.has(p.room)); store.set(K.bpPlayers, state.bpPlayers); store.set(K.bpRooms, state.bpRooms); },
    _bpend(r, winner, reason) {
      Object.assign(r, { status: 'done', winner, reason, upd: Date.now() });
      if (winner) { const p = state.bpPlayers.find(x => x.room === r.id && x.member === winner); this.addActivity({ who: winner, what: '블록 퍼즐 대결에서 이겼어요', where: `${p ? p.score : 0}점${reason === 'target' ? ` · 목표 ${r.target}점 먼저 도착` : ' · 최고 점수'}`, at: Date.now() }); }
    },
    async bpCreate(inv, target) {
      const me = this.meId(); inv = [...new Set(inv)].filter(id => id !== me && state.members.some(m => m.id === id));
      if (!inv.length || inv.length > 3) throw new Error('bad_players'); if (![500, 1000, 2000, 3000].includes(target)) throw new Error('bad_target');
      const r = { id: newId('p'), host: me, invited: inv, target, seed: null, status: 'lobby', winner: null, reason: null, started: 0, at: Date.now(), upd: Date.now() };
      state.bpRooms.unshift(r); state.bpPlayers.push({ room: r.id, member: me, score: 0, lines: 0, over: false, joined: Date.now(), upd: Date.now() }); this._bpsave(); return r.id;
    },
    async bpJoin(id) { const me = this.meId(), r = this._br(id); if (r.status !== 'lobby') throw new Error('not_lobby'); if (!r.invited.includes(me)) throw new Error('not_invited'); if (!state.bpPlayers.some(p => p.room === id && p.member === me)) state.bpPlayers.push({ room: id, member: me, score: 0, lines: 0, over: false, joined: Date.now(), upd: Date.now() }); r.upd = Date.now(); this._bpsave(); },
    async bpLeave(id) {
      const me = this.meId(), r = this._br(id); if (r.status !== 'lobby') throw new Error('not_lobby'); if (me !== r.host && !r.invited.includes(me)) throw new Error('not_invited');
      if (me === r.host) r.status = 'canceled'; else { state.bpPlayers = state.bpPlayers.filter(p => !(p.room === id && p.member === me)); r.invited = r.invited.filter(x => x !== me); }
      r.upd = Date.now(); this._bpsave();
    },
    async bpStart(id) {
      const me = this.meId(), r = this._br(id); if (r.status !== 'lobby') throw new Error('not_lobby'); if (me !== r.host) throw new Error('not_host');
      const ps = state.bpPlayers.filter(p => p.room === id); if (ps.length < 2) throw new Error('need_players');
      Object.assign(r, { status: 'playing', seed: 1 + Math.floor(Math.random() * 2147483646), invited: ps.map(p => p.member).filter(x => x !== r.host), started: Date.now(), upd: Date.now() }); this._bpsave();
    },
    async bpReport(id, score, lines, over) {
      const me = this.meId(), r = this._br(id); if (r.status !== 'playing') throw new Error('not_playing');
      const p = state.bpPlayers.find(x => x.room === id && x.member === me); if (!p) throw new Error('not_player'); if (p.over) return;
      Object.assign(p, { score: Math.max(p.score, score | 0), lines: Math.max(p.lines, lines | 0), over: !!over, upd: Date.now() }); r.upd = Date.now();
      const ps = state.bpPlayers.filter(x => x.room === id);
      if (p.score >= r.target) this._bpend(r, me, 'target');
      else if (ps.every(x => x.over)) { const best = Math.max(...ps.map(x => x.score)), top = ps.filter(x => x.score === best); this._bpend(r, top.length === 1 ? top[0].member : null, top.length === 1 ? 'best' : 'draw'); }
      this._bpsave();
    },
    async omokResign(id) { const me = this.meId(), g = this._og(id); if (g.status !== 'playing') throw new Error('not_playing'); if (![g.black, g.white].includes(me)) throw new Error('not_yours'); this._oend(g, me === g.black ? g.white : g.black, 'resign'); this._osave(); },
    async resetAll(pw) {
      if (!(await this.checkPassword(pw))) throw new Error('wrong_password');
      store.keys().filter(k => k.startsWith(PFX) && k !== PFX + 'theme').forEach(k => store.del(k)); sess.keys().filter(k => k.startsWith(PFX)).forEach(k => sess.del(k));
    },
    async leave() { const id = this.meId(); if (id) store.set(K.pres + id, Object.assign(this.pres(id), { beat: 0 })); sess.del(K.me); if (store.get(K.me, null) === id) store.del(K.me); },
    // 접속 상태: 탭마다 8초 신호 → 같은 브라우저의 다른 탭이 storage 이벤트로 받음
    pres(id) { return store.get(K.pres + id, null) || { status: 'online', beat: 0 }; },
    isOnline(id) { const p = this.pres(id); return !!p.beat && Date.now() - p.beat <= OFFLINE_AFTER; },
    manual(id) { return this.pres(id).status || 'online'; },
    async setStatus(s) { const id = this.meId(); if (id) store.set(K.pres + id, Object.assign(this.pres(id), { status: s, beat: Date.now() })); },
    startLive() {
      const beat = () => { const id = this.meId(); if (id) store.set(K.pres + id, Object.assign(this.pres(id), { beat: Date.now() })); };
      beat();
      setInterval(() => { beat(); emit('hub:team'); }, 8000);
      window.addEventListener('pagehide', () => { const id = this.meId(); if (id) store.set(K.pres + id, Object.assign(this.pres(id), { beat: Date.now() - OFFLINE_AFTER + 4000 })); });
      window.addEventListener('pageshow', (e) => { if (e.persisted) { beat(); this.load().then(emitAll); } });
      window.addEventListener('storage', async (e) => {
        if (e.key && !e.key.startsWith(PFX)) return;
        await this.load();
        if (!this.meId()) { location.replace('join.html'); return; }
        const k = e.key || '';
        if (!k || k === K.members || k.startsWith(K.pres)) emit('hub:team');
        if (!k || k === K.activity) emit('hub:activity');
        if (!k || k === K.notices) emit('hub:notices');
        if (!k || k === K.messages || k === K.reads) emit('hub:messages');
        if (!k || k === K.schedules || k === K.kinds) { emit('hub:schedules'); emit('hub:team'); }
        if (!k || k === K.lunch) emit('hub:lunch');
        if (!k || k === K.omok) emit('hub:omok');
        if (!k || k === K.bb || k === K.bbSec) emit('hub:bb');
        if (!k || k === K.bpRooms || k === K.bpPlayers) emit('hub:bp');
      });
    },
  };

  /* ---------- Supabase 백엔드 ---------- */
  let sb = null, channel = null;
  const BUCKET = 'chat-files';
  const fromMember = (r) => ({ id: r.id, name: r.name, role: r.role || '', joinedAt: Date.parse(r.joined_at) || 0, avatar: r.avatar || null });
  const fromNotice = (r) => ({ id: r.id, tag: r.tag, title: r.title, body: r.body || '', author: r.author, at: Date.parse(r.created_at) || 0 });
  const fromMessage = (r) => ({ id: r.id, from: r.sender, to: r.recipient || null, body: r.body || '', at: Date.parse(r.created_at) || 0, readAt: r.read_at ? Date.parse(r.read_at) : null,
    file: r.file_path ? { path: r.file_path, name: r.file_name || '파일', type: r.file_type || '', size: r.file_size || 0 } : null });
  const fromActivity = (r) => ({ who: r.who, what: r.what, where: r.place || '', at: Date.parse(r.at) || 0 });
  const fromSchedule = (r) => ({ id: r.id, member: r.member, kind: r.kind, start: r.start_date, end: r.end_date, memo: r.memo || '', at: Date.parse(r.created_at) || 0, edited: Date.parse(r.updated_at) || 0 });
  const fromOmok = (r) => ({ id: r.id, black: r.black, white: r.white, by: r.created_by, status: r.status, moves: (r.moves || []).map(Number), winner: r.winner || null, reason: r.end_reason || null, at: Date.parse(r.created_at) || 0, upd: Date.parse(r.updated_at) || 0 });
  const fromBb = (r) => ({ id: r.id, p1: r.p1, p2: r.p2, digits: r.digits, status: r.status, ready1: !!r.ready1, ready2: !!r.ready2, guesses: Array.isArray(r.guesses) ? r.guesses : [], solved1: !!r.solved1, winner: r.winner || null, reason: r.end_reason || null, at: Date.parse(r.created_at) || 0, upd: Date.parse(r.updated_at) || 0 });
  const fromBpRoom = (r) => ({ id: r.id, host: r.host, invited: r.invited || [], target: r.target, seed: r.seed == null ? null : Number(r.seed), status: r.status, winner: r.winner || null, reason: r.end_reason || null, started: Date.parse(r.started_at) || 0, at: Date.parse(r.created_at) || 0, upd: Date.parse(r.updated_at) || 0 });
  const fromBpPlayer = (r) => ({ room: r.room, member: r.member, score: r.score, lines: r.lines, over: !!r.over, joined: Date.parse(r.joined_at) || 0, upd: Date.parse(r.updated_at) || 0 });
  const fromLunch = (r) => ({ id: r.id, by: r.picked_by, mode: r.mode, candidates: r.candidates || [], result: r.result, at: Date.parse(r.created_at) || 0 });
  function check(res) { if (res.error) throw res.error; return res.data; }
  const errMsg = (e) => String((e && (e.message || e.msg)) || e || '');
  const supabaseBackend = {
    mode: 'supabase',
    async session() { const r = await sb.auth.getSession(); return r && r.data ? r.data.session : null; },
    async ensureSession() {
      if (await this.session()) return;
      const r = await sb.auth.signInAnonymously();
      if (r.error) throw new Error(/anonymous/i.test(errMsg(r.error)) ? 'anon_disabled' : errMsg(r.error));
    },
    meId() { return state.meId; },
    async loadMembers() { state.members = check(await sb.from('members').select('*').order('joined_at')).map(fromMember); },
    async loadActivity() { state.activity = check(await sb.from('activity').select('*').order('at', { ascending: false }).limit(30)).map(fromActivity); },
    async loadNotices() { state.notices = check(await sb.from('notices').select('*').order('created_at', { ascending: false }).limit(50)).map(fromNotice); },
    async loadMessages() { state.messages = check(await sb.from('messages').select('*').order('created_at', { ascending: false }).limit(800)).map(fromMessage).sort(byAt); },   // DB가 내가 볼 수 있는 것만 줌
    async loadReads() { const r = {}; check(await sb.from('chat_reads').select('*')).forEach(x => { r[x.member] = Date.parse(x.read_at) || 0; }); state.reads = r; },
    async loadSchedules() { const from = ymd(addDays(new Date(), -100)); state.schedules = check(await sb.from('schedules').select('*').gte('end_date', from).order('start_date')).map(fromSchedule).sort(bySched); },
    async loadBp() {
      const rs = check(await sb.from('bp_rooms').select('*').order('updated_at', { ascending: false }).limit(40)).map(fromBpRoom);
      const ids = rs.map(r => r.id);
      state.bpPlayers = ids.length ? check(await sb.from('bp_players').select('*').in('room', ids)).map(fromBpPlayer) : [];
      state.bpRooms = rs;
    },
    async loadBb() {
      const [gs, ss] = await Promise.all([sb.from('bb_games').select('*').order('updated_at', { ascending: false }).limit(60), sb.from('bb_secrets').select('*')]);
      state.bb = check(gs).map(fromBb);
      const sec = {}; check(ss).forEach(r => { (sec[r.game] = sec[r.game] || {})[r.member] = r.secret; }); state.bbSec = sec;   // 내 숫자 + 끝난 대결의 상대 숫자만 옴(RLS)
    },
    async loadOmok() { state.omok = check(await sb.from('omok_games').select('*').order('updated_at', { ascending: false }).limit(60)).map(fromOmok); },
    async loadKinds() { state.kinds = check(await sb.from('schedule_kinds').select('*').order('created_at')).map(r => ({ name: r.name, color: r.color, by: r.created_by, at: Date.parse(r.created_at) || 0 })); },
    async loadLunch() { state.lunch = check(await sb.from('lunch_picks').select('*').order('created_at', { ascending: false }).limit(50)).map(fromLunch); },
    async load() {
      // meId는 끝까지 확인한 뒤에 바꿈 (중간에 비워 두면 그 사이 화면 갱신이 '알림 없음'으로 보고 새 알림 토스트가 다시 뜸)
      if (!(await this.session())) { state.meId = null; return; }
      const me = check(await sb.rpc('whoami'));
      if (!me) { state.meId = null; return; }
      state.meId = me.id;
      await Promise.all([this.loadMembers(), this.loadActivity(), this.loadNotices(), this.loadMessages(), this.loadReads(), this.loadSchedules(), this.loadKinds(), this.loadLunch(), this.loadOmok().catch(e => { console.warn('[interns] 오목 표가 없어요 — setup.sql을 다시 Run 해 주세요', e); state.omok = []; }), this.loadBb().catch(e => { console.warn('[interns] 숫자야구 표가 없어요 — setup.sql을 다시 Run 해 주세요', e); state.bb = []; state.bbSec = {}; }), this.loadBp().catch(e => { console.warn('[interns] 블록 퍼즐 표가 없어요 — setup.sql을 다시 Run 해 주세요', e); state.bpRooms = []; state.bpPlayers = []; })]);
    },
    async checkPassword(pw) { return !!check(await sb.rpc('check_password', { p_password: pw })); },
    async memberNames(pw) { const r = await sb.rpc('member_names', { p_password: pw }); if (r.error) throw new Error(/wrong_password/.test(errMsg(r.error)) ? 'wrong_password' : errMsg(r.error)); return (r.data || []).map(x => typeof x === 'string' ? x : x.member_names); },
    async join(pw, name, role) {
      await this.ensureSession();
      const res = await sb.rpc('join_team', { p_password: pw, p_name: name, p_role: role || '' });
      if (res.error) throw new Error(/wrong_password/.test(errMsg(res.error)) ? 'wrong_password' : errMsg(res.error) || 'join_failed');
      const m = fromMember(res.data.member);
      await this.load();
      return { member: m, isNew: !!res.data.is_new };
    },
    async continueAs() {},
    async setAvatar(data) {
      const r = await sb.rpc('set_avatar', { p_avatar: data || null });
      if (r.error) throw new Error(/bad_avatar/.test(errMsg(r.error)) ? 'bad_avatar' : errMsg(r.error));
      const m = state.members.find(x => x.id === state.meId); if (m) m.avatar = data || null;
    },
    async addActivity(a) { check(await sb.from('activity').insert({ who: a.who, what: a.what, place: a.where || '' })); state.activity = [a].concat(state.activity).slice(0, 30); },
    async addNotice(n) {
      const item = fromNotice(check(await sb.from('notices').insert({ tag: n.tag, title: n.title, body: n.body || '', author: n.author }).select().single()));
      if (!state.notices.some(x => x.id === item.id)) state.notices = [item].concat(state.notices);
      return item;
    },
    async removeNotice(id) { check(await sb.from('notices').delete().eq('id', id)); state.notices = state.notices.filter(n => n.id !== id); },
    async sendMessage(m) {
      const row = { sender: m.from, recipient: m.to || null, body: m.body || '' };
      if (m.file) Object.assign(row, { file_path: m.file.path, file_name: m.file.name, file_type: m.file.type, file_size: m.file.size });
      const item = fromMessage(check(await sb.from('messages').insert(row).select().single()));
      if (!state.messages.some(x => x.id === item.id)) state.messages = state.messages.concat(item);
      return item;
    },
    // 첨부: 비공개 버킷에 올리고, 볼 때는 1시간짜리 서명 URL
    async uploadFile(path, blob, type) {
      const r = await sb.storage.from(BUCKET).upload(path, blob, { contentType: type || 'application/octet-stream', upsert: false });
      if (r.error) throw r.error;
      return path;
    },
    async signUrls(paths) {
      const r = await sb.storage.from(BUCKET).createSignedUrls(paths, 3600);
      if (r.error) throw r.error;
      const out = {}; (r.data || []).forEach(x => { if (x.signedUrl) out[x.path] = x.signedUrl; }); return out;
    },
    async downloadUrl(path, name) { const r = await sb.storage.from(BUCKET).createSignedUrl(path, 3600, { download: name || true }); if (r.error) throw r.error; return r.data.signedUrl; },
    async markRead(me, other) {
      if (other === 'group') {
        check(await sb.from('chat_reads').upsert({ member: me, read_at: new Date().toISOString() }, { onConflict: 'member' }));
        state.reads[me] = Date.now(); return;
      }
      if (!state.messages.some(m => m.to === me && m.from === other && !m.readAt)) return;
      check(await sb.from('messages').update({ read_at: new Date().toISOString() }).eq('recipient', me).eq('sender', other).is('read_at', null));
      state.messages.forEach(m => { if (m.to === me && m.from === other && !m.readAt) m.readAt = Date.now(); });
    },
    async addSchedule(s) {
      const item = fromSchedule(check(await sb.from('schedules').insert({ member: s.member, kind: s.kind, start_date: s.start, end_date: s.end, memo: s.memo || '' }).select().single()));
      if (!state.schedules.some(x => x.id === item.id)) state.schedules = state.schedules.concat(item).sort(bySched);
      return item;
    },
    async removeSchedule(id) { check(await sb.from('schedules').delete().eq('id', id)); state.schedules = state.schedules.filter(s => s.id !== id); },
    async updateSchedule(id, p) {
      const rows = check(await sb.from('schedules').update({ kind: p.kind, start_date: p.start, end_date: p.end, memo: p.memo || '', updated_at: new Date().toISOString() }).eq('id', id).select());
      if (!rows || !rows.length) throw new Error('not_found');   // 남의 일정이거나 이미 지워짐
      const item = fromSchedule(rows[0]);
      state.schedules = state.schedules.filter(x => x.id !== id).concat(item).sort(bySched);
      return item;
    },
    async addKind(k) {
      const r = await sb.from('schedule_kinds').insert({ name: k.name, color: k.color, created_by: k.by });
      if (r.error) throw new Error(/duplicate|unique/i.test(errMsg(r.error)) ? 'duplicate' : /row-level/i.test(errMsg(r.error)) ? 'too_many' : errMsg(r.error));
      if (!state.kinds.some(x => x.name === k.name)) state.kinds = state.kinds.concat(Object.assign({ at: Date.now() }, k));
    },
    async removeKind(name) { check(await sb.from('schedule_kinds').delete().eq('name', name)); state.kinds = state.kinds.filter(x => x.name !== name); },
    async addLunch(l) {
      const item = fromLunch(check(await sb.from('lunch_picks').insert({ picked_by: l.by, mode: l.mode, candidates: l.candidates, result: l.result }).select().single()));
      if (!state.lunch.some(x => x.id === item.id)) state.lunch = [item].concat(state.lunch);
      return item;
    },
    async _orpc(fn, args) {
      const r = await sb.rpc(fn, args);
      if (r.error) { const m = errMsg(r.error).match(/not_invite|not_yours|not_playing|not_your_turn|bad_move/); throw new Error(m ? m[0] : errMsg(r.error)); }
      await this.loadOmok();
    },
    async _brpc(fn, args) {
      const r = await sb.rpc(fn, args);
      if (r.error) { const m = errMsg(r.error).match(/not_invite|not_yours|not_playing|not_setup|not_your_turn|bad_number/); throw new Error(m ? m[0] : errMsg(r.error)); }
      await this.loadBb();
    },
    async _prpc(fn, args) {
      const r = await sb.rpc(fn, args);
      if (r.error) { const m = errMsg(r.error).match(/not_lobby|not_invited|not_host|need_players|not_playing|not_player|bad_players|bad_target/); throw new Error(m ? m[0] : errMsg(r.error)); }
      await this.loadBp(); return r.data;
    },
    async bpCreate(inv, target) { return this._prpc('bp_create', { p_invited: inv, p_target: target }); },
    async bpJoin(id) { return this._prpc('bp_join', { p_room: id }); },
    async bpLeave(id) { return this._prpc('bp_leave', { p_room: id }); },
    async bpStart(id) { return this._prpc('bp_start', { p_room: id }); },
    async bpReport(id, score, lines, over) { return this._prpc('bp_report', { p_room: id, p_score: score, p_lines: lines, p_over: over }); },
    async bbInvite(o) { const g = fromBb(check(await sb.from('bb_games').insert({ p1: o.p1, p2: o.p2, digits: o.digits }).select().single())); state.bb = [g].concat(state.bb.filter(x => x.id !== g.id)); return g; },
    async bbRespond(id, accept) { return this._brpc('bb_respond', { p_game: id, p_accept: accept }); },
    async bbCancel(id) { return this._brpc('bb_cancel', { p_game: id }); },
    async bbSetSecret(id, sec) { return this._brpc('bb_set_secret', { p_game: id, p_secret: sec }); },
    async bbGuess(id, guess) { return this._brpc('bb_guess', { p_game: id, p_guess: guess }); },
    async bbResign(id) { return this._brpc('bb_resign', { p_game: id }); },
    async omokInvite(o) { const g = fromOmok(check(await sb.from('omok_games').insert({ black: o.black, white: o.white, created_by: o.by }).select().single())); state.omok = [g].concat(state.omok.filter(x => x.id !== g.id)); return g; },
    async omokRespond(id, accept) { return this._orpc('omok_respond', { p_game: id, p_accept: accept }); },
    async omokCancel(id) { return this._orpc('omok_cancel', { p_game: id }); },
    async omokMove(id, idx) { return this._orpc('omok_move', { p_game: id, p_idx: idx }); },
    async omokResign(id) { return this._orpc('omok_resign', { p_game: id }); },
    async resetAll(pw) {
      const res = await sb.rpc('reset_all', { p_password: pw });
      if (res.error) throw new Error(/wrong_password/.test(errMsg(res.error)) ? 'wrong_password' : errMsg(res.error));
      try { await sb.auth.signOut(); } catch (e) {}
    },
    async leave() {
      if (channel) { try { await channel.untrack(); } catch (e) {} }
      try { check(await sb.rpc('leave_device')); } catch (e) { console.warn(e); }
      try { await sb.auth.signOut(); } catch (e) {}
      state.meId = null;
    },
    // 접속 상태: Realtime Presence (창을 닫으면 서버가 알아서 빼 줌)
    isOnline(id) { return id === state.meId || !!state.online[id] || (state.lastSeen[id] && Date.now() - state.lastSeen[id] < GRACE); },
    manual(id) { const o = state.online[id]; return (o && o.status) || (id === state.meId ? store.get(K.myStatus + ':' + id, 'online') : 'online'); },
    async setStatus(s) { const id = state.meId; if (!id) return; store.set(K.myStatus + ':' + id, s); state.online[id] = { status: s }; if (channel) await channel.track({ status: s, at: Date.now() }); },
    startLive() {
      const id = state.meId;
      const t = {};
      const loaders = { members: 'loadMembers', activity: 'loadActivity', notices: 'loadNotices', messages: 'loadMessages', chat_reads: 'loadReads', schedules: 'loadSchedules', schedule_kinds: 'loadKinds', lunch_picks: 'loadLunch', omok_games: 'loadOmok', bb_games: 'loadBb', bp_rooms: 'loadBp', bp_players: 'loadBp' };
      const events = { members: ['hub:team'], activity: ['hub:activity'], notices: ['hub:notices'], messages: ['hub:messages'], chat_reads: ['hub:messages'], schedules: ['hub:schedules', 'hub:team'], schedule_kinds: ['hub:schedules', 'hub:team'], lunch_picks: ['hub:lunch'], omok_games: ['hub:omok'], bb_games: ['hub:bb'], bp_rooms: ['hub:bp'], bp_players: ['hub:bp'] };
      const reload = (tb) => { clearTimeout(t[tb]); t[tb] = setTimeout(async () => {
        try {
          if (tb === 'members') {
            const me = check(await sb.rpc('whoami'));
            if (!me) { location.replace('join.html'); return; }   // 초기화됐거나 이 기기 연결이 끊김
          }
          await this[loaders[tb]](); events[tb].forEach(ev => emit(ev));
        } catch (e) { netError(e); }
      }, 150); };
      channel = sb.channel('interns', { config: { presence: { key: id } } });
      Object.keys(loaders).forEach(tb => channel.on('postgres_changes', { event: '*', schema: 'public', table: tb }, () => reload(tb)));
      channel.on('presence', { event: 'sync' }, () => {
        const ps = channel.presenceState(), now = Date.now(), next = {};
        Object.keys(ps).forEach(k => { const metas = ps[k] || []; const last = metas.slice().sort((a, b) => (b.at || 0) - (a.at || 0))[0]; if (last) next[k] = { status: last.status || 'online' }; });
        Object.keys(state.online).forEach(k => { if (!next[k]) state.lastSeen[k] = now; });
        Object.keys(next).forEach(k => delete state.lastSeen[k]);
        state.online = next;
        emit('hub:team');
      });
      channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ status: store.get(K.myStatus + ':' + id, 'online'), at: Date.now() });
          try { await this.load(); if (!state.meId) { location.replace('join.html'); return; } emitAll(); } catch (e) { netError(e); }
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          toast('실시간 연결이 잠깐 끊겼어요 · 다시 연결하는 중');
        }
      });
      window.addEventListener('pageshow', (e) => { if (e.persisted) this.load().then(emitAll).catch(netError); });
    },
  };

  function emitAll() { ['hub:team', 'hub:activity', 'hub:notices', 'hub:messages', 'hub:schedules', 'hub:lunch', 'hub:omok', 'hub:bb', 'hub:bp'].forEach(ev => emit(ev)); }
  function netError(e) { console.warn('[interns]', e); toast('서버에 연결하지 못했어요 · 잠시 뒤 다시 시도해 주세요'); }
  function loadScript(src) {
    return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('script_load_failed')); document.head.appendChild(s); });
  }

  // 시작: Supabase 설정이 있으면 연결 (실패해도 로컬로 몰래 바꾸지 않음 — 데이터가 갈라지지 않게)
  let initError = null;
  const ready = (async () => {
    if (SB.url && SB.key) {
      backend = supabaseBackend;
      try {
        if (!window.supabase) await loadScript(SB_LIB);
        sb = window.supabase.createClient(SB.url, SB.key, { auth: { persistSession: true, autoRefreshToken: true, storageKey: PFX + 'auth' } });
        await backend.load();
      } catch (e) { console.warn('[interns] Supabase 연결 실패', e); initError = e; }
      return;
    }
    backend = localBackend;
    await backend.load();
  })();

  /* ---------- 공개 API ---------- */
  const AVATAR_RE = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/;
  const AVATAR_MAX = 200000;   // 글자 수 (setup.sql check와 같음)
  const team = {
    list() { return state.members.slice(); },
    get(id) { return state.members.find(m => m.id === id) || null; },
    findByName(name) { return state.members.find(m => m.name === name) || null; },
    meId() { return backend ? backend.meId() : null; },
    me() { return this.get(this.meId()); },
    checkPassword(pw) { return backend.checkPassword(pw); },
    memberNames(pw) { return backend.memberNames(pw); },
    join(pw, name, role, asTabOnly) { return backend.join(pw, name, role, asTabOnly); },
    continueAs(id) { return backend.continueAs(id); },
    // 프로필 사진: data URL(256×256 JPEG) 또는 null(지우기)
    async setAvatar(data) {
      if (data != null && !AVATAR_RE.test(data)) throw new Error('bad_avatar');
      await backend.setAvatar(data || null);
      if (data) activity.add('프로필 사진을 바꿨어요');
      emit('hub:team'); emit('hub:activity');
    },
    signOut() { return backend.leave(); },
    resetAll(pw) { return backend.resetAll(pw); },
    setStatus(s) { return backend.setStatus(s); },
    manualStatus(id) { return backend.manual(id); },
    // 화면 상태: 접속 안 함 → 오프라인 / 직접 고른 '자리 비움'·'바쁨' / 그 외 온라인
    status(id) {
      if (!backend.isOnline(id)) return 'offline';
      const s = backend.manual(id);
      return s === 'away' ? 'away' : s === 'meeting' ? 'meeting' : 'online';
    },
  };
  const activity = {
    all() { return state.activity.slice(); },
    async add(what, where) { const me = team.meId(); if (!me) return; try { await backend.addActivity({ who: me, what, where: where || '', at: Date.now() }); } catch (e) { console.warn(e); } },
  };
  const TAGS = ['공지', '약속', '정보'];
  const notices = {
    all() { return state.notices.slice().sort(byAtDesc); },
    get(id) { return state.notices.find(n => n.id === id) || null; },
    async add(n) { const item = await backend.addNotice({ tag: n.tag || '공지', title: n.title, body: n.body || '', author: team.meId() }); activity.add('공지를 올렸어요', n.title); return item; },
    async remove(id) { return backend.removeNotice(id); },
  };
  // 쪽지: to가 팀원 id면 1:1, 'group'(DB에선 null)이면 단체방
  const messages = {
    group() { return state.messages.filter(m => !m.to).sort(byAt); },
    thread(other) {
      if (other === 'group') return this.group();
      const me = team.meId(); return state.messages.filter(m => m.to && ((m.from === me && m.to === other) || (m.from === other && m.to === me))).sort(byAt);
    },
    last(other) { const t = this.thread(other); return t[t.length - 1] || null; },
    groupReadAt(id) { const m = team.get(id); return state.reads[id] || (m ? m.joinedAt : 0); },
    unreadFrom(other) {
      const me = team.meId();
      if (other === 'group') { const t = this.groupReadAt(me); return this.group().filter(m => m.from !== me && m.at > t).length; }
      return state.messages.filter(m => m.to === me && m.from === other && !m.readAt).length;
    },
    unreadTotal() { const me = team.meId(); return state.messages.filter(m => m.to === me && !m.readAt).length + this.unreadFrom('group'); },
    // 이 쪽지를 아직 안 읽은 사람 수 (카톡의 노란 숫자)
    unreadCount(msg) {
      if (msg.to) return msg.readAt ? 0 : 1;
      return state.members.filter(m => m.id !== msg.from && m.joinedAt <= msg.at && this.groupReadAt(m.id) < msg.at).length;
    },
    async send(to, body, file) {
      const me = team.meId();
      let f = null;
      if (file) {
        const ext = (String(file.name).match(/\.([a-z0-9]{1,8})$/i) || [, 'bin'])[1].toLowerCase();
        const path = `${this.scope(to)}/${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const saved = await backend.uploadFile(path, file.blob, file.type);
        f = { path: saved, name: String(file.name).slice(0, 120), type: (file.type || '').slice(0, 100), size: file.size };
      }
      return backend.sendMessage({ from: me, to: to === 'group' ? null : to, body: body || '', file: f });
    },
    // 첨부 폴더: 단체방 'group', 1:1은 두 사람 id 정렬 (DB 보안 규칙과 같은 규칙)
    scope(to) { if (to === 'group' || !to) return 'group'; return [team.meId(), to].sort().join('_'); },
    isImage(f) { return !!f && /^image\/(jpeg|png|gif|webp|bmp|avif)$/i.test(f.type || ''); },
    preview(m) { if (m.body) return m.body; if (!m.file) return ''; return this.isImage(m.file) ? '📷 사진' : `📎 ${m.file.name}`; },
    // 서명 URL 캐시 (만료 5분 전까지 재사용)
    _urls: {},
    cachedUrl(path) { const c = this._urls[path]; return c && c.exp > Date.now() ? c.url : null; },
    async urls(paths) {
      const need = [...new Set(paths)].filter(p => !this.cachedUrl(p));
      if (need.length) {
        const got = await backend.signUrls(need), exp = Date.now() + 55 * 60 * 1000;
        Object.keys(got).forEach(p => { this._urls[p] = { url: got[p], exp }; });
      }
      const out = {}; paths.forEach(p => { const u = this.cachedUrl(p); if (u) out[p] = u; }); return out;
    },
    downloadUrl(f) { return backend.downloadUrl(f.path, f.name); },
    async markRead(other) { try { await backend.markRead(team.meId(), other); } catch (e) { console.warn(e); } },
  };
  const BASE_KINDS = TEAM.scheduleKinds.length ? TEAM.scheduleKinds : ['연차', '오전 반차', '오후 반차', '출장', '외근', '교육', '재택', '기타'];
  const BASE_CLASS = { '연차': 'off', '오전 반차': 'half', '오후 반차': 'half', '출장': 'trip', '외근': 'trip', '교육': 'edu', '재택': 'home' };
  // 직접 만드는 종류에 고를 수 있는 색 (이름은 화면 읽기용)
  const KIND_COLORS = [['pink', '분홍'], ['green', '초록'], ['red', '빨강'], ['blue', '파랑'], ['edu', '보라'], ['home', '하늘'], ['off', '주황'], ['trip', '청록']];
  const kindClass = (k) => { const c = state.kinds.find(x => x.name === k); return c ? c.color : (BASE_CLASS[k] || 'etc'); };
  const cleanKind = (v) => String(v || '').replace(/\s+/g, ' ').trim();
  const schedules = {
    BASE_KINDS, KIND_COLORS, kindClass,
    get KINDS() { return BASE_KINDS.concat(state.kinds.map(x => x.name).filter(n => !BASE_KINDS.includes(n))); },
    custom() { return state.kinds.slice(); },
    isCustom(name) { return state.kinds.some(x => x.name === name); },
    async addKind(name, color) {
      name = cleanKind(name);
      if (!name || name.length > 10) throw new Error('bad_name');
      if (this.KINDS.includes(name)) return name;   // 이미 있으면 그걸 고름
      await backend.addKind({ name, color: KIND_COLORS.some(c => c[0] === color) ? color : 'pink', by: team.meId() });
      return name;
    },
    async removeKind(name) { return backend.removeKind(name); },
    all() { return state.schedules.slice(); },
    get(id) { return state.schedules.find(s => s.id === id) || null; },
    on(date) { return state.schedules.filter(s => s.start <= date && s.end >= date); },
    inRange(a, b) { return state.schedules.filter(s => s.start <= b && s.end >= a); },
    todayFor(id) { const t = todayYmd(); return state.schedules.filter(s => s.member === id && s.start <= t && s.end >= t); },
    async add(s) {
      const item = await backend.addSchedule({ member: team.meId(), kind: s.kind, start: s.start, end: s.end, memo: s.memo || '' });
      activity.add('일정을 올렸어요', `${rangeLabel(s.start, s.end)} ${s.kind}`);
      return item;
    },
    async remove(id) { return backend.removeSchedule(id); },
    async update(id, s) {
      const item = await backend.updateSchedule(id, { kind: s.kind, start: s.start, end: s.end, memo: s.memo || '' });
      activity.add('일정을 바꿨어요', `${rangeLabel(s.start, s.end)} ${s.kind}`);
      return item;
    },
  };
  const lunch = {
    all() { return state.lunch.slice().sort(byAtDesc); },
    today() { const t = todayYmd(); return this.all().filter(l => ymd(new Date(l.at)) === t); },
    pickIndex(n) { const a = new Uint32Array(1); (window.crypto || window.msCrypto).getRandomValues(a); return a[0] % n; },
    async add(l) {
      const item = await backend.addLunch({ by: team.meId(), mode: l.mode, candidates: l.candidates, result: l.result });
      activity.add('점심을 뽑았어요', `🍚 ${l.candidates[l.result]}`);
      return item;
    },
  };
  const omok = {
    rules: OMOK,
    all() { return state.omok.slice().sort((a, b) => b.upd - a.upd); },
    get(id) { return state.omok.find(g => g.id === id) || null; },
    isIn(g, id) { id = id || team.meId(); return g.black === id || g.white === id; },
    colorOf(g, id) { id = id || team.meId(); return g.black === id ? 1 : g.white === id ? 2 : 0; },
    opponent(g, id) { id = id || team.meId(); return g.black === id ? g.white : g.black; },
    turnOf(g) { return g.moves.length % 2 ? g.white : g.black; },
    myTurn(g) { return g.status === 'playing' && this.turnOf(g) === team.meId(); },
    invitesForMe() { const me = team.meId(); return this.all().filter(g => g.status === 'invite' && g.by !== me && this.isIn(g, me)); },
    attention() { return this.invitesForMe().length + this.all().filter(g => this.myTurn(g)).length; },
    async invite(other, color) {
      const me = team.meId(); if (!other || other === me) throw new Error('bad_opponent');
      const iBlack = color === 'random' ? !!(crypto.getRandomValues(new Uint8Array(1))[0] & 1) : color !== 'white';
      return backend.omokInvite({ black: iBlack ? me : other, white: iBlack ? other : me, by: me });
    },
    async respond(id, accept) { return backend.omokRespond(id, accept); },
    async cancel(id) { return backend.omokCancel(id); },
    async move(id, idx) { return backend.omokMove(id, idx); },
    async resign(id) { return backend.omokResign(id); },
  };

  const bb = {
    rules: BB,
    all() { return state.bb.slice().sort((a, b) => b.upd - a.upd); },
    get(id) { return state.bb.find(g => g.id === id) || null; },
    isIn(g, id) { id = id || team.meId(); return g.p1 === id || g.p2 === id; },
    opponent(g, id) { id = id || team.meId(); return g.p1 === id ? g.p2 : g.p1; },
    turnOf(g) { return g.guesses.length % 2 ? g.p2 : g.p1; },
    myTurn(g) { return g.status === 'playing' && this.turnOf(g) === team.meId(); },
    ready(g, id) { id = id || team.meId(); return id === g.p1 ? g.ready1 : g.ready2; },
    needsSecret(g) { return g.status === 'setup' && this.isIn(g) && !this.ready(g); },
    secretOf(g, id) { return (state.bbSec[g.id] || {})[id || team.meId()] || null; },
    // 상대 숫자는 끝난 대결에서만 (로컬 미리보기 모드도 같은 규칙으로 보여 줌)
    revealed(g, id) { return g.status === 'done' || id === team.meId() ? this.secretOf(g, id) : null; },
    invitesForMe() { const me = team.meId(); return this.all().filter(g => g.status === 'invite' && g.p2 === me); },
    attention() { return this.invitesForMe().length + this.all().filter(g => this.myTurn(g) || this.needsSecret(g)).length; },
    async invite(other, digits) { const me = team.meId(); if (!other || other === me) throw new Error('bad_opponent'); return backend.bbInvite({ p1: me, p2: other, digits: digits === 4 ? 4 : 3 }); },
    async respond(id, accept) { return backend.bbRespond(id, accept); },
    async cancel(id) { return backend.bbCancel(id); },
    async setSecret(id, sec) { return backend.bbSetSecret(id, sec); },
    async guess(id, g) { return backend.bbGuess(id, g); },
    async resign(id) { return backend.bbResign(id); },
  };

  const bbApi = bb;

  const bp = {
    TARGETS: [500, 1000, 2000, 3000],
    rooms() { return state.bpRooms.slice().sort((a, b) => b.upd - a.upd); },
    get(id) { return state.bpRooms.find(r => r.id === id) || null; },
    players(id) { return state.bpPlayers.filter(p => p.room === id).sort((a, b) => b.score - a.score || a.joined - b.joined); },
    player(id, m) { m = m || team.meId(); return state.bpPlayers.find(p => p.room === id && p.member === m) || null; },
    isPlayer(r, m) { return !!this.player(r.id, m); },
    pendingFor(r, m) { m = m || team.meId(); return r.status === 'lobby' && r.invited.includes(m) && !this.isPlayer(r, m); },
    invitesForMe() { return this.rooms().filter(r => this.pendingFor(r)); },
    attention() { return this.invitesForMe().length + this.rooms().filter(r => r.status === 'playing' && this.isPlayer(r) && !this.player(r.id).over).length; },
    async create(inv, target) { return backend.bpCreate(inv, target); },
    async join(id) { return backend.bpJoin(id); },
    async leave(id) { return backend.bpLeave(id); },
    async start(id) { return backend.bpStart(id); },
    async report(id, score, lines, over) { return backend.bpReport(id, score, lines, over); },
  };
  const bpApi = bp;   // renderShell 안에서 쓰는 이름

  // 알림: 남이 올린 공지 / 나한테 온 쪽지·단체방 / 남이 올린 일정 / 남이 뽑은 점심
  //  안 읽음 — 쪽지: 실제로 안 읽음 / 나머지: 종 패널(또는 그 화면)을 마지막으로 본 시각 이후
  const SEEN_KINDS = ['notice', 'schedule', 'lunch', 'omok', 'bb', 'bp'];
  const notifs = {
    seenAt(kind) { const me = team.me(); if (!me) return Date.now(); const all = store.get(K.seen + me.id, null) || {}; return all[kind] || me.joinedAt || 0; },
    list() {
      const me = team.meId(); if (!me) return [];
      const nm = (id) => member(id).name;
      const gRead = messages.groupReadAt(me);
      const out = [];
      state.notices.filter(n => n.author !== me).forEach(n => out.push({ id: 'n:' + n.id, kind: 'notice', who: n.author, at: n.at, text: `${nm(n.author)} 님이 공지를 올렸어요`, sub: n.title, href: 'notices.html#n-' + n.id }));
      state.messages.filter(m => m.to === me).forEach(m => out.push({ id: 'd:' + m.id, kind: 'message', who: m.from, at: m.at, read: !!m.readAt, text: `${nm(m.from)} 님의 쪽지`, sub: messages.preview(m), href: 'messages.html?to=' + encodeURIComponent(m.from) }));
      state.messages.filter(m => !m.to && m.from !== me).forEach(m => out.push({ id: 'g:' + m.id, kind: 'message', who: m.from, at: m.at, read: m.at <= gRead, text: `단체방 · ${nm(m.from)}`, sub: messages.preview(m), href: 'messages.html?to=group' }));
      state.schedules.filter(s => s.member !== me && s.at).forEach(s => out.push({ id: 's:' + s.id + (s.edited ? ':' + s.edited : ''), kind: 'schedule', who: s.member, at: s.edited || s.at, text: `${nm(s.member)} 님이 일정을 ${s.edited ? '바꿨어요' : '올렸어요'}`, sub: `${rangeLabel(s.start, s.end)} ${s.kind}${s.memo ? ' · ' + s.memo : ''}`, href: 'schedule.html?date=' + s.start }));
      state.lunch.filter(l => l.by !== me).forEach(l => out.push({ id: 'l:' + l.id, kind: 'lunch', who: l.by, at: l.at, text: `${nm(l.by)} 님이 점심을 뽑았어요`, sub: `🍚 ${l.candidates[l.result]} (후보 ${l.candidates.length}개)`, href: 'lunch.html' }));
      state.omok.filter(g => omok.isIn(g, me)).forEach(g => {
        const op = omok.opponent(g, me), href = 'omok.html?g=' + g.id, mine = omok.colorOf(g, me) === 1 ? '흑(선공)' : '백(후공)';
        if (g.status === 'invite' && g.by !== me) out.push({ id: 'oi:' + g.id, kind: 'omok', who: op, at: g.at, text: `${nm(op)} 님이 오목 한 판 하재요`, sub: `나는 ${mine} · 눌러서 수락`, href });
        else if (g.status === 'declined' && g.by === me) out.push({ id: 'od:' + g.id, kind: 'omok', who: op, at: g.upd, text: `${nm(op)} 님이 오목은 다음에 하재요`, sub: '대국 신청이 거절됐어요', href });
        else if (g.status === 'playing' && !g.moves.length && g.by === me) out.push({ id: 'oa:' + g.id, kind: 'omok', who: op, at: g.upd, text: `${nm(op)} 님이 오목 대국을 받았어요`, sub: omok.myTurn(g) ? '내가 흑이라 먼저 둬요' : `${nm(op)} 님이 흑이라 먼저 둬요`, href });
        else if (g.status === 'playing' && g.moves.length && omok.myTurn(g)) out.push({ id: 'ot:' + g.id + ':' + g.moves.length, kind: 'omok', who: op, at: g.upd, text: `${nm(op)} 님이 뒀어요 · 내 차례`, sub: `오목 ${g.moves.length}수째`, href });
        else if (g.status === 'done') out.push({ id: 'oe:' + g.id, kind: 'omok', who: op, at: g.upd, text: !g.winner ? `${nm(op)} 님과 오목 비겼어요` : g.winner === me ? `${nm(op)} 님과 오목 이겼어요 🎉` : `${nm(op)} 님과 오목 졌어요`, sub: g.reason === 'resign' ? (g.winner === me ? '상대가 기권했어요' : '기권했어요') : g.reason === 'draw' ? '판이 꽉 찼어요' : '오목 완성', href });
      });
      state.bb.filter(g => bb.isIn(g, me)).forEach(g => {
        const op = bb.opponent(g, me), href = 'baseball.html?g=' + g.id, nd = `${g.digits}자리`;
        const last = g.guesses[g.guesses.length - 1];
        if (g.status === 'invite' && g.p2 === me) out.push({ id: 'bi:' + g.id, kind: 'bb', who: op, at: g.at, text: `${nm(op)} 님이 숫자야구 하재요`, sub: `${nd} · 눌러서 수락`, href });
        else if (g.status === 'declined' && g.p1 === me) out.push({ id: 'bd:' + g.id, kind: 'bb', who: op, at: g.upd, text: `${nm(op)} 님이 숫자야구는 다음에 하재요`, sub: '대결 신청이 거절됐어요', href });
        else if (g.status === 'setup' && !bb.ready(g, me)) out.push({ id: 'bs:' + g.id, kind: 'bb', who: op, at: g.upd, text: g.p1 === me ? `${nm(op)} 님이 숫자야구를 받았어요` : `숫자야구 · 내 숫자를 정해 주세요`, sub: `${nd} 숫자를 숨겨요`, href });
        else if (g.status === 'playing' && bb.myTurn(g) && last) out.push({ id: 'bt:' + g.id + ':' + g.guesses.length, kind: 'bb', who: op, at: g.upd, text: `${nm(op)} 님이 ${last.g} → ${BB.label(last, g.digits)} · 내 차례`, sub: g.solved1 && g.p2 === me ? '상대가 맞혔어요 · 마지막 기회!' : `숫자야구 ${nd}`, href });
        else if (g.status === 'playing' && bb.myTurn(g) && !last) out.push({ id: 'bt:' + g.id + ':0', kind: 'bb', who: op, at: g.upd, text: `숫자야구 시작 · 내가 먼저 맞혀요`, sub: `${nm(op)} 님과 ${nd}`, href });
        else if (g.status === 'done') out.push({ id: 'be:' + g.id, kind: 'bb', who: op, at: g.upd, text: !g.winner ? `${nm(op)} 님과 숫자야구 비겼어요` : g.winner === me ? `${nm(op)} 님과 숫자야구 이겼어요 🎉` : `${nm(op)} 님과 숫자야구 졌어요`, sub: g.reason === 'resign' ? (g.winner === me ? '상대가 기권했어요' : '기권했어요') : `${Math.ceil(g.guesses.length / 2)}번째에 끝`, href });
      });
      state.bpRooms.forEach(r => {
        const href = 'blocks.html?r=' + r.id, mine = bp.isPlayer(r, me);
        if (bp.pendingFor(r, me)) out.push({ id: 'pi:' + r.id, kind: 'bp', who: r.host, at: r.at, text: `${nm(r.host)} 님이 블록 퍼즐 대결에 불렀어요`, sub: `목표 ${r.target}점 먼저 · 눌러서 참가`, href });
        else if (r.status === 'playing' && mine && r.host !== me) out.push({ id: 'ps:' + r.id, kind: 'bp', who: r.host, at: r.started || r.upd, text: '블록 퍼즐 대결이 시작됐어요!', sub: `목표 ${r.target}점 · ${bp.players(r.id).length}명`, href });
        else if (r.status === 'done' && mine) { const p = bp.player(r.id, me); out.push({ id: 'pe:' + r.id, kind: 'bp', who: r.winner || r.host, at: r.upd, text: !r.winner ? '블록 퍼즐 대결 · 비겼어요' : r.winner === me ? '블록 퍼즐 대결 이겼어요 🎉' : `블록 퍼즐 대결 · ${nm(r.winner)} 님 승`, sub: `내 점수 ${p ? p.score : 0}점 · 목표 ${r.target}점`, href }); }
      });
      return out.sort(byAtDesc).slice(0, 30);
    },
    isUnread(x) { return x.kind === 'message' ? !x.read : x.at > this.seenAt(x.kind); },
    unread() { return this.list().filter(x => this.isUnread(x)); },
    markSeen(kind) { const me = team.meId(); if (!me) return; const all = store.get(K.seen + me, null) || {}; (kind ? [kind] : SEEN_KINDS).forEach(k => { all[k] = Date.now(); }); store.set(K.seen + me, all); },
  };

  const member = (id) => team.get(id) || { id, name: '알 수 없음', role: '' };
  const shortName = (name) => /^[가-힣]{3}$/.test(name || '') ? name.slice(1) : name;
  const initial = (name) => { name = String(name || '?').trim(); return /^[가-힣]+$/.test(name) ? name.slice(-2) : name.slice(0, 2).toUpperCase(); };
  const tone = (id) => { const i = state.members.findIndex(m => m.id === id); return (i < 0 ? 4 : i) % 5; };
  // 프로필 사진: data URL을 한 번만 blob: 주소로 바꿔 둠 (화면마다 30KB짜리 글자를 다시 만들지 않게)
  const avUrls = new Map();
  function avatarSrc(data) {
    if (!data || data.length > AVATAR_MAX || !AVATAR_RE.test(data)) return null;
    let u = avUrls.get(data);
    if (!u) {
      try {
        const i = data.indexOf(','), bin = atob(data.slice(i + 1)), a = new Uint8Array(bin.length);
        for (let k = 0; k < bin.length; k++) a[k] = bin.charCodeAt(k);
        u = URL.createObjectURL(new Blob([a], { type: data.slice(5, data.indexOf(';')) }));
      } catch (e) { u = data; }
      avUrls.set(data, u);
    }
    return u;
  }
  const avatar = (id, cls) => {
    const m = member(id), src = avatarSrc(m.avatar);
    return `<span class="av${src ? ' av--img' : ''} ${cls || ''}" title="${esc(m.name)}" data-tone="${tone(id)}">${src ? `<img src="${esc(src)}" alt="" draggable="false" decoding="async">` : esc(initial(m.name))}</span>`;
  };
  const avatars = (ids, max) => { max = max || 4; const extra = ids.length - max; return `<span class="avs">${ids.slice(0, max).map(i => avatar(i)).join('')}${extra > 0 ? `<span class="av av--more">+${extra}</span>` : ''}</span>`; };
  const inviteUrl = () => new URL('join.html?invite=1', location.href).href;
  const isShared = () => backend && backend.mode === 'supabase';

  /* ---------- 테마 ---------- */
  const TKEY = PFX + 'theme';
  const isLight = () => document.documentElement.getAttribute('data-theme') === 'light';
  function setTheme(light) {
    if (light) document.documentElement.setAttribute('data-theme', 'light'); else document.documentElement.removeAttribute('data-theme');
    try { localStorage.setItem(TKEY, light ? 'light' : 'dark'); } catch (e) {}
    document.querySelectorAll('[data-theme-btn]').forEach(b => b.setAttribute('aria-pressed', String((b.dataset.themeBtn === 'light') === light)));
  }

  /* ---------- 토스트 ---------- */
  let toastT;
  function toast(msg) {
    let t = $('#toast');
    if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; t.setAttribute('role', 'status'); t.setAttribute('aria-live', 'polite'); document.body.appendChild(t); }
    t.textContent = msg; t.classList.add('is-on');
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('is-on'), 2600);
  }
  async function copyText(text, input) {
    try { await navigator.clipboard.writeText(text); return true; } catch (e) {}
    try { if (input) { input.select(); return document.execCommand('copy'); } } catch (e) {}
    return false;
  }

  /* ---------- 공용 모달 뼈대 ---------- */
  function makeDialog(id, cls, labelId) {
    let d = $('#' + id);
    if (d) return { d, fresh: false };
    d = document.createElement('dialog');
    d.className = 'modal ' + (cls || ''); d.id = id; d.setAttribute('aria-labelledby', labelId);
    document.body.appendChild(d);
    d.addEventListener('click', (e) => { if (e.target === d) d.close(); });
    d.addEventListener('close', () => { if (d._opener && d._opener.focus && document.contains(d._opener)) d._opener.focus(); });
    return { d, fresh: true };
  }

  /* ---------- 초대 모달 ---------- */
  function openInvite() {
    const { d } = makeDialog('inviteDialog', 'modal--sm', 'invTitle');
    d.innerHTML = `
      <div class="modal__head"><h2 id="invTitle">멤버 초대하기</h2><button class="icon-btn" type="button" data-close aria-label="닫기">${icon('close', 20)}</button></div>
      <div class="modal__body">
        <p class="muted" style="font-size:14px">아래 링크로 들어와서 비밀번호와 이름만 적으면 ${esc(TEAM.name)}에 합류해요.</p>
        <div class="copy-row"><input type="text" id="invLink" readonly aria-label="초대 링크"><button class="btn btn--accent btn--sm" type="button" id="invCopy">${icon('copy', 16)}복사</button></div>
        <p class="hint">${icon('lock', 15)}<span>비밀번호는 링크와 따로 알려 주세요.</span></p>
        ${isShared() ? `<p class="hint">${icon('device', 15)}<span>각자 <b>자기 휴대폰·노트북</b>에서 링크를 열면 돼요. 한 번 들어오면 그 기기는 다음부터 바로 열려요.</span></p>`
          : `<p class="hint">${icon('users', 15)}<span>미리보기 모드라 <b>이 브라우저 안</b>에만 저장돼요. '새 창에서 열기'로 다른 사람처럼 들어와 볼 수 있어요.</span></p>`}
      </div>
      <div class="modal__foot">${isShared() ? '' : `<button class="btn btn--ghost" type="button" id="invOpen">${icon('external', 16)}새 창에서 열기</button>`}<button class="btn btn--accent" type="button" data-close>확인</button></div>`;
    d.querySelectorAll('[data-close]').forEach(b => b.onclick = () => d.close());
    $('#invCopy', d).onclick = async () => { const ok = await copyText(inviteUrl(), $('#invLink', d)); toast(ok ? '초대 링크를 복사했어요' : '링크를 길게 눌러 복사해 주세요'); };
    const o = $('#invOpen', d); if (o) o.onclick = () => { window.open(inviteUrl(), '_blank', 'noopener'); };
    d._opener = document.activeElement;
    $('#invLink', d).value = inviteUrl();
    d.showModal();
  }

  /* ---------- 프로필 사진 모달: 고르기 → 위치·크기 맞추기(동그라미) → 저장 / 지우기 ---------- */
  const AV_OUT = 256;   // 저장 크기(px). 화면에선 최대 64px라 휴대폰 고해상도에서도 충분
  async function decodeImage(file) {
    try { return await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch (e) {}
    const url = URL.createObjectURL(file);
    try {
      const img = new Image(); img.src = url; await img.decode();
      return img;
    } finally { setTimeout(() => URL.revokeObjectURL(url), 1000); }
  }
  function openAvatarEditor() {
    const me = team.me(); if (!me) return;
    const { d, fresh } = makeDialog('avatarDialog', 'modal--sm', 'avTitle');
    let img = null, S = 260, zoom = 1, x = 0, y = 0, base = 1, busy = false, confirmDel = false;
    const pts = new Map(); let pinch = null;
    if (fresh) {
      d.innerHTML = `
        <div class="modal__head"><h2 id="avTitle">프로필 사진</h2><button class="icon-btn" type="button" data-close aria-label="닫기">${icon('close', 20)}</button></div>
        <div class="modal__body">
          <div class="avd" id="avView">
            <span class="avd__cur" id="avCur"></span>
            <p class="muted avd__txt">멤버 목록·쪽지·알림 등 동기들 화면에 이 사진이 보여요.</p>
          </div>
          <div class="avc" id="avCrop" hidden>
            <div class="avc__stage" id="avStage" tabindex="0" role="application" aria-label="사진 위치 맞추기. 끌어서 옮기고, 방향키로 옮기고, + − 키로 크기 조절">
              <canvas id="avCanvas"></canvas><span class="avc__ring" aria-hidden="true"></span>
            </div>
            <label class="avc__zoom"><span aria-hidden="true">${icon('image', 14)}</span><input type="range" id="avZoom" min="1" max="4" step="0.01" value="1" aria-label="사진 크기"><span aria-hidden="true">${icon('image', 20)}</span></label>
            <p class="hint">${icon('image', 15)}<span>끌어서 위치를, 아래 막대(휴대폰은 두 손가락)로 크기를 맞춰요. 동그라미 안이 보여요.</span></p>
          </div>
          <input type="file" id="avFile" accept="image/jpeg,image/png,image/webp,image/gif,image/bmp,image/avif,image/heic,image/heif" hidden>
        </div>
        <div class="modal__foot avd__foot" id="avFoot"></div>`;
      d.querySelectorAll('[data-close]').forEach(b => b.onclick = () => d.close());
      // 사진 파일을 모달 위에 끌어다 놓아도 됨
      d.addEventListener('dragover', (e) => { if (e.dataTransfer && [...e.dataTransfer.types].includes('Files')) e.preventDefault(); });
      d.addEventListener('drop', (e) => { const f = e.dataTransfer && e.dataTransfer.files[0]; if (f) { e.preventDefault(); d._pick(f); } });
    }
    const $d = (s) => $(s, d);
    const cv = $d('#avCanvas'), stage = $d('#avStage'), zr = $d('#avZoom'), file = $d('#avFile');
    const clamp = () => { const s = base * zoom, w = img.width * s, h = img.height * s; x = Math.min(0, Math.max(S - w, x)); y = Math.min(0, Math.max(S - h, y)); };
    function draw() {
      if (!img) return;
      const dpr = Math.min(3, window.devicePixelRatio || 1);
      const nS = Math.round(stage.getBoundingClientRect().width) || S;
      if (nS !== S) { const k = nS / S; x *= k; y *= k; base *= k; S = nS; }   // 창 크기가 바뀌어도 같은 부분이 보이게
      if (cv.width !== S * dpr) { cv.width = S * dpr; cv.height = S * dpr; }
      const g = cv.getContext('2d'), s = base * zoom;
      g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, S, S); g.imageSmoothingQuality = 'high';
      g.drawImage(img, x, y, img.width * s, img.height * s);
    }
    function setZoom(z, cx, cy) {
      if (!img) return;
      z = Math.min(4, Math.max(1, z)); cx = cx == null ? S / 2 : cx; cy = cy == null ? S / 2 : cy;
      const s0 = base * zoom, s1 = base * z;   // (cx, cy) 지점이 그대로 있게
      x = cx - (cx - x) * s1 / s0; y = cy - (cy - y) * s1 / s0; zoom = z; zr.value = String(z);
      clamp(); draw();
    }
    function foot() {
      const has = !!(team.me() || {}).avatar;
      $d('#avFoot').innerHTML = img
        ? `<button class="btn btn--ghost" type="button" id="avOther">다른 사진</button><span class="avd__sp"></span><button class="btn btn--ghost" type="button" id="avBack">취소</button><button class="btn btn--accent" type="button" id="avSave">${busy ? '저장하는 중…' : '저장'}</button>`
        : `${has ? `<button class="btn btn--danger" type="button" id="avDel">${icon('trash', 16)}${confirmDel ? '정말 지울까요?' : '사진 지우기'}</button>` : ''}<span class="avd__sp"></span><button class="btn btn--accent" type="button" id="avPick">${icon('camera', 16)}${has ? '사진 바꾸기' : '사진 올리기'}</button>`;
      const on = (id, fn) => { const b = $d(id); if (b) { b.onclick = fn; b.disabled = busy; } };
      on('#avPick', () => file.click()); on('#avOther', () => file.click());
      on('#avBack', () => { img = null; view(); });
      on('#avSave', save); on('#avDel', del);
    }
    function view() {
      const m = team.me(); if (!m) return;
      const showCrop = !!img;
      $d('#avView').hidden = showCrop; $d('#avCrop').hidden = !showCrop;
      $d('#avCur').innerHTML = avatar(m.id, 'av--xxl');
      foot();
      if (showCrop) { draw(); stage.focus({ preventScroll: true }); }
    }
    d._repaint = () => { if (d.open && !img && !busy) view(); };
    d._pick = async (f) => {
      if (busy) return;
      if (!/^image\//i.test(f.type || '') && !/\.(jpe?g|png|webp|gif|bmp|avif|heic|heif)$/i.test(f.name || '')) { toast('사진 파일만 올릴 수 있어요'); return; }
      if (f.size > 30 * 1024 * 1024) { toast('30MB보다 큰 사진은 올릴 수 없어요'); return; }
      let bmp;
      try { bmp = await decodeImage(f); } catch (e) { console.warn(e); toast('이 사진은 열 수 없어요 · JPG나 PNG로 바꿔서 올려 주세요'); return; }
      if (!bmp.width || !bmp.height) { toast('이 사진은 열 수 없어요'); return; }
      img = bmp; confirmDel = false; zoom = 1; zr.value = '1';
      $d('#avView').hidden = true; $d('#avCrop').hidden = false;   // 크기를 재려면 먼저 보여야 함
      S = Math.round(stage.getBoundingClientRect().width) || 260;
      base = S / Math.min(img.width, img.height);
      x = (S - img.width * base) / 2; y = (S - img.height * base) / 2;
      view();
    };
    file.onchange = () => { const f = file.files[0]; file.value = ''; if (f) d._pick(f); };
    zr.oninput = () => setZoom(parseFloat(zr.value));
    // 끌기(마우스·터치 공용) + 두 손가락 확대
    const local = (e) => { const r = stage.getBoundingClientRect(); return [(e.clientX - r.left) * S / r.width, (e.clientY - r.top) * S / r.height]; };
    stage.onpointerdown = (e) => { if (!img) return; e.preventDefault(); stage.setPointerCapture(e.pointerId); pts.set(e.pointerId, local(e)); stage.classList.add('is-drag'); if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = { dist: Math.hypot(a[0] - b[0], a[1] - b[1]), zoom }; } };
    stage.onpointermove = (e) => {
      if (!img || !pts.has(e.pointerId)) return;
      const prev = pts.get(e.pointerId), cur = local(e); pts.set(e.pointerId, cur);
      if (pts.size >= 2 && pinch) {
        const [a, b] = [...pts.values()], dist = Math.hypot(a[0] - b[0], a[1] - b[1]);
        if (pinch.dist > 0) setZoom(pinch.zoom * dist / pinch.dist, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
      } else { x += cur[0] - prev[0]; y += cur[1] - prev[1]; clamp(); draw(); }
    };
    stage.onpointerup = stage.onpointercancel = (e) => { pts.delete(e.pointerId); if (pts.size < 2) pinch = null; if (!pts.size) stage.classList.remove('is-drag'); };
    stage.onwheel = (e) => { if (!img) return; e.preventDefault(); const [cx, cy] = local(e); setZoom(zoom * (e.deltaY < 0 ? 1.08 : 1 / 1.08), cx, cy); };
    stage.onkeydown = (e) => {
      if (!img) return;
      const k = e.key, st = e.shiftKey ? 30 : 8;
      if (k === 'ArrowLeft') x -= st; else if (k === 'ArrowRight') x += st; else if (k === 'ArrowUp') y -= st; else if (k === 'ArrowDown') y += st;   // 사진이 화살표 쪽으로 움직임
      else if (k === '+' || k === '=') { setZoom(zoom * 1.1); e.preventDefault(); return; } else if (k === '-' || k === '_') { setZoom(zoom / 1.1); e.preventDefault(); return; }
      else if (k === 'Enter') { e.preventDefault(); save(); return; } else return;
      e.preventDefault(); clamp(); draw();
    };
    // 동그라미에 보이는 부분을 256×256 JPEG로 (투명 PNG는 흰 바탕)
    function render() {
      const s = base * zoom, c = document.createElement('canvas'); c.width = c.height = AV_OUT;
      const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, AV_OUT, AV_OUT); g.imageSmoothingQuality = 'high';
      g.drawImage(img, -x / s, -y / s, S / s, S / s, 0, 0, AV_OUT, AV_OUT);
      for (const q of [0.86, 0.75, 0.6, 0.45]) { const u = c.toDataURL('image/jpeg', q); if (u.length <= AVATAR_MAX * 0.9) return u; }
      return null;
    }
    async function save() {
      if (!img || busy) return;
      const data = render(); if (!data) { toast('사진을 줄이지 못했어요 · 다른 사진으로 해 주세요'); return; }
      busy = true; foot();
      try { await team.setAvatar(data); img = null; busy = false; d.close(); toast('프로필 사진을 바꿨어요'); }
      catch (e) { console.warn(e); busy = false; foot(); toast(e.message === 'local_full' ? '이 브라우저 저장 공간이 꽉 찼어요' : '사진을 저장하지 못했어요 · 연결을 확인해 주세요'); }
    }
    async function del() {
      if (busy) return;
      if (!confirmDel) { confirmDel = true; foot(); $d('#avDel').focus(); return; }
      busy = true; foot();
      try { await team.setAvatar(null); busy = false; confirmDel = false; view(); toast('프로필 사진을 지웠어요'); }
      catch (e) { console.warn(e); busy = false; foot(); toast('사진을 지우지 못했어요 · 연결을 확인해 주세요'); }
    }
    d._opener = document.activeElement;
    img = null; busy = false; confirmDel = false;
    d.onclose = () => { img = null; pts.clear(); pinch = null; };
    view();
    d.showModal();
  }

  /* ---------- 공지 쓰기 모달 ---------- */
  function openNoticeEditor() {
    const { d, fresh } = makeDialog('noticeDialog', '', 'ntdTitle');
    if (fresh) {
      d.innerHTML = `<form method="dialog" id="ntForm" novalidate>
        <div class="modal__head"><h2 id="ntdTitle">공지 쓰기</h2><button class="icon-btn" type="button" data-close aria-label="닫기">${icon('close', 20)}</button></div>
        <div class="modal__body">
          <fieldset class="fld"><legend>분류</legend><div class="seg" role="radiogroup">${TAGS.map((t, i) => `<label><input type="radio" name="ntTag" value="${t}"${i ? '' : ' checked'}><span>${t}</span></label>`).join('')}</div></fieldset>
          <label class="fld"><span>제목 <em>*</em></span><input type="text" id="ntfTitle" maxlength="60" placeholder="예: 금요일 저녁 회식 장소 투표" autocomplete="off"><small class="fld__err" id="ntfErr"></small></label>
          <label class="fld"><span>내용</span><textarea id="ntfBody" maxlength="1000" rows="6" placeholder="다 같이 알아야 할 내용을 적어 주세요"></textarea><small class="fld__count" id="ntfCount">0 / 1000</small></label>
          <p class="hint">${icon('bell', 15)}<span>올리면 다른 멤버들의 <b>알림</b>과 <b>공지사항</b>에 바로 떠요.</span></p>
        </div>
        <div class="modal__foot"><button class="btn btn--ghost" type="button" data-close>취소</button><button class="btn btn--accent" type="submit" id="ntfSave">올리기</button></div>
      </form>`;
      d.querySelectorAll('[data-close]').forEach(b => b.onclick = () => d.close());
      $('#ntfBody', d).addEventListener('input', () => { $('#ntfCount', d).textContent = `${$('#ntfBody', d).value.length} / 1000`; });
      $('#ntForm', d).addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = $('#ntfTitle', d).value.trim(), body = $('#ntfBody', d).value.trim(), tag = d.querySelector('input[name=ntTag]:checked').value;
        $('#ntfErr', d).textContent = title ? '' : '제목을 적어 주세요';
        $('#ntfTitle', d).closest('.fld').classList.toggle('is-err', !title);
        if (!title) { $('#ntfTitle', d).focus(); return; }
        const btn = $('#ntfSave', d); btn.disabled = true;
        try { const item = await notices.add({ tag, title, body }); d.close(); toast('공지를 올렸어요 · 다른 멤버들에게 알림이 가요'); emit('hub:notices'); emit('hub:activity'); emit('hub:notice-added', item.id); }
        catch (er) { console.warn(er); toast('공지를 올리지 못했어요 · 연결을 확인해 주세요'); }
        finally { btn.disabled = false; }
      });
    }
    d._opener = document.activeElement;
    $('#ntForm', d).reset(); $('#ntfErr', d).textContent = ''; $('#ntfTitle', d).closest('.fld').classList.remove('is-err'); $('#ntfCount', d).textContent = '0 / 1000';
    d.showModal();
    setTimeout(() => $('#ntfTitle', d).focus(), 30);
  }

  /* ---------- 일정 올리기 모달 (홈·일정 페이지 공용) ---------- */
  function openScheduleEditor(date, editId) {
    const { d, fresh } = makeDialog('schedDialog', '', 'sdTitle');
    if (fresh) {
      d.innerHTML = `<form method="dialog" id="sdForm" novalidate>
        <div class="modal__head"><h2 id="sdTitle">일정 올리기</h2><button class="icon-btn" type="button" data-close aria-label="닫기">${icon('close', 20)}</button></div>
        <div class="modal__body">
          <fieldset class="fld"><legend>종류</legend><div class="kinds" role="radiogroup" id="sdKinds"></div>
            <div class="kmake" id="sdMake" hidden>
              <input type="text" id="kmName" maxlength="10" placeholder="예: 병원, 외부 미팅" aria-label="새 일정 종류 이름 (10자까지)" autocomplete="off">
              <span class="kmake__colors" role="radiogroup" aria-label="색">${schedules.KIND_COLORS.map(([c, n], i) => `<label class="kcol chip--${c}" title="${n}"><input type="radio" name="kmColor" value="${c}"${i ? '' : ' checked'} aria-label="${n}"><i></i></label>`).join('')}</span>
              <span class="kmake__btns"><button class="btn btn--ghost btn--sm" type="button" id="kmCancel">취소</button><button class="btn btn--accent btn--sm" type="button" id="kmAdd">추가</button></span>
              <small class="kmake__note" id="kmNote">만든 종류는 다른 멤버도 같이 써요</small>
            </div>
          </fieldset>
          <div class="fld-row fld-row--2">
            <label class="fld"><span>시작일 <em>*</em></span><input type="date" id="sdStart" required></label>
            <label class="fld"><span>종료일</span><input type="date" id="sdEnd"><small class="fld__err" id="sdErr"></small></label>
          </div>
          <label class="fld"><span>메모 <small class="muted">(선택)</small></span><input type="text" id="sdMemo" maxlength="40" placeholder="예: 부산 출장, 병원" autocomplete="off"></label>
          <p class="hint" id="sdHint">${icon('bell', 15)}<span>올리면 다른 멤버들의 <b>알림</b>과 <b>일정 달력</b>에 바로 떠요. 반차는 하루만 골라요.</span></p>
        </div>
        <div class="modal__foot"><button class="btn btn--ghost" type="button" data-close>취소</button><button class="btn btn--accent" type="submit" id="sdSave">올리기</button></div>
      </form>`;
      d.querySelectorAll('[data-close]').forEach(b => b.onclick = () => d.close());
      const picked = () => { const r = d.querySelector('input[name=sdKind]:checked'); return r ? r.value : schedules.KINDS[0]; };
      const half = () => /반차/.test(picked());
      // 종류 칩 그리기 (내가 만든 종류엔 × — 지워도 이미 올린 일정 글자는 그대로)
      const paintKinds = (sel) => {
        const me = team.meId(), list = schedules.KINDS;
        if (d._keep && !list.includes(d._keep)) list.push(d._keep);   // 수정 중인 일정의 종류가 지워진 종류여도 그대로 고를 수 있게
        if (!list.includes(sel)) sel = list[0];
        $('#sdKinds', d).innerHTML = list.map(k => { const c = state.kinds.find(x => x.name === k);
          return `<span class="kind-wrap"><label class="kind kind--${kindClass(k)}${c ? ' kind--custom' : ''}${c && c.by === me ? ' kind--mine' : ''}"><input type="radio" name="sdKind" value="${esc(k)}"${k === sel ? ' checked' : ''}><span>${esc(k)}</span></label>${c && c.by === me ? `<button type="button" class="kind__x" data-kdel="${esc(k)}" aria-label="'${esc(k)}' 종류 지우기" title="이 종류 지우기">${icon('close', 11)}</button>` : ''}</span>`; }).join('') +
          `<button type="button" class="kind-add" id="kindAdd" aria-expanded="${!$('#sdMake', d).hidden}">${icon('plus', 14)}직접 만들기</button>`;
        d.querySelectorAll('input[name=sdKind]').forEach(r => r.addEventListener('change', sync));
        $('#kindAdd', d).onclick = () => openMake(true);
        d.querySelectorAll('[data-kdel]').forEach(b => b.onclick = async () => {
          const name = b.dataset.kdel, cur = picked();
          try { await schedules.removeKind(name); toast(`'${name}' 종류를 지웠어요 · 이미 올린 일정은 그대로예요`); paintKinds(cur === name ? list[0] : cur); sync(); emit('hub:schedules'); }
          catch (er) { console.warn(er); toast('종류를 지우지 못했어요'); }
        });
      };
      const openMake = (on) => {
        $('#sdMake', d).hidden = !on; const a = $('#kindAdd', d); if (a) a.setAttribute('aria-expanded', String(on));
        if (on) {
          const used = new Set(state.kinds.map(x => x.color)), free = schedules.KIND_COLORS.find(c => !used.has(c[0])) || schedules.KIND_COLORS[0];
          d.querySelector(`input[name=kmColor][value="${free[0]}"]`).checked = true;
          $('#kmName', d).value = ''; $('#kmNote', d).textContent = '만든 종류는 다른 멤버도 같이 써요'; $('#kmNote', d).classList.remove('is-err');
          $('#kmName', d).focus();
        } else if (a) a.focus();
      };
      const addKind = async () => {
        const name = $('#kmName', d).value, color = d.querySelector('input[name=kmColor]:checked').value, note = $('#kmNote', d);
        const bad = (t) => { note.textContent = t; note.classList.add('is-err'); $('#kmName', d).focus(); };
        if (!name.trim()) return bad('이름을 적어 주세요');
        const btn = $('#kmAdd', d); btn.disabled = true;
        try {
          const existed = schedules.KINDS.includes(name.replace(/\s+/g, ' ').trim());
          const got = await schedules.addKind(name, color);
          $('#sdMake', d).hidden = true; paintKinds(got); sync();
          d.querySelector(`input[name=sdKind][value="${CSS.escape(got)}"]`).focus();
          toast(existed ? `'${got}'은 이미 있어서 그걸 골랐어요` : `'${got}' 종류를 만들었어요`);
          if (!existed) emit('hub:schedules');
        } catch (er) {
          console.warn(er);
          bad(er.message === 'duplicate' ? '방금 누가 같은 이름을 만들었어요 · 목록에서 골라 주세요' : er.message === 'too_many' ? '종류는 30개까지 만들 수 있어요 · 안 쓰는 걸 지워 주세요' : '만들지 못했어요 · 연결을 확인해 주세요');
          if (er.message === 'duplicate') paintKinds(picked());
        } finally { btn.disabled = false; }
      };
      $('#kmAdd', d).onclick = addKind;
      $('#kmName', d).addEventListener('input', () => { const n = $('#kmNote', d); if (n.classList.contains('is-err')) { n.classList.remove('is-err'); n.textContent = '만든 종류는 다른 멤버도 같이 써요'; } });
      $('#kmCancel', d).onclick = () => openMake(false);
      $('#kmName', d).addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); addKind(); }
        if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); openMake(false); }
      });
      d._paint = paintKinds;
      // 다른 멤버가 종류를 만들거나 지우면 열려 있는 창에도 반영 (고른 것·만드는 중인 건 유지)
      document.addEventListener('hub:schedules', () => { if (d.open) paintKinds(picked()); });
      const sync = () => {
        const s = $('#sdStart', d), e = $('#sdEnd', d);
        e.disabled = half(); if (half()) e.value = s.value;
        e.min = s.value; if (e.value && s.value && e.value < s.value) e.value = s.value;
      };
      $('#sdStart', d).addEventListener('change', () => { if (!$('#sdEnd', d).value || $('#sdEnd', d).value < $('#sdStart', d).value || half()) $('#sdEnd', d).value = $('#sdStart', d).value; sync(); });
      $('#sdForm', d).addEventListener('submit', async (e) => {
        e.preventDefault();
        const kind = picked(), start = $('#sdStart', d).value, end = $('#sdEnd', d).value || start, memo = $('#sdMemo', d).value.trim();
        let err = '';
        if (!start) err = '시작일을 골라 주세요';
        else if (end < start) err = '종료일이 시작일보다 빨라요';
        else if ((parseYmd(end) - parseYmd(start)) / 864e5 > 30) err = '한 번에 31일까지 올릴 수 있어요';
        $('#sdErr', d).textContent = err;
        if (err) { $('#sdStart', d).focus(); return; }
        const btn = $('#sdSave', d); btn.disabled = true;
        const editing = d._editId;
        if (editing) {
          const o = schedules.get(editing);
          if (o && o.kind === kind && o.start === start && o.end === end && o.memo === memo) { d.close(); toast('바뀐 게 없어요'); btn.disabled = false; return; }
        }
        try {
          const item = editing ? await schedules.update(editing, { kind, start, end, memo }) : await schedules.add({ kind, start, end, memo });
          d.close(); toast(editing ? `일정을 바꿨어요 · ${rangeLabel(start, end)} ${kind}` : `${rangeLabel(start, end)} ${kind} 올렸어요`);
          emit('hub:schedules'); emit('hub:team'); emit('hub:activity'); emit('hub:schedule-added', item.id);
        }
        catch (er) { console.warn(er); toast(editing ? (er.message === 'not_found' ? '이미 지워진 일정이에요' : '일정을 바꾸지 못했어요 · 연결을 확인해 주세요') : '일정을 올리지 못했어요 · 연결을 확인해 주세요'); }
        finally { btn.disabled = false; }
      });
      d._sync = sync;
    }
    d._opener = document.activeElement;
    $('#sdForm', d).reset(); $('#sdErr', d).textContent = '';
    $('#sdMake', d).hidden = true;
    const ed = editId ? schedules.get(editId) : null;
    d._editId = ed ? ed.id : null; d._keep = ed ? ed.kind : null;
    $('#sdTitle', d).textContent = ed ? '일정 수정' : '일정 올리기';
    $('#sdSave', d).textContent = ed ? '저장' : '올리기';
    $('#sdHint span', d).innerHTML = ed ? '바꾸면 다른 멤버들의 <b>알림</b>에 \'일정을 바꿨어요\'로 떠요. 반차는 하루만 골라요.' : '올리면 다른 멤버들의 <b>알림</b>과 <b>일정 달력</b>에 바로 떠요. 반차는 하루만 골라요.';
    d._paint(ed ? ed.kind : schedules.KINDS[0]);
    if (ed) { $('#sdStart', d).value = ed.start; $('#sdEnd', d).value = ed.end; $('#sdMemo', d).value = ed.memo || ''; }
    else { $('#sdStart', d).value = date || todayYmd(); $('#sdEnd', d).value = $('#sdStart', d).value; }
    d._sync();
    d.showModal();
  }

  /* ---------- 연결 실패 화면 ---------- */
  function showInitError(where) {
    const box = document.createElement('div');
    box.className = 'netfail';
    box.innerHTML = `<div class="card netfail__card" role="alert">${icon('cloud', 28)}<h1>서버에 연결하지 못했어요</h1>
      <p>인터넷 연결을 확인하거나 잠시 뒤 다시 열어 주세요.<br>Supabase 무료 프로젝트는 오래 안 쓰면 잠들어요 — 대시보드에서 <b>Restore</b>를 눌러 깨워 주세요.</p>
      <button class="btn btn--accent" type="button" onclick="location.reload()">다시 시도</button></div>`;
    (where || document.body).replaceChildren(box);
  }

  function requireMe() {
    if (initError) { showInitError(); return false; }
    if (team.meId()) return true;
    location.replace('join.html' + (/[?&]invite=/.test(location.search) ? '?invite=1' : ''));
    return false;
  }

  /* ---------- 상단바·사이드바 ---------- */
  function renderShell(page) {
    const side = $('#side');
    const navItem = (href, ic, label, active, extra) => `<a class="nav__item${active ? ' is-active' : ''}" href="${esc(href)}"${active ? ' aria-current="page"' : ''}${/^https?:/.test(href) ? ' target="_blank" rel="noopener"' : ''}>${icon(ic, 18)}<span>${esc(label)}</span>${extra || ''}</a>`;
    side.innerHTML = `
      <div class="side__head">
        <a class="brand" href="index.html" aria-label="${esc(TEAM.name)} 홈">
          <span class="brand__logo" aria-hidden="true">${icon('bowl', 18)}</span>
          <span class="brand__txt"><b>${esc(TEAM.name)}</b><small>${esc(TEAM.sub || '')}</small></span>
        </a>
        <button class="icon-btn side__close" type="button" id="sideClose" aria-label="메뉴 닫기">${icon('close', 20)}</button>
      </div>
      <nav class="nav" aria-label="메뉴">
        <div class="nav__group">
          ${navItem('index.html', 'home', '홈', page === 'home')}
        </div>
        <div class="nav__group">
          <p class="nav__label">함께 쓰기</p>
          ${navItem('messages.html', 'chat', '쪽지', page === 'messages', '<em class="pill pill--count" id="navMsgCount" hidden></em>')}
          ${navItem('schedule.html', 'calendar', '일정 공유', page === 'schedule')}
          ${navItem('lunch.html', 'bowl', '점심 뽑기', page === 'lunch')}
          ${navItem('notices.html', 'megaphone', '공지사항', page === 'notices')}
          ${navItem('index.html#team', 'users', '멤버', false)}
        </div>
        <div class="nav__group">
          <p class="nav__label">미니게임</p>
          ${navItem('omok.html', 'go', '오목', page === 'omok', '<em class="pill pill--count" id="navOmok" hidden></em>')}
          ${navItem('baseball.html', 'ball', '숫자야구', page === 'baseball', '<em class="pill pill--count" id="navBb" hidden></em>')}
          ${navItem('blocks.html', 'blocks', '블록 퍼즐', page === 'blocks', '<em class="pill pill--count" id="navBp" hidden></em>')}
        </div>
        ${TEAM.links.length ? `<div class="nav__group">
          <p class="nav__label">바로가기</p>
          ${TEAM.links.map(l => navItem(l.href, l.icon || 'link', l.name, false, '<span class="nav__ext">' + icon('external', 14) + '</span>')).join('')}
        </div>` : ''}
      </nav>
      <div class="side__foot">
        <div class="theme" role="group" aria-label="화면 테마">
          <button type="button" data-theme-btn="dark" aria-pressed="${!isLight()}" aria-label="다크">${icon('moon', 16)}</button>
          <button type="button" data-theme-btn="light" aria-pressed="${isLight()}" aria-label="라이트">${icon('sun', 16)}</button>
        </div>
        <p class="side__note">${isShared() ? '<span class="live-dot" aria-hidden="true"></span>실시간 연결<br>Supabase' : '미리보기 모드<br>이 브라우저에만 저장돼요'}</p>
      </div>`;

    const top = $('#top');
    top.innerHTML = `
      <button class="icon-btn top__menu" type="button" id="sideOpen" aria-label="메뉴 열기" aria-controls="side" aria-expanded="false">${icon('menu', 22)}</button>
      <a class="top__brand" href="index.html">${esc(TEAM.name)}</a>
      <div class="top__end">
        <a class="icon-btn" href="messages.html?to=group" aria-label="단체방" title="단체방">${icon('group', 20)}<i class="badge" id="groupBadge" hidden></i></a>
        <div class="notif">
          <button class="icon-btn" type="button" id="bellBtn" aria-label="알림" aria-haspopup="dialog" aria-expanded="false" aria-controls="notifPanel">${icon('bell', 20)}<i class="badge" id="bellBadge" hidden></i></button>
          <div class="notif__panel" id="notifPanel" role="dialog" aria-label="알림" hidden></div>
        </div>
        <div class="profile">
          <button class="profile__btn" type="button" id="profileBtn" aria-haspopup="menu" aria-expanded="false" aria-controls="profileMenu"></button>
          <div class="menu" id="profileMenu" role="menu" hidden></div>
        </div>
      </div>`;

    const shell = $('.shell');
    const scrim = $('#scrim');
    const open = (on) => { shell.classList.toggle('side-open', on); $('#sideOpen').setAttribute('aria-expanded', String(on)); if (on) $('#sideClose').focus(); };
    $('#sideOpen').onclick = () => open(true);
    $('#sideClose').onclick = () => { open(false); $('#sideOpen').focus(); };
    if (scrim) scrim.onclick = () => open(false);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && shell.classList.contains('side-open')) { open(false); $('#sideOpen').focus(); } });
    side.addEventListener('click', (e) => { if (e.target.closest('a.nav__item') && window.matchMedia('(max-width: 960px)').matches) open(false); });
    side.querySelectorAll('[data-theme-btn]').forEach(b => b.onclick = () => setTheme(b.dataset.themeBtn === 'light'));

    // 프로필 버튼·메뉴
    const pb = $('#profileBtn'), pm = $('#profileMenu');
    function paintProfile() {
      const me = team.me(); if (!me) return;
      const st = team.status(me.id);
      pb.innerHTML = `<span class="av-wrap">${avatar(me.id, 'av--lg')}<i class="st st--${st} st--badge" aria-hidden="true"></i></span><span class="profile__name">${esc(me.name)}</span>`;
      pb.setAttribute('aria-label', `내 프로필: ${me.name}, ${ST[st]}`);
      if (!pm.hidden) return;
      const manual = team.manualStatus(me.id);
      pm.innerHTML = `
        <div class="menu__head"><button type="button" class="menu__av" id="menuAvBtn" aria-label="프로필 사진 ${me.avatar ? '바꾸기' : '올리기'}" title="프로필 사진">${avatar(me.id, 'av--lg')}<i aria-hidden="true">${icon('camera', 11)}</i></button><div><b>${esc(me.name)}</b><small>${me.role ? esc(me.role) + ' · ' : ''}${esc(TEAM.name)}</small></div></div>
        <p class="menu__label">내 상태</p>
        <div class="status-pick" role="group" aria-label="내 상태">
          ${[['online', '온라인'], ['meeting', '바쁨'], ['away', '자리 비움']].map(([k, l]) => `<button type="button" role="menuitemradio" aria-checked="${manual === k}" data-status="${k}"><i class="st st--${k}" aria-hidden="true"></i>${l}</button>`).join('')}
        </div>
        <button type="button" role="menuitem" id="menuAvatar">${icon('camera', 16)}<span>프로필 사진 ${me.avatar ? '바꾸기' : '올리기'}</span></button>
        <button type="button" role="menuitem" id="menuInvite">${icon('userPlus', 16)}<span>멤버 초대하기</span></button>
        <button type="button" role="menuitem" id="menuTheme">${icon('sun', 16)}<span>테마 바꾸기</span></button>
        <button type="button" role="menuitem" id="menuOut">${icon('logout', 16)}<span>이 기기에서 나가기</span></button>
        <button type="button" role="menuitem" id="menuReset" class="is-danger">${icon('reset', 16)}<span>전체 초기화</span></button>`;
      pm.querySelectorAll('[data-status]').forEach(b => b.onclick = async () => { menu(false); await team.setStatus(b.dataset.status); paintProfile(); emit('hub:team'); toast(`내 상태를 '${ST[b.dataset.status]}'(으)로 바꿨어요`); });
      $('#menuAvatar').onclick = $('#menuAvBtn').onclick = () => { menu(false); openAvatarEditor(); };
      $('#menuInvite').onclick = () => { menu(false); openInvite(); };
      $('#menuTheme').onclick = () => { setTheme(!isLight()); menu(false); };
      $('#menuOut').onclick = async () => {
        menu(false);
        if (isShared() && !confirm('이 기기에서 나갈까요? 다음에 들어올 때 비밀번호와 이름을 다시 입력해요.\n(쪽지·일정 같은 기록은 그대로 남아요)')) return;
        await team.signOut(); location.replace('join.html');
      };
      $('#menuReset').onclick = async () => {
        menu(false);
        const pw = prompt('모든 멤버의 쪽지·공지·일정·점심 기록·멤버 목록이 전부 지워져요. 되돌릴 수 없어요.\n계속하려면 입장 비밀번호를 입력하세요.');
        if (pw === null) return;
        try { await team.resetAll(pw); location.replace('join.html'); }
        catch (e) { toast(e.message === 'wrong_password' ? '비밀번호가 맞지 않아요' : '초기화하지 못했어요'); }
      };
    }
    const menu = (on) => { if (on) { pm.hidden = true; paintProfile(); } pm.hidden = !on; pb.setAttribute('aria-expanded', String(on)); if (on) pm.querySelector('button').focus(); };
    pb.onclick = (e) => { e.stopPropagation(); if (!$('#notifPanel').hidden) $('#bellBtn').click(); menu(pm.hidden); };
    document.addEventListener('click', (e) => { if (!pm.hidden && !e.target.closest('.profile')) menu(false); });
    pm.addEventListener('keydown', (e) => { if (e.key === 'Escape') { menu(false); pb.focus(); } });
    paintProfile();
    document.addEventListener('hub:team', paintProfile);
    document.addEventListener('hub:team', () => { const ad = $('#avatarDialog'); if (ad && ad._repaint) ad._repaint(); });
    document.addEventListener('hub:tick', paintProfile);

    // ---- 알림 패널 ----
    const bb = $('#bellBtn'), np = $('#notifPanel');
    const KIND_IC = { notice: 'megaphone', message: 'chat', schedule: 'calendar', lunch: 'bowl', omok: 'go', bb: 'ball', bp: 'blocks' };
    function paintBell() {
      const n = notifs.unread().length, badge = $('#bellBadge');
      badge.hidden = !n; badge.textContent = n > 9 ? '9+' : String(n);
      bb.setAttribute('aria-label', n ? `알림 ${n}개 읽지 않음` : '알림');
      const mc = messages.unreadTotal(), nb = $('#navMsgCount');
      if (nb) { nb.hidden = !mc; nb.textContent = String(mc); }
      const oc = omok.attention(), ob = $('#navOmok');
      if (ob) { ob.hidden = !oc; ob.textContent = String(oc); ob.title = oc ? `오목: 받은 신청·내 차례 ${oc}개` : ''; }
      const bc = bbApi.attention(), bbb = $('#navBb');   // 이 안의 bb는 종 버튼이라 별칭 사용
      if (bbb) { bbb.hidden = !bc; bbb.textContent = String(bc); bbb.title = bc ? `숫자야구: 받은 신청·내 차례 ${bc}개` : ''; }
      const pc = bpApi.attention(), pbb = $('#navBp');
      if (pbb) { pbb.hidden = !pc; pbb.textContent = String(pc); pbb.title = pc ? `블록 퍼즐: 초대·진행 중 ${pc}개` : ''; }
      const gc = messages.unreadFrom('group'), gb = $('#groupBadge');
      gb.hidden = !gc; gb.textContent = gc > 9 ? '9+' : String(gc);
      if (!np.hidden) paintPanel();
    }
    function seenAll() { SEEN_KINDS.forEach(k => notifs.markSeen(k)); }
    function paintPanel() {
      const list = notifs.list();
      np.innerHTML = `<div class="notif__head"><b>알림</b>${list.some(x => x.kind !== 'message' && notifs.isUnread(x)) ? '<button type="button" class="link-btn" id="notifAll">모두 읽음</button>' : ''}</div>
        ${list.length ? `<ul class="notif__list">${list.map(x => `<li><a class="nt${notifs.isUnread(x) ? ' is-unread' : ''}" href="${esc(x.href)}">
            <span class="nt__av">${avatar(x.who, 'av--lg')}<i class="nt__kind nt__kind--${x.kind}">${icon(KIND_IC[x.kind], 10)}</i></span>
            <span class="nt__txt"><b>${esc(x.text)}</b><small>${esc(x.sub)}</small></span>
            <span class="nt__when">${esc(ago(x.at))}</span></a></li>`).join('')}</ul>`
          : `<p class="empty empty--box">${icon('bell', 22)}<b>새 알림이 없어요</b><span>쪽지·공지·일정·점심·게임 소식이 오면 여기에 보여요</span></p>`}`;
      const all = $('#notifAll', np); if (all) all.onclick = () => { seenAll(); paintBell(); };
    }
    const panel = (on) => { np.hidden = !on; bb.setAttribute('aria-expanded', String(on)); if (on) { paintPanel(); const f = np.querySelector('a, button'); if (f) f.focus(); } else { seenAll(); paintBell(); } };
    bb.onclick = (e) => { e.stopPropagation(); menu(false); panel(np.hidden); };
    document.addEventListener('click', (e) => { if (!np.hidden && !e.target.closest('.notif')) panel(false); });
    np.addEventListener('keydown', (e) => { if (e.key === 'Escape') { panel(false); bb.focus(); } });
    np.addEventListener('click', (e) => { if (e.target.closest('a.nt')) seenAll(); });
    // 새 알림이 실시간으로 도착하면 토스트 + 종 흔들기 (지금 보고 있는 대화·점심 화면 소식은 토스트 생략)
    let known = new Set(notifs.list().map(x => x.id));
    function onData() {
      if (!team.meId()) return;
      const list = notifs.list(), fresh = list.filter(x => !known.has(x.id) && x.at > Date.now() - 60000);
      known = new Set(list.map(x => x.id));
      const to = new URLSearchParams(location.search).get('to');
      const quiet = (x) => !document.hidden && ((page === 'messages' && x.kind === 'message' && (to === x.who && x.id.startsWith('d:') || to === 'group' && x.id.startsWith('g:'))) || (page === 'lunch' && x.kind === 'lunch') || (page === 'omok' && x.kind === 'omok' && x.id.split(':')[1] === new URLSearchParams(location.search).get('g')) || (page === 'baseball' && x.kind === 'bb' && x.id.split(':')[1] === new URLSearchParams(location.search).get('g')) || (page === 'blocks' && x.kind === 'bp' && x.id.split(':')[1] === new URLSearchParams(location.search).get('r')));
      const loud = fresh.filter(x => !quiet(x));
      if (loud.length) {
        toast(`🔔 ${loud[0].text}${loud[0].kind === 'lunch' ? ' · ' + loud[0].sub : ''}${loud.length > 1 ? ` 외 ${loud.length - 1}개` : ''}`);
        bb.classList.remove('is-ring'); void bb.offsetWidth; bb.classList.add('is-ring');
      }
      paintBell();
    }
    ['hub:notices', 'hub:messages', 'hub:schedules', 'hub:lunch', 'hub:team', 'hub:omok', 'hub:bb', 'hub:bp'].forEach(ev => document.addEventListener(ev, onData));
    paintBell();

    backend.startLive();
    setInterval(() => emit('hub:tick'), 4000);   // 오프라인 전환·'몇 분 전' 갱신
  }

  // 페이지 시작: 데이터 준비 → 입장 확인 → 페이지 코드
  function boot(fn) { ready.then(() => { if (requireMe()) fn(); }); }

  window.Hub = { TEAM, $, esc, icon, store, sess, activity, team, notices, messages, schedules, lunch, omok, bb, bp, notifs, openNoticeEditor, openScheduleEditor, openInvite, openAvatarEditor, TAGS, ST, member, shortName, avatar, avatars, ymd, parseYmd, addDays, weekStart, todayYmd, dayLabel, shortDate, rangeLabel, ago, DOW, pad, toast, renderShell, setTheme, isLight, requireMe, inviteUrl, copyText, ready, boot, isShared, showInitError, get initError() { return initError; }, get mode() { return backend ? backend.mode : null; } };
})();
