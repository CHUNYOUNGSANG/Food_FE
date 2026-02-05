/**
 * HTTP 클라이언트 유틸리티
 * fetch API를 래핑하여 공통 에러 처리 및 헤더 관리
 */

import API_CONFIG from '../config/api-config.js';
import {
  getMemberId,
  getToken,
  setToken,
  getRefreshToken,
  setRefreshToken,
  clearStorage,
} from './storage.js';

class HttpClient {
  constructor() {
    this._isRefreshing = false;
    this._refreshPromise = null;
  }

  /**
   * 토큰 갱신
   * @returns {Promise<boolean>} 갱신 성공 여부
   */
  async _refreshAccessToken() {
    // 이미 갱신 중이면 기존 Promise 재사용
    if (this._isRefreshing) {
      return this._refreshPromise;
    }

    this._isRefreshing = true;
    this._refreshPromise = (async () => {
      try {
        const refreshToken = getRefreshToken();
        if (!refreshToken) {
          return false;
        }

        const response = await fetch(
          `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.MEMBER_REFRESH}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
          },
        );

        if (!response.ok) {
          return false;
        }

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
  }

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
        // JWT 토큰
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    };

    try {
      console.log(`[HTTP ${config.method || 'GET'}] ${url}`);

      let response = await fetch(`${API_CONFIG.BASE_URL}${url}`, config);

      // 401 Unauthorized - 토큰 갱신 시도
      if (response.status === 401) {
        console.log('[HTTP] 401 - 토큰 갱신 시도');
        const refreshed = await this._refreshAccessToken();

        if (refreshed) {
          // 갱신된 토큰으로 원래 요청 재시도
          const newToken = getToken();
          config.headers = {
            ...config.headers,
            Authorization: `Bearer ${newToken}`,
          };
          response = await fetch(`${API_CONFIG.BASE_URL}${url}`, config);
        } else {
          // 갱신 실패 - 로그아웃 처리
          console.error('[HTTP] 토큰 갱신 실패 - 로그인 페이지로 이동');
          clearStorage();
          window.location.href = '/pages/auth/login.html';
          throw new Error('인증이 만료되었습니다. 다시 로그인해주세요.');
        }
      }

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
