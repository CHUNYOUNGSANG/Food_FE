/**
 * HTTP 클라이언트 유틸리티
 * fetch API를 래핑하여 공통 에러 처리 및 헤더 관리
 */

import API_CONFIG from '../config/api-config.js';
import { getMemberId, getToken } from './storage.js';

class HttpClient {
  /**
   * HTTP 요청 공통 처리
   * @param {string} url - API 엔드포인트
   * @param {Object} options - fetch 옵션
   * @returns {Promise} 응답 데이터
   */
  async request(url, options = {}) {
    const memberId = getMemberId();
    const token = getToken();

    // 기본 설정 병합
    const config = {
      ...options,
      headers: {
        ...API_CONFIG.HEADERS,
        ...options.headers,
        // Member-Id 헤더 추가
        ...(memberId && { 'Member-Id': memberId.toString() }),
        // 향후 JWT 토큰 사용 시
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    };

    try {
      console.log(`[HTTP ${config.method || 'GET'}] ${url}`);

      const response = await fetch(`${API_CONFIG.BASE_URL}${url}`, config);

      // 204 No Content 처리
      if (response.status === 204) {
        console.log('[HTTP] 204 No Content');
        return null;
      }

      // JSON 파싱
      const data = await response.json();

      // 에러 응답 처리
      if (!response.ok) {
        console.error('[HTTP Error]', data);
        throw new Error(data.message || `HTTP Error: ${response.status}`);
      }

      console.log('[HTTP Success]', data);
      return data;
    } catch (error) {
      console.error('[HTTP Error]', error);

      // 네트워크 에러 처리
      if (error.name === 'TypeError') {
        throw new Error('서버에 연결할 수 없습니다. 네트워크를 확인해주세요.');
      }

      throw error;
    }
  }

  /**
   * GET 요청
   * @param {string} url - API 엔드포인트
   * @param {Object} options - 추가 옵션
   * @returns {Promise} 응답 데이터
   */
  get(url, options = {}) {
    return this.request(url, {
      ...options,
      method: 'GET',
    });
  }

  /**
   * POST 요청
   * @param {string} url - API 엔드포인트
   * @param {Object} data - 요청 데이터
   * @param {Object} options - 추가 옵션
   * @returns {Promise} 응답 데이터
   */
  post(url, data, options = {}) {
    return this.request(url, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * PUT 요청
   * @param {string} url - API 엔드포인트
   * @param {Object} data - 요청 데이터
   * @param {Object} options - 추가 옵션
   * @returns {Promise} 응답 데이터
   */
  put(url, data, options = {}) {
    return this.request(url, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  /**
   * DELETE 요청
   * @param {string} url - API 엔드포인트
   * @param {Object} options - 추가 옵션
   * @returns {Promise} 응답 데이터
   */
  delete(url, options = {}) {
    return this.request(url, {
      ...options,
      method: 'DELETE',
    });
  }
}

// 싱글톤 인스턴스 export
export default new HttpClient();
