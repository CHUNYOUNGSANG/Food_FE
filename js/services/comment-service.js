/**
 * 댓글 관련 API 서비스
 */

import httpClient from '../utils/http-client.js';
import API_CONFIG from '../config/api-config.js';

/**
 * 게시글의 댓글 목록 조회
 * @param {number} postId - 게시글 ID
 * @returns {Promise<Array>} 댓글 목록
 */
export const getCommentsByPost = async (postId) => {
  try {
    const response = await httpClient.get(
      API_CONFIG.ENDPOINTS.COMMENTS(postId),
    );
    return response;
  } catch (error) {
    console.error('댓글 목록 조회 실패:', error);
    throw error;
  }
};

/**
 * 댓글 작성
 * @param {number} postId - 게시글 ID
 * @param {Object} data - 댓글 데이터 { content, parentCommentId? }
 * @returns {Promise<Object>} 생성된 댓글 정보
 */
export const createComment = async (postId, data) => {
  try {
    const response = await httpClient.post(
      API_CONFIG.ENDPOINTS.COMMENTS(postId),
      data,
    );
    return response;
  } catch (error) {
    console.error('댓글 작성 실패:', error);
    throw error;
  }
};

/**
 * 댓글 수정
 * @param {number} postId - 게시글 ID
 * @param {number} commentId - 댓글 ID
 * @param {Object} data - 수정할 데이터 { content }
 * @returns {Promise<Object>} 수정된 댓글 정보
 */
export const updateComment = async (postId, commentId, data) => {
  try {
    const response = await httpClient.put(
      API_CONFIG.ENDPOINTS.COMMENT_DETAIL(postId, commentId),
      data,
    );
    return response;
  } catch (error) {
    console.error('댓글 수정 실패:', error);
    throw error;
  }
};

/**
 * 댓글 삭제
 * @param {number} postId - 게시글 ID
 * @param {number} commentId - 댓글 ID
 * @returns {Promise}
 */
export const deleteComment = async (postId, commentId) => {
  try {
    await httpClient.delete(
      API_CONFIG.ENDPOINTS.COMMENT_DETAIL(postId, commentId),
    );
  } catch (error) {
    console.error('댓글 삭제 실패:', error);
    throw error;
  }
};

/**
 * 회원의 댓글 목록 조회
 * @param {number} memberId - 회원 ID
 * @returns {Promise<Array>} 댓글 목록
 */
export const getCommentsByMember = async (memberId) => {
  try {
    const response = await httpClient.get(
      API_CONFIG.ENDPOINTS.COMMENTS_BY_MEMBER(memberId),
    );
    return response;
  } catch (error) {
    console.error('회원 댓글 조회 실패:', error);
    throw error;
  }
};
