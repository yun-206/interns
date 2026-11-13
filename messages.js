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
  const pending = {};      // 대화별 보낼 첨부 [{blob, name, type, size, url}]
  const MAX_FILES = 10;
  const LIMIT = H.isShared() ? 10 * 1024 * 1024 : 1024 * 1024;   // 미리보기(로컬) 모드는 브라우저 저장 공간이 작아서 1MB
  const BLOCK = /\.(html?|xhtml|js|mjs|exe|bat|cmd|sh|msi|apk)$/i;
  const fmtSize = (n) => n < 1024 ? `${n}B` : n < 1048576 ? `${(n / 1024).toFixed(0)}KB` : `${(n / 1048576).toFixed(1)}MB`;
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
        <span class="conv__txt"><b>${esc(name)}<small>${esc(sub)}</small></b><span>${last ? lastFromName + esc(H.messages.preview(last)) : '<em>아직 주고받은 쪽지가 없어요</em>'}</span></span>
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
        <div class="bub__col">${showWho ? `<span class="bub__who">${esc(H.member(x.from).name)}</span>` : ''}${x.file ? fileHtml(x.file) : ''}${x.body ? `<p>${esc(x.body)}</p>` : ''}</div>
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
    const msgsHtml = body || `<p class="dm__first">${isGroup ? '다 같이 보는 방이에요. 첫 쪽지를 남겨 보세요 👋 사진·파일은 끌어다 놓아도 돼요' : esc(nm) + '에게 첫 쪽지를 보내 보세요 👋'}</p>`;
    // 같은 대화를 다시 그릴 땐 말풍선·머리만 바꾸고 입력창은 그대로 둠
    // (입력창을 새로 만들면 한글 조합 중이던 글자가 끊겨 'ㅇㅏㄴㅣ'처럼 자모가 풀려 버림)
    if (same && $('#dmForm') && scroller) {
      $('.dm__head', box).innerHTML = `<button class="icon-btn dm__back" type="button" id="dmBack" aria-label="대화 목록으로">${icon('back', 20)}</button>${head}`;
      $('#dmBack').onclick = () => open(null);
      const top = scroller.scrollTop;
      scroller.innerHTML = msgsHtml;
      scroller.scrollTop = nearBottom ? scroller.scrollHeight : top;
      fillUrls();
      markRead();
      return;
    }
    box.innerHTML = `
      <header class="dm__head">
        <button class="icon-btn dm__back" type="button" id="dmBack" aria-label="대화 목록으로">${icon('back', 20)}</button>
        ${head}
      </header>
      <div class="dm__msgs" id="dmMsgs" tabindex="0" aria-label="${esc(nm)} 쪽지">${msgsHtml}</div>
      <div class="tray" id="tray" hidden></div>
      <form class="dm__form" id="dmForm">
        <button class="icon-btn dm__attach" type="button" id="dmAttach" aria-label="사진·파일 첨부" title="사진·파일 첨부 (끌어다 놓기·붙여넣기도 돼요)">${icon('clip', 20)}</button>
        <textarea id="dmInput" rows="1" maxlength="500" placeholder="${isGroup ? '단체방에 쪽지 쓰기' : esc(nm) + '에게 쪽지 쓰기'}" aria-label="쪽지 내용"></textarea>
        <button class="btn btn--accent dm__send" type="submit" id="dmSend" aria-label="보내기">${icon('send', 18)}</button>
      </form>`;
    const input = $('#dmInput');
    input.value = keep; grow(input);
    const list = $('#dmMsgs');
    if (nearBottom) list.scrollTop = list.scrollHeight; else if (scroller) list.scrollTop = scroller.scrollTop;
    // 사진이 늦게 뜨면서 높이가 바뀌어도 맨 아래를 보던 중이면 계속 맨 아래로
    list.addEventListener('load', (e) => { if (e.target.tagName === 'IMG' && list.scrollHeight - list.scrollTop - list.clientHeight - e.target.offsetHeight < 120) list.scrollTop = list.scrollHeight; }, true);
    input.addEventListener('input', () => { draft[current] = input.value; grow(input); });
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); $('#dmForm').requestSubmit(); } });
    input.addEventListener('paste', (e) => { const fs = [...(e.clipboardData && e.clipboardData.files || [])]; if (fs.length) { e.preventDefault(); addFiles(fs); } });
    $('#dmAttach').onclick = () => picker.click();
    renderTray();
    fillUrls();
    $('#dmForm').addEventListener('submit', send);
    $('#dmBack').onclick = () => open(null);
    if ((focusInput && !narrow()) || hadFocus) input.focus();
    else if (focusInput) input.focus({ preventScroll: true });
    markRead();
  }
  function grow(t) { t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight, 140) + 'px'; }

  async function send(e) {
    e.preventDefault();
    const input = $('#dmInput'), text = input.value.trim(), to = current, files = (pending[to] || []).slice();
    if ((!text && !files.length) || sending) return;
    sending = true; $('#dmSend').disabled = true; $('#dmAttach').disabled = true;
    let sent = 0;
    try {
      if (text) { await H.messages.send(to, text); input.value = ''; draft[to] = ''; }
      for (const f of files) {
        setTrayStatus(`올리는 중 ${sent + 1}/${files.length}`);
        await H.messages.send(to, '', f);
        sent++;
        pending[to] = (pending[to] || []).filter(x => x !== f); URL.revokeObjectURL(f.url);
      }
      renderedFor = null;   // 보낸 뒤엔 맨 아래로
      renderList(); renderThread(true);
    } catch (er) {
      console.warn(er);
      H.toast(er && er.message === 'local_full' ? '미리보기 모드 저장 공간이 꽉 찼어요 · 전체 초기화 후 다시 해 보세요' : (sent ? `${sent}개는 보냈고 나머지는 못 보냈어요 · 다시 보내 주세요` : '쪽지를 보내지 못했어요 · 연결을 확인해 주세요'));
      renderedFor = null; renderList(); renderThread(false);
    }
    finally { sending = false; const b = $('#dmSend'); if (b) b.disabled = false; const a = $('#dmAttach'); if (a) a.disabled = false; setTrayStatus(''); }
  }

  /* ---------- 첨부: 고르기·끌어다 놓기·붙여넣기 ---------- */
  const picker = document.createElement('input');
  picker.type = 'file'; picker.multiple = true; picker.hidden = true; picker.id = 'dmFile';
  picker.accept = 'image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.hwp,.hwpx,.txt,.csv,.zip';
  document.body.appendChild(picker);
  picker.addEventListener('change', () => { addFiles([...picker.files]); picker.value = ''; });

  // 큰 사진은 보내기 전에 줄임(긴 변 1920px, JPEG) — 용량·속도 절약. GIF·HEIC 등은 그대로
  async function shrink(file) {
    const type = file.type || '';
    if (!/^image\/(jpeg|png|webp|bmp)$/i.test(type) || !window.createImageBitmap) return { blob: file, name: file.name, type, size: file.size };
    const max = H.isShared() ? 1920 : 1000;
    try {
      const bmp = await createImageBitmap(file);
      const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
      if (k === 1 && file.size <= (H.isShared() ? 1.5e6 : 3e5)) return { blob: file, name: file.name, type, size: file.size };
      const c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
      const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(bmp, 0, 0, c.width, c.height);
      const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', H.isShared() ? 0.85 : 0.72));
      if (!blob || blob.size >= file.size) return { blob: file, name: file.name, type, size: file.size };
      return { blob, name: file.name.replace(/\.[^.]+$/, '') + '.jpg', type: 'image/jpeg', size: blob.size };
    } catch (e) { return { blob: file, name: file.name, type, size: file.size }; }
  }
  async function addFiles(list) {
    if (!current || !list.length) return;
    const to = current, arr = pending[to] = pending[to] || [];
    const msgs = [];
    for (const raw of list) {
      if (arr.length >= MAX_FILES) { msgs.push(`한 번에 ${MAX_FILES}개까지 보낼 수 있어요`); break; }
      if (BLOCK.test(raw.name)) { msgs.push(`'${raw.name}'은 보낼 수 없는 형식이에요`); continue; }
      const f = await shrink(raw);
      if (f.size > LIMIT) { msgs.push(`'${raw.name}'이 너무 커요 (${fmtSize(LIMIT)}까지)`); continue; }
      f.url = URL.createObjectURL(f.blob);
      arr.push(f);
    }
    if (msgs.length) H.toast(msgs[0]);
    if (to === current) { renderTray(); const i = $('#dmInput'); if (i) i.focus(); }
  }
  function renderTray() {
    const t = $('#tray'); if (!t) return;
    const arr = pending[current] || [];
    t.hidden = !arr.length;
    t.innerHTML = arr.map((f, i) => `<div class="tray__item">${H.messages.isImage(f) ? `<img src="${f.url}" alt="">` : `<span class="tray__file">${icon('file', 18)}<b>${esc(f.name)}</b><small>${fmtSize(f.size)}</small></span>`}<button type="button" class="tray__x" data-rm="${i}" aria-label="${esc(f.name)} 빼기">${icon('close', 12)}</button></div>`).join('') + `<span class="tray__status" id="trayStatus" aria-live="polite"></span>`;
    t.querySelectorAll('[data-rm]').forEach(b => b.onclick = () => { const f = arr.splice(+b.dataset.rm, 1)[0]; if (f) URL.revokeObjectURL(f.url); renderTray(); });
  }
  function setTrayStatus(txt) { const s = $('#trayStatus'); if (s) s.textContent = txt; }

  // 끌어다 놓기: 대화창 전체가 받는 곳
  let dragDepth = 0;
  const dmBox = $('#dm');
  const hasFiles = (e) => e.dataTransfer && [...(e.dataTransfer.types || [])].includes('Files');
  dmBox.addEventListener('dragenter', (e) => { if (!hasFiles(e) || !current) return; e.preventDefault(); dragDepth++; dmBox.classList.add('is-drop'); });
  dmBox.addEventListener('dragover', (e) => { if (!hasFiles(e) || !current) return; e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; });
  dmBox.addEventListener('dragleave', () => { dragDepth = Math.max(0, dragDepth - 1); if (!dragDepth) dmBox.classList.remove('is-drop'); });
  dmBox.addEventListener('drop', (e) => { if (!hasFiles(e)) return; e.preventDefault(); dragDepth = 0; dmBox.classList.remove('is-drop'); if (current) addFiles([...e.dataTransfer.files]); });
  window.addEventListener('dragover', (e) => { if (hasFiles(e)) e.preventDefault(); });   // 밖에 떨어뜨려도 브라우저가 파일을 열어 버리지 않게
  window.addEventListener('drop', (e) => { if (hasFiles(e)) e.preventDefault(); });

  /* ---------- 첨부 보여주기 ---------- */
  function fileHtml(f) {
    const u = H.messages.cachedUrl(f.path);
    if (H.messages.isImage(f)) return `<button type="button" class="bub__img" data-img="${esc(f.path)}" aria-label="사진 크게 보기: ${esc(f.name)}"><img ${u ? `src="${esc(u)}"` : ''} data-path="${esc(f.path)}" alt="${esc(f.name)}" loading="lazy"></button>`;
    return `<a class="bub__file" data-dl="${esc(f.path)}" data-name="${esc(f.name)}" href="#" ${u ? '' : 'aria-busy="true"'}>${icon('file', 20)}<span><b>${esc(f.name)}</b><small>${fmtSize(f.size)} · 받기</small></span>${icon('download', 16)}</a>`;
  }
  async function fillUrls() {
    const imgs = [...document.querySelectorAll('#dmMsgs img[data-path]:not([src])')];
    if (!imgs.length) return;
    try {
      const map = await H.messages.urls(imgs.map(i => i.dataset.path));
      imgs.forEach(i => { if (map[i.dataset.path]) i.src = map[i.dataset.path]; });
    } catch (e) { console.warn(e); imgs.forEach(i => i.closest('.bub__img') && i.closest('.bub__img').classList.add('is-broken')); }
  }
  // 파일 받기: 누를 때 다운로드용 서명 URL을 받아 이동
  $('#thread').addEventListener('click', async (e) => {
    const a = e.target.closest('a[data-dl]');
    if (a) {
      e.preventDefault();
      const msg = H.messages.thread(current).find(m => m.file && m.file.path === a.dataset.dl);
      try { const url = await H.messages.downloadUrl(msg ? msg.file : { path: a.dataset.dl, name: a.dataset.name }); const l = document.createElement('a'); l.href = url; l.download = a.dataset.name; l.rel = 'noopener'; document.body.appendChild(l); l.click(); l.remove(); }
      catch (er) { console.warn(er); H.toast('파일을 받지 못했어요'); }
      return;
    }
    const b = e.target.closest('[data-img]');
    if (b) openViewer(b.dataset.img);
  });

  // 사진 크게 보기 (같은 대화의 사진끼리 ← → 이동)
  const viewer = document.createElement('dialog');
  viewer.className = 'viewer'; viewer.id = 'viewer'; viewer.setAttribute('aria-label', '사진 보기');
  document.body.appendChild(viewer);
  viewer.addEventListener('click', (e) => { if (e.target === viewer || e.target.closest('[data-vclose]')) viewer.close(); });
  let vList = [], vIdx = 0;
  async function openViewer(path) {
    vList = H.messages.thread(current).filter(m => m.file && H.messages.isImage(m.file));
    vIdx = Math.max(0, vList.findIndex(m => m.file.path === path));
    viewer._opener = document.activeElement;
    if (!viewer.open) viewer.showModal();
    paintViewer();
  }
  async function paintViewer() {
    const m = vList[vIdx]; if (!m) return;
    const map = await H.messages.urls([m.file.path]).catch(() => ({}));
    viewer.innerHTML = `<figure class="viewer__fig"><img src="${esc(map[m.file.path] || '')}" alt="${esc(m.file.name)}">
      <figcaption>${H.avatar(m.from)}<span><b>${esc(H.member(m.from).name)}</b><small>${esc(H.dayLabel(dayKey(m.at)))} ${fmtTime(m.at)} · ${esc(m.file.name)}</small></span>
        <a class="btn btn--ghost btn--sm" href="#" id="vDl">${icon('download', 16)}저장</a>
        <button class="icon-btn" type="button" data-vclose aria-label="닫기">${icon('close', 20)}</button></figcaption></figure>
      ${vList.length > 1 ? `<button class="viewer__nav viewer__nav--prev" type="button" id="vPrev" aria-label="이전 사진"${vIdx ? '' : ' disabled'}>${icon('left', 26)}</button><button class="viewer__nav viewer__nav--next" type="button" id="vNext" aria-label="다음 사진"${vIdx < vList.length - 1 ? '' : ' disabled'}>${icon('right', 26)}</button>` : ''}`;
    $('#vDl', viewer).onclick = async (e) => { e.preventDefault(); try { const url = await H.messages.downloadUrl(m.file); const l = document.createElement('a'); l.href = url; l.download = m.file.name; document.body.appendChild(l); l.click(); l.remove(); } catch (er) { H.toast('저장하지 못했어요'); } };
    const p = $('#vPrev', viewer), n = $('#vNext', viewer);
    if (p) p.onclick = () => { vIdx = Math.max(0, vIdx - 1); paintViewer(); };
    if (n) n.onclick = () => { vIdx = Math.min(vList.length - 1, vIdx + 1); paintViewer(); };
    ($('[data-vclose]', viewer)).focus();
  }
  viewer.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft' && vIdx > 0) { vIdx--; paintViewer(); }
    if (e.key === 'ArrowRight' && vIdx < vList.length - 1) { vIdx++; paintViewer(); }
  });
  viewer.addEventListener('close', () => { if (viewer._opener && document.contains(viewer._opener)) viewer._opener.focus(); });

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
