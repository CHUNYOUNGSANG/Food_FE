/**
 * 회원 관련 API 서비스
 */

import httpClient from '../utils/http-client.js';
import API_CONFIG from '../config/api-config.js';

/**
 * 전체 회원 목록 조회
 * @returns {Promise<Array>} 회원 목록
 */
export const getAllMembers = async () => {
  try {
    const response = await httpClient.get(API_CONFIG.ENDPOINTS.MEMBERS);
    const unwrapped = response?.data ?? response?.result ?? response?.payload ?? response;
    if (Array.isArray(unwrapped)) return unwrapped;
    if (Array.isArray(unwrapped?.content)) return unwrapped.content;
    return [];
  } catch (error) {
    console.warn('회원 목록 조회 불가 (백엔드 /api/members 500 에러):', error.message);
    return [];
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
 * @param {Object|FormData} data - 수정할 데이터 (JSON 또는 FormData)
 * @returns {Promise<Object>} 수정된 회원 정보
 */
export const updateMember = async (memberId, data) => {
  try {
    // FormData인 경우 putFormData 사용
    if (data instanceof FormData) {
      const response = await httpClient.putFormData(
        API_CONFIG.ENDPOINTS.MEMBER_UPDATE(memberId),
        data,
      );
      return response;
    }
    const response = await httpClient.put(
      API_CONFIG.ENDPOINTS.MEMBER_UPDATE(memberId),
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
    await httpClient.delete(API_CONFIG.ENDPOINTS.MEMBER_DELETE(memberId));
  } catch (error) {
    console.error('회원 탈퇴 실패:', error);
    throw error;
  }
};
