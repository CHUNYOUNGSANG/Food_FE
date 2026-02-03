/**
 * localStorage 관리 유틸리티
 */

// Member ID
export const getMemberId = () => {
  return localStorage.getItem('memberId');
};

export const setMemberId = (memberId) => {
  localStorage.setItem('memberId', memberId);
};

export const removeMemberId = () => {
  localStorage.removeItem('memberId');
};

// Member Nickname
export const getMemberNickname = () => {
  return localStorage.getItem('memberNickname');
};

export const setMemberNickname = (nickname) => {
  localStorage.setItem('memberNickname', nickname);
};

export const removeMemberNickname = () => {
  localStorage.removeItem('memberNickname');
};

// Token (향후 JWT 사용 시)
export const getToken = () => {
  return localStorage.getItem('token');
};

export const setToken = (token) => {
  localStorage.setItem('token', token);
};

export const removeToken = () => {
  localStorage.removeItem('token');
};

// 로그인 여부 확인
export const isLoggedIn = () => {
  return !!getMemberId();
};

// 사용자 정보 가져오기
export const getUser = () => {
  const memberId = getMemberId();
  const nickname = getMemberNickname();

  if (!memberId) {
    return null;
  }

  return {
    id: memberId,
    nickname: nickname || '사용자',
  };
};

// 전체 로그아웃 (clearStorage)
export const clearStorage = () => {
  removeMemberId();
  removeMemberNickname();
  removeToken();
};
