/* 입장 화면 — 1) 비밀번호 2) 이름·소속(선택) → 홈으로 */
(function () {
  'use strict';
  const H = window.Hub, { $, esc, icon, TEAM, team } = H;
  const invited = /[?&]invite=/.test(location.search);
  $('#jLogo').innerHTML = icon('bowl', 18);
  $('#jTeam').textContent = TEAM.name;
  $('#jSub').textContent = TEAM.sub || '';

  H.ready.then(() => {
    if (H.initError) { H.showInitError($('.join__card')); return; }
    if (!invited && team.meId()) { location.replace('index.html'); return; }

    $('#jNote').innerHTML = H.isShared()
      ? `<span class="live-dot" aria-hidden="true"></span>한 번 들어오면 이 기기는 다음부터 바로 열려요`
      : '미리보기 모드예요. 입력한 정보는 이 브라우저에만 저장돼요.';
    if (!invited) $('#jIntro').textContent = '전달받은 비밀번호를 입력해 주세요.';

    const err = (fid, eid, msg) => { $('#' + eid).textContent = msg; $('#' + fid).closest('.fld').classList.toggle('is-err', !!msg); return !msg; };
    const busy = (btn, on, label) => { btn.disabled = on; if (label) btn.textContent = label; };
    const step = (n) => {
      $('#pwForm').hidden = n !== 1; $('#infoForm').hidden = n !== 2;
      $('#s1Dot').classList.toggle('is-on', n === 1); $('#s1Dot').classList.toggle('is-done', n === 2);
      $('#s2Dot').classList.toggle('is-on', n === 2);
      setTimeout(() => (n === 1 ? $('#fPw') : $('#fName')).focus(), 30);
    };

    let pw = '', names = [];
    $('#pwForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const v = $('#fPw').value, btn = $('#pwForm button[type=submit]');
      if (!err('fPw', 'ePw', v ? '' : '비밀번호를 입력해 주세요')) return;
      busy(btn, true, '확인 중…');
      try { names = await team.memberNames(v); }
      catch (er) {
        busy(btn, false, '다음');
        err('fPw', 'ePw', er.message === 'wrong_password' ? '비밀번호가 맞지 않아요' : '서버에 연결하지 못했어요. 잠시 뒤 다시 시도해 주세요');
        $('#fPw').select(); return;
      }
      busy(btn, false, '다음');
      err('fPw', 'ePw', '');
      pw = v;
      $('#returnList').innerHTML = names.length ? `${icon('users', 15)}<span>지금 멤버: ${names.map(n => `<button type="button" class="name-chip" data-name="${esc(n)}">${esc(n)}</button>`).join('')} <small>내 이름을 누르면 이어서 들어가요</small></span>` : `${icon('users', 15)}<span>아직 아무도 없어요. 첫 멤버로 들어오세요!</span>`;
      $('#returnList').querySelectorAll('[data-name]').forEach(b => b.onclick = () => { $('#fName').value = b.dataset.name; $('#fName').dispatchEvent(new Event('input')); $('#enterBtn').focus(); });
      step(2);
    });
    $('#backPw').onclick = () => step(1);

    $('#fName').addEventListener('input', () => {
      const v = $('#fName').value.trim().replace(/\s+/g, ' ');
      const known = names.includes(v);
      const r = $('#returning');
      r.hidden = !known;
      if (known) r.innerHTML = `${icon('users', 15)}<span>이미 있는 멤버예요. <b>${esc(v)}</b> 님으로 이어서 들어가요 — 쪽지·일정이 그대로 있어요.</span>`;
      $('#enterBtn').textContent = known ? '이어서 들어가기' : '입장하기';
    });

    $('#infoForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = $('#fName').value.trim().replace(/\s+/g, ' '), role = $('#fRole').value.trim(), btn = $('#enterBtn');
      if (!err('fName', 'eName', name ? '' : '이름을 적어 주세요')) { $('#fName').focus(); return; }
      const label = btn.textContent;
      busy(btn, true, '들어가는 중…');
      let res;
      try { res = await team.join(pw, name, role, invited); }
      catch (er) {
        busy(btn, false, label);
        if (er.message === 'wrong_password') { step(1); err('fPw', 'ePw', '비밀번호가 바뀌었어요. 다시 입력해 주세요'); }
        else if (er.message === 'anon_disabled') err('fName', 'eName', '관리자 설정이 필요해요: Supabase에서 익명 로그인(Anonymous sign-ins)을 켜 주세요');
        else err('fName', 'eName', '들어가지 못했어요. 연결을 확인하고 다시 시도해 주세요');
        return;
      }
      try { sessionStorage.setItem('interns-welcome', res.isNew ? 'new' : 'back'); } catch (er) {}
      location.replace('index.html');
    });

    // 초대 링크로 왔는데 이 기기에 이미 입장한 사람이 있으면 → '○○ 님으로 계속하기' 먼저
    const prev = invited ? team.me() : null;
    if (prev) {
      $('#contWho').innerHTML = `<span class="av-wrap">${H.avatar(prev.id, 'av--xl')}</span><span><b>${esc(prev.name)}</b><small>${prev.role ? esc(prev.role) + ' · ' : ''}${esc(TEAM.name)}</small></span>`;
      $('#contGo').textContent = `${prev.name} 님으로 계속하기`;
      $('#contGo').onclick = async () => { await team.continueAs(prev.id); location.replace('index.html'); };
      $('#contOther').onclick = () => { $('#contBox').hidden = true; $('.steps').hidden = false; step(1); };
      $('#contBox').hidden = false; $('.steps').hidden = true; $('#pwForm').hidden = true; $('#infoForm').hidden = true;
      setTimeout(() => $('#contGo').focus(), 30);
      return;
    }
    step(1);
  });
})();
