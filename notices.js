/* 공지사항 — 목록·분류 필터·쓰기·삭제 (새 공지는 실시간으로 위에 붙음) */
window.Hub.boot(function () {
  'use strict';
  const H = window.Hub, { $, esc, icon, team } = H;
  H.renderShell('notices');
  document.querySelectorAll('[data-ic]').forEach(el => { el.outerHTML = icon(el.dataset.ic, el.closest('.btn') ? 16 : 18); });

  let filter = '전체';
  // 강조할 공지: 방금 쓴 공지 또는 알림·허브에서 링크로 들어온 공지 (2.5초 동안 유지 — 실시간 갱신으로 다시 그려도 안 사라지게)
  let flash = location.hash.startsWith('#n-') ? decodeURIComponent(location.hash.slice(3)) : null;
  const clearFlash = () => setTimeout(() => { flash = null; }, 2500);
  const seenAtOpen = H.notifs.seenAt('notice');   // 이 화면을 열기 전에 안 본 공지는 '새 공지' 표시
  function renderFilters() {
    const all = H.notices.all();
    $('#filters').innerHTML = ['전체'].concat(H.TAGS).map(t => {
      const n = t === '전체' ? all.length : all.filter(x => x.tag === t).length;
      return `<button type="button" class="chip-btn" aria-pressed="${filter === t}" data-f="${t}">${t}<span>${n}</span></button>`;
    }).join('');
    $('#filters').querySelectorAll('[data-f]').forEach(b => b.onclick = () => { filter = b.dataset.f; render(); });
  }
  function render() {
    renderFilters();
    const meId = team.meId();
    const list = H.notices.all().filter(n => filter === '전체' || n.tag === filter);
    $('#noticeFeed').innerHTML = list.length ? list.map(n => `
      <article class="card nitem${n.id === flash ? ' is-new' : ''}" id="n-${esc(n.id)}" tabindex="-1">
        <div class="nitem__head">
          <span class="tag${n.tag === '공지' ? '' : ' tag--gray'}">${esc(n.tag)}</span>
          <h2 class="nitem__title">${esc(n.title)}${n.author !== meId && n.at > seenAtOpen ? ' <i class="new-dot" aria-label="새 공지"></i>' : ''}</h2>
          ${n.author === meId ? `<button class="icon-btn icon-btn--sm" type="button" data-del="${esc(n.id)}" aria-label="'${esc(n.title)}' 공지 삭제" title="삭제">${icon('trash', 16)}</button>` : ''}
        </div>
        ${n.body ? `<p class="nitem__body">${esc(n.body)}</p>` : ''}
        <p class="nitem__meta">${H.avatar(n.author)}<b>${esc(H.member(n.author).name)}</b><span>${esc(H.member(n.author).role)}</span><time datetime="${new Date(n.at).toISOString()}">${esc(H.ago(n.at))}</time></p>
      </article>`).join('')
      : `<div class="card empty empty--box">${icon('megaphone', 24)}<b>${filter === '전체' ? '아직 올라온 공지가 없어요' : `'${esc(filter)}' 공지가 없어요`}</b><span>오른쪽 위 '공지 쓰기'로 팀에 소식을 알려 보세요</span></div>`;
    $('#noticeFeed').querySelectorAll('[data-del]').forEach(b => b.onclick = async () => {
      const n = H.notices.get(b.dataset.del);
      if (!n || !confirm(`'${n.title}' 공지를 지울까요?`)) return;
      try { await H.notices.remove(n.id); render(); H.toast('공지를 지웠어요'); } catch (e) { console.warn(e); H.toast('공지를 지우지 못했어요'); }
    });
  }

  $('#writeBtn').onclick = () => H.openNoticeEditor();
  document.addEventListener('hub:notice-added', (e) => { filter = '전체'; flash = e.detail; render(); clearFlash(); });
  document.addEventListener('hub:notices', render);
  render();
  H.notifs.markSeen('notice');   // 공지 화면을 열었으면 공지 알림은 본 것으로
  document.dispatchEvent(new CustomEvent('hub:notices'));

  // 알림·허브에서 특정 공지로 들어오면 그 공지로 스크롤
  const target = flash && document.getElementById('n-' + flash);
  if (target) { target.scrollIntoView({ block: 'center' }); target.focus({ preventScroll: true }); }
  if (flash) clearFlash();
});
