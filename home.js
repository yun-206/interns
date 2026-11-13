/* 홈 — 인사·요약, 이번 주 일정, 오늘 점심, 공지, 최근 활동, 멤버 */
window.Hub.boot(function () {
  'use strict';
  const H = window.Hub, { $, esc, icon, TEAM, team, ST } = H;
  H.renderShell('home');
  document.querySelectorAll('[data-ic]').forEach(el => { el.outerHTML = icon(el.dataset.ic, el.closest('.btn') ? 16 : el.closest('.card__more') ? 14 : 18); });

  const now = new Date();
  const hi = now.getHours() < 11 ? '좋은 아침이에요' : now.getHours() < 14 ? '점심 맛있게 먹어요' : now.getHours() < 18 ? '좋은 오후예요' : '오늘도 수고했어요';
  $('#today').textContent = `${now.getFullYear()}. ${now.getMonth() + 1}. ${now.getDate()}. ${H.DOW[now.getDay()]}요일`;
  (function hello() {
    const me = team.me(); let w = null;
    try { w = sessionStorage.getItem('interns-welcome'); sessionStorage.removeItem('interns-welcome'); } catch (e) {}
    $('#hello').textContent = w === 'new' ? `${TEAM.name}에 온 걸 환영해요, ${H.shortName(me.name)} 님` : `${hi}, ${H.shortName(me.name)} 님`;
  })();

  function renderStats() {
    const t = H.todayYmd(), out = new Set(H.schedules.on(t).map(s => s.member));
    const on = team.list().filter(m => team.status(m.id) !== 'offline').length;
    const un = H.messages.unreadTotal();
    $('#stats').innerHTML = [
      [out.size, '오늘 일정 있는 사람', 'schedule.html'],
      [un, '안 읽은 쪽지', 'messages.html' + (H.messages.unreadFrom('group') ? '?to=group' : '')],
      [on, '지금 접속한 멤버', '#team'],
    ].map(([n, l, href]) => `<a class="stat" href="${href}"><b>${n}</b><span>${l}</span></a>`).join('');
    const offToday = H.schedules.on(t);
    $('#helloSub').textContent = offToday.length ? `오늘은 ${offToday.map(s => `${H.shortName(H.member(s.member).name)} ${s.kind}`).join(', ')}이에요.` : '오늘은 다 같이 출근하는 날이에요.';
  }

  /* 이번 주 일정 (월~일) */
  function renderWeek() {
    const ws = H.weekStart(now), days = [...Array(7)].map((_, i) => H.ymd(H.addDays(ws, i)));
    const rows = days.map(d => ({ d, list: H.schedules.on(d) })).filter(x => x.list.length);
    $('#week').innerHTML = rows.length ? rows.map(({ d, list }) => `
      <li class="wk${d === H.todayYmd() ? ' is-today' : ''}${d < H.todayYmd() ? ' is-past' : ''}"><a href="schedule.html?date=${d}">
        <span class="wk__day"><b>${H.parseYmd(d).getDate()}</b>${d === H.todayYmd() ? '오늘' : H.DOW[H.parseYmd(d).getDay()]}</span>
        <span class="wk__items">${list.map(s => `<span class="chip chip--${H.schedules.kindClass(s.kind)}">${H.avatar(s.member)}<b>${esc(H.shortName(H.member(s.member).name))}</b>${esc(s.kind)}</span>`).join('')}</span>
      </a></li>`).join('')
      : `<li class="empty empty--box">${icon('calendar', 22)}<b>이번 주는 다 같이 있어요</b><span>연차·반차·출장이 생기면 올려 주세요</span></li>`;
  }
  $('#schedBtn').onclick = () => H.openScheduleEditor();

  /* 오늘 점심 */
  function renderLunch() {
    const today = H.lunch.today()[0];
    const c = $('#lunchCard');
    const wheel = `<svg class="lunchcard__wheel" viewBox="0 0 100 100" aria-hidden="true">${[0, 1, 2, 3].map(i => `<path d="M50 50 L${50 + 46 * Math.sin(i * Math.PI / 2)} ${50 - 46 * Math.cos(i * Math.PI / 2)} A46 46 0 0 1 ${50 + 46 * Math.sin((i + 1) * Math.PI / 2)} ${50 - 46 * Math.cos((i + 1) * Math.PI / 2)} Z" class="seg-${i}"/>`).join('')}<circle cx="50" cy="50" r="7" class="hub"/></svg>`;
    c.innerHTML = today ? `
      ${wheel}
      <span class="feature__top"><span class="pill pill--live">오늘 점심</span><span class="pill">${today.mode === 'wheel' ? '돌림판' : '랜덤 뽑기'}</span></span>
      <div>
        <h2 class="sr" id="lcTitle">오늘 점심</h2>
        <p class="feature__name"><em>${esc(today.candidates[today.result])}</em></p>
        <p class="feature__desc" style="margin-top:10px">${esc(H.member(today.by).name)} 님이 ${esc(H.ago(today.at))} 뽑았어요 · 후보 ${today.candidates.map(esc).join(', ')}</p>
      </div>
      <div class="feature__foot"><span class="feature__meta">${H.lunch.today().length > 1 ? `오늘 ${H.lunch.today().length}번 뽑았어요` : ''}</span><a class="feature__go" href="lunch.html">다시 뽑기 ${icon('arrow', 16)}</a></div>`
      : `
      ${wheel}
      <span class="feature__top"><span class="pill">점심 뽑기</span></span>
      <div>
        <h2 class="feature__name" id="lcTitle">오늘 점심 <em>뭐 먹지?</em></h2>
        <p class="feature__desc" style="margin-top:10px">후보를 1~4개 넣고 돌림판이나 랜덤 뽑기로 정해요. 결과는 다 같이 봐요.</p>
      </div>
      <div class="feature__foot"><span class="feature__meta"></span><a class="feature__go" href="lunch.html">뽑으러 가기 ${icon('arrow', 16)}</a></div>`;
  }

  /* 공지 — 최근 3개 */
  function renderNotices() {
    const list = H.notices.all().slice(0, 3), seen = H.notifs.seenAt('notice'), meId = team.meId();
    $('#noticeList').innerHTML = list.length ? list.map(n => `<li><a class="nl" href="notices.html#n-${esc(n.id)}">
        <span class="tag${n.tag === '공지' ? '' : ' tag--gray'}">${esc(n.tag)}</span>
        <span class="grow nl__txt"><b>${esc(n.title)}${n.author !== meId && n.at > seen ? ' <i class="new-dot" aria-label="새 공지"></i>' : ''}</b><small>${esc(H.member(n.author).name)} · ${esc(H.ago(n.at))}</small></span></a></li>`).join('')
      : `<li class="empty empty--box">${icon('megaphone', 22)}<b>아직 올라온 공지가 없어요</b><span>'공지 쓰기'로 첫 소식을 알려 보세요</span></li>`;
  }
  $('#noticeWrite').onclick = () => H.openNoticeEditor();

  function renderActivity() {
    const list = H.activity.all().slice(0, 6);
    $('#activityList').innerHTML = list.length ? list.map(a => `<li class="act">${H.avatar(a.who)}<span class="grow"><b>${esc(H.member(a.who).name)}</b> 님이 ${esc(a.what)}<small>${esc(a.where)}</small></span><span class="when">${esc(H.ago(a.at))}</span></li>`).join('')
      : `<li class="empty empty--box">${icon('pulse', 22)}<b>아직 활동이 없어요</b></li>`;
  }

  /* 멤버 + 접속 상태 + 오늘 일정 */
  const ORDER = { online: 0, meeting: 1, away: 2, offline: 3 };
  function renderTeam() {
    const meId = team.meId();
    const list = team.list().map(m => ({ m, st: team.status(m.id) }))
      .sort((a, b) => (b.m.id === meId) - (a.m.id === meId) || ORDER[a.st] - ORDER[b.st] || a.m.joinedAt - b.m.joinedAt);
    $('#teamList').innerHTML = list.map(({ m, st }) => {
      const un = m.id === meId ? 0 : H.messages.unreadFrom(m.id);
      const td = H.schedules.todayFor(m.id)[0];
      return `<li>${H.avatar(m.id)}<span class="grow who"><b>${esc(m.name)}${m.id === meId ? ' <span class="muted" style="font-weight:500">(나)</span>' : ''}</b><small>${td ? `<span class="chip chip--${H.schedules.kindClass(td.kind)} chip--sm">오늘 ${esc(td.kind)}</span>` : esc(m.role || TEAM.name)}</small></span><span class="st st--${st}" aria-hidden="true"></span><span class="when">${ST[st]}</span>${m.id === meId ? '<span class="dm-btn dm-btn--ghost" aria-hidden="true"></span>' : `<a class="dm-btn" href="messages.html?to=${encodeURIComponent(m.id)}" aria-label="${esc(m.name)} 님에게 쪽지${un ? `, 안 읽은 쪽지 ${un}개` : ''}" title="쪽지 보내기">${icon('chat', 16)}${un ? `<i class="badge badge--sm">${un}</i>` : ''}</a>`}</li>`;
    }).join('') + (list.length < 2 ? `<li class="empty empty--hint">초대 링크로 동기들을 불러 보세요</li>` : '');
    $('#onlineCount').textContent = `${list.length}명 · 접속 ${list.filter(x => x.st !== 'offline').length}명`;
  }
  $('#inviteBtn').onclick = () => H.openInvite();

  renderStats(); renderWeek(); renderLunch(); renderNotices(); renderActivity(); renderTeam();
  document.addEventListener('hub:schedules', () => { renderWeek(); renderStats(); renderTeam(); });
  document.addEventListener('hub:lunch', renderLunch);
  document.addEventListener('hub:notices', renderNotices);
  document.addEventListener('hub:activity', renderActivity);
  document.addEventListener('hub:messages', () => { renderTeam(); renderStats(); });
  document.addEventListener('hub:team', () => { renderTeam(); renderStats(); renderActivity(); });
  document.addEventListener('hub:tick', () => { renderTeam(); renderStats(); });
});
