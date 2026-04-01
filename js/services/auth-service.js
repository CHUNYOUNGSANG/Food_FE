/**
 * 인증 관련 API 서비스
 */

import httpClient from '../utils/http-client.js';
import API_CONFIG from '../config/api-config.js';
import {
  setMemberId,
  setMemberNickname,
  setMemberEmail,
  setMemberProfileImage,
  setMemberRole,
  setToken,
  setRefreshToken,
} from '../utils/storage.js';

export const persistLoginResponse = (response) => {
  if (!response?.accessToken || !response?.refreshToken || !response?.member) {
    throw new Error('로그인 응답 형식이 올바르지 않습니다.');
  }

  setToken(response.accessToken);
  setRefreshToken(response.refreshToken);
  setMemberId(response.member.id);
  setMemberNickname(response.member.nickname);
  setMemberEmail(response.member.email);
  if (response.member.role) {
    setMemberRole(response.member.role);
  }
  if (response.member.profileImage) {
    setMemberProfileImage(response.member.profileImage);
  }

  return response;
};

/**
 * 회원가입
 * @param {Object} data - 회원가입 데이터
 * @returns {Promise<Object>} 생성된 회원 정보
 */
export const signUp = async (data) => {
  try {
    const response =
      data instanceof FormData
        ? await httpClient.postFormData(API_CONFIG.ENDPOINTS.MEMBER_SIGNUP, data)
        : await httpClient.post(API_CONFIG.ENDPOINTS.MEMBER_SIGNUP, data);
    return response;
  } catch (error) {
    console.error('회원가입 실패:', error);
    throw error;
  }
};

/**
 * 🔥 로그인 (실제 로그인 API 사용)
 * @param {Object} credentials - { email, password }
 * @returns {Promise<Object>} 회원 정보
 */
export const login = async (credentials) => {
  try {
    const response = await httpClient.post(
      API_CONFIG.ENDPOINTS.MEMBER_LOGIN,
      credentials,
    );
    return persistLoginResponse(response);
  } catch (error) {
    console.error('로그인 실패:', error);
    throw error;
  }
};

/**
 * OAuth 인가 코드 로그인
 * @param {string} provider - OAuth 제공자
 * @param {string} code - 인가 코드
 * @returns {Promise<Object>} 회원 정보
 */
export const loginWithOAuthCode = async (provider, code) => {
  try {
    const response = await httpClient.get(
      `/oauth/${provider}?code=${encodeURIComponent(code)}`,
    );
    return persistLoginResponse(response);
  } catch (error) {
    console.error(`${provider} OAuth 로그인 실패:`, error);
    throw error;
  }
};

/**
 * 이메일 중복 확인
 * @param {string} email - 확인할 이메일
 * @returns {Promise<boolean>} 중복 여부 (true: 중복, false: 사용가능)
 */
export const checkEmailDuplicate = async (email) => {
  try {
    const response = await httpClient.get(
      `${API_CONFIG.ENDPOINTS.CHECK_EMAIL}?email=${encodeURIComponent(email)}`,
    );
    return response; // true면 중복, false면 사용 가능
  } catch (error) {
    console.error('이메일 중복 확인 실패:', error);
    throw error;
  }
};

/**
 * 닉네임 중복 확인
 * @param {string} nickname - 확인할 닉네임
 * @returns {Promise<boolean>} 중복 여부 (true: 중복, false: 사용가능)
 */
export const checkNicknameDuplicate = async (nickname) => {
  try {
    const response = await httpClient.get(
      `${API_CONFIG.ENDPOINTS.CHECK_NICKNAME}?nickname=${encodeURIComponent(nickname)}`,
    );
    return response; // true면 중복, false면 사용 가능
  } catch (error) {
    console.error('닉네임 중복 확인 실패:', error);
    throw error;
  }
};

/**
 * 회원 정보 조회
 * @param {number} memberId - 회원 ID
 * @returns {Promise<Object>} 회원 정보
 */
export const getMember = async (memberId) => {
  try {
    const response = await httpClient.get(
      API_CONFIG.ENDPOINTS.MEMBER_DETAIL(memberId),
    );
    return response;
  } catch (error) {
    console.error('회원 정보 조회 실패:', error);
    throw error;
  }
};

/**
 * 회원 정보 수정
 * @param {number} memberId - 회원 ID
 * @param {Object} data - 수정할 데이터
 * @returns {Promise<Object>} 수정된 회원 정보
 */
export const updateMember = async (memberId, data) => {
  try {
    const response = await httpClient.put(
      API_CONFIG.ENDPOINTS.MEMBER_DETAIL(memberId),
      data,
    );
    return response;
  } catch (error) {
    console.error('회원 정보 수정 실패:', error);
    throw error;
  }
};

/**
 * 회원 탈퇴
 * @param {number} memberId - 회원 ID
 * @returns {Promise}
 */
export const deleteMember = async (memberId) => {
  try {
    await httpClient.delete(API_CONFIG.ENDPOINTS.MEMBER_DETAIL(memberId));
  } catch (error) {
    console.error('회원 탈퇴 실패:', error);
    throw error;
  }
};
