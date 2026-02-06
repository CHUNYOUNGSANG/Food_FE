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

// Member Email
export const getMemberEmail = () => {
  return localStorage.getItem('memberEmail');
};

export const setMemberEmail = (email) => {
  localStorage.setItem('memberEmail', email);
};

export const removeMemberEmail = () => {
  localStorage.removeItem('memberEmail');
};

// Member Profile Image
export const getMemberProfileImage = () => {
  return localStorage.getItem('memberProfileImage');
};

export const setMemberProfileImage = (profileImage) => {
  localStorage.setItem('memberProfileImage', profileImage);
};

export const removeMemberProfileImage = () => {
  localStorage.removeItem('memberProfileImage');
};

// Access Token (JWT)
export const getToken = () => {
  return localStorage.getItem('token');
};

export const setToken = (token) => {
  localStorage.setItem('token', token);
};

export const removeToken = () => {
  localStorage.removeItem('token');
};

// Refresh Token (JWT)
export const getRefreshToken = () => {
  return localStorage.getItem('refreshToken');
};

export const setRefreshToken = (refreshToken) => {
  localStorage.setItem('refreshToken', refreshToken);
};

export const removeRefreshToken = () => {
  localStorage.removeItem('refreshToken');
};

// 로그인 여부 확인
export const isLoggedIn = () => {
  return !!getMemberId() && !!getToken();
};

// 사용자 정보 가져오기
export const getUser = () => {
  const memberId = getMemberId();
  const nickname = getMemberNickname();
  const email = getMemberEmail();
  const profileImage = getMemberProfileImage();

  if (!memberId) {
    return null;
  }

  return {
    id: memberId,
    nickname: nickname || '사용자',
    email: email || '',
    profileImage: profileImage || '',
  };
};

// 사용자 정보 저장
export const setUser = (user) => {
  if (user.id) setMemberId(user.id);
  if (user.nickname) setMemberNickname(user.nickname);
  if (user.email) setMemberEmail(user.email);
  if (user.profileImage) setMemberProfileImage(user.profileImage);
};

// 전체 로그아웃 (clearStorage)
export const clearStorage = () => {
  removeMemberId();
  removeMemberNickname();
  removeMemberEmail();
  removeMemberProfileImage();
  removeToken();
  removeRefreshToken();
};
