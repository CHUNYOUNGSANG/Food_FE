/**
 * 좋아요한 게시글 페이지 로직
 */

import { getLikedPostsByMember } from '../../services/post-like-service.js';
import { getMemberId } from '../../utils/storage.js';
import { hydrateAvatars } from '../../utils/avatar-loader.js';

// DOM 요소
const loading = document.getElementById('loading');
const likedPostsGrid = document.getElementById('likedPostsGrid');
const emptyState = document.getElementById('emptyState');
const totalLikes = document.getElementById('totalLikes');
const todayLikes = document.getElementById('todayLikes');

// 상태
let currentMemberId = null;
let likedPosts = [];

/**
 * 초기화
 */
const init = async () => {
  // 로그인 확인
  currentMemberId = getMemberId();
  if (!currentMemberId) {
    alert('로그인이 필요합니다.');
    window.location.href = '/pages/auth/login.html';
    return;
  }

  // 좋아요한 게시글 로드
  await loadLikedPosts();
};

/**
 * 좋아요한 게시글 로드
 */
const loadLikedPosts = async () => {
  try {
    showLoading();

    const likedData = await getLikedPostsByMember(currentMemberId);
    likedPosts = likedData;

    // 통계 표시
    totalLikes.textContent = likedData.length;

    // 오늘 좋아요한 게시글 개수
    const today = new Date().toISOString().split('T')[0];
    const todayCount = likedData.filter((like) => {
      if (!like.createdAt) return false;
      const likeDate = like.createdAt.split(' ')[0];
      return likeDate === today;
    }).length;
    todayLikes.textContent = todayCount;

    // 게시글 렌더링
    renderLikedPosts(likedData);
  } catch (error) {
    console.error('좋아요한 게시글 로드 실패:', error);
    showEmptyState();
  } finally {
    hideLoading();
  }
};

/**
 * 좋아요한 게시글 렌더링
 */
const renderLikedPosts = (likedData) => {
  if (likedData.length === 0) {
    showEmptyState();
    return;
  }

  // 좋아요 데이터를 게시글 카드 형식으로 변환
  likedPostsGrid.innerHTML = likedData
    .map((like) => createLikedPostCard(like))
    .join('');

  likedPostsGrid.style.display = 'grid';
  emptyState.style.display = 'none';
  hydrateAvatars(likedPostsGrid);
};

/**
 * 좋아요한 게시글 카드 생성
 */
const createLikedPostCard = (like) => {
  return `
    <a href="/pages/posts/post-detail.html?id=${like.postId}" class="post-card" style="text-decoration: none; color: inherit; display: block; background: var(--white); border-radius: var(--radius-lg); overflow: hidden; border: 1px solid var(--gray-200); transition: all 0.3s; box-shadow: var(--shadow-md);">
      <div style="padding: var(--spacing-xl);">
        <div style="display: flex; align-items: center; gap: var(--spacing-sm); margin-bottom: var(--spacing-md);">
          <span style="background: var(--error-light); color: var(--error-color); padding: var(--spacing-xs) var(--spacing-sm); border-radius: var(--radius-md); font-size: var(--font-xs); font-weight: var(--font-semibold);">
            ❤️ 좋아요
          </span>
          ${formatDate(like.createdAt)}
        </div>

        <h3 style="font-size: var(--font-lg); font-weight: var(--font-bold); color: var(--gray-900); margin-bottom: var(--spacing-md); line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
          ${escapeHtml(like.title)}
        </h3>

        <div style="display: flex; align-items: center; justify-content: space-between; padding-top: var(--spacing-md); border-top: 1px solid var(--gray-200);">
          <div style="display: flex; align-items: center; gap: var(--spacing-sm);">
            <div class="author-avatar" data-member-id="${like.memberId}">
              ${like.nickname ? like.nickname.charAt(0).toUpperCase() : '?'}
            </div>
            <span style="font-size: var(--font-sm); color: var(--gray-600); font-weight: var(--font-medium);">
              ${escapeHtml(like.nickname || '익명')}
            </span>
          </div>

          <span style="color: var(--primary-color); font-size: var(--font-sm); font-weight: var(--font-semibold);">
            자세히 보기 →
          </span>
        </div>
      </div>
    </a>
  `;
};

/**
 * 날짜 포맷팅
 */
const formatDate = (dateString) => {
  if (!dateString) return '';

  const date = new Date(dateString.replace(' ', 'T'));
  const now = new Date();
  const diff = Math.floor((now - date) / 1000); // 초 단위

  if (diff < 60) return '<span style="font-size: var(--font-xs); color: var(--gray-500);">방금 전</span>';
  if (diff < 3600) return `<span style="font-size: var(--font-xs); color: var(--gray-500);">${Math.floor(diff / 60)}분 전</span>`;
  if (diff < 86400) return `<span style="font-size: var(--font-xs); color: var(--gray-500);">${Math.floor(diff / 3600)}시간 전</span>`;
  if (diff < 604800) return `<span style="font-size: var(--font-xs); color: var(--gray-500);">${Math.floor(diff / 86400)}일 전</span>`;

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `<span style="font-size: var(--font-xs); color: var(--gray-500);">${year}-${month}-${day}</span>`;
};

/**
 * HTML 이스케이프
 */
const escapeHtml = (text) => {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};

/**
 * 로딩 표시
 */
const showLoading = () => {
  loading.style.display = 'block';
  likedPostsGrid.style.display = 'none';
  emptyState.style.display = 'none';
};

/**
 * 로딩 숨김
 */
const hideLoading = () => {
  loading.style.display = 'none';
};

/**
 * 빈 상태 표시
 */
const showEmptyState = () => {
  likedPostsGrid.style.display = 'none';
  emptyState.style.display = 'block';
};

// 초기화 실행
init();
