/**
 * 댓글 좋아요 관련 API 서비스
 */

import httpClient from '../utils/http-client.js';
import API_CONFIG from '../config/api-config.js';

/**
 * 댓글 좋아요 추가
 * @param {number} commentId - 댓글 ID
 * @returns {Promise<Object>} 좋아요 정보
 */
export const addCommentLike = async (commentId) => {
  try {
    const response = await httpClient.post(
      API_CONFIG.ENDPOINTS.COMMENT_LIKE(commentId),
    );
    return response;
  } catch (error) {
    console.error('댓글 좋아요 추가 실패:', error);
    throw error;
  }
};

/**
 * 댓글 좋아요 취소
 * @param {number} commentId - 댓글 ID
 * @returns {Promise}
 */
export const removeCommentLike = async (commentId) => {
  try {
    await httpClient.delete(API_CONFIG.ENDPOINTS.COMMENT_LIKE(commentId));
  } catch (error) {
    console.error('댓글 좋아요 취소 실패:', error);
    throw error;
  }
};

/**
 * 댓글 좋아요 토글 (있으면 취소, 없으면 추가)
 * @param {number} commentId - 댓글 ID
 * @returns {Promise<boolean>} 좋아요 상태 (true: 추가, false: 취소)
 */
export const toggleCommentLike = async (commentId) => {
  try {
    const response = await httpClient.put(
      API_CONFIG.ENDPOINTS.COMMENT_LIKE_TOGGLE(commentId),
    );
    return response; // true or false
  } catch (error) {
    console.error('댓글 좋아요 토글 실패:', error);
    throw error;
  }
};

/**
 * 댓글 좋아요 개수 및 사용자의 좋아요 여부 조회
 * @param {number} commentId - 댓글 ID
 * @param {number} memberId - 회원 ID (선택)
 * @returns {Promise<Object>} { commentId, likeCount, isLiked }
 */
export const getCommentLikeCount = async (commentId, memberId = null) => {
  try {
    const url = API_CONFIG.ENDPOINTS.COMMENT_LIKE_COUNT(commentId);

    const response = await httpClient.get(url);

    return response;
  } catch (error) {
    console.error('댓글 좋아요 정보 조회 실패:', error);
    throw error;
  }
};

/**
 * 특정 회원이 좋아요한 댓글 목록 조회
 * @param {number} memberId - 회원 ID
 * @returns {Promise<Array>} 좋아요한 댓글 목록
 */
export const getLikedCommentsByMember = async (memberId) => {
  try {
    const response = await httpClient.get(
      `/api/comments/likes/member/${memberId}`,
    );
    return response;
  } catch (error) {
    console.error('좋아요한 댓글 조회 실패:', error);
    throw error;
  }
};

/**
 * 특정 댓글의 좋아요 목록 조회 (누가 좋아요 눌렀는지)
 * @param {number} commentId - 댓글 ID
 * @returns {Promise<Array>} 좋아요 목록
 */
export const getLikesByComment = async (commentId) => {
  try {
    const response = await httpClient.get(
      API_CONFIG.ENDPOINTS.COMMENT_LIKE(commentId),
    );
    return response;
  } catch (error) {
    console.error('댓글 좋아요 목록 조회 실패:', error);
    throw error;
  }
};
