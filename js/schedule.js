/* 일정 공유 — 월간 달력 (연차·반차·출장…). 날짜를 누르면 그날로 올리기, 일정을 누르면 상세·삭제 */
window.Hub.boot(function () {
  'use strict';
  const H = window.Hub, { $, esc, icon, team, schedules } = H;
  H.renderShell('schedule');
  document.querySelectorAll('[data-ic]').forEach(el => { el.outerHTML = icon(el.dataset.ic, el.closest('.btn') ? 16 : 20); });

  const params = new URLSearchParams(location.search);
  const focusDate = /^\d{4}-\d{2}-\d{2}$/.test(params.get('date') || '') ? params.get('date') : null;
  let cur = focusDate ? H.parseYmd(focusDate) : new Date();
  cur = new Date(cur.getFullYear(), cur.getMonth(), 1);
  let flashDay = focusDate, flashId = null;

  // 범례
  function legend() {
    const shown = [];
    schedules.BASE_KINDS.forEach(k => { const c = schedules.kindClass(k); if (!shown.some(x => x[1] === c)) shown.push([k.replace(/^오[전후] /, ''), c]); });
    schedules.custom().forEach(x => shown.push([x.name, x.color]));   // 직접 만든 종류는 이름마다 따로
    $('#legend').innerHTML = shown.map(([k, c]) => `<span class="lgk"><i class="lgk__dot chip--${c}"></i>${esc(k)}</span>`).join('');
  }
  legend();
  document.addEventListener('hub:schedules', legend);

  const chip = (s, small) => `<button type="button" class="chip chip--${schedules.kindClass(s.kind)}${s.member === team.meId() ? ' is-mine' : ''}${s.id === flashId ? ' is-new' : ''}" data-sid="${esc(s.id)}" title="${esc(H.member(s.member).name)} ${esc(s.kind)}${s.memo ? ' · ' + esc(s.memo) : ''}">${small ? '' : H.avatar(s.member)}<b>${esc(H.shortName(H.member(s.member).name))}</b><span>${esc(s.kind)}</span></button>`;

  function render() {
    const y = cur.getFullYear(), m = cur.getMonth();
    $('#calTitle').textContent = `${y}년 ${m + 1}월`;
    const first = H.weekStart(new Date(y, m, 1));
    const last = new Date(y, m + 1, 0);
    const end = H.addDays(H.weekStart(last), 6);
    const days = [];
    for (let d = first; d <= end; d = H.addDays(d, 1)) days.push(d);
    const today = H.todayYmd();
    $('#grid').innerHTML = ['월', '화', '수', '목', '금', '토', '일'].map((d, i) => `<div class="mhead${i > 4 ? ' is-weekend' : ''}" role="columnheader">${d}</div>`).join('') +
      days.map(d => {
        const k = H.ymd(d), list = schedules.on(k), out = d.getMonth() !== m, we = d.getDay() === 0 || d.getDay() === 6;
        const max = 3, extra = list.length - max;
        return `<div class="mday${out ? ' is-out' : ''}${we ? ' is-weekend' : ''}${k === today ? ' is-today' : ''}${k === flashDay ? ' is-flash' : ''}" role="gridcell" data-date="${k}">
          <button type="button" class="mday__add" data-add="${k}" aria-label="${d.getMonth() + 1}월 ${d.getDate()}일${list.length ? `, 일정 ${list.length}개` : ''} — 일정 올리기"></button>
          <span class="mday__n">${d.getDate()}</span>
          <div class="mday__list">${list.slice(0, max).map(s => chip(s)).join('')}${extra > 0 ? `<button type="button" class="mday__more" data-add-more="${k}">+${extra}</button>` : ''}</div>
          ${list.length ? `<span class="mday__dots" aria-hidden="true">${list.slice(0, 4).map(s => `<i class="chip--${schedules.kindClass(s.kind)}"></i>`).join('')}</span>` : ''}
        </div>`;
      }).join('');

    // 모바일(그리고 큰 화면 아래)용 이 달 목록
    const ms = H.ymd(new Date(y, m, 1)), me = H.ymd(last);
    const byDay = [];
    for (let d = new Date(y, m, 1); d <= last; d = H.addDays(d, 1)) { const k = H.ymd(d), l = schedules.on(k); if (l.length) byDay.push([k, l]); }
    $('#mlist').innerHTML = `<h3 class="mlist__title">${m + 1}월 일정 <span>${schedules.inRange(ms, me).length}개</span></h3>` + (byDay.length ? byDay.map(([k, l]) => `
      <div class="mlist__day${k === today ? ' is-today' : ''}${k < today ? ' is-past' : ''}"><span class="mlist__date">${esc(H.dayLabel(k))}</span><div class="mlist__items">${l.map(s => chip(s)).join('')}</div></div>`).join('')
      : `<p class="empty">이 달엔 올라온 일정이 없어요</p>`);
  }

  // 상세 모달
  const dd = document.createElement('dialog');
  dd.className = 'modal modal--sm'; dd.id = 'sdDetail'; dd.setAttribute('aria-labelledby', 'sdTitleD');
  document.body.appendChild(dd);
  dd.addEventListener('click', (e) => { if (e.target === dd) dd.close(); });
  dd.addEventListener('close', () => { if (dd._opener && document.contains(dd._opener)) dd._opener.focus(); });
  function openDetail(id) {
    const s = schedules.get(id); if (!s) return;
    const mine = s.member === team.meId(), m = H.member(s.member);
    dd.innerHTML = `
      <div class="modal__head"><h2 id="sdTitleD">${esc(m.name)} · ${esc(s.kind)}</h2><button class="icon-btn" type="button" data-close aria-label="닫기">${icon('close', 20)}</button></div>
      <div class="modal__body">
        <p class="sd-row">${H.avatar(s.member, 'av--lg')}<span><b>${esc(m.name)}</b><small>${m.role ? esc(m.role) : esc(H.TEAM.name)}</small></span><span class="chip chip--${schedules.kindClass(s.kind)}">${esc(s.kind)}</span></p>
        <p class="sd-row">${icon('calendar', 18)}<span>${esc(H.rangeLabel(s.start, s.end))}${s.start !== s.end ? ` <small class="muted">(${Math.round((H.parseYmd(s.end) - H.parseYmd(s.start)) / 864e5) + 1}일)</small>` : ''}</span></p>
        ${s.memo ? `<p class="sd-row">${icon('edit', 18)}<span>${esc(s.memo)}</span></p>` : ''}
      </div>
      <div class="modal__foot">${mine ? `<button class="btn btn--danger" type="button" id="sdDel">${icon('trash', 16)}삭제</button>` : ''}<button class="btn btn--accent" type="button" data-close>확인</button></div>`;
    dd.querySelectorAll('[data-close]').forEach(b => b.onclick = () => dd.close());
    const del = $('#sdDel', dd);
    if (del) del.onclick = async () => {
      try { await schedules.remove(s.id); dd.close(); render(); H.toast('일정을 지웠어요'); document.dispatchEvent(new CustomEvent('hub:schedules')); }
      catch (e) { console.warn(e); H.toast('일정을 지우지 못했어요'); }
    };
    dd._opener = document.activeElement;
    dd.showModal();
  }

  document.addEventListener('click', (e) => {
    const c = e.target.closest('[data-sid]'); if (c && c.closest('.mcal')) { e.preventDefault(); openDetail(c.dataset.sid); return; }
    const a = e.target.closest('[data-add]'); if (a) { H.openScheduleEditor(a.dataset.add); return; }
    const more = e.target.closest('[data-add-more]'); if (more) $('#mlist').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  $('#prevM').onclick = () => { cur = new Date(cur.getFullYear(), cur.getMonth() - 1, 1); flashDay = null; render(); };
  $('#nextM').onclick = () => { cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1); flashDay = null; render(); };
  $('#thisM').onclick = () => { const t = new Date(); cur = new Date(t.getFullYear(), t.getMonth(), 1); flashDay = null; render(); };
  $('#addBtn').onclick = () => H.openScheduleEditor();
  document.addEventListener('hub:schedule-added', (e) => {
    const s = schedules.get(e.detail); if (s) { const d = H.parseYmd(s.start); cur = new Date(d.getFullYear(), d.getMonth(), 1); }
    flashId = e.detail; render(); setTimeout(() => { flashId = null; }, 2000);
  });
  document.addEventListener('hub:schedules', render);
  render();
  H.notifs.markSeen('schedule');
  document.dispatchEvent(new CustomEvent('hub:schedules'));
  if (params.get('new') === '1') H.openScheduleEditor(focusDate || undefined);
  if (focusDate) { const el = document.querySelector(`.mday[data-date="${focusDate}"]`); if (el) el.scrollIntoView({ block: 'center' }); setTimeout(() => { flashDay = null; }, 2500); }
});
