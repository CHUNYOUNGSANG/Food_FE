/**
 * LocalStorage 관리 유틸리티
 */

// Storage Keys
const STORAGE_KEYS = {
  USER: 'user',
  MEMBER_ID: 'memberId',
  TOKEN: 'token', // 향후 JWT 토큰 사용 시
};

/**
 * 사용자 정보 저장
 * @param {Object} userData - 사용자 정보 객체
 */
export const saveUser = (userData) => {
  try {
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(userData));
    console.log('사용자 정보 저장 완료:', userData);
  } catch (error) {
    console.error('사용자 정보 저장 실패:', error);
  }
};

/**
 * 사용자 정보 조회
 * @returns {Object|null} 사용자 정보 또는 null
 */
export const getUser = () => {
  try {
    const user = localStorage.getItem(STORAGE_KEYS.USER);
    return user ? JSON.parse(user) : null;
  } catch (error) {
    console.error('사용자 정보 조회 실패:', error);
    return null;
  }
};

/**
 * Member ID 저장
 * @param {number} memberId - 회원 ID
 */
export const saveMemberId = (memberId) => {
  try {
    localStorage.setItem(STORAGE_KEYS.MEMBER_ID, memberId.toString());
    console.log('Member ID 저장 완료:', memberId);
  } catch (error) {
    console.error('Member ID 저장 실패:', error);
  }
};

/**
 * Member ID 조회
 * @returns {number|null} 회원 ID 또는 null
 */
export const getMemberId = () => {
  try {
    const memberId = localStorage.getItem(STORAGE_KEYS.MEMBER_ID);
    return memberId ? parseInt(memberId, 10) : null;
  } catch (error) {
    console.error('Member ID 조회 실패:', error);
    return null;
  }
};

/**
 * 토큰 저장 (향후 JWT 사용 시)
 * @param {string} token - 인증 토큰
 */
export const saveToken = (token) => {
  try {
    localStorage.setItem(STORAGE_KEYS.TOKEN, token);
    console.log('토큰 저장 완료');
  } catch (error) {
    console.error('토큰 저장 실패:', error);
  }
};

/**
 * 토큰 조회
 * @returns {string|null} 토큰 또는 null
 */
export const getToken = () => {
  try {
    return localStorage.getItem(STORAGE_KEYS.TOKEN);
  } catch (error) {
    console.error('토큰 조회 실패:', error);
    return null;
  }
};

/**
 * 로그인 여부 확인
 * @returns {boolean} 로그인 상태
 */
export const isLoggedIn = () => {
  const memberId = getMemberId();
  const user = getUser();
  return !!(memberId && user);
};

/**
 * 로그아웃 (모든 저장 정보 삭제)
 */
export const clearStorage = () => {
  try {
    localStorage.removeItem(STORAGE_KEYS.USER);
    localStorage.removeItem(STORAGE_KEYS.MEMBER_ID);
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
    console.log('로그아웃 완료 - 저장소 초기화');
  } catch (error) {
    console.error('저장소 초기화 실패:', error);
  }
};

/**
 * 현재 로그인한 사용자 닉네임 조회
 * @returns {string|null} 닉네임 또는 null
 */
export const getCurrentUserNickname = () => {
  const user = getUser();
  return user ? user.nickname : null;
};

/**
 * 현재 로그인한 사용자 이메일 조회
 * @returns {string|null} 이메일 또는 null
 */
export const getCurrentUserEmail = () => {
  const user = getUser();
  return user ? user.email : null;
};
