/* =========================================================
   사이트 설정 — 이름, Supabase 연결, 일정 종류, 점심 추천 후보, 바로가기
   (팀원·쪽지·일정 같은 데이터는 여기 없어요. 들어와서 직접 만든 값만 쓰여요.)
   ========================================================= */
window.HUB_TEAM = {
  name: 'interns',
  sub: 'Intern Lounge',

  // ── Supabase 연결 (실제 DB · 다른 기기끼리 실시간 공유) ──────────────
  // url·key를 채우면 Supabase 모드, 비워 두면 로컬 모드(이 브라우저에만 저장 — 미리보기용).
  // key는 Publishable key(sb_publishable_…) 또는 anon public 키 — 웹페이지에 공개되는 용도라 올려도 괜찮아요.
  // ⚠️ secret / service_role 키는 절대 넣지 마세요.
  // 입장 비밀번호는 여기가 아니라 Supabase 안에만 있어요(README '비밀번호 정하기').
  supabase: {
    url: 'https://qtkrzcwskqvguujoaicm.supabase.co',
    key: 'sb_publishable_GPDxwveKIAmAWzM2_tOvGw_q_kiPg9E',
  },

  // 로컬 모드(supabase 값을 비웠을 때)에서만 쓰는 비밀번호 — 페이지 코드에 그대로 보여요
  password: '',

  // 일정 공유에서 고르는 종류 (supabase/setup.sql의 목록과 같아야 해요)
  scheduleKinds: ['연차', '오전 반차', '오후 반차', '출장', '외근', '교육', '재택', '기타'],

  // 점심 뽑기 빠른 추가 후보
  lunchIdeas: ['김치찌개', '돈까스', '국밥', '마라탕', '쌀국수', '샐러드', '햄버거', '초밥', '제육볶음', '칼국수'],

  // 사이드바 바로가기 — 필요하면 { name: '이름', href: 'https://…', icon: 'link' } 추가
  links: [],
};
