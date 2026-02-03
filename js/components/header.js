/**
 * 헤더 컴포넌트
 * 로그인 상태에 따라 동적으로 헤더 렌더링
 */

import { isLoggedIn, getUser, clearStorage } from '../utils/storage.js';

/**
 * 헤더 렌더링
 */
export const renderHeader = () => {
  const headerElement = document.getElementById('header');
  if (!headerElement) return;

  const loggedIn = isLoggedIn();
  const user = getUser();

  const headerHTML = `
    <div class="header-container">
      <a href="/index.html" class="site-logo">
        🍽️ 맛집 리뷰
      </a>
      
      <nav class="site-nav" id="siteNav">
        <a href="/index.html" class="nav-link ${isCurrentPage('/index.html') ? 'active' : ''}">
          홈
        </a>
        <a href="/pages/posts/post-list.html" class="nav-link ${isCurrentPage('/pages/posts/post-list.html') ? 'active' : ''}">
          게시글
        </a>
        ${
          loggedIn
            ? `
          <a href="/pages/my-page/my-posts.html" class="nav-link ${isCurrentPage('/pages/my-page/') ? 'active' : ''}">
            마이페이지
          </a>
        `
            : ''
        }
      </nav>
      
      <div class="user-menu">
        ${
          loggedIn
            ? `
          <span class="user-nickname">👤 ${user.nickname}님</span>
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
      
      <button class="mobile-menu-btn" id="mobileMenuBtn">
        ☰
      </button>
    </div>
  `;

  headerElement.innerHTML = headerHTML;
  headerElement.className = 'site-header';

  // 이벤트 리스너 추가
  attachEventListeners();
};

/**
 * 현재 페이지 확인
 */
const isCurrentPage = (path) => {
  return window.location.pathname.includes(path);
};

/**
 * 이벤트 리스너 추가
 */
const attachEventListeners = () => {
  // 모바일 메뉴 토글
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const siteNav = document.getElementById('siteNav');

  if (mobileMenuBtn && siteNav) {
    mobileMenuBtn.addEventListener('click', () => {
      siteNav.classList.toggle('active');
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
