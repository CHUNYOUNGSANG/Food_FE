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
                맛집 리뷰
            </a>
            
            <nav class="site-nav" id="siteNav">
                <a href="/index.html" class="nav-link ${isCurrentPage('/index.html') ? 'active' : ''}">
                    🏠 홈
                </a>
                <a href="/pages/posts/post-list.html" class="nav-link ${isCurrentPage('/pages/posts/post-list.html') ? 'active' : ''}">
                    📝 게시글
                </a>
                ${
                  loggedIn
                    ? `
                    <a href="/pages/my-page/my-posts.html" class="nav-link ${isCurrentPage('/pages/my-page/') ? 'active' : ''}">
                        💼 마이페이지
                    </a>
                `
                    : ''
                }
            </nav>
            
            <div class="user-menu">
                ${
                  loggedIn
                    ? `
                    <a href="/pages/posts/post-create.html" class="btn btn-primary">
                        ✍️ 글쓰기
                    </a>
                    <div class="user-profile" id="userProfile">
                        <div class="user-avatar">
                            ${user.nickname ? user.nickname.charAt(0).toUpperCase() : '😊'}
                        </div>
                        <span class="user-name">${user.nickname || '사용자'}</span>
                    </div>
                    <div class="user-dropdown" id="userDropdown" style="display: none;">
                        <a href="/pages/auth/profile.html" class="dropdown-item">
                            👤 프로필
                        </a>
                        <a href="/pages/my-page/my-posts.html" class="dropdown-item">
                            📝 내 게시글
                        </a>
                        <a href="/pages/my-page/liked-posts.html" class="dropdown-item">
                            ❤️ 좋아요한 글
                        </a>
                        <button id="logoutBtn" class="dropdown-item">
                            🚪 로그아웃
                        </button>
                    </div>
                `
                    : `
                    <a href="/pages/auth/login.html" class="btn btn-outline">
                        로그인
                    </a>
                    <a href="/pages/auth/signup.html" class="btn btn-primary">
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

  // 사용자 드롭다운 토글
  const userProfile = document.getElementById('userProfile');
  const userDropdown = document.getElementById('userDropdown');

  if (userProfile && userDropdown) {
    userProfile.addEventListener('click', () => {
      userDropdown.style.display =
        userDropdown.style.display === 'none' ? 'block' : 'none';
    });

    // 외부 클릭 시 드롭다운 닫기
    document.addEventListener('click', (e) => {
      if (!userProfile.contains(e.target) && !userDropdown.contains(e.target)) {
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
