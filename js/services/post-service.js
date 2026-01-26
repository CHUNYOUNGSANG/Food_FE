/**
 * 게시글 관련 API 서비스
 */

import httpClient from '../utils/http-client.js';
import API_CONFIG from '../config/api-config.js';

/**
 * 모든 게시글 조회 (최신순)
 * @returns {Promise<Array>} 게시글 목록
 */
export const getAllPosts = async () => {
  try {
    const response = await httpClient.get(API_CONFIG.ENDPOINTS.POSTS);
    return response;
  } catch (error) {
    console.error('게시글 목록 조회 실패:', error);
    throw error;
  }
};

/**
 * 게시글 상세 조회
 * @param {number} postId - 게시글 ID
 * @returns {Promise<Object>} 게시글 정보
 */
export const getPost = async (postId) => {
  try {
    const response = await httpClient.get(
      API_CONFIG.ENDPOINTS.POST_DETAIL(postId),
    );
    return response;
  } catch (error) {
    console.error('게시글 조회 실패:', error);
    throw error;
  }
};

/**
 * 게시글 작성
 * @param {Object} data - 게시글 데이터
 * @returns {Promise<Object>} 생성된 게시글 정보
 */
export const createPost = async (data) => {
  try {
    const response = await httpClient.post(
      API_CONFIG.ENDPOINTS.POST_CREATE,
      data,
    );
    return response;
  } catch (error) {
    console.error('게시글 작성 실패:', error);
    throw error;
  }
};

/**
 * 게시글 수정
 * @param {number} postId - 게시글 ID
 * @param {Object} data - 수정할 데이터
 * @returns {Promise<Object>} 수정된 게시글 정보
 */
export const updatePost = async (postId, data) => {
  try {
    const response = await httpClient.put(
      API_CONFIG.ENDPOINTS.POST_UPDATE(postId),
      data,
    );
    return response;
  } catch (error) {
    console.error('게시글 수정 실패:', error);
    throw error;
  }
};

/**
 * 게시글 삭제
 * @param {number} postId - 게시글 ID
 * @returns {Promise}
 */
export const deletePost = async (postId) => {
  try {
    await httpClient.delete(API_CONFIG.ENDPOINTS.POST_DELETE(postId));
  } catch (error) {
    console.error('게시글 삭제 실패:', error);
    throw error;
  }
};

/**
 * 게시글 검색
 * @param {string} keyword - 검색 키워드
 * @returns {Promise<Array>} 검색 결과
 */
export const searchPosts = async (keyword) => {
  try {
    const response = await httpClient.get(
      `${API_CONFIG.ENDPOINTS.POSTS_SEARCH}?keyword=${encodeURIComponent(keyword)}`,
    );
    return response;
  } catch (error) {
    console.error('게시글 검색 실패:', error);
    throw error;
  }
};

/**
 * 카테고리별 게시글 조회
 * @param {string} category - 음식 카테고리
 * @returns {Promise<Array>} 게시글 목록
 */
export const getPostsByCategory = async (category) => {
  try {
    const response = await httpClient.get(
      API_CONFIG.ENDPOINTS.POSTS_BY_CATEGORY(category),
    );
    return response;
  } catch (error) {
    console.error('카테고리별 게시글 조회 실패:', error);
    throw error;
  }
};

/**
 * 특정 회원의 게시글 조회
 * @param {number} memberId - 회원 ID
 * @returns {Promise<Array>} 게시글 목록
 */
export const getPostsByMember = async (memberId) => {
  try {
    const response = await httpClient.get(
      API_CONFIG.ENDPOINTS.POSTS_BY_MEMBER(memberId),
    );
    return response;
  } catch (error) {
    console.error('회원 게시글 조회 실패:', error);
    throw error;
  }
};
