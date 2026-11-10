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
    image: '<rect x="3.5" y="4.5" width="17" height="15" rx="3"/><circle cx="9" cy="10" r="1.8"/><path d="M20.5 16l-5-5-8.5 8.5"/>',
    file: '<path d="M7 3.5h7l4.5 4.5v12.5H7z"/><path d="M14 3.5V8h4.5"/>',
    download: '<path d="M12 4v11M7 10.5l5 5 5-5M5 19.5h14"/>',
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
  const K = { members: PFX + 'members', me: PFX + 'me', activity: PFX + 'activity', pres: PFX + 'p:', myStatus: PFX + 'mystatus', notices: PFX + 'notices', messages: PFX + 'messages', reads: PFX + 'reads', schedules: PFX + 'schedules', lunch: PFX + 'lunch', seen: PFX + 'seen:' };

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
  const state = { members: [], activity: [], notices: [], messages: [], reads: {}, schedules: [], lunch: [], online: {}, lastSeen: {}, meId: null };
  const byAtDesc = (a, b) => b.at - a.at;
  const byAt = (a, b) => a.at - b.at;
  const bySched = (a, b) => (a.start + a.at).localeCompare(b.start + b.at);
  const newId = (p) => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
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
    async addLunch(l) { const item = Object.assign({ id: newId('l'), at: Date.now() }, l); state.lunch = [item].concat(state.lunch).slice(0, 50); store.set(K.lunch, state.lunch); return item; },
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
        if (!k || k === K.schedules) { emit('hub:schedules'); emit('hub:team'); }
        if (!k || k === K.lunch) emit('hub:lunch');
      });
    },
  };

  /* ---------- Supabase 백엔드 ---------- */
  let sb = null, channel = null;
  const BUCKET = 'chat-files';
  const fromMember = (r) => ({ id: r.id, name: r.name, role: r.role || '', joinedAt: Date.parse(r.joined_at) || 0 });
  const fromNotice = (r) => ({ id: r.id, tag: r.tag, title: r.title, body: r.body || '', author: r.author, at: Date.parse(r.created_at) || 0 });
  const fromMessage = (r) => ({ id: r.id, from: r.sender, to: r.recipient || null, body: r.body || '', at: Date.parse(r.created_at) || 0, readAt: r.read_at ? Date.parse(r.read_at) : null,
    file: r.file_path ? { path: r.file_path, name: r.file_name || '파일', type: r.file_type || '', size: r.file_size || 0 } : null });
  const fromActivity = (r) => ({ who: r.who, what: r.what, where: r.place || '', at: Date.parse(r.at) || 0 });
  const fromSchedule = (r) => ({ id: r.id, member: r.member, kind: r.kind, start: r.start_date, end: r.end_date, memo: r.memo || '', at: Date.parse(r.created_at) || 0 });
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
    async loadLunch() { state.lunch = check(await sb.from('lunch_picks').select('*').order('created_at', { ascending: false }).limit(50)).map(fromLunch); },
    async load() {
      // meId는 끝까지 확인한 뒤에 바꿈 (중간에 비워 두면 그 사이 화면 갱신이 '알림 없음'으로 보고 새 알림 토스트가 다시 뜸)
      if (!(await this.session())) { state.meId = null; return; }
      const me = check(await sb.rpc('whoami'));
      if (!me) { state.meId = null; return; }
      state.meId = me.id;
      await Promise.all([this.loadMembers(), this.loadActivity(), this.loadNotices(), this.loadMessages(), this.loadReads(), this.loadSchedules(), this.loadLunch()]);
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
    async addLunch(l) {
      const item = fromLunch(check(await sb.from('lunch_picks').insert({ picked_by: l.by, mode: l.mode, candidates: l.candidates, result: l.result }).select().single()));
      if (!state.lunch.some(x => x.id === item.id)) state.lunch = [item].concat(state.lunch);
      return item;
    },
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
      const loaders = { members: 'loadMembers', activity: 'loadActivity', notices: 'loadNotices', messages: 'loadMessages', chat_reads: 'loadReads', schedules: 'loadSchedules', lunch_picks: 'loadLunch' };
      const events = { members: ['hub:team'], activity: ['hub:activity'], notices: ['hub:notices'], messages: ['hub:messages'], chat_reads: ['hub:messages'], schedules: ['hub:schedules', 'hub:team'], lunch_picks: ['hub:lunch'] };
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

  function emitAll() { ['hub:team', 'hub:activity', 'hub:notices', 'hub:messages', 'hub:schedules', 'hub:lunch'].forEach(ev => emit(ev)); }
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
  const KINDS = TEAM.scheduleKinds.length ? TEAM.scheduleKinds : ['연차', '오전 반차', '오후 반차', '출장', '외근', '교육', '재택', '기타'];
  const kindClass = (k) => ({ '연차': 'off', '오전 반차': 'half', '오후 반차': 'half', '출장': 'trip', '외근': 'trip', '교육': 'edu', '재택': 'home' })[k] || 'etc';
  const schedules = {
    KINDS, kindClass,
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
  // 알림: 남이 올린 공지 / 나한테 온 쪽지·단체방 / 남이 올린 일정 / 남이 뽑은 점심
  //  안 읽음 — 쪽지: 실제로 안 읽음 / 나머지: 종 패널(또는 그 화면)을 마지막으로 본 시각 이후
  const SEEN_KINDS = ['notice', 'schedule', 'lunch'];
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
      state.schedules.filter(s => s.member !== me && s.at).forEach(s => out.push({ id: 's:' + s.id, kind: 'schedule', who: s.member, at: s.at, text: `${nm(s.member)} 님이 일정을 올렸어요`, sub: `${rangeLabel(s.start, s.end)} ${s.kind}${s.memo ? ' · ' + s.memo : ''}`, href: 'schedule.html?date=' + s.start }));
      state.lunch.filter(l => l.by !== me).forEach(l => out.push({ id: 'l:' + l.id, kind: 'lunch', who: l.by, at: l.at, text: `${nm(l.by)} 님이 점심을 뽑았어요`, sub: `🍚 ${l.candidates[l.result]} (후보 ${l.candidates.length}개)`, href: 'lunch.html' }));
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
  const avatar = (id, cls) => { const m = member(id); return `<span class="av ${cls || ''}" title="${esc(m.name)}" data-tone="${tone(id)}">${esc(initial(m.name))}</span>`; };
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
  function openScheduleEditor(date) {
    const { d, fresh } = makeDialog('schedDialog', '', 'sdTitle');
    if (fresh) {
      d.innerHTML = `<form method="dialog" id="sdForm" novalidate>
        <div class="modal__head"><h2 id="sdTitle">일정 올리기</h2><button class="icon-btn" type="button" data-close aria-label="닫기">${icon('close', 20)}</button></div>
        <div class="modal__body">
          <fieldset class="fld"><legend>종류</legend><div class="kinds" role="radiogroup">${KINDS.map((k, i) => `<label class="kind kind--${kindClass(k)}"><input type="radio" name="sdKind" value="${esc(k)}"${i ? '' : ' checked'}><span>${esc(k)}</span></label>`).join('')}</div></fieldset>
          <div class="fld-row fld-row--2">
            <label class="fld"><span>시작일 <em>*</em></span><input type="date" id="sdStart" required></label>
            <label class="fld"><span>종료일</span><input type="date" id="sdEnd"><small class="fld__err" id="sdErr"></small></label>
          </div>
          <label class="fld"><span>메모 <small class="muted">(선택)</small></span><input type="text" id="sdMemo" maxlength="40" placeholder="예: 부산 출장, 병원" autocomplete="off"></label>
          <p class="hint">${icon('bell', 15)}<span>올리면 다른 멤버들의 <b>알림</b>과 <b>일정 달력</b>에 바로 떠요. 반차는 하루만 골라요.</span></p>
        </div>
        <div class="modal__foot"><button class="btn btn--ghost" type="button" data-close>취소</button><button class="btn btn--accent" type="submit" id="sdSave">올리기</button></div>
      </form>`;
      d.querySelectorAll('[data-close]').forEach(b => b.onclick = () => d.close());
      const half = () => /반차/.test(d.querySelector('input[name=sdKind]:checked').value);
      const sync = () => {
        const s = $('#sdStart', d), e = $('#sdEnd', d);
        e.disabled = half(); if (half()) e.value = s.value;
        e.min = s.value; if (e.value && s.value && e.value < s.value) e.value = s.value;
      };
      d.querySelectorAll('input[name=sdKind]').forEach(r => r.addEventListener('change', sync));
      $('#sdStart', d).addEventListener('change', () => { if (!$('#sdEnd', d).value || $('#sdEnd', d).value < $('#sdStart', d).value || half()) $('#sdEnd', d).value = $('#sdStart', d).value; sync(); });
      $('#sdForm', d).addEventListener('submit', async (e) => {
        e.preventDefault();
        const kind = d.querySelector('input[name=sdKind]:checked').value, start = $('#sdStart', d).value, end = $('#sdEnd', d).value || start, memo = $('#sdMemo', d).value.trim();
        let err = '';
        if (!start) err = '시작일을 골라 주세요';
        else if (end < start) err = '종료일이 시작일보다 빨라요';
        else if ((parseYmd(end) - parseYmd(start)) / 864e5 > 30) err = '한 번에 31일까지 올릴 수 있어요';
        $('#sdErr', d).textContent = err;
        if (err) { $('#sdStart', d).focus(); return; }
        const btn = $('#sdSave', d); btn.disabled = true;
        try { const item = await schedules.add({ kind, start, end, memo }); d.close(); toast(`${rangeLabel(start, end)} ${kind} 올렸어요`); emit('hub:schedules'); emit('hub:team'); emit('hub:activity'); emit('hub:schedule-added', item.id); }
        catch (er) { console.warn(er); toast('일정을 올리지 못했어요 · 연결을 확인해 주세요'); }
        finally { btn.disabled = false; }
      });
      d._sync = sync;
    }
    d._opener = document.activeElement;
    $('#sdForm', d).reset(); $('#sdErr', d).textContent = '';
    $('#sdStart', d).value = date || todayYmd(); $('#sdEnd', d).value = $('#sdStart', d).value;
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
        <div class="menu__head">${avatar(me.id, 'av--lg')}<div><b>${esc(me.name)}</b><small>${me.role ? esc(me.role) + ' · ' : ''}${esc(TEAM.name)}</small></div></div>
        <p class="menu__label">내 상태</p>
        <div class="status-pick" role="group" aria-label="내 상태">
          ${[['online', '온라인'], ['meeting', '바쁨'], ['away', '자리 비움']].map(([k, l]) => `<button type="button" role="menuitemradio" aria-checked="${manual === k}" data-status="${k}"><i class="st st--${k}" aria-hidden="true"></i>${l}</button>`).join('')}
        </div>
        <button type="button" role="menuitem" id="menuInvite">${icon('userPlus', 16)}<span>멤버 초대하기</span></button>
        <button type="button" role="menuitem" id="menuTheme">${icon('sun', 16)}<span>테마 바꾸기</span></button>
        <button type="button" role="menuitem" id="menuOut">${icon('logout', 16)}<span>이 기기에서 나가기</span></button>
        <button type="button" role="menuitem" id="menuReset" class="is-danger">${icon('reset', 16)}<span>전체 초기화</span></button>`;
      pm.querySelectorAll('[data-status]').forEach(b => b.onclick = async () => { menu(false); await team.setStatus(b.dataset.status); paintProfile(); emit('hub:team'); toast(`내 상태를 '${ST[b.dataset.status]}'(으)로 바꿨어요`); });
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
    document.addEventListener('hub:tick', paintProfile);

    // ---- 알림 패널 ----
    const bb = $('#bellBtn'), np = $('#notifPanel');
    const KIND_IC = { notice: 'megaphone', message: 'chat', schedule: 'calendar', lunch: 'bowl' };
    function paintBell() {
      const n = notifs.unread().length, badge = $('#bellBadge');
      badge.hidden = !n; badge.textContent = n > 9 ? '9+' : String(n);
      bb.setAttribute('aria-label', n ? `알림 ${n}개 읽지 않음` : '알림');
      const mc = messages.unreadTotal(), nb = $('#navMsgCount');
      if (nb) { nb.hidden = !mc; nb.textContent = String(mc); }
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
          : `<p class="empty empty--box">${icon('bell', 22)}<b>새 알림이 없어요</b><span>쪽지·공지·일정·점심 소식이 오면 여기에 보여요</span></p>`}`;
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
      const quiet = (x) => !document.hidden && ((page === 'messages' && x.kind === 'message' && (to === x.who && x.id.startsWith('d:') || to === 'group' && x.id.startsWith('g:'))) || (page === 'lunch' && x.kind === 'lunch'));
      const loud = fresh.filter(x => !quiet(x));
      if (loud.length) {
        toast(`🔔 ${loud[0].text}${loud[0].kind === 'lunch' ? ' · ' + loud[0].sub : ''}${loud.length > 1 ? ` 외 ${loud.length - 1}개` : ''}`);
        bb.classList.remove('is-ring'); void bb.offsetWidth; bb.classList.add('is-ring');
      }
      paintBell();
    }
    ['hub:notices', 'hub:messages', 'hub:schedules', 'hub:lunch', 'hub:team'].forEach(ev => document.addEventListener(ev, onData));
    paintBell();

    backend.startLive();
    setInterval(() => emit('hub:tick'), 4000);   // 오프라인 전환·'몇 분 전' 갱신
  }

  // 페이지 시작: 데이터 준비 → 입장 확인 → 페이지 코드
  function boot(fn) { ready.then(() => { if (requireMe()) fn(); }); }

  window.Hub = { TEAM, $, esc, icon, store, sess, activity, team, notices, messages, schedules, lunch, notifs, openNoticeEditor, openScheduleEditor, openInvite, TAGS, ST, member, shortName, avatar, avatars, ymd, parseYmd, addDays, weekStart, todayYmd, dayLabel, shortDate, rangeLabel, ago, DOW, pad, toast, renderShell, setTheme, isLight, requireMe, inviteUrl, copyText, ready, boot, isShared, showInitError, get initError() { return initError; }, get mode() { return backend ? backend.mode : null; } };
})();
