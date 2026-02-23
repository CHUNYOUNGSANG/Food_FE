/**
 * 헤더 컴포넌트
 * 로그인 상태에 따라 동적으로 헤더 렌더링
 */

import { isLoggedIn, getUser, clearStorage } from '../utils/storage.js';
import { resolveImageUrl } from '../utils/image-url.js';

/**
 * 헤더 렌더링
 */
export const renderHeader = () => {
  const headerElement = document.getElementById('header');
  if (!headerElement) return;

  const loggedIn = isLoggedIn();
  const user = getUser();
  const profileImageUrl = user?.profileImage
    ? resolveImageUrl(user.profileImage)
    : '';

  const headerHTML = `
    <div class="header-container">
      <a href="/index.html" class="site-logo">
        <span>🍽️ 파인잇</span>
      </a>

      <div class="header-search">
        <form class="search-form" id="headerSearchForm">
          <input
            type="text"
            class="search-input"
            placeholder="맛집을 검색해보세요..."
            id="headerSearchInput"
          />
          <button type="submit" class="search-button">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <circle cx="8.5" cy="8.5" r="6" stroke="currentColor" stroke-width="2"/>
              <path d="M13 13L17 17" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>
        </form>
      </div>

      <div class="user-menu">
        ${
          loggedIn
            ? `
          <div class="user-profile-wrapper">
            <button id="userProfileBtn" class="user-profile-button">
              <span class="user-nickname-text">👤 ${user.nickname}님</span>
              <span class="dropdown-arrow">▼</span>
            </button>
            <div id="userDropdown" class="user-dropdown" style="display: none;">
              <div class="dropdown-header">
                <div class="dropdown-avatar ${user.profileImage ? 'has-image' : ''}">
                  ${
                    profileImageUrl
                      ? `<img src="${profileImageUrl}" alt="${user.nickname}" />`
                      : user.nickname ? user.nickname.charAt(0).toUpperCase() : '?'
                  }
                </div>
                <div class="dropdown-info">
                  <div class="dropdown-nickname-row">
                    <span class="dropdown-nickname">${user.nickname}님</span>
                    <a href="/pages/my-page/my-posts.html" class="dropdown-mypage-link">마이페이지</a>
                  </div>
                  <div class="dropdown-email">${user.email || ''}</div>
                </div>
              </div>
              <div class="dropdown-menu">
                <a href="/pages/posts/post-create.html" class="dropdown-item">게시글 작성</a>
                <a href="/pages/my-page/my-posts.html" class="dropdown-item">내 게시글</a>
              </div>
            </div>
          </div>
          <button id="logoutBtn" class="btn btn-outline btn-small">
            로그아웃
          </button>
        `
            : `
          <a href="/pages/auth/login.html" class="btn btn-outline btn-small">
            로그인
          </a>
          <a href="/pages/auth/signup.html" class="btn btn-primary btn-small">
            회원가입
          </a>
        `
        }
      </div>
    </div>
  `;

  headerElement.innerHTML = headerHTML;
  headerElement.className = 'site-header';

  // 이벤트 리스너 추가
  attachEventListeners();
};

/**
 * 이벤트 리스너 추가
 */
const attachEventListeners = () => {
  // 검색 폼 처리
  const searchForm = document.getElementById('headerSearchForm');
  if (searchForm) {
    searchForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const searchInput = document.getElementById('headerSearchInput');
      const searchQuery = searchInput.value.trim();

      if (searchQuery) {
        // 게시글 목록 페이지로 이동하면서 검색어 전달
        window.location.href = `/pages/posts/post-list.html?search=${encodeURIComponent(searchQuery)}`;
      }
    });
  }

  // 사용자 프로필 드롭다운
  const userProfileBtn = document.getElementById('userProfileBtn');
  const userDropdown = document.getElementById('userDropdown');

  if (userProfileBtn && userDropdown) {
    userProfileBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isVisible = userDropdown.style.display === 'block';
      userDropdown.style.display = isVisible ? 'none' : 'block';
    });

    // 드롭다운 외부 클릭 시 닫기
    document.addEventListener('click', (e) => {
      if (!userProfileBtn.contains(e.target) && !userDropdown.contains(e.target)) {
        userDropdown.style.display = 'none';
      }
    });
  }

  // 로그아웃 버튼
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogout);
  }
};

/**
 * 로그아웃 처리
 */
const handleLogout = () => {
  if (confirm('로그아웃 하시겠습니까?')) {
    clearStorage();
    alert('로그아웃되었습니다');
    window.location.href = '/index.html';
  }
};

// 페이지 로드 시 헤더 렌더링
document.addEventListener('DOMContentLoaded', renderHeader);
