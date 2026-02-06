/**
 * 과거 트러블슈팅 항목을 Notion에 추가하는 스크립트
 * 분석된 오류들을 날짜순으로 Notion에 기록합니다.
 */

import { addMultipleTroubleshooting } from './notion-logger.js';

// 과거 트러블슈팅 항목들 (날짜순 정렬)
const pastTroubleshootings = [
  // ============================================
  // 2026-02-03: 로그인 오류 수정
  // ============================================
  {
    title: '[Frontend] 로그인 비밀번호 유효성 검사 누락',
    domain: '전체',
    category: '기타',
    date: '2026-02-03',
    severity: 'High',
    tags: ['버그', '검증'],
    resolveTime: 15,
    description:
      '로그인 페이지에서 비밀번호 입력 시 유효성 검사가 없어서 빈 값이나 짧은 비밀번호도 API에 요청되는 문제가 발생했습니다. 이메일은 validateEmail로 검사했지만, 비밀번호는 검사 로직이 없었습니다.',
    solution:
      'validatePassword 함수를 import하고, 비밀번호가 8자 이상인지 검사하는 로직을 추가했습니다. 검사 실패 시 포커스를 비밀번호 입력란으로 이동시킵니다.',
    code: `// Before
if (!email || !password) {
  showError('이메일과 비밀번호를 모두 입력해주세요.');
  return;
}

// After
if (!validateEmail(email)) {
  showError('올바른 이메일 형식이 아닙니다.');
  emailInput.focus();
  return;
}

if (!validatePassword(password)) {
  showError('비밀번호는 8자 이상이어야 합니다.');
  passwordInput.focus();
  return;
}`,
  },
  {
    title: '[Frontend] 로그인 에러 메시지 처리 로직 복잡도 개선',
    domain: '전체',
    category: '기타',
    date: '2026-02-03',
    severity: 'Medium',
    tags: ['최적화'],
    resolveTime: 10,
    description:
      '로그인 실패 시 에러 메시지를 표시하는 로직이 중복되고 복잡했습니다. error.message, error.response?.message 등 여러 케이스를 확인하는 if-else 구조였습니다.',
    solution:
      '에러 메시지 처리를 단순화하여 error.message가 있으면 사용하고, 없으면 기본 메시지를 표시하도록 개선했습니다. auth-service에서 이미 적절한 에러 메시지를 던지므로 중복 로직이 불필요했습니다.',
    code: `// Before
if (error.message) {
  showError(error.message);
} else if (error.response?.message) {
  showError(error.response.message);
} else {
  showError('로그인에 실패했습니다. 이메일과 비밀번호를 확인해주세요.');
}

// After
showError(error.message || '이메일 또는 비밀번호가 일치하지 않습니다.');`,
  },
  {
    title: '[Frontend] Storage 함수명 불일치 문제',
    domain: '전체',
    category: '기타',
    date: '2026-02-03',
    severity: 'High',
    tags: ['버그'],
    resolveTime: 5,
    description:
      'auth-service.js에서 로그인 성공 시 saveUser(), saveMemberId() 함수를 호출했지만, storage.js에는 setMemberId(), setMemberNickname() 함수만 존재하여 런타임 에러가 발생했습니다.',
    solution:
      'storage.js의 실제 함수명에 맞춰 setMemberId()와 setMemberNickname()을 사용하도록 수정했습니다.',
    code: `// Before
import { saveUser, saveMemberId } from '../utils/storage.js';
saveUser(response);
saveMemberId(response.id);

// After
import { setMemberId, setMemberNickname } from '../utils/storage.js';
setMemberId(response.id);
setMemberNickname(response.nickname);`,
  },

  // ============================================
  // 2026-02-06: 일반 오류 수정
  // ============================================
  {
    title: '[Frontend] JWT 토큰 갱신 로직 누락 (401 에러 처리)',
    domain: '전체',
    category: '기타',
    date: '2026-02-06',
    severity: 'Critical',
    tags: ['버그', '권한'],
    resolveTime: 60,
    description:
      'API 요청 시 401 Unauthorized 에러 발생 시 자동으로 토큰을 갱신하는 로직이 없어서, 사용자가 로그인 상태임에도 불구하고 인증 만료로 인해 작업을 계속할 수 없는 문제가 발생했습니다.',
    solution:
      'http-client.js에 토큰 갱신 로직을 추가했습니다.\n1. 401 에러 감지 시 _refreshAccessToken() 호출\n2. refresh token으로 새로운 access token 발급\n3. 갱신된 토큰으로 원래 요청 재시도\n4. 갱신 실패 시 자동 로그아웃 및 로그인 페이지 이동\n5. 동시 갱신 방지를 위한 _isRefreshing 플래그 사용',
    code: `async _refreshAccessToken() {
  if (this._isRefreshing) {
    return this._refreshPromise;
  }

  this._isRefreshing = true;
  this._refreshPromise = (async () => {
    try {
      const refreshToken = getRefreshToken();
      if (!refreshToken) return false;

      const response = await fetch(
        \`\${API_CONFIG.BASE_URL}\${API_CONFIG.ENDPOINTS.MEMBER_REFRESH}\`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        }
      );

      if (!response.ok) return false;

      const data = await response.json();
      setToken(data.accessToken);
      setRefreshToken(data.refreshToken);
      return true;
    } catch {
      return false;
    } finally {
      this._isRefreshing = false;
      this._refreshPromise = null;
    }
  })();

  return this._refreshPromise;
}`,
  },
  {
    title: '[Frontend] Refresh Token 저장/조회 함수 누락',
    domain: '전체',
    category: '기타',
    date: '2026-02-06',
    severity: 'High',
    tags: ['버그'],
    resolveTime: 10,
    description:
      'JWT 인증 방식으로 변경하면서 access token만 저장하고 refresh token을 저장/조회하는 함수가 없어서 토큰 갱신 기능을 구현할 수 없었습니다.',
    solution:
      'storage.js에 getRefreshToken(), setRefreshToken(), removeRefreshToken() 함수를 추가하고, clearStorage()에서도 refresh token을 삭제하도록 수정했습니다.',
    code: `// Refresh Token (JWT)
export const getRefreshToken = () => {
  return localStorage.getItem('refreshToken');
};

export const setRefreshToken = (refreshToken) => {
  localStorage.setItem('refreshToken', refreshToken);
};

export const removeRefreshToken = () => {
  localStorage.removeItem('refreshToken');
};

// clearStorage에 추가
export const clearStorage = () => {
  removeMemberId();
  removeMemberNickname();
  removeToken();
  removeRefreshToken(); // 추가
};`,
  },
  {
    title: '[Frontend] 로그인 여부 확인 로직 불완전',
    domain: '전체',
    category: '기타',
    date: '2026-02-06',
    severity: 'Medium',
    tags: ['버그', '검증'],
    resolveTime: 5,
    description:
      'isLoggedIn() 함수가 memberId만 확인하고 token은 확인하지 않아서, token이 없어도 로그인 상태로 판단되는 문제가 있었습니다. 이로 인해 인증이 필요한 API 호출 시 401 에러가 발생했습니다.',
    solution:
      'isLoggedIn() 함수에서 memberId와 token 둘 다 존재하는지 확인하도록 수정했습니다.',
    code: `// Before
export const isLoggedIn = () => {
  return !!getMemberId();
};

// After
export const isLoggedIn = () => {
  return !!getMemberId() && !!getToken();
};`,
  },
  {
    title: '[Frontend] 게시글 수정 권한 확인 시 타입 불일치',
    domain: 'Post',
    category: '기타',
    date: '2026-02-06',
    severity: 'High',
    tags: ['버그', '권한'],
    resolveTime: 15,
    description:
      '게시글 수정 페이지에서 본인 게시글인지 확인할 때, localStorage의 memberId(string)와 API 응답의 post.memberId(number)를 직접 비교하여 항상 false가 되는 문제가 발생했습니다. 이로 인해 본인 게시글임에도 수정 권한이 없다고 판단되었습니다.',
    solution:
      'localStorage의 memberId를 parseInt()로 숫자로 변환한 후 비교하도록 수정했습니다.',
    code: `// Before
const memberId = getMemberId();
if (memberId !== post.memberId.toString()) {
  alert('수정 권한이 없습니다.');
  return;
}

// After
const memberId = getMemberId();
if (parseInt(memberId) !== post.memberId) {
  alert('수정 권한이 없습니다.');
  return;
}`,
  },
  {
    title: '[Frontend] 게시글 이미지 업로드 기능 개선 (URL → 파일)',
    domain: 'Post',
    category: '기타',
    date: '2026-02-06',
    severity: 'Low',
    tags: ['최적화'],
    resolveTime: 120,
    description:
      '게시글 수정 페이지에서 이미지를 URL로만 입력받던 방식을 파일 업로드 방식으로 변경했습니다. 기존 이미지 미리보기, 삭제/복원, 새 이미지 추가 등의 기능이 없어서 사용성이 떨어졌습니다.',
    solution:
      '1. imageUrl input을 imageFiles input으로 변경\n2. 기존 이미지 미리보기 및 삭제/복원 기능 추가\n3. 새 이미지 선택 시 미리보기 기능 추가\n4. 최대 10장 제한 로직 추가\n5. deleteImageIds 배열로 삭제할 이미지 ID 관리',
    code: `// 기존 이미지 삭제/복원 토글
const toggleDeleteImage = (imageId) => {
  const index = deleteImageIds.indexOf(imageId);
  if (index > -1) {
    deleteImageIds.splice(index, 1);
  } else {
    deleteImageIds.push(imageId);
  }
  renderExistingImages(currentPost.images || []);
};

// 새 이미지 선택 처리
const handleImageSelect = (e) => {
  const files = Array.from(e.target.files);
  const existingCount = (currentPost.images || []).length - deleteImageIds.length;

  if (existingCount + selectedFiles.length + files.length > MAX_IMAGES) {
    alert(\`이미지는 최대 \${MAX_IMAGES}장까지만 업로드 가능합니다.\`);
    return;
  }

  const imageFiles = files.filter((file) => file.type.startsWith('image/'));
  selectedFiles = [...selectedFiles, ...imageFiles];
  renderNewImagePreviews();
};`,
  },
];

// 실행
console.log('🚀 과거 트러블슈팅 항목을 Notion에 추가합니다...\n');
console.log(`총 ${pastTroubleshootings.length}개 항목을 추가합니다.\n`);

const results = await addMultipleTroubleshooting(pastTroubleshootings);

// 결과 요약
const successCount = results.filter((r) => r.success).length;
const failCount = results.filter((r) => !r.success).length;

console.log('\n=== 결과 요약 ===');
console.log(`✅ 성공: ${successCount}개`);
console.log(`❌ 실패: ${failCount}개`);

if (failCount > 0) {
  console.log('\n실패한 항목:');
  results
    .filter((r) => !r.success)
    .forEach((r) => {
      console.log(`  - ${r.title}: ${r.error}`);
    });
}

console.log('\n✨ 완료!');
