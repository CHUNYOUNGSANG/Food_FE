/**
 * 홈 페이지
 * 최근 게시글 표시
 */

import { getAllPosts } from '../services/post-service.js';

/**
 * 페이지 초기화
 */
const init = async () => {
  await loadRecentPosts();
};

/**
 * 최근 게시글 로드
 */
const loadRecentPosts = async () => {
  const postsGrid = document.getElementById('recentPostsGrid');
  if (!postsGrid) return;

  try {
    // 모든 게시글 가져오기
    const posts = await getAllPosts();

    // 최근 8개만 표시
    const recentPosts = posts.slice(0, 8);

    // 게시글 렌더링
    postsGrid.innerHTML = recentPosts.map((post) => createPostCard(post)).join('');
  } catch (error) {
    console.error('최근 게시글 로드 실패:', error);
    postsGrid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 2rem; color: var(--gray-600);">
        게시글을 불러오는데 실패했습니다.
      </div>
    `;
  }
};

/**
 * 게시글 카드 생성
 */
const createPostCard = (post) => {
  // 이미지 URL 처리 - 백엔드는 images[].fileUrl 사용
  let imageUrl = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23f0f0f0" width="400" height="300"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="24" fill="%23999"%3E이미지 없음%3C/text%3E%3C/svg%3E';

  if (post.images && post.images.length > 0) {
    // images가 객체 배열: [{fileUrl: '...'}]
    const firstImage = post.images[0];
    const imgSrc = typeof firstImage === 'string' ? firstImage : firstImage.fileUrl;

    if (imgSrc) {
      imageUrl = imgSrc.startsWith('http') || imgSrc.startsWith('data:')
        ? imgSrc
        : `http://localhost:8080${imgSrc}`;
    }
  } else if (post.imageUrl) {
    // 단일 imageUrl 필드가 있는 경우
    imageUrl = post.imageUrl.startsWith('http') || post.imageUrl.startsWith('data:')
      ? post.imageUrl
      : `http://localhost:8080${post.imageUrl}`;
  }

  const rating = post.rating || 0;
  const stars = '⭐'.repeat(Math.round(rating));
  const category = post.foodCategory || post.category || '기타';
  const address = post.restaurantAddress || post.address || '주소 정보 없음';

  return `
    <a href="/pages/posts/post-detail.html?id=${post.id}" class="post-card">
      <div class="post-card-image">
        <img src="${imageUrl}" alt="${post.title}" onerror="this.onerror=null;" />
        <div class="post-card-badge">${category}</div>
      </div>
      <div class="post-card-content">
        <h3 class="post-card-title">${post.title}</h3>
        <p class="post-card-address">${address}</p>
        <div class="post-card-rating">
          <span class="stars">${stars}</span>
          <span class="rating-value">${rating.toFixed(1)}</span>
        </div>
        <div class="post-card-meta">
          <span class="meta-item">
            ❤️ ${post.likeCount || 0}
          </span>
          <span class="meta-item">
            💬 ${post.commentCount || 0}
          </span>
        </div>
      </div>
    </a>
  `;
};

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', init);
