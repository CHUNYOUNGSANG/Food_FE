/**
 * 홈 페이지
 */

import { getAllPosts } from '../services/post-service.js';
import { loginWithOAuthCode } from '../services/auth-service.js';
import {
  normalizeRestaurantListResponse,
  searchRestaurants,
} from '../services/restaurant-service.js';
import { getPostLikeCount } from '../services/post-like-service.js';
import { getCommentsByPost } from '../services/comment-service.js';
import { isAdmin } from '../utils/storage.js';
import { resolveImageUrl } from '../utils/image-url.js';
import { renderHeader } from '../components/header.js';

/**
 * 페이지 초기화
 */
const init = async () => {
  await handleOAuthCallback();
  initHeroSearch();
  await loadHomeData();
  if (isAdmin()) {
    const ctaBtn = document.getElementById('ctaWriteBtn');
    if (ctaBtn) ctaBtn.style.display = 'none';
  }
};

const handleOAuthCallback = async () => {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');

  if (!code) return;

  try {
    const response = await loginWithOAuthCode('kakao', code);
    const cleanedUrl = `${window.location.origin}${window.location.pathname}`;
    window.history.replaceState({}, document.title, cleanedUrl);
    renderHeader();

    if (response?.member?.role === 'ADMIN') {
      window.location.href = '/pages/admin/admin-page.html';
      return;
    }
  } catch (error) {
    console.error('카카오 로그인 처리 실패:', error);
    const cleanedUrl = `${window.location.origin}${window.location.pathname}`;
    window.history.replaceState({}, document.title, cleanedUrl);
    alert(error.message || '카카오 로그인에 실패했습니다.');
  }
};

/**
 * 히어로 검색창 초기화
 */
const initHeroSearch = () => {
  const form = document.getElementById('heroSearchForm');
  if (!form) return;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = form.querySelector('.hero-search-input');
    const query = input?.value.trim();
    if (query) {
      window.location.href = `/pages/posts/post-list.html?search=${encodeURIComponent(query)}`;
    }
  });
};

/**
 * 홈 데이터 로드
 */
const loadHomeData = async () => {
  const popularGrid = document.getElementById('popularPostsGrid');

  try {
    const posts = await getAllPosts();

    // 게시글 수 통계 업데이트
    const statEl = document.getElementById('statPostCount');
    if (statEl) {
      statEl.textContent = posts.length.toLocaleString();
    }

    renderPopularPosts(posts);
    loadRecommendedRestaurants(posts);
  } catch (error) {
    console.error('홈 데이터 로드 실패:', error);
    if (popularGrid) {
      popularGrid.innerHTML = `
        <div style="grid-column:1/-1;text-align:center;padding:2rem;color:#6b7280;">
          게시글을 불러오는데 실패했습니다.
        </div>
      `;
    }
  }
};

/**
 * 인기 게시글 렌더링 (viewCount 기준 상위 6개)
 */
const renderPopularPosts = (posts) => {
  const grid = document.getElementById('popularPostsGrid');
  if (!grid) return;

  const sorted = [...posts].sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0));
  const top6 = sorted.slice(0, 6);

  if (top6.length === 0) {
    grid.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:2rem;color:#6b7280;">
        아직 게시글이 없습니다.
      </div>
    `;
    return;
  }

  grid.innerHTML = top6.map((post) => createPopularPostCard(post)).join('');
  hydratePopularPostCounts(top6, grid);
};

/**
 * 인기 게시글 카드 좋아요/댓글 수 실시간 업데이트
 */
const hydratePopularPostCounts = async (posts, grid) => {
  await Promise.all(
    posts.map(async (post) => {
      const card = grid.querySelector(`[data-post-id="${post.id}"]`);
      if (!card) return;
      try {
        const [likeData, comments] = await Promise.all([
          getPostLikeCount(post.id),
          getCommentsByPost(post.id),
        ]);
        const likeEl = card.querySelector('.popular-like-count');
        const commentEl = card.querySelector('.popular-comment-count');
        if (likeEl) likeEl.textContent = likeData?.likeCount ?? 0;
        if (commentEl) commentEl.textContent = Array.isArray(comments) ? comments.length : 0;
      } catch (_) {
        // 카운트 로드 실패 시 초기값 유지
      }
    }),
  );
};

/**
 * 로드된 게시글 목록에서 해당 맛집의 첫 번째 이미지 URL 추출
 */
const getRestaurantFirstImage = (restaurantId, posts) => {
  if (!restaurantId || !posts?.length) return null;

  const post = posts.find((p) => {
    const rid = p.restaurant?.id ?? p.restaurantId;
    return rid != null && String(rid) === String(restaurantId) && p.images?.length > 0;
  });

  if (!post) return null;

  const firstImage = post.images[0];
  const imgSrc = typeof firstImage === 'string' ? firstImage : firstImage?.fileUrl;
  if (!imgSrc) return null;

  return resolveImageUrl(imgSrc);
};

/**
 * 추천 맛집 로드
 */
const loadRecommendedRestaurants = async (posts = []) => {
  const grid = document.getElementById('recommendGrid');
  if (!grid) return;

  try {
    let result = await searchRestaurants('', 0, 4);
    let items = normalizeRestaurantListResponse(result).content || [];
    if (!items.length) {
      result = await searchRestaurants('강남', 0, 4);
      items = normalizeRestaurantListResponse(result).content || [];
    }
    if (!items.length) {
      grid.innerHTML = `
        <div style="grid-column:1/-1;text-align:center;padding:2rem;color:#6b7280;">
          추천 맛집이 없습니다.
        </div>
      `;
      return;
    }

    const top4 = items.slice(0, 4);
    grid.innerHTML = top4
      .map((item) => createRestaurantCard(item, getRestaurantFirstImage(item?.id, posts)))
      .join('');
  } catch (error) {
    console.error('추천 맛집 로드 실패:', error);
    grid.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:2rem;color:#6b7280;">
        추천 맛집을 불러오지 못했습니다.
      </div>
    `;
  }
};

/**
 * 카테고리 정규화
 */
const normalizeCategory = (category) => {
  if (!category) return '';
  const text = String(category).trim();
  if (!text) return '';
  const parts = text.split('>').map((part) => part.trim()).filter(Boolean);
  return parts[parts.length - 1] || text;
};

/**
 * 게시글 이미지 URL 추출
 */
const getPostImageUrl = (post) => {
  const placeholder =
    'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23f3f4f6" width="400" height="300"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="20" fill="%23d1d5db"%3E🍽️%3C/text%3E%3C/svg%3E';

  if (post.images && post.images.length > 0) {
    const firstImage = post.images[0];
    const imgSrc = typeof firstImage === 'string' ? firstImage : firstImage.fileUrl;
    if (imgSrc) {
      return resolveImageUrl(imgSrc);
    }
  } else if (post.imageUrl) {
    return resolveImageUrl(post.imageUrl);
  }

  return placeholder;
};

/**
 * 인기 게시글 카드 생성
 */
const createPopularPostCard = (post) => {
  const imageUrl = getPostImageUrl(post);
  const category = normalizeCategory(post.restaurant?.category) || '미분류';
  const address = post.restaurant?.address || post.address || '';
  const author = post.author?.nickname || post.memberNickname || '익명';

  // 지역 태그 (주소 앞 두 단어)
  const locationTag = address
    ? address.split(' ').filter(Boolean).slice(0, 2).join(' ')
    : '';

  return `
    <a href="/pages/posts/post-detail.html?id=${post.id}" class="popular-post-card" data-post-id="${post.id}">
      <div class="popular-post-card-img">
        <img src="${imageUrl}" alt="${post.title || '게시글 이미지'}" onerror="this.onerror=null;" />
      </div>
      <div class="popular-post-card-body">
        <div class="popular-post-tags">
          <span class="popular-post-tag">#${category}</span>
          ${locationTag ? `<span class="popular-post-tag">#${locationTag}</span>` : ''}
        </div>
        <h3 class="popular-post-title">${post.title || '제목 없음'}</h3>
        <div class="popular-post-meta">
          <span class="popular-post-author">${author}</span>
          <div class="popular-post-stats">
            <span class="popular-post-stat">
              <i class="ri-heart-line"></i><span class="popular-like-count">${post.likeCount || 0}</span>
            </span>
            <span class="popular-post-stat">
              <i class="ri-chat-3-line"></i><span class="popular-comment-count">${post.commentCount || 0}</span>
            </span>
          </div>
        </div>
      </div>
    </a>
  `;
};

/**
 * 추천 맛집 카드 생성
 */
const createRestaurantCard = (restaurant, imageUrl = null) => {
  const name = restaurant?.name || '맛집명 없음';
  const address = restaurant?.address || '주소 정보 없음';
  const category =
    normalizeCategory(restaurant?.category) ||
    (restaurant?.category ? String(restaurant.category).trim() : '미분류');

  const categoryStyles = {
    한식: { bg: 'linear-gradient(135deg,#fed7aa,#fdba74)', emoji: '🌶️' },
    중식: { bg: 'linear-gradient(135deg,#fecaca,#fca5a5)', emoji: '🥟' },
    일식: { bg: 'linear-gradient(135deg,#fbcfe8,#f9a8d4)', emoji: '🍱' },
    양식: { bg: 'linear-gradient(135deg,#ddd6fe,#c4b5fd)', emoji: '🍝' },
    카페: { bg: 'linear-gradient(135deg,#fde68a,#fcd34d)', emoji: '☕' },
    디저트: { bg: 'linear-gradient(135deg,#fce7f3,#fbcfe8)', emoji: '🍰' },
    분식: { bg: 'linear-gradient(135deg,#fef9c3,#fef08a)', emoji: '🍜' },
    치킨: { bg: 'linear-gradient(135deg,#ffedd5,#fed7aa)', emoji: '🍗' },
  };

  const style = categoryStyles[category] || {
    bg: 'linear-gradient(135deg,#e5e7eb,#d1d5db)',
    emoji: '🍽️',
  };

  const imgContent = imageUrl
    ? `<img
        src="${imageUrl}"
        alt="${name}"
        style="position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;"
        onerror="this.style.display='none';this.nextElementSibling.style.display='flex';"
      />
      <div class="recommend-card-img-bg" style="background:${style.bg};display:none;">${style.emoji}</div>`
    : `<div class="recommend-card-img-bg" style="background:${style.bg}">${style.emoji}</div>`;

  return `
    <a href="/pages/restaurants/restaurant-detail.html?id=${restaurant?.id}" class="recommend-card-new">
      <div class="recommend-card-img">
        ${imgContent}
        <div class="recommend-category-badge">${category}</div>
      </div>
      <div class="recommend-card-body">
        <h3 class="recommend-card-name">${name}</h3>
        <div class="recommend-card-addr">
          <i class="ri-map-pin-line"></i>
          <span>${address}</span>
        </div>
      </div>
    </a>
  `;
};

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', init);
