/* 쪽지 — 왼쪽: 단체방 + 멤버 목록, 오른쪽: 대화창 (모바일은 목록 ↔ 대화창 전환)
   말풍선 옆 노란 숫자 = 아직 안 읽은 사람 수 (카톡처럼) */
window.Hub.boot(function () {
  'use strict';
  const H = window.Hub, { $, esc, icon, team, ST, TEAM } = H;
  H.renderShell('messages');
  document.querySelectorAll('[data-ic]').forEach(el => { el.outerHTML = icon(el.dataset.ic, 18); });

  const params = new URLSearchParams(location.search);
  let current = params.get('to');
  if (current && current !== 'group' && (!team.get(current) || current === team.meId())) current = null;
  if (!current && !window.matchMedia('(max-width: 760px)').matches) current = 'group';   // 넓은 화면은 단체방을 먼저 열어 둠
  const draft = {};
  let sending = false;
  let renderedFor = null;
  const narrow = () => window.matchMedia('(max-width: 760px)').matches;
  const fmtTime = (ts) => { const d = new Date(ts); return `${H.pad(d.getHours())}:${H.pad(d.getMinutes())}`; };
  const dayKey = (ts) => H.ymd(new Date(ts));
  const groupAvatar = (cls) => `<span class="av av--group ${cls || ''}" aria-hidden="true">${icon('group', cls === 'av--lg' ? 18 : 15)}</span>`;

  function renderList() {
    const meId = team.meId();
    const gLast = H.messages.last('group'), gUn = H.messages.unreadFrom('group');
    const people = team.list().filter(m => m.id !== meId)
      .map(m => ({ m, last: H.messages.last(m.id), un: H.messages.unreadFrom(m.id) }))
      .sort((a, b) => ((b.last && b.last.at) || 0) - ((a.last && a.last.at) || 0) || a.m.joinedAt - b.m.joinedAt);
    const row = (id, av, name, sub, last, un, lastFromName) => `<li><a class="conv${id === current ? ' is-active' : ''}${un ? ' is-unread' : ''}" href="messages.html?to=${encodeURIComponent(id)}" data-to="${esc(id)}"${id === current ? ' aria-current="true"' : ''}>
        ${av}
        <span class="conv__txt"><b>${esc(name)}<small>${esc(sub)}</small></b><span>${last ? lastFromName + esc(last.body) : '<em>아직 주고받은 쪽지가 없어요</em>'}</span></span>
        <span class="conv__end">${last ? `<time>${esc(H.ago(last.at))}</time>` : ''}${un ? `<i class="badge badge--sm">${un}</i>` : ''}</span>
      </a></li>`;
    const gName = gLast ? (gLast.from === meId ? '나: ' : H.shortName(H.member(gLast.from).name) + ': ') : '';
    $('#convList').innerHTML =
      row('group', `<span class="av-wrap">${groupAvatar('av--lg')}</span>`, '단체방', `${team.list().length}명`, gLast, gUn, gName) +
      `<li class="conv-sep" aria-hidden="true">멤버</li>` +
      (people.length ? people.map(({ m, last, un }) => row(m.id, `<span class="av-wrap">${H.avatar(m.id, 'av--lg')}<i class="st st--${team.status(m.id)} st--badge" aria-hidden="true"></i></span>`, m.name, m.role || '', last, un, last && last.from === meId ? '나: ' : '')).join('')
        : `<li class="empty empty--box">${icon('users', 22)}<b>아직 다른 멤버가 없어요</b><span>초대한 동기가 들어오면 여기에 보여요</span><button class="btn btn--ghost btn--sm" type="button" id="dmInvite">${icon('userPlus', 16)}초대하기</button></li>`);
    const inv = $('#dmInvite'); if (inv) inv.onclick = () => H.openInvite();
  }

  function renderThread(focusInput) {
    const box = $('#thread');
    $('#dm').classList.toggle('show-thread', !!current);
    if (!current) {
      renderedFor = null;
      box.innerHTML = `<div class="dm__empty">${icon('chat', 28)}<b>단체방이나 멤버를 골라 보세요</b><span>보낸 쪽지는 상대방의 알림에 바로 떠요</span></div>`;
      return;
    }
    const isGroup = current === 'group', meId = team.meId();
    const msgs = H.messages.thread(current);
    let lastDay = '', lastFrom = null;
    const body = msgs.map((x) => {
      const mine = x.from === meId, d = dayKey(x.at);
      const sep = d !== lastDay ? `<p class="bub-day"><span>${esc(H.dayLabel(d))}</span></p>` : '';
      const showWho = isGroup && !mine && (sep || lastFrom !== x.from);
      lastDay = d; lastFrom = x.from;
      const n = (isGroup || mine) ? H.messages.unreadCount(x) : 0;
      return `${sep}<div class="bub${mine ? ' bub--me' : ''}${isGroup && !mine ? ' bub--grp' : ''}">
        ${isGroup && !mine ? (showWho ? H.avatar(x.from) : '<span class="bub__gap"></span>') : ''}
        <div class="bub__col">${showWho ? `<span class="bub__who">${esc(H.member(x.from).name)}</span>` : ''}<p>${esc(x.body)}</p></div>
        <span class="bub__meta">${n ? `<i class="unread-n" title="안 읽은 사람 ${n}명">${n}</i>` : ''}${fmtTime(x.at)}</span></div>`;
    }).join('');
    const same = renderedFor === current;
    const keep = same && $('#dmInput') ? $('#dmInput').value : (draft[current] || '');
    const hadFocus = same && document.activeElement && document.activeElement.id === 'dmInput';
    const scroller = $('#dmMsgs'), nearBottom = !same || !scroller || scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < 80;
    renderedFor = current;
    let head;
    if (isGroup) {
      const ids = team.list().map(m => m.id);
      head = `${groupAvatar('av--lg')}<span class="dm__who"><b>단체방</b><small>${esc(TEAM.name)} · ${ids.length}명</small></span><span class="dm__members">${H.avatars(ids, 5)}</span>`;
    } else {
      const m = H.member(current), st = team.status(current);
      head = `<span class="av-wrap">${H.avatar(current, 'av--lg')}<i class="st st--${st} st--badge" aria-hidden="true"></i></span><span class="dm__who"><b>${esc(m.name)}</b><small>${m.role ? esc(m.role) + ' · ' : ''}${ST[st]}</small></span>`;
    }
    const nm = isGroup ? '단체방' : H.member(current).name + ' 님';
    box.innerHTML = `
      <header class="dm__head">
        <button class="icon-btn dm__back" type="button" id="dmBack" aria-label="대화 목록으로">${icon('back', 20)}</button>
        ${head}
      </header>
      <div class="dm__msgs" id="dmMsgs" tabindex="0" aria-label="${esc(nm)} 쪽지">${body || `<p class="dm__first">${isGroup ? '다 같이 보는 방이에요. 첫 쪽지를 남겨 보세요 👋' : esc(nm) + '에게 첫 쪽지를 보내 보세요 👋'}</p>`}</div>
      <form class="dm__form" id="dmForm">
        <textarea id="dmInput" rows="1" maxlength="500" placeholder="${isGroup ? '단체방에 쪽지 쓰기' : esc(nm) + '에게 쪽지 쓰기'}" aria-label="쪽지 내용"></textarea>
        <button class="btn btn--accent dm__send" type="submit" id="dmSend" aria-label="보내기">${icon('send', 18)}</button>
      </form>`;
    const input = $('#dmInput');
    input.value = keep; grow(input);
    const list = $('#dmMsgs');
    if (nearBottom) list.scrollTop = list.scrollHeight; else if (scroller) list.scrollTop = scroller.scrollTop;
    input.addEventListener('input', () => { draft[current] = input.value; grow(input); });
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); $('#dmForm').requestSubmit(); } });
    $('#dmForm').addEventListener('submit', send);
    $('#dmBack').onclick = () => open(null);
    if ((focusInput && !narrow()) || hadFocus) input.focus();
    else if (focusInput) input.focus({ preventScroll: true });
    markRead();
  }
  function grow(t) { t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight, 140) + 'px'; }

  async function send(e) {
    e.preventDefault();
    const input = $('#dmInput'), text = input.value.trim();
    if (!text || sending) return;
    sending = true; $('#dmSend').disabled = true;
    try {
      await H.messages.send(current, text);
      input.value = ''; draft[current] = '';
      renderedFor = null;   // 보낸 뒤엔 맨 아래로
      renderList(); renderThread(true);
    } catch (er) { console.warn(er); H.toast('쪽지를 보내지 못했어요 · 연결을 확인해 주세요'); }
    finally { sending = false; const b = $('#dmSend'); if (b) b.disabled = false; }
  }

  // 대화창이 보이는 동안 받은 쪽지는 읽음 처리
  async function markRead() {
    if (!current || document.hidden || !H.messages.unreadFrom(current)) return;
    await H.messages.markRead(current);
    renderList();
    document.dispatchEvent(new CustomEvent('hub:messages'));
  }

  function open(id) {
    current = id;
    history.replaceState(null, '', id ? `messages.html?to=${encodeURIComponent(id)}` : 'messages.html');
    renderList(); renderThread(true);
  }
  $('#convList').addEventListener('click', (e) => { const a = e.target.closest('a[data-to]'); if (!a) return; e.preventDefault(); open(a.dataset.to); });

  document.addEventListener('hub:messages', () => { renderList(); renderThread(false); });
  document.addEventListener('hub:team', () => {
    renderList();
    if (current && current !== 'group') { const h = $('.dm__who small'); const m = H.member(current); if (h) h.textContent = `${m.role ? m.role + ' · ' : ''}${ST[team.status(current)]}`; }
  });
  document.addEventListener('visibilitychange', markRead);
  renderList();
  renderThread(!!current && params.has('to'));
});
