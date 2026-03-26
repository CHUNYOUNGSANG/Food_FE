/**
 * 헤더 컴포넌트
 * 로그인 상태에 따라 동적으로 헤더 렌더링
 */

import { isLoggedIn, getUser, clearStorage, isAdmin } from '../utils/storage.js';
import { resolveImageUrl } from '../utils/image-url.js';

/**
 * 헤더 렌더링
 */
export const renderHeader = () => {
  const headerElement = document.getElementById('header');
  if (!headerElement) return;

  const loggedIn = isLoggedIn();
  const user = getUser();
  const admin = isAdmin();
  const mypageUrl = admin ? '/pages/admin/admin-page.html' : '/pages/my-page/my-posts.html';
  const mypageLabel = admin ? '관리자페이지' : '마이페이지';
  const profileImageUrl = user?.profileImage
    ? resolveImageUrl(user.profileImage)
    : '';

  const headerHTML = `
    <div class="header-container">
      <a href="/index.html" class="site-logo">
        <div class="logo-icon">
          <i class="ri-restaurant-2-fill"></i>
        </div>
        <span class="logo-text">파인잇</span>
      </a>

      <form class="header-search-form" id="heroSearchForm">
        <input type="text" class="header-search-input" placeholder="지역, 음식 또는 식당명을 검색하세요" />
        <button type="submit" class="header-search-btn">
          <i class="ri-search-line"></i>
        </button>
      </form>

      <nav class="header-inline-nav" aria-label="주요 메뉴">
        <a href="/pages/posts/post-list.html" class="header-inline-link">게시글 목록</a>
        <a href="/pages/restaurants/restaurant-list.html" class="header-inline-link">맛집 목록</a>
      </nav>

      <div class="user-menu">
        ${!admin ? `
        <a href="/pages/posts/post-create.html" class="btn-write">
          <i class="ri-edit-2-line"></i>리뷰 작성
        </a>` : ''}
        ${
          loggedIn
            ? `
          <div class="user-profile-wrapper">
            <button id="userProfileBtn" class="user-profile-button">
              <span class="user-nickname-text">
                ${
                  profileImageUrl
                    ? `<img src="${profileImageUrl}" alt="${user.nickname}" class="profile-avatar-img" />`
                    : `<span class="profile-avatar-initial">${user.nickname ? user.nickname.charAt(0).toUpperCase() : '?'}</span>`
                }
                ${user.nickname}님
              </span>
              <span class="dropdown-arrow">▾</span>
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
                    <a href="${mypageUrl}" class="dropdown-mypage-link">${mypageLabel}</a>
                  </div>
                  <div class="dropdown-email">${user.email || ''}</div>
                </div>
              </div>
              <div class="dropdown-menu">
                ${!admin ? `<a href="/pages/posts/post-create.html" class="dropdown-item">리뷰 작성</a>` : ''}
                ${!admin ? `<a href="${mypageUrl}" class="dropdown-item">내 리뷰</a>` : ''}
                <button id="logoutBtn" class="dropdown-item dropdown-logout-btn" type="button">로그아웃</button>
              </div>
            </div>
          </div>
        `
            : `
          <a href="/pages/auth/login.html" class="btn-header-outline">
            로그인
          </a>
          <a href="/pages/auth/signup.html" class="btn-header-primary">
            회원가입
          </a>
        `
        }
      </div>
    </div>
  `;

  headerElement.innerHTML = headerHTML;
  headerElement.className = 'site-header';

  attachEventListeners();
};

/**
 * 이벤트 리스너 추가
 */
const attachEventListeners = () => {
  // 사용자 프로필 드롭다운
  const userProfileBtn = document.getElementById('userProfileBtn');
  const userDropdown = document.getElementById('userDropdown');

  if (userProfileBtn && userDropdown) {
    userProfileBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isVisible = userDropdown.style.display === 'block';
      userDropdown.style.display = isVisible ? 'none' : 'block';
    });

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
