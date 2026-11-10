# interns

동기 4명이 같이 쓰는 작은 사이트예요. **쪽지·단체방, 공지사항, 일정 공유(연차·반차·출장), 점심 뽑기**를 한곳에 모았어요.
팀 허브(teamhub_00)의 화면 틀과 코드를 가져와 기능만 바꿔 만들었어요. 빌드 없이 HTML·CSS·바닐라 JS만 써요.

## 화면
| 주소 | 내용 |
|---|---|
| `/` | 홈: 인사·요약(오늘 일정 있는 사람 / 안 읽은 쪽지 / 접속 중), 이번 주 일정, 오늘 점심, 공지, 최근 활동, 멤버 |
| `/join.html` | 입장: 비밀번호 → 이름·소속(선택). 초대 링크는 `/join.html?invite=1` |
| `/messages.html` | 쪽지: **단체방** + 멤버별 1:1. 말풍선 옆 노란 숫자 = 아직 안 읽은 사람 수 |
| `/schedule.html` | 일정 공유: 월간 달력. 연차·오전/오후 반차·출장·외근·교육·재택·기타, 여러 날 가능 |
| `/lunch.html` | 점심 뽑기: 후보 1~4개 → 돌림판 / 랜덤 뽑기. 결과는 다른 멤버 화면에서도 같은 애니메이션으로 재생 |
| `/notices.html` | 공지사항: 공지·약속·정보 |

- 상단: 단체방 바로가기(안 읽은 수), 알림 종(공지·쪽지·일정·점심 소식, 실시간 토스트), 프로필(상태: 온라인·바쁨·자리 비움 / 초대 / 테마 / 이 기기에서 나가기 / 전체 초기화)
- 멤버 목록에 접속 상태와 **오늘 연차·출장** 같은 표시가 같이 떠요
- 한 번 들어온 기기는 다음부터 바로 열려요. 다른 기기에선 같은 이름으로 들어오면 기존 멤버로 이어져요

## 처음 설정 (Supabase)
1. supabase.com에서 프로젝트 만들기 (Region: Northeast Asia (Seoul))
2. **Authentication → Sign In / Providers → Allow anonymous sign-ins 켜기** (기기 인증에 써요)
3. **SQL Editor**에 `supabase/setup.sql` 통째로 붙여넣고 Run (여러 번 실행해도 안전)
4. **비밀번호 정하기** — SQL Editor에서 아래 한 줄을 따로 Run (이 줄은 저장소에 올리지 않아요)
   ```sql
   insert into public.app_settings (key, value) values ('password', '여기에_비밀번호') on conflict (key) do update set value = excluded.value;
   ```
5. Project Settings → API Keys의 **Project URL**과 **Publishable key**를 `data/team.js`의 `supabase`에 넣기
   (Publishable 키는 공개용이라 저장소에 올라가도 괜찮아요. **secret·service_role 키는 절대 넣지 말 것**)
6. 이 저장소를 Vercel에 연결 (빌드 설정 없음)

무료 프로젝트는 일주일쯤 안 쓰면 일시정지돼요 → 대시보드에서 Restore.

## 보안 구조
- 브라우저는 기기마다 **익명 로그인** 사용자를 하나 받아요. 비밀번호를 맞혀 입장하면 그 기기가 멤버와 연결돼요(`member_devices`).
- 모든 표는 **입장한 기기만** 읽을 수 있어요(RLS). 비밀번호 없이 익명 로그인만 해서는 아무것도 못 읽어요.
- **1:1 쪽지는 보낸 사람·받은 사람만** 읽을 수 있어요. 단체방은 멤버 모두.
- 글·일정·점심 기록은 **자기 이름으로만** 쓸 수 있고, 공지·일정은 자기 것만 지울 수 있어요. 쪽지는 읽음 표시(`read_at`)만 바꿀 수 있어요.
- 비밀번호는 DB(`app_settings`)에만 있고 브라우저에서 읽을 수 없어요. 함수 안에서만 비교해요.
- 한계: 비밀번호를 아는 사람은 아무 이름으로나 들어올 수 있어요(같은 이름이면 그 멤버로 이어짐). 4명끼리 쓰는 용도라 이 정도로 정했어요.

## 파일
| 파일 | 역할 |
|---|---|
| `js/hub-core.js` | 공통: 상단바·사이드바·알림 패널, 데이터 층(로컬/Supabase), 접속 상태, 초대·공지·일정 모달 |
| `js/home.js` · `join.js` · `messages.js` · `schedule.js` · `lunch.js` · `notices.js` | 화면별 코드 |
| `data/team.js` | 이름, Supabase 주소·키, 일정 종류, 점심 빠른 추가 후보, 바로가기 |
| `supabase/setup.sql` | 표·RLS·함수·Realtime |
| `css/hub.css` | 스타일 (팀 허브와 같은 토큰) |

## 미리보기 모드
`data/team.js`의 `supabase` 값을 비우고 `password`를 넣으면 이 브라우저 안에서만 돌아가는 미리보기 모드가 돼요(같은 브라우저 탭끼리만 공유).
