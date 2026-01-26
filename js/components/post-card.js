/**
 * 게시글 카드 컴포넌트
 * 게시글 데이터를 카드 형태로 렌더링
 */

import { getRelativeTime } from '../utils/date-formatter.js';

/**
 * 게시글 카드 생성
 * @param {Object} post - 게시글 데이터
 * @returns {string} HTML 문자열
 */
export const createPostCard = (post) => {
  const {
    id,
    title,
    content,
    restaurantName,
    foodCategory,
    rating,
    imageUrl,
    memberNickname,
    createdAt,
    viewCount = 0,
  } = post;

  // 카테고리 클래스 매핑
  const categoryClass =
    {
      한식: 'korean',
      중식: 'chinese',
      일식: 'japanese',
      양식: 'western',
      카페: 'cafe',
    }[foodCategory] || '';

  // 카테고리 이모지
  const categoryEmoji =
    {
      한식: '🌶️',
      중식: '🥟',
      일식: '🍱',
      양식: '🍝',
      카페: '☕',
    }[foodCategory] || '🍽️';

  // 기본 이미지 처리
  const cardImage = imageUrl
    ? `<img src="${imageUrl}" alt="${title}" onerror="this.style.display='none'">`
    : '';

  return `
        <div class="post-card" onclick="location.href='/pages/posts/post-detail.html?id=${id}'">
            <div class="post-card-image">
                ${cardImage}
                ${
                  foodCategory
                    ? `
                    <span class="category-badge ${categoryClass}">
                        ${categoryEmoji} ${foodCategory}
                    </span>
                `
                    : ''
                }
                ${
                  rating
                    ? `
                    <span class="rating-badge">
                        ⭐ ${rating}
                    </span>
                `
                    : ''
                }
            </div>
            
            <div class="post-card-body">
                <h3 class="post-card-title">${escapeHtml(title)}</h3>
                
                ${
                  restaurantName
                    ? `
                    <div class="post-card-restaurant">
                        📍 ${escapeHtml(restaurantName)}
                    </div>
                `
                    : ''
                }
                
                <p class="post-card-content">${escapeHtml(content)}</p>
                
                <div class="post-card-footer">
                    <div class="post-card-author">
                        <div class="author-avatar">
                            ${memberNickname ? memberNickname.charAt(0).toUpperCase() : '?'}
                        </div>
                        <span class="author-name">${escapeHtml(memberNickname || '익명')}</span>
                    </div>
                    
                    <div class="post-card-meta">
                        <span class="meta-item" title="조회수">
                            👁️ ${viewCount}
                        </span>
                        <span class="meta-item" title="작성일">
                            🕐 ${getRelativeTime(createdAt)}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    `;
};

/**
 * HTML 이스케이프 (XSS 방지)
 * @param {string} text - 이스케이프할 텍스트
 * @returns {string} 이스케이프된 텍스트
 */
const escapeHtml = (text) => {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};

/**
 * 여러 게시글 카드 생성
 * @param {Array} posts - 게시글 배열
 * @returns {string} HTML 문자열
 */
export const createPostCards = (posts) => {
  if (!posts || posts.length === 0) {
    return '';
  }

  return posts.map((post) => createPostCard(post)).join('');
};
